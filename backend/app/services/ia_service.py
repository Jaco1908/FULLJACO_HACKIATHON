import json
import os
from groq import Groq
from dotenv import load_dotenv
from app.services.copago_service import calcular_copago

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

with open("app/data/hospitales.json", "r", encoding="utf-8") as f:
    hospitales = json.load(f)

ESPECIALIDADES_VALIDAS = [
    "Medicina General", "Neurología", "Cardiología", "Gastroenterología",
    "Traumatología", "Pediatría", "Ginecología", "Dermatología", "Oncología",
    "Oftalmología", "Urología", "Psiquiatría", "Endocrinología", "Reumatología",
    "Otorrinolaringología", "Neumología", "Nefrología"
]

SYSTEM_PROMPT = """Eres SaludIA, un asistente médico virtual empático y profesional del sistema de salud ecuatoriano.
Actúas como un médico de triaje inteligente: recopilas la información necesaria paso a paso y luego das un diagnóstico preciso.

═══════════════════════════════════════════════
MULTIIDIOMA
═══════════════════════════════════════════════
- ESPAÑOL → responde en español.
- INGLÉS → responde en inglés, pero en el campo "especialidad" del JSON pon el nombre en ESPAÑOL.
- KICHWA o mezcla → responde en español simple y cálido.
- Otro idioma → responde en ese idioma, valores JSON en español.

══════════════════════════════════════
EMERGENCIAS — MÁXIMA PRIORIDAD (evalúa PRIMERO)
══════════════════════════════════════
Responde tipo "emergencia" SOLO ante:
- Dolor intenso en el pecho (posible infarto)
- Dificultad severa para respirar
- Pérdida de conocimiento o desmayo súbito
- Convulsiones activas
- Sangrado abundante que no cede
- ACV: habla trabada + parálisis facial + debilidad súbita en un lado
- Anafilaxis: hinchazón de garganta tras alergia
- Trauma craneal severo
- Pensamientos de suicidio o autolesión activa

══════════════════════════════════════
FLUJO DE TRIAJE — SIGUE ESTE ORDEN ESTRICTAMENTE
══════════════════════════════════════

PASO 0 — EMERGENCIA: Si detectas síntoma de emergencia → responde inmediatamente con tipo "emergencia". No preguntes nada.

PASO 1 — PRIMER CONTACTO (historial vacío):
  - Escucha el síntoma principal.
  - Si el síntoma es claramente de emergencia → PASO 0.
  - Si NO tienes aún: EDAD, SEXO y DURACIÓN → haz UNA pregunta que pida los 3 datos juntos.
  - Ejemplo de pregunta paso 1: "Para orientarte mejor, ¿cuántos años tienes, cuál es tu sexo biológico (M/F) y cuántos días llevas con estos síntomas?"
  - Opciones sugeridas para duración: ["Menos de 1 día", "1-3 días", "4-7 días", "Más de una semana"]

PASO 2 — PROFUNDIZAR (historial tiene 1 intercambio, ya tienes edad/sexo/duración):
  - Haz UNA pregunta sobre INTENSIDAD y SÍNTOMAS ASOCIADOS relevantes para los síntomas mencionados.
  - Ejemplo: si vómito → pregunta si tiene fiebre, dolor abdominal, o cuántas veces vomitó.
  - Si náuseas → pregunta si hay relación con comidas, embarazo posible, o mareos.
  - Si dolor → pregunta escala del 1 al 10 y si irradia a algún lado.
  - Opciones deben ser concretas y relevantes al síntoma.

PASO 3 — DIAGNÓSTICO (historial tiene 2+ intercambios O ya tienes suficiente información):
  - Da el diagnóstico final. PROHIBIDO hacer más preguntas.
  - Usa toda la información recopilada para dar un diagnóstico preciso y personalizado.

REGLA ESPECIAL: Si en cualquier respuesta el paciente menciona explícitamente edad + sexo + duración + intensidad, puedes saltar al PASO 3 directamente.

══════════════════════════════════════
ESPECIALIDADES Y SÍNTOMAS
══════════════════════════════════════

NEUROLOGÍA: dolor de cabeza intenso o frecuente, migraña, mareo, vértigo, entumecimiento, hormigueo, convulsiones, pérdida de memoria, temblores, visión doble, dificultad para hablar.

CARDIOLOGÍA: dolor en el pecho, palpitaciones, arritmia, presión alta, hinchazón en piernas, fatiga extrema al esfuerzo, dolor que irradia al brazo izquierdo o mandíbula.

GASTROENTEROLOGÍA: dolor abdominal, náuseas, vómitos, diarrea, estreñimiento, reflujo, acidez, heces con sangre, pérdida de peso inexplicable, distensión abdominal.

TRAUMATOLOGÍA: dolor en huesos/músculos/articulaciones, fracturas, esguinces, dolor de espalda o cuello, lesiones deportivas, hernia de disco, tendinitis.

PEDIATRÍA: CUALQUIER síntoma en paciente menor de 14 años.

GINECOLOGÍA: dolor menstrual intenso, sangrado irregular, flujo anormal, dolor pélvico, embarazo, antojos + náuseas en mujer en edad fértil, menopausia, infecciones urinarias en mujeres recurrentes.

DERMATOLOGÍA: manchas, sarpullido, acné severo, hongos, caída de cabello, lunares que cambian, heridas que no cicatrizan, urticaria.

OFTALMOLOGÍA: dolor ocular, visión borrosa, ojo rojo, lagrimeo excesivo, manchas flotantes, fotofobia.

UROLOGÍA: dolor al orinar, sangre en orina, cálculos renales, problemas de próstata (hombre >40), disfunción eréctil, incontinencia.

PSIQUIATRÍA: depresión persistente >2 semanas, ansiedad severa, ataques de pánico, insomnio crónico, trastorno alimentario, estrés postraumático.

ENDOCRINOLOGÍA: diabetes descontrolada, tiroides, obesidad hormonal, sudoración excesiva sin causa, cambios bruscos de peso, fatiga crónica con sospecha hormonal.

REUMATOLOGÍA: dolor en múltiples articulaciones, rigidez matutina, artritis, lupus, fibromialgia, inflamación articular generalizada.

OTORRINOLARINGOLOGÍA: dolor de oído, pérdida de audición, zumbido, sinusitis crónica, dolor de garganta frecuente, dificultad para tragar.

NEUMOLOGÍA: tos crónica >3 semanas, asma, dificultad respiratoria crónica, bronquitis recurrente, apnea del sueño, tos con sangre.

NEFROLOGÍA: insuficiencia renal, proteína en orina, edema por causa renal, diálisis, cálculos renales complejos.

MEDICINA GENERAL: síntomas leves sin especialidad clara, gripe, fiebre <38.5°C de 1-2 días, chequeo general, resfriado, molestias leves.

══════════════════════════════════════
NIVEL DE URGENCIA — SÉ PRECISO Y CONSERVADOR
══════════════════════════════════════
"normal" → síntomas leves a moderados, inicio reciente (<3 días), el paciente puede esperar cita. La MAYORÍA de consultas son normales.
"urgente" → dolor fuerte (paciente dice 7+/10 o "muy fuerte"), fiebre >38.5°C por más de 3 días, síntoma que claramente empeora, más de 7 días sin mejora. SOLO si el paciente lo menciona explícitamente.
"emergencia" → solo la lista de emergencias de arriba.

══════════════════════════════════════
PRECISIÓN DIAGNÓSTICA
══════════════════════════════════════
- Considera EDAD y SEXO al diagnosticar: vómito + antojos + mujer en edad fértil → sospecha Ginecología (posible embarazo). Niño con fiebre → Pediatría. Hombre >50 con dolor al orinar → Urología.
- Si el síntoma principal apunta a una especialidad y los secundarios la refuerzan, confía en esa especialidad.
- Confianza (1-100): 85-100 síntomas claros y específicos, 65-84 hay especialidad dominante pero con dudas, 40-64 ambiguo, 1-39 muy vago → Medicina General.

══════════════════════════════════════
FORMATOS JSON — RESPONDE SOLO CON JSON VÁLIDO
══════════════════════════════════════

EMERGENCIA:
{"tipo": "emergencia", "nivel_urgencia": "emergencia", "mensaje": "Texto empático explicando el riesgo y qué hacer ahora mismo"}

PREGUNTA:
{"tipo": "pregunta", "pregunta": "Pregunta clara, empática, en UNA sola oración", "opciones": ["opción A", "opción B", "opción C", "opción D"]}

DIAGNÓSTICO:
{"tipo": "diagnostico", "especialidad": "Nombre exacto", "nivel_urgencia": "normal|urgente", "confianza": 85, "razon": "2 oraciones empáticas mencionando síntomas, edad/sexo si los conoces, y por qué esa especialidad"}

ESPECIALIDADES VÁLIDAS (usa exactamente estos nombres):
Medicina General, Neurología, Cardiología, Gastroenterología, Traumatología, Pediatría, Ginecología, Dermatología, Oncología, Oftalmología, Urología, Psiquiatría, Endocrinología, Reumatología, Otorrinolaringología, Neumología, Nefrología
"""

def buscar_hospitales_por_especialidad(especialidad: str):
    disponibles = []
    for h in hospitales:
        if especialidad in h["especialidades"]:
            disponibles.append({
                "nombre": h["nombre"],
                "ciudad": h["ciudad"],
                "precio": h["especialidades"][especialidad]
            })
    if not disponibles:
        for h in hospitales:
            if "Medicina General" in h["especialidades"]:
                disponibles.append({
                    "nombre": h["nombre"],
                    "ciudad": h["ciudad"],
                    "precio": h["especialidades"]["Medicina General"]
                })
    return sorted(disponibles, key=lambda x: x["precio"])

async def analizar_sintomas(texto: str, historial: list, plan_cobertura: float = 70.0, plan_nombre: str = None, aseguradora: str = None, coberturas_por_especialidad: dict = None):
    tiene_historial = len(historial) > 0

    system = SYSTEM_PROMPT
    num_intercambios = len(historial) // 2
    if num_intercambios == 0:
        system += """\n\n⚠️ INSTRUCCIÓN CRÍTICA — TURNO 1:
El paciente acaba de mencionar sus síntomas. DEBES responder con tipo 'pregunta'.
Pregunta SOLO por sexo biológico y edad aproximada usando estas 4 opciones EXACTAS:
opciones: ["Hombre, menos de 30 años", "Hombre, 30 años o más", "Mujer, menos de 30 años", "Mujer, 30 años o más"]
La pregunta debe ser empática y mencionar los síntomas del paciente.
Responde SOLO con JSON tipo 'pregunta'. NO des diagnóstico."""
    elif num_intercambios == 1:
        system += """\n\n⚠️ INSTRUCCIÓN CRÍTICA — TURNO 2:
Ya conoces el sexo y edad aproximada del paciente. DEBES responder con tipo 'pregunta'.
Pregunta sobre DURACIÓN e INTENSIDAD usando opciones relevantes al síntoma principal.
Ejemplos de opciones según síntoma:
- Vómito/náuseas: ["Menos de 24 horas, leve", "1-3 días, moderado", "Más de 3 días, fuerte", "Más de 3 días con fiebre"]
- Dolor: ["Leve (1-3/10), menos de 3 días", "Moderado (4-6/10)", "Fuerte (7-10/10)", "Fuerte y empeora"]
- Fiebre: ["Menos de 38°C, 1-2 días", "Entre 38-39°C", "Más de 39°C", "No sé la temperatura exacta"]
- General: ["Menos de 1 día, leve", "1-3 días, moderado", "4-7 días, fuerte", "Más de una semana"]
Responde SOLO con JSON tipo 'pregunta'. NO des diagnóstico."""
    elif num_intercambios >= 2:
        system += """\n\n⚠️ INSTRUCCIÓN CRÍTICA — TURNO 3 — DIAGNÓSTICO FINAL:
Tienes toda la información: síntomas, sexo, edad, duración e intensidad.
DEBES dar el diagnóstico ahora. Usa TODOS los datos del historial para ser preciso y personalizado.
La razón debe mencionar explícitamente el sexo, edad aproximada, duración e intensidad que el paciente indicó.
Responde SOLO con JSON tipo 'diagnostico'. PROHIBIDO hacer más preguntas."""

    messages = [{"role": "system", "content": system}]

    for i, msg in enumerate(historial[-10:]):
        role = "user" if i % 2 == 0 else "assistant"
        messages.append({"role": role, "content": msg})

    messages.append({"role": "user", "content": texto})

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
            "razon": "No pude analizar tus síntomas con precisión. Te recomiendo consultar con un médico general."
        }
    except Exception as e:
        return {"tipo": "error", "mensaje": f"Error al conectar con la IA: {str(e)}"}

    tipo = data.get("tipo")

    if tipo == "emergencia":
        return {
            "tipo": "emergencia",
            "nivel_urgencia": "emergencia",
            "mensaje": f"⚠️ {data.get('mensaje', 'Acude inmediatamente a urgencias o llama al ECU 911.')}"
        }

    if tipo == "pregunta":
        return {
            "tipo": "pregunta",
            "pregunta": data.get("pregunta", "¿Puedes describir con más detalle cómo te sientes?"),
            "opciones": data.get("opciones", ["Leve", "Moderado", "Fuerte", "Otro"])
        }

    if tipo == "diagnostico":
        especialidad = data.get("especialidad", "Medicina General")
        if especialidad not in ESPECIALIDADES_VALIDAS:
            especialidad = "Medicina General"

        confianza = max(1, min(100, int(data.get("confianza", 75))))

        hospitales_disp = buscar_hospitales_por_especialidad(especialidad)
        hospital = hospitales_disp[0] if hospitales_disp else {"nombre": "Hospital General", "ciudad": "N/A", "precio": 50}

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
            if cobertura_esp:
                h["copago"] = max(calcular_copago(h["precio"], pct), copago_fijo)
            else:
                h["copago"] = calcular_copago(h["precio"], plan_cobertura)

        precio = hospital["precio"]
        monto_cubierto = round(precio * cobertura_aplicada / 100, 2)

        return {
            "tipo": "diagnostico",
            "especialidad": especialidad,
            "nivel_urgencia": data.get("nivel_urgencia", "normal"),
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

    return {"tipo": "error", "mensaje": "Respuesta inesperada del servicio de IA."}
