from app.repositories.supabase_client import get_supabase


class PerfilRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_by_id(self, user_id: str) -> dict | None:
        response = (
            self.db.table("perfiles")
            .select("""
                *,
                plan_seguro:plan_seguro_id(
                    *,
                    aseguradora:aseguradora_id(*),
                    coberturas:coberturas_especialidad(*)
                )
            """)
            .eq("id", user_id)
            .single()
            .execute()
        )

        return response.data

    def update(self, user_id: str, data: dict) -> dict:
        response = (
            self.db.table("perfiles")
            .update(data)
            .eq("id", user_id)
            .execute()
        )

        return response.data[0]