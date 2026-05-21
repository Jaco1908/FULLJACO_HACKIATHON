from fastapi import APIRouter
from app.models.request_models import AnalizarRequest
from app.services.ia_service import analizar_sintomas, hospitales

router = APIRouter()

@router.post("/analizar")
async def analizar(data: AnalizarRequest):
    return await analizar_sintomas(
        data.texto,
        data.historial,
        data.plan_cobertura,
        data.plan_nombre,
        data.aseguradora,
        data.coberturas_por_especialidad
    )

@router.get("/precios")
def get_precios():
    """Retorna precio promedio por especialidad calculado desde hospitales reales."""
    precios = {}
    for h in hospitales:
        for esp, precio in h.get("especialidades", {}).items():
            if esp not in precios:
                precios[esp] = []
            precios[esp].append(precio)
    return {esp: round(sum(vals) / len(vals)) for esp, vals in precios.items()}
