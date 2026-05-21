import json

from app.services.copago_service import calcular_copago


with open("app/data/hospitales.json", "r", encoding="utf-8") as f:
    hospitales = json.load(f)


async def analizar_sintomas(texto, historial):

    texto_lower = texto.lower()

    # CASOS DE EMERGENCIA
    emergencias = [
        "dolor en el pecho",
        "no puedo respirar",
        "dificultad para respirar",
        "perdí el conocimiento"
    ]

    for e in emergencias:
        if e in texto_lower:
            return {
                "tipo": "emergencia",
                "mensaje": "Acuda inmediatamente a emergencias."
            }

    # PREGUNTAS AUTOMÁTICAS
    if len(texto.split()) < 10 and len(historial) < 1:

        return {
            "tipo": "pregunta",
            "pregunta": "¿Hace cuánto comenzó el malestar?",
            "opciones": [
                "Menos de 2 horas",
                "Todo el día",
                "Varios días",
                "Otro"
            ]
        }

    # LÓGICA SIMPLE IA SIMULADA

    especialidad = "Medicina General"
    razon = "Posible tensión o estrés."
    hospital = hospitales[0]

    if "cabeza" in texto_lower:
        especialidad = "Neurología"
        razon = "Posible migraña, estrés o cansancio."

    elif "pecho" in texto_lower:
        especialidad = "Cardiología"
        razon = "Se recomienda revisión cardiovascular."

    elif "estómago" in texto_lower:
        especialidad = "Gastroenterología"
        razon = "Posible malestar digestivo."

    cobertura = 70

    copago = calcular_copago(
        hospital["precio"],
        cobertura
    )

    return {
        "tipo": "diagnostico",
        "especialidad": especialidad,
        "copago": copago,
        "hospital": hospital["nombre"],
        "razon": razon
    }