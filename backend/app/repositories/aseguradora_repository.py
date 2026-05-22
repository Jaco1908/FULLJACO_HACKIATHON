from app.repositories.supabase_client import get_supabase


class AseguradoraRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_all(self) -> list[dict]:
        return self.db.table("aseguradoras").select("*").order("nombre").execute().data or []

    def get_by_id(self, aseguradora_id: str) -> dict | None:
        return self.db.table("aseguradoras").select("*").eq("id", aseguradora_id).single().execute().data

    def create(self, data: dict) -> dict:
        return self.db.table("aseguradoras").insert(data).execute().data[0]

    def update(self, aseguradora_id: str, data: dict) -> dict:
        return self.db.table("aseguradoras").update(data).eq("id", aseguradora_id).execute().data[0]

    def delete(self, aseguradora_id: str) -> None:
        # Cascade manual: coberturas → planes → aseguradora
        # Si algún paso falla, se lanza excepción y los anteriores quedan como están
        # (Supabase no soporta transacciones en el cliente REST; FK ON DELETE CASCADE en BD es preferible)
        planes = self.db.table("planes_seguro").select("id").eq("aseguradora_id", aseguradora_id).execute()
        plan_ids = [p["id"] for p in (planes.data or [])]

        try:
            if plan_ids:
                self.db.table("coberturas_especialidad").delete().in_("plan_id", plan_ids).execute()
                self.db.table("planes_seguro").delete().in_("id", plan_ids).execute()
            self.db.table("aseguradoras").delete().eq("id", aseguradora_id).execute()
        except Exception as e:
            raise RuntimeError(f"Error en cascade delete de aseguradora {aseguradora_id}: {e}") from e
