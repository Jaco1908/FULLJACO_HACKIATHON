from app.repositories.plan_repository import PlanRepository
from app.repositories.hospital_repository import HospitalRepository
from app.services.copago_service import calcular_copago


class ComparadorService:

    def __init__(self, plan_repo: PlanRepository, hospital_repo: HospitalRepository):
        self.plan_repo = plan_repo
        self.hospital_repo = hospital_repo

    def comparar_planes(self, especialidad: str, mi_plan_id: str | None) -> dict:
        coberturas = self.plan_repo.get_coberturas_por_especialidad(especialidad)
        precios = self.hospital_repo.get_precios_por_especialidad()
        precio_referencia = precios.get(especialidad, 80)

        resultado = []
        for c in coberturas:
            plan = c.get("plan") or {}
            copago_estimado = calcular_copago(precio_referencia, float(c["porcentaje_cobertura"]))
            resultado.append({
                "plan_id": c["plan_id"],
                "plan_nombre": plan.get("nombre", ""),
                "aseguradora_nombre": (plan.get("aseguradora") or {}).get("nombre", ""),
                "prima_mensual": plan.get("prima_mensual", 0),
                "porcentaje_cobertura": float(c["porcentaje_cobertura"]),
                "copago_estimado": copago_estimado,
                "copago_fijo": float(c.get("copago_fijo") or 0),
                "es_mi_plan": c["plan_id"] == mi_plan_id,
            })

        return {
            "especialidad": especialidad,
            "precio_referencia": precio_referencia,
            "planes": resultado,
        }
