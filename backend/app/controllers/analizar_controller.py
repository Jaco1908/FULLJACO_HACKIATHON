from fastapi import APIRouter, Depends, HTTPException, Request

from app.dtos.analizar_dto import AnalizarRequest, PreciosResponse
from app.services.ia_service import analizar_sintomas
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.perfil_repository import PerfilRepository
from app.exceptions import IAServiceError
from app.rate_limiter import limiter
from app.dependencies import get_current_user, get_current_user_id

router = APIRouter(
    prefix="/analizar",
    tags=["Análisis IA"]
)

_hospital_repo = HospitalRepository()


def _calcular_edad(fecha_nacimiento) -> str | None:
    """Calcula edad en años a partir de fecha_nacimiento (str ISO o date)."""
    if not fecha_nacimiento:
        return None
    try:
        from datetime import date
        if isinstance(fecha_nacimiento, str):
            from datetime import datetime
            fn = datetime.strptime(fecha_nacimiento[:10], "%Y-%m-%d").date()
        else:
            fn = fecha_nacimiento
        hoy = date.today()
        edad = hoy.year - fn.year - ((hoy.month, hoy.day) < (fn.month, fn.day))
        return str(edad)
    except Exception:
        return str(fecha_nacimiento)


def _extraer_perfil_data(perfil: dict | None) -> dict:
    """
    Extrae los campos clínicos del perfil del usuario para inyectarlos en el prompt.
    Usa valores legibles si los campos no están presentes en la tabla.
    """
    if not perfil:
        return {}

    # Edad: puede venir como campo directo o calcularse desde fecha_nacimiento
    edad = perfil.get("edad") or _calcular_edad(perfil.get("fecha_nacimiento"))

    sexo_raw = perfil.get("sexo") or perfil.get("genero")
    sexo_map = {
        "M": "Masculino", "F": "Femenino",
        "masculino": "Masculino", "femenino": "Femenino",
        "male": "Masculino", "female": "Femenino",
    }
    sexo = sexo_map.get(str(sexo_raw).strip(), sexo_raw) if sexo_raw else None

    antecedentes = (
        perfil.get("antecedentes")
        or perfil.get("antecedentes_medicos")
        or perfil.get("historial_medico")
    )

    medicacion = (
        perfil.get("medicacion")
        or perfil.get("medicacion_actual")
        or perfil.get("medicamentos")
    )

    return {
        "edad": edad or "No especificada",
        "sexo": sexo or "No especificado",
        "antecedentes": antecedentes or "Ninguno registrado",
        "medicacion": medicacion or "Ninguna registrada",
    }


@router.post("")
@limiter.limit("10/minute")
async def analizar(
    request: Request,
    data: AnalizarRequest,
    user: dict = Depends(get_current_user),
):
    perfil = PerfilRepository().get_by_id(user["sub"])
    plan_seguro = (perfil or {}).get("plan_seguro")

    plan_cobertura = 70.0
    plan_nombre = None
    aseguradora = None
    coberturas = None

    if plan_seguro:
        plan_nombre = plan_seguro.get("nombre")
        aseguradora = (plan_seguro.get("aseguradora") or {}).get("nombre")
        coberturas_raw = plan_seguro.get("coberturas", [])
        if coberturas_raw:
            coberturas = {}
            for c in coberturas_raw:
                esp = c["especialidad"]
                pct = c["porcentaje_cobertura"]
                copago = c.get("copago_fijo") or 0
                # Indexar con y sin tilde para hacer match con lo que devuelve la IA
                tabla = str.maketrans("áéíóúÁÉÍÓÚ", "aeiouAEIOU")
                esp_norm = esp.translate(tabla)
                entry = {"pct": pct, "copago": copago}
                coberturas[esp] = entry
                if esp_norm != esp:
                    coberturas[esp_norm] = entry

    # Extraer datos clínicos del perfil para el prompt
    perfil_data = _extraer_perfil_data(perfil)

    # Convertir lista de MensajeDTO a dicts planos para el servicio
    historial_dicts = [m.model_dump() for m in (data.historial or [])]

    try:
        return await analizar_sintomas(
            texto=data.texto,
            historial=historial_dicts,
            plan_cobertura=plan_cobertura,
            plan_nombre=plan_nombre,
            aseguradora=aseguradora,
            coberturas_por_especialidad=coberturas,
            hospital_repo=_hospital_repo,
            perfil_data=perfil_data,
        )

    except IAServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )


@router.get("/precios", response_model=PreciosResponse)
def get_precios(
    _user_id: str = Depends(get_current_user_id),
):
    return PreciosResponse(
        precios=_hospital_repo.get_precios_por_especialidad()
    )
