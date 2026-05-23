from pydantic import BaseModel
from typing import Optional


class CoberturaDTO(BaseModel):
    especialidad: str
    porcentaje_cobertura: float
    copago_fijo: float


class PlanSeguroDTO(BaseModel):
    id: str
    nombre: str
    prima_mensual: Optional[float]
    deducible_anual: Optional[float]
    aseguradora_id: Optional[str]
    aseguradora_nombre: Optional[str]
    coberturas: list[CoberturaDTO] = []


class PerfilResponse(BaseModel):
    id: str
    nombre_completo: Optional[str]
    email: str
    plan_seguro: Optional[PlanSeguroDTO]
    es_admin: bool = False


class PerfilUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    plan_seguro_id: Optional[str] = None
