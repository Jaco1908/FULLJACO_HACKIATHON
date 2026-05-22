from fastapi import APIRouter
from app.dtos.analizar_dto import AnalizarRequest
from app.services.analizar_service import AnalizarService

router = APIRouter()

service = AnalizarService()


@router.post("/analizar")
async def analizar(data: AnalizarRequest):

    return await service.analizar_sintomas(
        texto=data.mensaje,
        historial=data.historial
    )