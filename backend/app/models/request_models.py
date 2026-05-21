from pydantic import BaseModel
from typing import List, Optional

class AnalizarRequest(BaseModel):
    texto: str
    historial: List[str] = []
    plan_cobertura: Optional[float] = 70.0
    plan_nombre: Optional[str] = None
    aseguradora: Optional[str] = None
    coberturas_por_especialidad: Optional[dict] = None  # {"Neurología": {"pct": 85, "copago": 8}, ...}
