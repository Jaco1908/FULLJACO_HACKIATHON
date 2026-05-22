from fastapi import APIRouter, Depends, HTTPException, status

from app.dtos.perfil_dto import PerfilResponse, PerfilUpdate, PlanSeguroDTO, CoberturaDTO
from app.repositories.perfil_repository import PerfilRepository
from app.dependencies import get_current_user

router = APIRouter(prefix="/perfil", tags=["perfil"])

_repo = PerfilRepository()


def _build_perfil_response(perfil: dict, email: str) -> PerfilResponse:
    plan_seguro = None
    raw_plan = perfil.get("plan_seguro")
    if raw_plan:
        aseg = raw_plan.get("aseguradora") or {}
        coberturas = [
            CoberturaDTO(
                especialidad=c["especialidad"],
                porcentaje_cobertura=float(c["porcentaje_cobertura"]),
                copago_fijo=float(c.get("copago_fijo") or 0),
            )
            for c in (raw_plan.get("coberturas") or [])
        ]
        plan_seguro = PlanSeguroDTO(
            id=raw_plan["id"],
            nombre=raw_plan["nombre"],
            prima_mensual=raw_plan.get("prima_mensual"),
            deducible_anual=raw_plan.get("deducible_anual"),
            aseguradora_nombre=aseg.get("nombre"),
            coberturas=coberturas,
        )

    return PerfilResponse(
        id=perfil["id"],
        nombre_completo=perfil.get("nombre_completo"),
        email=email,
        plan_seguro=plan_seguro,
        es_admin=perfil.get("es_admin", False),
    )


@router.get("", response_model=PerfilResponse)
def get_perfil(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    perfil = _repo.get_by_id(user_id)
    if not perfil:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado")
    return _build_perfil_response(perfil, user.get("email", ""))


@router.put("", response_model=PerfilResponse)
def update_perfil(data: PerfilUpdate, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Sin datos para actualizar")
    _repo.update(user_id, update_data)
    perfil = _repo.get_by_id(user_id)
    return _build_perfil_response(perfil, user.get("email", ""))
