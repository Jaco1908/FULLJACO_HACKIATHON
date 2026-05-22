import json
from pathlib import Path
from groq import Groq

from app.config import get_settings
from app.services.copago_service import calcular_copago
from app.repositories.hospital_repository import HospitalRepository
from app.exceptions import IAServiceError

settings = get_settings()
client = Groq(api_key=settings.groq_api_key)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "system_prompt.txt"
SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

ESPECIALIDADES_VALIDAS = [
    "Medicina General", "Neurología", "Cardiología", "Gastroenterología",
    "Traumatología", "Pediatría", "Ginecología", "Dermatología", "Oncología",
    "Oftalmología", "Urología", "Psiquiatría", "Endocrinología", "Reumatología",
    "Otorrinolaringología", "Neumología", "Nefrología",
]


def _buscar_hospitales(especialidad: str, hospital_repo: HospitalRepository) -> list[dict]:
    disponibles = hospital_repo.get_by_especialidad(especialidad)
    if not disponibles:
        disponibles = hospital_repo.get_by_especialidad("Medicina General")
    return sorted(disponibles, key=lambda x: x["precio"])


def _construir_system_prompt(num_intercambios: int) -> str:
    system = SYSTEM_PROMPT
    if num_intercambios == 0:
        system += "\n\n⚠️ TURNO 1: Responde SOLO con tipo 'pregunta' sobre sexo/edad."
    elif num_intercambios == 1:
        system += "\n\n⚠️ TURNO 2: Responde SOLO con tipo 'pregunta' sobre duración/intensidad."
    else:
        system += "\n\n⚠️ TURNO 3: Da el diagnóstico final. PROHIBIDO hacer más preguntas."
    return system


def _procesar_respuesta_ia(
    data: dict,
    plan_cobertura: float,
    plan_nombre: str | None,
    aseguradora: str | None,
    coberturas_por_especialidad: dict | None,
    hospital_repo: HospitalRepository,
) -> dict:
    tipo = data.get("tipo")

    if tipo == "emergencia":
        return {
            "tipo": "emergencia",
            "nivel_urgencia": "emergencia",
            "mensaje": f"⚠️ {data.get('mensaje', 'Acude inmediatamente a urgencias o llama al ECU 911.')}",
        }

    if tipo == "pregunta":
        return {
            "tipo": "pregunta",
            "pregunta": data.get("pregunta", "¿Puedes describir con más detalle cómo te sientes?"),
            "opciones": data.get("opciones", ["Leve", "Moderado", "Fuerte", "Otro"]),
        }

    if tipo == "diagnostico":
        especialidad = data.get("especialidad", "Medicina General")
        if especialidad not in ESPECIALIDADES_VALIDAS:
            especialidad = "Medicina General"

        confianza = max(1, min(100, int(data.get("confianza", 75))))
        hospitales_disp = _buscar_hospitales(especialidad, hospital_repo)
        hospital = hospitales_disp[0] if hospitales_disp else {
            "nombre": "Hospital General", "ciudad": "N/A",
            "precio": settings.fallback_price,
        }

        cobertura_esp = coberturas_por_especialidad.get(especialidad) if coberturas_por_especialidad else None
        if cobertura_esp:
            pct = cobertura_esp.get("pct", plan_cobertura)
            copago_fijo = cobertura_esp.get("copago", 0)
            copago = max(calcular_copago(hospital["precio"], pct), copago_fijo)
            cobertura_aplicada = pct
        else:
            pct = plan_cobertura
            copago_fijo = 0
            copago = calcular_copago(hospital["precio"], plan_cobertura)
            cobertura_aplicada = plan_cobertura

        for h in hospitales_disp:
            h["copago"] = (
                max(calcular_copago(h["precio"], pct), copago_fijo)
                if cobertura_esp
                else calcular_copago(h["precio"], plan_cobertura)
            )

        precio = hospital["precio"]
        return {
            "tipo": "diagnostico",
            "especialidad": especialidad,
            "nivel_urgencia": data.get("nivel_urgencia", "normal"),
            "confianza": confianza,
            "razon": data.get("razon", ""),
            "copago": copago,
            "precio_consulta": precio,
            "cobertura_aplicada": cobertura_aplicada,
            "monto_cubierto": round(precio * cobertura_aplicada / 100, 2),
            "copago_fijo": copago_fijo,
            "plan_nombre": plan_nombre,
            "aseguradora": aseguradora,
            "hospital": hospital["nombre"],
            "ciudad_hospital": hospital["ciudad"],
            "hospitales_disponibles": hospitales_disp[:3],
        }

    raise IAServiceError("Tipo de respuesta IA no reconocido")


async def analizar_sintomas(
    texto: str,
    historial: list[str],
    plan_cobertura: float,
    plan_nombre: str | None,
    aseguradora: str | None,
    coberturas_por_especialidad: dict | None,
    hospital_repo: HospitalRepository,
) -> dict:
    num_intercambios = len(historial) // 2
    system = _construir_system_prompt(num_intercambios)

    messages = [{"role": "system", "content": system}]
    for i, msg in enumerate(historial[-10:]):
        messages.append({"role": "user" if i % 2 == 0 else "assistant", "content": msg})
    messages.append({"role": "user", "content": texto})

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.2,
            max_tokens=700,
        )
        raw = response.choices[0].message.content.strip()

        if "```" in raw:
            for part in raw.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    raw = part
                    break

        data = json.loads(raw)

    except json.JSONDecodeError as e:
        raise IAServiceError(
            f"La IA devolvió una respuesta con formato inválido: {e}",
            status_code=503,
        )
    except Exception as e:
        raise IAServiceError(f"Error al conectar con el servicio de IA: {e}")

    return _procesar_respuesta_ia(
        data, plan_cobertura, plan_nombre, aseguradora,
        coberturas_por_especialidad, hospital_repo,
    )
