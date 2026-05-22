from pydantic import BaseModel
from typing import Optional


class AseguradoraResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str]
    activa: bool


class PlanResponse(BaseModel):
    id: str
    nombre: str
    prima_mensual: Optional[float]
    deducible_anual: Optional[float]
    descripcion: Optional[str]
    activo: bool
    aseguradora_id: Optional[str]
    aseguradora_nombre: Optional[str]


class ComparadorItemResponse(BaseModel):
    plan_id: str
    plan_nombre: str
    aseguradora_nombre: str
    prima_mensual: Optional[float]
    porcentaje_cobertura: float
    copago_fijo: float
    es_mi_plan: bool
