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
SYSTEM_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

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


def _buscar_hospitales(especialidad: str, hospital_repo: HospitalRepository):
    disponibles = hospital_repo.get_by_especialidad(especialidad)

    if not disponibles:
        disponibles = hospital_repo.get_by_especialidad("Medicina General")

    for h in disponibles:
        if "precio" not in h:
            h["precio"] = settings.fallback_price

    return sorted(disponibles, key=lambda x: x["precio"])


def _construir_system_prompt(num_intercambios: int):
    system = SYSTEM_PROMPT

    if num_intercambios == 0:
        system += "\n\n⚠️ TURNO 1: Haz SOLO una pregunta médica corta."

    elif num_intercambios == 1:
        system += "\n\n⚠️ TURNO 2: Haz SOLO una pregunta médica corta."

    else:
        system += """
        
⚠️ TURNO 3:
Debes responder OBLIGATORIAMENTE en JSON válido.

Formato exacto:
{
  "tipo": "diagnostico",
  "especialidad": "Cardiología",
  "nivel_urgencia": "media",
  "confianza": 80,
  "razon": "Posible problema cardíaco"
}

NO uses markdown.
NO uses ```json
NO escribas texto fuera del JSON.
"""

    return system


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
        return {
            "tipo": "pregunta",
            "pregunta": data.get(
                "pregunta",
                "¿Puedes describir mejor tus síntomas?"
            ),
            "opciones": data.get(
                "opciones",
                ["Leve", "Moderado", "Fuerte"]
            ),
        }

    if tipo == "diagnostico":

        especialidad = data.get("especialidad", "Medicina General")

        if especialidad not in ESPECIALIDADES_VALIDAS:
            especialidad = "Medicina General"

        hospitales_disp = _buscar_hospitales(
            especialidad,
            hospital_repo
        )

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

            copago = max(
                calcular_copago(precio, pct),
                copago_fijo
            )

            cobertura_aplicada = pct

        else:
            pct = plan_cobertura
            copago_fijo = 0

            copago = calcular_copago(
                precio,
                plan_cobertura
            )

            cobertura_aplicada = plan_cobertura

        for h in hospitales_disp:

            precio_h = h.get(
                "precio",
                settings.fallback_price
            )

            if cobertura_esp:
                h["copago"] = max(
                    calcular_copago(precio_h, pct),
                    copago_fijo
                )
            else:
                h["copago"] = calcular_copago(
                    precio_h,
                    plan_cobertura
                )

        return {
            "tipo": "diagnostico",
            "especialidad": especialidad,
            "nivel_urgencia": data.get(
                "nivel_urgencia",
                "normal"
            ),
            "confianza": data.get("confianza", 80),
            "razon": data.get(
                "razon",
                "Posible diagnóstico generado por IA."
            ),
            "copago": copago,
            "precio_consulta": precio,
            "cobertura_aplicada": cobertura_aplicada,
            "monto_cubierto": round(
                precio * cobertura_aplicada / 100,
                2
            ),
            "copago_fijo": copago_fijo,
            "plan_nombre": plan_nombre,
            "aseguradora": aseguradora,
            "hospital": hospital.get(
                "nombre",
                "Hospital General"
            ),
            "ciudad_hospital": hospital.get(
                "ciudad",
                "Quito"
            ),
            "hospitales_disponibles": hospitales_disp[:3],
        }

    raise IAServiceError(
        "Tipo de respuesta IA no reconocido"
    )


async def analizar_sintomas(
    texto,
    historial,
    plan_cobertura,
    plan_nombre,
    aseguradora,
    coberturas_por_especialidad,
    hospital_repo,
):

    num_intercambios = len(historial) // 2

    system = _construir_system_prompt(
        num_intercambios
    )

    messages = [
        {
            "role": "system",
            "content": system,
        }
    ]

    for i, msg in enumerate(historial[-10:]):

        messages.append({
            "role": (
                "user"
                if i % 2 == 0
                else "assistant"
            ),
            "content": msg,
        })

    messages.append({
        "role": "user",
        "content": texto,
    })

    try:

        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.2,
            max_tokens=700,
        )

        raw = response.choices[0].message.content.strip()

        logger.debug("Respuesta IA: %s", raw)

        if "```" in raw:

            for part in raw.split("```"):

                part = part.strip()

                if part.startswith("json"):
                    part = part[4:].strip()

                if part.startswith("{"):
                    raw = part
                    break

        # intentar convertir a JSON
        try:
            data = json.loads(raw)

        except json.JSONDecodeError:
            # si no viene JSON, tomarlo como pregunta
            return {
                "tipo": "pregunta",
                "pregunta": raw,
                "opciones": [
                    "Leve",
                    "Moderado",
                    "Fuerte"
                ]
            }

    except Exception as e:

        raise IAServiceError(
            f"Error con Groq: {e}"
        )

    return _procesar_respuesta_ia(
        data,
        plan_cobertura,
        plan_nombre,
        aseguradora,
        coberturas_por_especialidad,
        hospital_repo,
    )