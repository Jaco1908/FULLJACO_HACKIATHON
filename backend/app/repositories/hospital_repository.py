import logging

from app.repositories.supabase_client import get_supabase

logger = logging.getLogger(__name__)


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

    def get_by_id(self, hospital_id: str) -> dict | None:
        response = (
            self.db.table("hospitales")
            .select("*")
            .eq("id", hospital_id)
            .single()
            .execute()
        )
        return response.data

    def get_by_especialidad(self, especialidad: str) -> list[dict]:
        """
        Busca hospitales que cubran la especialidad dada.
        La columna `especialidades` debe ser un array JSONB en Supabase.
        Si no existe o la query falla, devuelve lista vacía para no romper el flujo.
        """
        try:
            response = (
                self.db.table("hospitales")
                .select("*")
                .contains("especialidades", [especialidad])
                .execute()
            )
            return response.data or []
        except Exception as exc:
            logger.warning(
                "get_by_especialidad(%s) falló — verificar columna 'especialidades' "
                "en la tabla 'hospitales': %s",
                especialidad,
                exc,
            )
            return []

    def get_by_especialidad_and_aseguradora(
        self, especialidad: str, aseguradora: str
    ) -> list[dict]:
        """
        Busca hospitales que cubran la especialidad Y acepten la aseguradora dada.
        Usa la columna `aseguradoras` (JSONB array de nombres).
        Si falla o no hay resultados, devuelve lista vacía para que el caller use fallback.
        """
        try:
            response = (
                self.db.table("hospitales")
                .select("*")
                .contains("especialidades", [especialidad])
                .contains("aseguradoras", [aseguradora])
                .execute()
            )
            return response.data or []
        except Exception as exc:
            logger.warning(
                "get_by_especialidad_and_aseguradora(%s, %s) falló: %s",
                especialidad,
                aseguradora,
                exc,
            )
            return []

    def get_precios_por_especialidad(self) -> dict[str, int]:
        """
        Lee precios de la tabla `precios_especialidad`.
        Si la tabla no existe o hay error, devuelve dict vacío.
        """
        try:
            response = (
                self.db.table("precios_especialidad")
                .select("especialidad,precio")
                .execute()
            )
            datos = response.data or []
        except Exception as exc:
            logger.warning(
                "get_precios_por_especialidad falló — verificar tabla "
                "'precios_especialidad': %s",
                exc,
            )
            return {}

        precios: dict[str, list] = {}
        for row in datos:
            esp = row["especialidad"]
            precio = row["precio"]
            precios.setdefault(esp, []).append(precio)

        return {
            esp: round(sum(vals) / len(vals))
            for esp, vals in precios.items()
        }

    def create(self, data: dict) -> dict:
        response = (
            self.db.table("hospitales")
            .insert(data)
            .execute()
        )
        return response.data[0]

    def update(self, hospital_id: str, data: dict) -> dict:
        response = (
            self.db.table("hospitales")
            .update(data)
            .eq("id", hospital_id)
            .execute()
        )
        return response.data[0]

    def delete(self, hospital_id: str) -> None:
        self.db.table("hospitales").delete().eq("id", hospital_id).execute()
