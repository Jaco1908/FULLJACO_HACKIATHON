from fastapi import APIRouter
from app.models.request_models import AnalizarRequest
from app.services.ia_service import analizar_sintomas

router = APIRouter()

@router.post("/analizar")
async def analizar(data: AnalizarRequest):
    respuesta = await analizar_sintomas(
        data.texto,
        data.historial
    )

    return respuesta