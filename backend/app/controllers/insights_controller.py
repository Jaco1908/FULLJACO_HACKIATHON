from fastapi import APIRouter, Depends

from app.services.insights_service import InsightsService
from app.repositories.consulta_repository import ConsultaRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.perfil_repository import PerfilRepository
from app.dependencies import get_current_user_id

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("")
def get_insights(user_id: str = Depends(get_current_user_id)):
    perfil = PerfilRepository().get_by_id(user_id)
    mi_plan_id = None
    if perfil and perfil.get("plan_seguro"):
        mi_plan_id = perfil["plan_seguro"]["id"]

    service = InsightsService(ConsultaRepository(), PlanRepository())
    return service.get_insights(user_id, mi_plan_id)
