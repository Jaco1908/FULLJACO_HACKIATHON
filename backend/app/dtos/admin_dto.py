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
    prima_mensual: Optional[float] = Field(None, gt=0)
    deducible_anual: Optional[float] = Field(None, ge=0)
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class CoberturaCreate(BaseModel):
    plan_id: str
    especialidad: str = Field(..., min_length=2, max_length=100)
    porcentaje_cobertura: float = Field(..., ge=0, le=100)
    copago_fijo: float = Field(default=0, ge=0)
    cubierta: bool = True


class CoberturaUpdate(BaseModel):
    especialidad: Optional[str] = None
    porcentaje_cobertura: Optional[float] = Field(None, ge=0, le=100)
    copago_fijo: Optional[float] = Field(None, ge=0)
    cubierta: Optional[bool] = None


class HospitalCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    ciudad: str = Field(..., min_length=2, max_length=100)
    direccion: Optional[str] = None
    nivel: str = Field(default="intermedio")
    # Lista de especialidades que atiende el hospital.
    # Debe coincidir exactamente con los nombres canónicos de ESPECIALIDADES_VALIDAS.
    # Ejemplo: ["Cardiología", "Neurología", "Medicina General"]
    especialidades: list[str] = Field(
        default_factory=list,
        description="Especialidades que atiende el hospital (nombres exactos)",
    )
    # Precio de referencia de consulta en el hospital (USD)
    precio: Optional[float] = Field(
        default=None,
        ge=0,
        description="Precio promedio de consulta en USD. Si es None se usa el fallback del sistema.",
    )


class HospitalUpdate(BaseModel):
    nombre: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    nivel: Optional[str] = None
    especialidades: Optional[list[str]] = Field(
        default=None,
        description="Reemplaza la lista completa de especialidades del hospital",
    )
    precio: Optional[float] = Field(default=None, ge=0)
