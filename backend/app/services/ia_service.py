import json
import logging
from pathlib import Path
from groq import Groq

from app.config import get_settings
from app.services.copago_service import calcular_copago
from app.repositories.hospital_repository import HospitalRepository
from app.exceptions import IAServiceError

logger = logging.getLogger(__name__)

settings = get_settings()
client = Groq(api_key=settings.groq_api_key)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "system_prompt.txt"
# Cargamos la plantilla una sola vez al iniciar; los placeholders se sustituyen en runtime
PROMPT_TEMPLATE = PROMPT_PATH.read_text(encoding="utf-8")

# Número mínimo de preguntas antes de poder emitir diagnóstico
MIN_INTERCAMBIOS = 3
# Máximo de intercambios antes de forzar diagnóstico
MAX_INTERCAMBIOS = 6

ESPECIALIDADES_VALIDAS = [
    "Medicina General",
    "Neurología",
    "Cardiología",
    "Gastroenterología",
    "Traumatología",
    "Pediatría",
    "Ginecología",
    "Dermatología",
    "Oncología",
    "Oftalmología",
    "Urología",
    "Psiquiatría",
    "Endocrinología",
    "Reumatología",
    "Otorrinolaringología",
    "Neumología",
    "Nefrología",
]

# Normaliza nivel_urgencia del nuevo formato ("bajo"/"medio"/"alto")
# al formato histórico del sistema ("normal"/"urgente"/"emergencia")
_URGENCIA_MAP = {
    "bajo": "normal",
    "medio": "urgente",
    "alto": "urgente",
    # valores legacy (por si el modelo usa el formato antiguo)
    "normal": "normal",
    "urgente": "urgente",
    "emergencia": "emergencia",
}


def _buscar_hospitales(especialidad: str, hospital_repo: HospitalRepository):
    disponibles = hospital_repo.get_by_especialidad(especialidad)

    if not disponibles:
        disponibles = hospital_repo.get_by_especialidad("Medicina General")

    for h in disponibles:
        if "precio" not in h:
            h["precio"] = settings.fallback_price

    return sorted(disponibles, key=lambda x: x["precio"])


def _construir_system_prompt(num_intercambios: int, perfil_data: dict | None = None):
    """
    Construye el system prompt inyectando los datos del paciente y
    añadiendo instrucciones contextuales según el turno actual.
    """
    pd = perfil_data or {}

    # Sustituir placeholders con datos reales del paciente
    system = PROMPT_TEMPLATE
    system = system.replace("{edad}",         str(pd.get("edad", "No especificada")))
    system = system.replace("{sexo}",         str(pd.get("sexo", "No especificado")))
    system = system.replace("{antecedentes}", str(pd.get("antecedentes") or "Ninguno conocido"))
    system = system.replace("{medicacion}",   str(pd.get("medicacion")   or "Ninguna"))

    # Instrucciones contextuales por turno
    if num_intercambios == 0:
        system += (
            "\n\n⚠️ TURNO INICIAL: Haz tu primera pregunta para conocer la localización "
            "exacta y la naturaleza del síntoma principal. Responde con JSON tipo 'pregunta'."
        )
    elif num_intercambios < MIN_INTERCAMBIOS:
        restantes = MIN_INTERCAMBIOS - num_intercambios
        system += (
            f"\n\n⚠️ ENTREVISTA EN PROGRESO: Llevas {num_intercambios} pregunta(s). "
            f"Necesitas al menos {restantes} más antes de poder emitir diagnóstico "
            f"(mínimo {MIN_INTERCAMBIOS} preguntas). Continúa indagando. "
            "Responde con JSON tipo 'pregunta'."
        )
    elif num_intercambios >= MAX_INTERCAMBIOS:
        system += (
            "\n\n⚠️ LÍMITE ALCANZADO: Has realizado el máximo de preguntas permitidas. "
            "Debes emitir AHORA el JSON de tipo 'diagnostico'. NO hagas más preguntas."
        )

    return system


def _normalizar_confianza(valor) -> int:
    """Convierte confianza 0.0–1.0 → 0–100 (int). Acepta también enteros 0–100."""
    try:
        v = float(valor)
        if v <= 1.0:
            return int(round(v * 100))
        return int(round(v))
    except (TypeError, ValueError):
        return 80


def _procesar_respuesta_ia(
    data,
    plan_cobertura,
    plan_nombre,
    aseguradora,
    coberturas_por_especialidad,
    hospital_repo,
):

    tipo = data.get("tipo")

    if tipo == "emergencia":
        return {
            "tipo": "emergencia",
            "nivel_urgencia": "emergencia",
            "mensaje": data.get(
                "mensaje",
                "Acude inmediatamente a urgencias o llama al ECU 911.",
            ),
        }

    if tipo == "pregunta":
        # Soporta tanto el campo "contenido" (nuevo prompt) como "pregunta" (legado)
        texto_pregunta = (
            data.get("contenido")
            or data.get("pregunta")
            or "¿Puedes describir mejor tus síntomas?"
        )
        # "opciones" es opcional en el nuevo formato; si no viene, el frontend
        # simplemente no renderiza botones de opción rápida
        return {
            "tipo": "pregunta",
            "pregunta": texto_pregunta,
            "opciones": data.get("opciones") or [],
        }

    if tipo == "diagnostico":

        especialidad = data.get("especialidad", "Medicina General")
        if especialidad not in ESPECIALIDADES_VALIDAS:
            especialidad = "Medicina General"

        # Normalizar nivel_urgencia (nuevo formato → legado)
        nivel_urgencia_raw = data.get("nivel_urgencia", "bajo")
        nivel_urgencia = _URGENCIA_MAP.get(
            str(nivel_urgencia_raw).lower(), "normal"
        )

        # Normalizar confianza (0.0–1.0 ó 0–100 → entero 0–100)
        confianza = _normalizar_confianza(data.get("confianza", 0.8))

        hospitales_disp = _buscar_hospitales(especialidad, hospital_repo)

        hospital = (
            hospitales_disp[0]
            if hospitales_disp
            else {
                "nombre": "Hospital General",
                "ciudad": "Quito",
                "precio": settings.fallback_price,
            }
        )

        precio = hospital.get("precio", settings.fallback_price)

        cobertura_esp = None
        if coberturas_por_especialidad:
            cobertura_esp = coberturas_por_especialidad.get(especialidad)

        if cobertura_esp:
            pct = cobertura_esp.get("pct", plan_cobertura)
            copago_fijo = cobertura_esp.get("copago", 0)
            copago = max(calcular_copago(precio, pct), copago_fijo)
            cobertura_aplicada = pct
        else:
            pct = plan_cobertura
            copago_fijo = 0
            copago = calcular_copago(precio, plan_cobertura)
            cobertura_aplicada = plan_cobertura

        for h in hospitales_disp:
            precio_h = h.get("precio", settings.fallback_price)
            if cobertura_esp:
                h["copago"] = max(calcular_copago(precio_h, pct), copago_fijo)
            else:
                h["copago"] = calcular_copago(precio_h, plan_cobertura)

        return {
            "tipo": "diagnostico",
            "especialidad": especialidad,
            "nivel_urgencia": nivel_urgencia,
            "confianza": confianza,
            "razon": data.get(
                "razon",
                "Posible diagnóstico generado por IA."
            ),
            "copago": copago,
            "precio_consulta": precio,
            "cobertura_aplicada": cobertura_aplicada,
            "monto_cubierto": round(precio * cobertura_aplicada / 100, 2),
            "copago_fijo": copago_fijo,
            "plan_nombre": plan_nombre,
            "aseguradora": aseguradora,
            "hospital": hospital.get("nombre", "Hospital General"),
            "ciudad_hospital": hospital.get("ciudad", "Quito"),
            "hospitales_disponibles": hospitales_disp[:3],
        }

    raise IAServiceError("Tipo de respuesta IA no reconocido")


async def analizar_sintomas(
    texto,
    historial,
    plan_cobertura,
    plan_nombre,
    aseguradora,
    coberturas_por_especialidad,
    hospital_repo,
    perfil_data: dict | None = None,
):
    """
    Analiza los síntomas del paciente usando Groq.

    :param texto: Mensaje actual del usuario.
    :param historial: Lista de turnos previos con roles explícitos:
                      [{"role": "user"|"assistant", "content": "..."}]
                      Nunca incluye el mensaje actual (texto).
    :param perfil_data: dict con claves opcionales edad, sexo, antecedentes, medicacion.
    """

    # Normalizar: acepta dicts y objetos Pydantic (MensajeDTO)
    historial_dicts: list[dict] = []
    for msg in (historial or []):
        if isinstance(msg, dict):
            historial_dicts.append({"role": msg["role"], "content": msg["content"]})
        else:
            historial_dicts.append({"role": msg.role, "content": msg.content})

    # Número de turnos del usuario ya respondidos (intercambios completados)
    num_intercambios = sum(
        1 for m in historial_dicts if m["role"] == "user"
    )

    system = _construir_system_prompt(num_intercambios, perfil_data)

    messages = [{"role": "system", "content": system}]

    # Ventana deslizante: últimos MAX_INTERCAMBIOS*2 mensajes para no exceder tokens
    for msg in historial_dicts[-(MAX_INTERCAMBIOS * 2):]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # El mensaje actual del usuario va siempre al final
    messages.append({"role": "user", "content": texto})

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.2,
            max_tokens=700,
        )

        raw = response.choices[0].message.content.strip()
        logger.debug("Respuesta IA raw: %s", raw)

        # Limpiar bloques markdown si el modelo los emite
        if "```" in raw:
            for part in raw.split("```"):
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    raw = part
                    break

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Respuesta no-JSON → tratar como pregunta libre
            return {
                "tipo": "pregunta",
                "pregunta": raw,
                "opciones": ["Leve", "Moderado", "Fuerte"],
            }

    except Exception as e:
        raise IAServiceError(f"Error con Groq: {e}")

    return _procesar_respuesta_ia(
        data,
        plan_cobertura,
        plan_nombre,
        aseguradora,
        coberturas_por_especialidad,
        hospital_repo,
    )
