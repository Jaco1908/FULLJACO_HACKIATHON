from pydantic import BaseModel, Field
from typing import Literal, Optional


class MensajeDTO(BaseModel):
    """Un turno de la conversación: siempre con role y content explícitos."""
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class AnalizarRequest(BaseModel):
    texto: str = Field(..., min_length=3, max_length=2000)
    # Historial de turnos previos con roles explícitos.
    # Formato: [{role: "user", content: "..."}, {role: "assistant", content: "..."}, ...]
    historial: Optional[list[MensajeDTO]] = Field(default_factory=list)


class HospitalDTO(BaseModel):
    nombre: str
    ciudad: str
    precio: float
    copago: float


class AnalizarPreguntaResponse(BaseModel):
    tipo: Literal["pregunta"] = "pregunta"
    pregunta: str
    opciones: list[str]


class AnalizarDiagnosticoResponse(BaseModel):
    tipo: Literal["diagnostico"] = "diagnostico"
    especialidad: str
    nivel_urgencia: str
    confianza: int
    razon: str
    copago: float
    precio_consulta: float
    cobertura_aplicada: float
    monto_cubierto: float
    copago_fijo: float
    plan_nombre: Optional[str]
    aseguradora: Optional[str]
    hospital: str
    ciudad_hospital: str
    hospitales_disponibles: list[HospitalDTO]


class AnalizarEmergenciaResponse(BaseModel):
    tipo: Literal["emergencia"] = "emergencia"
    nivel_urgencia: Literal["emergencia"] = "emergencia"
    mensaje: str


class PreciosResponse(BaseModel):
    precios: dict[str, float]
