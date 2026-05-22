from fastapi import APIRouter, Depends, HTTPException, status

from app.dtos.analizar_dto import AnalizarRequest, PreciosResponse
from app.services.ia_service import analizar_sintomas
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.perfil_repository import PerfilRepository
from app.dependencies import get_current_user_id
from app.exceptions import IAServiceError

router = APIRouter(tags=["analizar"])

_hospital_repo = HospitalRepository()
_perfil_repo = PerfilRepository()


def _resolver_plan(user_id: str) -> tuple[float, str | None, str | None, dict | None]:
    perfil = _perfil_repo.get_by_id(user_id)
    if not perfil or not perfil.get("plan_seguro"):
        return 70.0, None, None, None

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
    return 70.0, plan_nombre, aseguradora, coberturas


@router.post("/analizar")
async def analizar(
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
