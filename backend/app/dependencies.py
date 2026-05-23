import time
import json
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.algorithms import ECAlgorithm, RSAAlgorithm

from app.config import get_settings, Settings

security = HTTPBearer()

# ── Cache de JWKS (claves públicas de Supabase para ES256/RS256) ───────────────
_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
_JWKS_CACHE_TTL = 3600  # 1 hora

# ── Cache de estado admin ──────────────────────────────────────────────────────
_admin_cache: dict[str, tuple[bool, float]] = {}
_ADMIN_CACHE_TTL = 60  # segundos


async def _get_jwks(supabase_url: str) -> dict:
    """
    Obtiene las claves públicas JWKS de Supabase (async, no bloquea el event loop).
    Se cachean durante 1 hora para evitar peticiones repetidas.
    Supabase usa ES256 (ECDSA P-256) para firmar los JWT de usuario.
    """
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_CACHE_TTL:
        return _jwks_cache

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{supabase_url}/auth/v1/.well-known/jwks.json")
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_cache_time = now
    return _jwks_cache


def _get_public_key_from_jwks(jwks: dict, kid: str):
    """Busca y construye la clave pública para el kid del JWT."""
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            alg = key_data.get("alg", "")
            if alg.startswith("ES"):
                return ECAlgorithm.from_jwk(json.dumps(key_data))
            elif alg.startswith("RS"):
                return RSAAlgorithm.from_jwk(json.dumps(key_data))
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Verifica el JWT de Supabase soportando:
    - ES256 / RS256 (nuevo default de Supabase): usa JWKS para obtener la clave pública
    - HS256 (legacy): usa SUPABASE_JWT_SECRET directamente
    """
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        kid = header.get("kid")

        if alg in ("ES256", "ES384", "ES512", "RS256", "RS384", "RS512"):
            # ── Tokens asimétricos (nuevo default de Supabase) ────────────────
            jwks = await _get_jwks(settings.supabase_url)
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token sin kid para verificación asimétrica",
                )
            public_key = _get_public_key_from_jwks(jwks, kid)
            if public_key is None:
                # Forzar recarga de JWKS (puede haberse rotado la clave)
                global _jwks_cache
                _jwks_cache = None
                jwks = await _get_jwks(settings.supabase_url)
                public_key = _get_public_key_from_jwks(jwks, kid)
            if public_key is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Clave pública no encontrada para kid={kid}",
                )
            payload = jwt.decode(
                token,
                public_key,
                algorithms=[alg],
                audience="authenticated",
            )
        else:
            # ── Token simétrico HS256 (legacy) ────────────────────────────────
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )

        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token sin user_id",
            )
        return payload

    except jwt.exceptions.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {e}",
        )


def get_current_user_id(user: dict = Depends(get_current_user)) -> str:
    return user["sub"]


def require_admin(user_id: str = Depends(get_current_user_id)) -> str:
    now = time.time()
    cached = _admin_cache.get(user_id)
    if cached and (now - cached[1]) < _ADMIN_CACHE_TTL:
        is_admin = cached[0]
    else:
        from app.repositories.perfil_repository import PerfilRepository
        perfil = PerfilRepository().get_by_id(user_id)
        is_admin = bool(perfil and perfil.get("es_admin", False))
        _admin_cache[user_id] = (is_admin, now)

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador",
        )
    return user_id
