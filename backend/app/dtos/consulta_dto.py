from pydantic import BaseModel, Field
from pydantic import ConfigDict
from typing import Literal, Optional, Any
from datetime import datetime


class HospitalResumen(BaseModel):
    """Hospital simplificado dentro del resumen de una consulta."""
    model_config = ConfigDict(extra='allow')

    nombre: Optional[str] = None
    ciudad: Optional[str] = None
    precio: Optional[float] = None
    copago: Optional[float] = None


class ResumenConsulta(BaseModel):
    """
    Almacena el resultado completo devuelto por ia_service en la columna JSONB 'resumen'.
    Todos los campos son opcionales porque el resumen varía según el tipo
    (diagnostico / emergencia / pregunta) y porque puede leerse de registros antiguos
    que no tenían todos los campos.
    """
    model_config = ConfigDict(extra='allow')  # nunca descartar campos desconocidos

    # Campos comunes
    tipo: Optional[str] = None                       # "diagnostico" | "emergencia" | "pregunta"
    nivel_urgencia: Optional[str] = None             # "normal" | "urgente" | "emergencia"

    # Diagnóstico
    especialidad: Optional[str] = None
    confianza: Optional[int] = None
    razon: Optional[str] = None

    # Copago y cobertura
    precio_consulta: Optional[float] = None
    copago: Optional[float] = None
    cobertura_aplicada: Optional[float] = None
    monto_cubierto: Optional[float] = None
    copago_fijo: Optional[float] = None

    # Plan de seguro
    plan_nombre: Optional[str] = None
    aseguradora: Optional[str] = None

    # Hospital principal
    hospital: Optional[str] = None
    ciudad_hospital: Optional[str] = None

    # Lista de hospitales disponibles
    hospitales_disponibles: Optional[list[HospitalResumen]] = None

    # Emergencia
    mensaje: Optional[str] = None


class ConsultaCreate(BaseModel):
    sintomas: str = Field(..., max_length=2000)
    especialidad_sugerida: Optional[str] = None
    nivel_urgencia: Optional[Literal["normal", "urgente", "emergencia"]] = None
    copago_estimado: Optional[float] = None
    resumen: Optional[ResumenConsulta] = None


class ConsultaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    usuario_id: Optional[str] = None
    sintomas: str
    especialidad_sugerida: Optional[str] = None
    nivel_urgencia: Optional[str] = None
    copago_estimado: Optional[float] = None
    resumen: Optional[ResumenConsulta] = None
    created_at: datetime
