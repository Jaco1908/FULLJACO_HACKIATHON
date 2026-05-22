from app.repositories.supabase_client import get_supabase


class HospitalRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_all(self) -> list[dict]:
        return self.db.table("hospitales").select("*").order("ciudad,nombre").execute().data or []

    def get_by_id(self, hospital_id: str) -> dict | None:
        return self.db.table("hospitales").select("*").eq("id", hospital_id).single().execute().data

    def get_by_especialidad(self, especialidad: str) -> list[dict]:
        response = (
            self.db.table("precios_especialidad")
            .select("precio, hospital:hospital_id(id, nombre, ciudad)")
            .eq("especialidad", especialidad)
            .order("precio")
            .execute()
        )
        result = []
        for row in (response.data or []):
            h = row.get("hospital")
            if h:
                result.append({
                    "id": h["id"],
                    "nombre": h["nombre"],
                    "ciudad": h["ciudad"],
                    "precio": float(row["precio"]),
                })
        return result

    def get_precios_por_especialidad(self) -> dict[str, float]:
        response = self.db.table("precios_especialidad").select("especialidad,precio").execute()
        acum: dict[str, list[float]] = {}
        for row in (response.data or []):
            acum.setdefault(row["especialidad"], []).append(float(row["precio"]))
        return {esp: round(sum(vals) / len(vals)) for esp, vals in acum.items()}

    def create(self, data: dict) -> dict:
        return self.db.table("hospitales").insert(data).execute().data[0]

    def update(self, hospital_id: str, data: dict) -> dict:
        return self.db.table("hospitales").update(data).eq("id", hospital_id).execute().data[0]

    def delete(self, hospital_id: str) -> None:
        try:
            self.db.table("precios_especialidad").delete().eq("hospital_id", hospital_id).execute()
            self.db.table("hospitales").delete().eq("id", hospital_id).execute()
        except Exception as e:
            raise RuntimeError(f"Error en cascade delete de hospital {hospital_id}: {e}") from e
