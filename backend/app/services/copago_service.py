def calcular_copago(precio: float, cobertura: float) -> float:
    if precio < 0:
        raise ValueError(f"El precio no puede ser negativo: {precio}")
    if not (0 <= cobertura <= 100):
        raise ValueError(f"La cobertura debe estar entre 0 y 100: {cobertura}")
    return round(precio - (precio * cobertura / 100), 2)
