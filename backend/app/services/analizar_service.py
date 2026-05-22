from app.repositories.hospital_repository import HospitalRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.perfil_repository import PerfilRepository


class AnalizarService:

    def __init__(self):
        self.hospital_repo = HospitalRepository()
        self.plan_repo = PlanRepository()
        self.perfil_repo = PerfilRepository()

    async def analizar_sintomas(
        self,
        texto: str,
        historial: list[str],
        user_id: str | None = None
    ):

        texto_lower = texto.lower()

        # ─────────────────────────────────────────
        # EMERGENCIAS
        # ─────────────────────────────────────────
        palabras_emergencia = [
            "dolor pecho",
            "no puedo respirar",
            "convulsiones",
            "desmayo",
            "sangrado fuerte"
        ]

        if any(p in texto_lower for p in palabras_emergencia):
            return {
                "tipo": "emergencia",
                "nivel_urgencia": "emergencia",
                "mensaje": "Tus síntomas parecen una emergencia médica. Llama inmediatamente al 911 o acude al hospital más cercano."
            }

        # ─────────────────────────────────────────
        # IA SIMPLE
        # ─────────────────────────────────────────
        especialidad = "Medicina General"
        confianza = 50
        razon = "Síntomas generales."

        if "corazon" in texto_lower or "pecho" in texto_lower:
            especialidad = "Cardiología"
            confianza = 90
            razon = "Los síntomas coinciden con problemas cardiovasculares."

        elif "cabeza" in texto_lower or "migraña" in texto_lower:
            especialidad = "Neurología"
            confianza = 85
            razon = "Los síntomas coinciden con problemas neurológicos."

        elif "piel" in texto_lower:
            especialidad = "Dermatología"
            confianza = 80
            razon = "Los síntomas parecen dermatológicos."

        # ─────────────────────────────────────────
        # PERFIL DEL USUARIO
        # ─────────────────────────────────────────
        perfil = None

        if user_id:
            perfil = self.perfil_repo.get_by_id(user_id)

        plan_nombre = None
        aseguradora = None
        cobertura = 0
        copago_fijo = 0

        if perfil and perfil.get("plan_seguro"):

            plan = perfil["plan_seguro"]

            plan_nombre = plan.get("nombre")
            aseguradora = plan.get("aseguradora", {}).get("nombre")

            coberturas = plan.get("coberturas", [])

            for c in coberturas:
                if c["especialidad"] == especialidad:
                    cobertura = c["porcentaje_cobertura"]
                    copago_fijo = c.get("copago_fijo", 0)

        # fallback si no encuentra cobertura
        if cobertura == 0:
            cobertura = 70

        # ─────────────────────────────────────────
        # HOSPITALES
        # ─────────────────────────────────────────
        hospitales = self.hospital_repo.get_by_especialidad(especialidad)
        precios = self.hospital_repo.get_precios_por_especialidad()

        hospitales_disponibles = []

        if hospitales:

            for h in hospitales:

                precio = precios.get(especialidad, 0)

                monto_cubierto = precio * cobertura / 100

                copago = precio - monto_cubierto + copago_fijo

                hospitales_disponibles.append({
                    "nombre": h["nombre"],
                    "ciudad": h["ciudad"],
                    "precio": precio,
                    "copago": round(copago, 2)
                })

            hospital_recomendado = hospitales_disponibles[0]

            precio_consulta = hospital_recomendado["precio"]

            monto_cubierto = precio_consulta * cobertura / 100

            copago_final = precio_consulta - monto_cubierto + copago_fijo

        else:

            precio_consulta = 50

            monto_cubierto = precio_consulta * cobertura / 100

            copago_final = precio_consulta - monto_cubierto + copago_fijo

            hospital_recomendado = {
                "nombre": "Hospital General",
                "ciudad": "Quito"
            }

        # ─────────────────────────────────────────
        # RESPONSE
        # ─────────────────────────────────────────
        return {
            "tipo": "diagnostico",
            "especialidad": especialidad,
            "nivel_urgencia": "normal",
            "confianza": confianza,
            "razon": razon,

            "copago": round(copago_final, 2),
            "precio_consulta": precio_consulta,
            "cobertura_aplicada": cobertura,
            "monto_cubierto": round(monto_cubierto, 2),
            "copago_fijo": copago_fijo,

            "plan_nombre": plan_nombre,
            "aseguradora": aseguradora,

            "hospital": hospital_recomendado["nombre"],
            "ciudad_hospital": hospital_recomendado["ciudad"],

            "hospitales_disponibles": hospitales_disponibles
        }