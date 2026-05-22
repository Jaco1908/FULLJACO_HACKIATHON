import json
import os
from dotenv import load_dotenv
from groq import Groq

from app.services.copago_service import calcular_copago
from app.repositories.hospital_repository import obtener_hospitales

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

ESPECIALIDADES_VALIDAS = [
    "Medicina General", "Neurología", "Cardiología", "Gastroenterología",
    "Traumatología", "Pediatría", "Ginecología", "Dermatología", "Oncología",
    "Oftalmología", "Urología", "Psiquiatría", "Endocrinología", "Reumatología",
    "Otorrinolaringología", "Neumología", "Nefrología"
]

with open("app/prompts/system_prompt.txt", "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()


def buscar_hospitales_por_especialidad(especialidad: str):
    hospitales = obtener_hospitales()

    disponibles = []

    for h in hospitales:
        especialidades = h.get("especialidades", {})

        if especialidad in especialidades:
            disponibles.append({
                "nombre": h.get("nombre", "Hospital"),
                "ciudad": h.get("ciudad", "N/A"),
                "precio": especialidades[especialidad]
            })

    if not disponibles:
        for h in hospitales:
            especialidades = h.get("especialidades", {})

            if "Medicina General" in especialidades:
                disponibles.append({
                    "nombre": h.get("nombre", "Hospital"),
                    "ciudad": h.get("ciudad", "N/A"),
                    "precio": especialidades["Medicina General"]
                })

    return sorted(disponibles, key=lambda x: x["precio"])


async def analizar_sintomas(
    texto: str,
    historial: list,
    plan_cobertura: float = 70.0,
    plan_nombre: str = None,
    aseguradora: str = None,
    coberturas_por_especialidad: dict = None
):

    system = SYSTEM_PROMPT

    num_intercambios = len(historial) // 2

    if num_intercambios == 0:
        system += """
        
⚠️ INSTRUCCIÓN CRÍTICA — TURNO 1:
El paciente acaba de mencionar sus síntomas. DEBES responder con tipo 'pregunta'.
Pregunta SOLO por sexo biológico y edad aproximada usando estas 4 opciones EXACTAS:
opciones: ["Hombre, menos de 30 años", "Hombre, 30 años o más", "Mujer, menos de 30 años", "Mujer, 30 años o más"]

Responde SOLO con JSON tipo 'pregunta'.
"""

    elif num_intercambios == 1:
        system += """

⚠️ INSTRUCCIÓN CRÍTICA — TURNO 2:
Ya conoces sexo y edad.

Pregunta por duración e intensidad.

Responde SOLO con JSON tipo 'pregunta'.
"""

    elif num_intercambios >= 2:
        system += """

⚠️ INSTRUCCIÓN CRÍTICA — TURNO 3:
Ya tienes suficiente información.

DEBES responder con diagnóstico final.
NO hagas más preguntas.
"""

    messages = [
        {
            "role": "system",
            "content": system
        }
    ]

    for i, msg in enumerate(historial[-10:]):
        role = "user" if i % 2 == 0 else "assistant"

        messages.append({
            "role": role,
            "content": msg
        })

    messages.append({
        "role": "user",
        "content": texto
    })

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.2,
            max_tokens=700,
        )

        raw = response.choices[0].message.content.strip()

        if "```" in raw:
            parts = raw.split("```")

            for part in parts:
                part = part.strip()

                if part.startswith("json"):
                    part = part[4:].strip()

                if part.startswith("{"):
                    raw = part
                    break

        raw = raw.strip()

        data = json.loads(raw)

    except json.JSONDecodeError:
        data = {
            "tipo": "diagnostico",
            "especialidad": "Medicina General",
            "nivel_urgencia": "normal",
            "confianza": 40,
            "razon": "No pude analizar tus síntomas con precisión."
        }

    except Exception as e:
        return {
            "tipo": "error",
            "mensaje": f"Error al conectar con la IA: {str(e)}"
        }

    tipo = data.get("tipo")

    if tipo == "emergencia":
        return {
            "tipo": "emergencia",
            "nivel_urgencia": "emergencia",
            "mensaje": data.get(
                "mensaje",
                "Acude inmediatamente a emergencias o llama al 911."
            )
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
                ["Leve", "Moderado", "Fuerte", "Otro"]
            )
        }

    if tipo == "diagnostico":

        especialidad = data.get(
            "especialidad",
            "Medicina General"
        )

        if especialidad not in ESPECIALIDADES_VALIDAS:
            especialidad = "Medicina General"

        confianza = max(
            1,
            min(100, int(data.get("confianza", 75)))
        )

        hospitales_disp = buscar_hospitales_por_especialidad(
            especialidad
        )

        hospital = (
            hospitales_disp[0]
            if hospitales_disp
            else {
                "nombre": "Hospital General",
                "ciudad": "N/A",
                "precio": 50
            }
        )

        cobertura_esp = (
            coberturas_por_especialidad.get(especialidad)
            if coberturas_por_especialidad
            else None
        )

        if cobertura_esp:

            pct = cobertura_esp.get(
                "pct",
                plan_cobertura
            )

            copago_fijo = cobertura_esp.get(
                "copago",
                0
            )

            copago = max(
                calcular_copago(hospital["precio"], pct),
                copago_fijo
            )

            cobertura_aplicada = pct

        else:

            pct = plan_cobertura
            copago_fijo = 0

            copago = calcular_copago(
                hospital["precio"],
                plan_cobertura
            )

            cobertura_aplicada = plan_cobertura

        for h in hospitales_disp:

            if cobertura_esp:
                h["copago"] = max(
                    calcular_copago(h["precio"], pct),
                    copago_fijo
                )

            else:
                h["copago"] = calcular_copago(
                    h["precio"],
                    plan_cobertura
                )

        precio = hospital["precio"]

        monto_cubierto = round(
            precio * cobertura_aplicada / 100,
            2
        )

        return {
            "tipo": "diagnostico",
            "especialidad": especialidad,
            "nivel_urgencia": data.get(
                "nivel_urgencia",
                "normal"
            ),
            "confianza": confianza,
            "razon": data.get("razon", ""),
            "copago": copago,
            "precio_consulta": precio,
            "cobertura_aplicada": cobertura_aplicada,
            "monto_cubierto": monto_cubierto,
            "copago_fijo": copago_fijo,
            "plan_nombre": plan_nombre,
            "aseguradora": aseguradora,
            "hospital": hospital["nombre"],
            "ciudad_hospital": hospital["ciudad"],
            "hospitales_disponibles": hospitales_disp[:3],
        }

    return {
        "tipo": "error",
        "mensaje": "Respuesta inesperada del servicio de IA."
    }