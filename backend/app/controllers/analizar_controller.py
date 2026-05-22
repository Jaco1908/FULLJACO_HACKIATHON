from fastapi import APIRouter, HTTPException, Request

from app.dtos.analizar_dto import AnalizarRequest, PreciosResponse
from app.services.ia_service import analizar_sintomas
from app.repositories.hospital_repository import HospitalRepository
from app.exceptions import IAServiceError
from app.rate_limiter import limiter

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
):

    # PLAN DEMO TEMPORAL
    plan_cobertura = 80
    plan_nombre = "Plan Demo"
    aseguradora = "Demo"
    coberturas = {}

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
            detail=e.message
        )


@router.get("/precios", response_model=PreciosResponse)
def get_precios():

    return PreciosResponse(
        precios=_hospital_repo.get_precios_por_especialidad()
    )