from app.repositories.supabase_client import get_supabase


class ConsultaRepository:

    def __init__(self):
        self.db = get_supabase()

    def create(self, data: dict) -> dict:
        return self.db.table("consultas").insert(data).execute().data[0]

    def get_by_user(self, user_id: str, limit: int = 50) -> list[dict]:
        return (
            self.db.table("consultas")
            .select("*")
            .eq("usuario_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data or []
        )

    def get_last_n(self, user_id: str, n: int = 3) -> list[dict]:
        return (
            self.db.table("consultas")
            .select("especialidad_sugerida, sintomas, created_at")
            .eq("usuario_id", user_id)
            .order("created_at", desc=True)
            .limit(n)
            .execute()
            .data or []
        )
