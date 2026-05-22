from app.repositories.supabase_client import get_supabase


class HospitalRepository:

    def __init__(self):
        self.db = get_supabase()

    def get_all(self):

        response = (
            self.db.table("hospitales")
            .select("*")
            .execute()
        )

        return response.data or []

    def get_by_especialidad(self, especialidad):

        response = (
            self.db.table("hospitales")
            .select("*")
            .contains("especialidades", [especialidad])
            .execute()
        )

        return response.data or []

    def get_precios_por_especialidad(self):

        response = (
            self.db.table("precios_especialidad")
            .select("especialidad,precio")
            .execute()
        )

        datos = response.data or []

        precios = {}

        for row in datos:

            esp = row["especialidad"]
            precio = row["precio"]

            if esp not in precios:
                precios[esp] = []

            precios[esp].append(precio)

        return {
            esp: round(sum(vals) / len(vals))
            for esp, vals in precios.items()
        }