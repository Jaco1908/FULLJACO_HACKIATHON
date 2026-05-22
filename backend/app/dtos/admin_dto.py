from pydantic import BaseModel, Field
from typing import Optional


class AseguradoraCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    descripcion: Optional[str] = None
    activa: bool = True


class AseguradoraUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None


class PlanCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    aseguradora_id: str
    prima_mensual: float = Field(..., gt=0)
    deducible_anual: float = Field(default=0, ge=0)
    descripcion: Optional[str] = None
    activo: bool = True


class PlanUpdate(BaseModel):
    nombre: Optional[str] = None
    prima_mensual: Optional[float] = None
    deducible_anual: Optional[float] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class CoberturaCreate(BaseModel):
    plan_id: str
    especialidad: str
    porcentaje_cobertura: float = Field(..., ge=0, le=100)
    copago_fijo: float = Field(default=0, ge=0)
    cubierta: bool = True


class CoberturaUpdate(BaseModel):
    porcentaje_cobertura: Optional[float] = Field(None, ge=0, le=100)
    copago_fijo: Optional[float] = Field(None, ge=0)


class HospitalCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    ciudad: str
    direccion: Optional[str] = None
    nivel: str = "intermedio"


class HospitalUpdate(BaseModel):
    nombre: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    nivel: Optional[str] = None
