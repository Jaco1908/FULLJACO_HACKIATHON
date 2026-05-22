from app.repositories.supabase_client import get_supabase


class PlanRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_aseguradoras(self, solo_activas: bool = True):

        query = (
            self.db
            .table("aseguradoras")
            .select("*")
            .order("nombre")
        )

        if solo_activas:
            query = query.eq("activa", True)

        response = query.execute()

        return response.data or []

    def get_planes(self, aseguradora_id=None):

        query = (
            self.db
            .table("planes_seguro")
            .select("""
                *,
                aseguradora:aseguradora_id(nombre)
            """)
            .eq("activo", True)
            .order("prima_mensual")
        )

        if aseguradora_id:
            query = query.eq("aseguradora_id", aseguradora_id)

        response = query.execute()

        return response.data or []

    def get_coberturas_por_especialidad(self, especialidad: str):

        response = (
            self.db
            .table("coberturas_especialidad")
            .select("""
                *,
                plan:plan_id(
                    *,
                    aseguradora:aseguradora_id(nombre)
                )
            """)
            .eq("especialidad", especialidad)
            .eq("cubierta", True)
            .execute()
        )

        return response.data or []

    def get_coberturas_de_plan(self, plan_id: str):

        response = (
            self.db
            .table("coberturas_especialidad")
            .select("*")
            .eq("plan_id", plan_id)
            .execute()
        )

        return response.data or []

    def get_coberturas_bulk(self, plan_ids: list[str]) -> dict[str, list[dict]]:
        """Una sola query para todos los planes — evita N+1."""
        if not plan_ids:
            return {}
        response = (
            self.db
            .table("coberturas_especialidad")
            .select("*")
            .in_("plan_id", plan_ids)
            .execute()
        )
        result: dict[str, list] = {pid: [] for pid in plan_ids}
        for c in (response.data or []):
            result.setdefault(c["plan_id"], []).append(c)
        return result

    # ── Planes: mutaciones ────────────────────────────────────────────────────

    def create_plan(self, data: dict) -> dict:
        response = (
            self.db.table("planes_seguro")
            .insert(data)
            .execute()
        )
        return response.data[0]

    def update_plan(self, plan_id: str, data: dict) -> dict | None:
        response = (
            self.db.table("planes_seguro")
            .update(data)
            .eq("id", plan_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def delete_plan(self, plan_id: str) -> bool:
        """Elimina coberturas del plan y luego el plan. Devuelve True si existía."""
        self.db.table("coberturas_especialidad").delete().eq("plan_id", plan_id).execute()
        result = self.db.table("planes_seguro").delete().eq("id", plan_id).execute()
        return bool(result.data)

    # ── Coberturas: mutaciones ────────────────────────────────────────────────

    def create_cobertura(self, data: dict) -> dict:
        response = (
            self.db.table("coberturas_especialidad")
            .insert(data)
            .execute()
        )
        return response.data[0]

    def update_cobertura(self, cobertura_id: str, data: dict) -> dict | None:
        response = (
            self.db.table("coberturas_especialidad")
            .update(data)
            .eq("id", cobertura_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def delete_cobertura(self, cobertura_id: str) -> bool:
        result = (
            self.db.table("coberturas_especialidad")
            .delete()
            .eq("id", cobertura_id)
            .execute()
        )
        return bool(result.data)