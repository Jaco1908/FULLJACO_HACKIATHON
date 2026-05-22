"""
Utilidades generales reutilizables en toda la aplicación.
"""

from __future__ import annotations

import re
from typing import Any


# ── Formato monetario ──────────────────────────────────────────────────────────

def formatear_dinero(valor: float, simbolo: str = "$") -> str:
    """
    Devuelve el valor como string con dos decimales y símbolo de moneda.

    >>> formatear_dinero(42.5)
    '$42.50'
    >>> formatear_dinero(1200, "€")
    '€1200.00'
    """
    return f"{simbolo}{valor:.2f}"


# ── Sanitización de texto ──────────────────────────────────────────────────────

def limpiar_texto(texto: str, max_len: int = 2000) -> str:
    """
    Elimina espacios redundantes, saltos de línea múltiples y recorta al largo máximo.
    Útil para normalizar input del usuario antes de enviarlo a la IA.
    """
    texto = re.sub(r"\s+", " ", texto.strip())
    return texto[:max_len]


# ── Diccionarios ───────────────────────────────────────────────────────────────

def filtrar_nulos(data: dict[str, Any]) -> dict[str, Any]:
    """
    Devuelve un nuevo diccionario sin las claves cuyo valor sea None.
    Útil antes de hacer .update() en Supabase para no pisar campos existentes.
    """
    return {k: v for k, v in data.items() if v is not None}


def primera_no_nula(*valores: Any) -> Any:
    """
    Devuelve el primer valor de la lista que no sea None.

    >>> primera_no_nula(None, None, "hola")
    'hola'
    """
    for v in valores:
        if v is not None:
            return v
    return None


# ── Porcentajes ────────────────────────────────────────────────────────────────

def porcentaje_a_decimal(pct: float) -> float:
    """Convierte 80 → 0.80 (acepta valores entre 0 y 100)."""
    if not (0 <= pct <= 100):
        raise ValueError(f"El porcentaje debe estar entre 0 y 100, recibido: {pct}")
    return pct / 100


def redondear_centavos(valor: float) -> float:
    """Redondea a dos decimales para evitar errores de punto flotante en copagos."""
    return round(valor, 2)
