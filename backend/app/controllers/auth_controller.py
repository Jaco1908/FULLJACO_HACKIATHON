"""
Proxy de autenticación hacia Supabase Auth.

El frontend NO llama a Supabase directamente — toda la autenticación
pasa por este controlador, que vive en localhost:8000 (siempre accesible).

Esto evita problemas cuando el browser tiene restricciones de red que
impiden alcanzar supabase.co (extensiones, firewall corporativo, etc.).
"""
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.config import get_settings, Settings

router = APIRouter(prefix="/auth", tags=["auth"])

# ── DTOs ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    nombre_completo: str | None = None


class ResetPasswordRequest(BaseModel):
    email: str
    redirect_to: str | None = None


class UpdatePasswordRequest(BaseModel):
    access_token: str
    password: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _supabase_headers(settings: Settings) -> dict:
    """Headers comunes para llamadas a la API REST de Supabase Auth."""
    return {
        "apikey": settings.supabase_service_role_key,
        "Content-Type": "application/json",
    }


def _raise_from_supabase(response: httpx.Response, fallback: str) -> None:
    """Convierte errores de Supabase en HTTPExceptions con mensaje legible."""
    try:
        body = response.json()
    except Exception:
        body = {}
    msg = (
        body.get("error_description")
        or body.get("msg")
        or body.get("message")
        or fallback
    )
    # Mapear mensajes en inglés a mensajes en español
    msg_lower = msg.lower()
    if "invalid login credentials" in msg_lower or "invalid credentials" in msg_lower:
        msg = "Correo o contraseña incorrectos"
    elif "email not confirmed" in msg_lower:
        msg = "Debes confirmar tu correo antes de iniciar sesión"
    elif "already registered" in msg_lower:
        msg = "Este correo ya tiene una cuenta registrada"
    elif "password" in msg_lower and "characters" in msg_lower:
        msg = "La contraseña debe tener al menos 6 caracteres"

    status = 401 if response.status_code in (400, 401, 422) else response.status_code
    raise HTTPException(status_code=status, detail=msg)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(data: LoginRequest, settings: Settings = Depends(get_settings)):
    """
    Inicia sesión de usuario a través de Supabase Auth.
    Devuelve access_token + refresh_token para que el frontend
    los almacene y use en peticiones autenticadas.
    """
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{settings.supabase_url}/auth/v1/token?grant_type=password",
            headers=_supabase_headers(settings),
            json={"email": data.email, "password": data.password},
        )

    if response.status_code != 200:
        _raise_from_supabase(response, "Error al iniciar sesión")

    session = response.json()
    return {
        "access_token":  session["access_token"],
        "refresh_token": session["refresh_token"],
        "expires_in":    session.get("expires_in", 3600),
        "token_type":    session.get("token_type", "bearer"),
        "user": {
            "id":    session["user"]["id"],
            "email": session["user"]["email"],
            "user_metadata": session["user"].get("user_metadata", {}),
        },
    }


@router.post("/register")
async def register(data: RegisterRequest, settings: Settings = Depends(get_settings)):
    """
    Registra un nuevo usuario en Supabase Auth.
    Si auto-confirm está activo devuelve la sesión directamente.
    Si requiere confirmación de email, devuelve email_confirmation_required=True.
    """
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{settings.supabase_url}/auth/v1/signup",
            headers=_supabase_headers(settings),
            json={
                "email":    data.email,
                "password": data.password,
                "data":     {"nombre_completo": data.nombre_completo or data.email},
            },
        )

    if response.status_code not in (200, 201):
        _raise_from_supabase(response, "Error al crear la cuenta")

    result = response.json()

    # Supabase devuelve access_token si mailer_autoconfirm=true
    if result.get("access_token"):
        return {
            "access_token":              result["access_token"],
            "refresh_token":             result["refresh_token"],
            "expires_in":                result.get("expires_in", 3600),
            "token_type":                result.get("token_type", "bearer"),
            "email_confirmation_required": False,
            "user": {
                "id":    result["user"]["id"],
                "email": result["user"]["email"],
                "user_metadata": result["user"].get("user_metadata", {}),
            },
        }

    # Requiere confirmación de email
    return {
        "access_token":              None,
        "refresh_token":             None,
        "email_confirmation_required": True,
        "user": {
            "id":    result.get("id", ""),
            "email": result.get("email", data.email),
            "user_metadata": result.get("user_metadata", {}),
        },
    }


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    settings: Settings = Depends(get_settings),
):
    """Envía email de recuperación de contraseña."""
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{settings.supabase_url}/auth/v1/recover",
            headers=_supabase_headers(settings),
            json={"email": data.email},
        )

    # Supabase siempre devuelve 200 aunque el email no exista (seguridad)
    if response.status_code not in (200, 204):
        _raise_from_supabase(response, "Error al enviar el correo de recuperación")

    return {"message": "Si el correo existe, recibirás un enlace de recuperación"}


@router.post("/refresh")
async def refresh_token(
    refresh_token: str,
    settings: Settings = Depends(get_settings),
):
    """Renueva el access_token usando el refresh_token."""
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{settings.supabase_url}/auth/v1/token?grant_type=refresh_token",
            headers=_supabase_headers(settings),
            json={"refresh_token": refresh_token},
        )

    if response.status_code != 200:
        _raise_from_supabase(response, "Error al renovar la sesión")

    session = response.json()
    return {
        "access_token":  session["access_token"],
        "refresh_token": session["refresh_token"],
        "expires_in":    session.get("expires_in", 3600),
    }
