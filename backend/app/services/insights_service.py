from datetime import datetime

from app.repositories.consulta_repository import ConsultaRepository
from app.repositories.plan_repository import PlanRepository
from app.services.copago_service import calcular_copago


class InsightsService:

    def __init__(self, consulta_repo: ConsultaRepository, plan_repo: PlanRepository):
        self.consulta_repo = consulta_repo
        self.plan_repo = plan_repo

    def get_insights(self, user_id: str, mi_plan_id: str | None) -> dict:
        consultas = self.consulta_repo.get_by_user(user_id)
        especialidades_freq = self._frecuencia_especialidades(consultas)

        return {
            "total_consultas": len(consultas),
            "total_copago": round(sum(float(c.get("copago_estimado") or 0) for c in consultas), 2),
            "resumen_mensual": self._resumen_mensual(consultas),
            "especialidades_frecuentes": especialidades_freq[:3],
            "comparativa_planes": self._comparativa_planes(consultas, mi_plan_id) if mi_plan_id else None,
            "recomendaciones": self._recomendar_planes(especialidades_freq) if not mi_plan_id else None,
        }

    def _resumen_mensual(self, consultas: list) -> list:
        meses: dict = {}
        for c in consultas:
            try:
                fecha = datetime.fromisoformat(c["created_at"])
            except (ValueError, TypeError):
                continue
            key = fecha.strftime("%B %Y")
            if key not in meses:
                meses[key] = {"mes": key, "consultas": 0, "copago": 0.0, "especialidades": []}
            meses[key]["consultas"] += 1
            meses[key]["copago"] += float(c.get("copago_estimado") or 0)
            if c.get("especialidad_sugerida"):
                meses[key]["especialidades"].append(c["especialidad_sugerida"])
        return list(meses.values())

    def _frecuencia_especialidades(self, consultas: list) -> list[dict]:
        freq: dict = {}
        for c in consultas:
            esp = c.get("especialidad_sugerida")
            if esp:
                freq[esp] = freq.get(esp, 0) + 1
        return [{"especialidad": k, "cantidad": v}
                for k, v in sorted(freq.items(), key=lambda x: -x[1])]

    def _comparativa_planes(self, consultas: list, mi_plan_id: str) -> list:
        todos_planes = self.plan_repo.get_planes()
        otros_planes = [p for p in todos_planes if p["id"] != mi_plan_id]

        # Una sola query para todas las coberturas (evita N+1)
        coberturas_bulk = self.plan_repo.get_coberturas_bulk([p["id"] for p in otros_planes])

        resultado = []
        for plan in otros_planes:
            coberturas = {
                c["especialidad"]: float(c["porcentaje_cobertura"])
                for c in coberturas_bulk.get(plan["id"], [])
            }
            costo = sum(
                calcular_copago(
                    c["resumen"]["precio_consulta"],
                    coberturas.get(c["especialidad_sugerida"], 0),
                )
                for c in consultas
                if c.get("resumen") and c.get("especialidad_sugerida")
                and isinstance(c["resumen"], dict)
                and c["resumen"].get("precio_consulta")
            )
            resultado.append({"plan": plan, "costo_historico": round(costo, 2)})
        return sorted(resultado, key=lambda x: x["costo_historico"])[:5]

    def _recomendar_planes(self, especialidades_freq: list) -> list:
        top_esps = [e["especialidad"] for e in especialidades_freq[:3]]
        todos_planes = self.plan_repo.get_planes()

        # Una sola query para todas las coberturas (evita N+1)
        coberturas_bulk = self.plan_repo.get_coberturas_bulk([p["id"] for p in todos_planes])

        resultado = []
        for plan in todos_planes:
            coberturas = {
                c["especialidad"]: float(c["porcentaje_cobertura"])
                for c in coberturas_bulk.get(plan["id"], [])
            }
            score = sum(coberturas.get(esp, 0) for esp in top_esps) / max(len(top_esps), 1)
            resultado.append({"plan": plan, "score": round(score)})
        return sorted(resultado, key=lambda x: -x["score"])[:3]
