from pydantic import BaseModel
from typing import List

class AnalizarRequest(BaseModel):
    texto: str
    historial: List[str] = []