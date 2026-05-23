from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.exceptions import register_exception_handlers
from app.rate_limiter import limiter
from app.controllers.auth_controller import router as auth_router
from app.controllers.analizar_controller import router as analizar_router
from app.controllers.perfil_controller import router as perfil_router
from app.controllers.consulta_controller import router as consultas_router
from app.controllers.plan_controller import router as planes_router
from app.controllers.insights_controller import router as insights_router
from app.controllers.admin_controller import router as admin_router

settings = get_settings()

app = FastAPI(
    title="SaludIA API",
    version="1.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url="/redoc" if settings.environment == "development" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(analizar_router)
app.include_router(perfil_router)
app.include_router(consultas_router)
app.include_router(planes_router)
app.include_router(insights_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "SaludIA Backend"}
