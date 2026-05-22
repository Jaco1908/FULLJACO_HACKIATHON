from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dtos.plan_dto import AseguradoraResponse, PlanResponse
from app.services.comparador_service import ComparadorService
from app.repositories.plan_repository import PlanRepository
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.perfil_repository import PerfilRepository
from app.dependencies import get_current_user_id

router = APIRouter(tags=["planes"])

_plan_repo = PlanRepository()
_hospital_repo = HospitalRepository()


@router.get("/aseguradoras", response_model=list[AseguradoraResponse])
def listar_aseguradoras(user_id: str = Depends(get_current_user_id)):
    return [AseguradoraResponse(**a) for a in _plan_repo.get_aseguradoras()]


@router.get("/planes", response_model=list[PlanResponse])
def listar_planes(
    aseguradora_id: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
):
    planes = _plan_repo.get_planes(aseguradora_id)
    result = []
    for p in planes:
        aseg = p.get("aseguradora") or {}
        result.append(PlanResponse(
            id=p["id"],
            nombre=p["nombre"],
            prima_mensual=p.get("prima_mensual"),
            deducible_anual=p.get("deducible_anual"),
            descripcion=p.get("descripcion"),
            activo=p.get("activo", True),
            aseguradora_id=p.get("aseguradora_id"),
            aseguradora_nombre=aseg.get("nombre"),
        ))
    return result


@router.get("/comparador")
def comparador(
    especialidad: str = Query(...),
    user_id: str = Depends(get_current_user_id),
):
    perfil = PerfilRepository().get_by_id(user_id)
    mi_plan_id = None
    if perfil and perfil.get("plan_seguro"):
        mi_plan_id = perfil["plan_seguro"]["id"]

    service = ComparadorService(_plan_repo, _hospital_repo)
    return service.comparar_planes(especialidad, mi_plan_id)
