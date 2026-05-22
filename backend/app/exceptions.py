from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging


class SaludIAException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class IAServiceError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

class RecursoNoEncontrado(SaludIAException):
    def __init__(self, recurso: str, id: str):
        super().__init__(f"{recurso} con id '{id}' no encontrado", status_code=404)


class PermisoDenegado(SaludIAException):
    def __init__(self, detail: str = "No tienes permisos para esta operación"):
        super().__init__(detail, status_code=403)


class ValidacionError(SaludIAException):
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(SaludIAException)
    async def saludia_exception_handler(request: Request, exc: SaludIAException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "tipo": type(exc).__name__},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logging.error(f"Error no manejado: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Error interno del servidor", "tipo": "InternalServerError"},
        )
