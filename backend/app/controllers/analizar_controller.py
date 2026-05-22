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
            coberturas = {
                c["especialidad"]: {
                    "pct": c["porcentaje_cobertura"],
                    "copago": c["copago_fijo"],
                }
                for c in coberturas_raw
            }

    try:
        return await analizar_sintomas(
            texto=data.texto,
            historial=data.historial,
            plan_cobertura=plan_cobertura,
            plan_nombre=plan_nombre,
            aseguradora=aseguradora,
            coberturas_por_especialidad=coberturas,
            hospital_repo=_hospital_repo,
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
