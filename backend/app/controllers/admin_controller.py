from fastapi import APIRouter, Depends, HTTPException, status

from app.dtos.admin_dto import (
    AseguradoraCreate, AseguradoraUpdate,
    PlanCreate, PlanUpdate,
    CoberturaCreate, CoberturaUpdate,
    HospitalCreate, HospitalUpdate,
)
from app.repositories.aseguradora_repository import AseguradoraRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.hospital_repository import HospitalRepository
from app.repositories.supabase_client import get_supabase
from app.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])

_aseg_repo = AseguradoraRepository()
_plan_repo = PlanRepository()
_hospital_repo = HospitalRepository()


# ── Aseguradoras ──────────────────────────────────────────────────────────────

@router.get("/aseguradoras")
def listar_aseguradoras(admin_id: str = Depends(require_admin)):
    return _aseg_repo.get_all()


@router.post("/aseguradoras", status_code=status.HTTP_201_CREATED)
def crear_aseguradora(data: AseguradoraCreate, admin_id: str = Depends(require_admin)):
    return _aseg_repo.create(data.model_dump())


@router.put("/aseguradoras/{aseguradora_id}")
def actualizar_aseguradora(
    aseguradora_id: str,
    data: AseguradoraUpdate,
    admin_id: str = Depends(require_admin),
):
    existing = _aseg_repo.get_by_id(aseguradora_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aseguradora no encontrada")
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Sin datos para actualizar")
    return _aseg_repo.update(aseguradora_id, update_data)


@router.delete("/aseguradoras/{aseguradora_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_aseguradora(aseguradora_id: str, admin_id: str = Depends(require_admin)):
    existing = _aseg_repo.get_by_id(aseguradora_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aseguradora no encontrada")
    _aseg_repo.delete(aseguradora_id)


# ── Planes ────────────────────────────────────────────────────────────────────

@router.get("/planes")
def listar_planes(admin_id: str = Depends(require_admin)):
    return _plan_repo.get_planes()


@router.post("/planes", status_code=status.HTTP_201_CREATED)
def crear_plan(data: PlanCreate, admin_id: str = Depends(require_admin)):
    return get_supabase().table("planes_seguro").insert(data.model_dump()).execute().data[0]


@router.put("/planes/{plan_id}")
def actualizar_plan(plan_id: str, data: PlanUpdate, admin_id: str = Depends(require_admin)):
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Sin datos para actualizar")
    result = get_supabase().table("planes_seguro").update(update_data).eq("id", plan_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan no encontrado")
    return result.data[0]


@router.delete("/planes/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_plan(plan_id: str, admin_id: str = Depends(require_admin)):
    get_supabase().table("coberturas_especialidad").delete().eq("plan_id", plan_id).execute()
    result = get_supabase().table("planes_seguro").delete().eq("id", plan_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan no encontrado")


# ── Coberturas ────────────────────────────────────────────────────────────────

@router.get("/coberturas/{plan_id}")
def listar_coberturas(plan_id: str, admin_id: str = Depends(require_admin)):
    return _plan_repo.get_coberturas_de_plan(plan_id)


@router.post("/coberturas", status_code=status.HTTP_201_CREATED)
def crear_cobertura(data: CoberturaCreate, admin_id: str = Depends(require_admin)):
    return get_supabase().table("coberturas_especialidad").insert(data.model_dump()).execute().data[0]


@router.put("/coberturas/{cobertura_id}")
def actualizar_cobertura(
    cobertura_id: str,
    data: CoberturaUpdate,
    admin_id: str = Depends(require_admin),
):
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Sin datos para actualizar")
    result = get_supabase().table("coberturas_especialidad").update(update_data).eq("id", cobertura_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cobertura no encontrada")
    return result.data[0]


@router.delete("/coberturas/{cobertura_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_cobertura(cobertura_id: str, admin_id: str = Depends(require_admin)):
    result = get_supabase().table("coberturas_especialidad").delete().eq("id", cobertura_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cobertura no encontrada")


# ── Hospitales ────────────────────────────────────────────────────────────────

@router.get("/hospitales")
def listar_hospitales(admin_id: str = Depends(require_admin)):
    return _hospital_repo.get_all()


@router.post("/hospitales", status_code=status.HTTP_201_CREATED)
def crear_hospital(data: HospitalCreate, admin_id: str = Depends(require_admin)):
    return _hospital_repo.create(data.model_dump())


@router.put("/hospitales/{hospital_id}")
def actualizar_hospital(
    hospital_id: str,
    data: HospitalUpdate,
    admin_id: str = Depends(require_admin),
):
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Sin datos para actualizar")
    existing = _hospital_repo.get_by_id(hospital_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital no encontrado")
    return _hospital_repo.update(hospital_id, update_data)


@router.delete("/hospitales/{hospital_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_hospital(hospital_id: str, admin_id: str = Depends(require_admin)):
    existing = _hospital_repo.get_by_id(hospital_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital no encontrado")
    _hospital_repo.delete(hospital_id)
