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