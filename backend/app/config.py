from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"

    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    environment: str = "development"

    # Valores por defecto para cálculos médicos
    default_coverage_pct: float = 70.0   # cobertura cuando el usuario no tiene plan
    fallback_price: float = 50.0         # precio de consulta cuando no hay datos

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
