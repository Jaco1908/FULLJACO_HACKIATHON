from pydantic import BaseModel
from typing import List

class AnalizarRequest(BaseModel):
    mensaje: str
    historial: List[str] = []
    plan_cobertura: int = 70