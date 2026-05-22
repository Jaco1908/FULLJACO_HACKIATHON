from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dtos.analizar_dto import AnalizarRequest, PreciosResponse
from app.services.ia_service import analizar_sintomas
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.perfil_repository import PerfilRepository
from app.dependencies import get_current_user_id
from app.exceptions import IAServiceError
from app.rate_limiter import limiter

router = APIRouter(prefix="/analizar", tags=["Análisis IA"])

_hospital_repo = HospitalRepository()
_perfil_repo = PerfilRepository()


def _resolver_plan(user_id: str) -> tuple[float, str | None, str | None, dict | None]:
    perfil = _perfil_repo.get_by_id(user_id)
    if not perfil or not perfil.get("plan_seguro"):
        from app.config import get_settings
        return get_settings().default_coverage_pct, None, None, None

    plan = perfil["plan_seguro"]
    plan_nombre = plan.get("nombre")
    aseguradora = (plan.get("aseguradora") or {}).get("nombre")
    coberturas = {
        c["especialidad"]: {
            "pct": float(c["porcentaje_cobertura"]),
            "copago": float(c.get("copago_fijo") or 0),
        }
        for c in (plan.get("coberturas") or [])
    }
    from app.config import get_settings
    return get_settings().default_coverage_pct, plan_nombre, aseguradora, coberturas


@router.post("")
@limiter.limit("10/minute")
async def analizar(
    request: Request,
    data: AnalizarRequest,
    user_id: str = Depends(get_current_user_id),
):
    plan_cobertura, plan_nombre, aseguradora, coberturas = _resolver_plan(user_id)
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
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/precios", response_model=PreciosResponse)
def get_precios(user_id: str = Depends(get_current_user_id)):
    return PreciosResponse(precios=_hospital_repo.get_precios_por_especialidad())
