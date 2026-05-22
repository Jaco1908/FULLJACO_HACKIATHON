from fastapi import APIRouter, Depends, HTTPException, status

from app.dtos.consulta_dto import ConsultaCreate, ConsultaResponse
from app.repositories.consulta_repository import ConsultaRepository
from app.dependencies import get_current_user

router = APIRouter(prefix="/consultas", tags=["consultas"])

_repo = ConsultaRepository()


@router.post("", response_model=ConsultaResponse, status_code=status.HTTP_201_CREATED)
def crear_consulta(data: ConsultaCreate, user: dict = Depends(get_current_user)):
    payload = data.model_dump()
    payload["usuario_id"] = user["sub"]
    created = _repo.create(payload)
    return ConsultaResponse(**created)


@router.get("", response_model=list[ConsultaResponse])
def listar_consultas(user: dict = Depends(get_current_user)):
    consultas = _repo.get_by_user(user["sub"])
    return [ConsultaResponse(**c) for c in consultas]
