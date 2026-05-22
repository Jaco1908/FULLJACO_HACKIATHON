import time
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from app.config import get_settings, Settings

security = HTTPBearer()

# TTL cache para estado admin: {user_id: (es_admin, timestamp)}
_admin_cache: dict[str, tuple[bool, float]] = {}
_ADMIN_CACHE_TTL = 60  # segundos


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        if not payload.get("sub"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin user_id")
        return payload
    except jwt.exceptions.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token inválido o expirado: {e}")


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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos de administrador")
    return user_id
