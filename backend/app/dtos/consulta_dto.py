from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


class ResumenConsulta(BaseModel):
    especialidad: Optional[str] = None
    nivel_urgencia: Optional[str] = None
    precio_consulta: Optional[float] = None
    copago: Optional[float] = None
    cobertura_aplicada: Optional[float] = None
    hospital: Optional[str] = None
    ciudad_hospital: Optional[str] = None


class ConsultaCreate(BaseModel):
    sintomas: str = Field(..., max_length=2000)
    especialidad_sugerida: Optional[str] = None
    nivel_urgencia: Optional[Literal["normal", "urgente", "emergencia"]] = None
    copago_estimado: Optional[float] = None
    resumen: Optional[ResumenConsulta] = None


class ConsultaResponse(BaseModel):
    id: str
    usuario_id: Optional[str]
    sintomas: str
    especialidad_sugerida: Optional[str]
    nivel_urgencia: Optional[str]
    copago_estimado: Optional[float]
    resumen: Optional[ResumenConsulta]
    created_at: datetime
