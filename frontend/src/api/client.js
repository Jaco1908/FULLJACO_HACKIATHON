import { supabase } from '../lib/supabase'

const BACKEND = import.meta.env.VITE_BACKEND_URL

/**
 * Error tipado para respuestas HTTP no-ok.
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// ── Clave de localStorage donde el SDK guarda la sesión ───────────────────────
const SUPABASE_URL    = import.meta.env.VITE_SUPABASE_URL ?? ''
const PROJECT_REF     = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] ?? ''
const SDK_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`

/** Escribe la sesión renovada en localStorage para que el SDK la lea. */
function writeSessionToStorage(sessionData) {
  const expiresAt = Math.floor(Date.now() / 1000) + (sessionData.expires_in ?? 3600)
  const sdkSession = {
    access_token:  sessionData.access_token,
    token_type:    sessionData.token_type ?? 'bearer',
    expires_in:    sessionData.expires_in  ?? 3600,
    expires_at:    expiresAt,
    refresh_token: sessionData.refresh_token,
    user:          sessionData.user,
  }
  localStorage.setItem(SDK_STORAGE_KEY, JSON.stringify(sdkSession))
}

/**
 * Refresca el access_token usando el backend proxy (/auth/refresh).
 * Evita llamar a supabase.co directamente desde el browser.
 * Devuelve el nuevo access_token, o null si no se pudo refrescar.
 */
async function tryRefreshViaBackend(refreshToken) {
  try {
    const res = await fetch(`${BACKEND}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`, {
      method: 'POST',
    })
    if (!res.ok) return null
    const data = await res.json()
    writeSessionToStorage(data)
    return data.access_token
  } catch {
    return null
  }
}

/**
 * Obtiene un token válido para la request:
 * 1. Lee la sesión desde localStorage (getSession sin red).
 * 2. Si el token expira en menos de 60 s → refresca vía backend proxy.
 * 3. Devuelve el token actualizado (o null si no hay sesión).
 */
async function getValidToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const expiresAt = session.expires_at ?? 0           // segundos epoch
  const secsLeft  = expiresAt - Math.floor(Date.now() / 1000)

  if (secsLeft < 60 && session.refresh_token) {
    // Token próximo a expirar → refrescar vía backend
    const newToken = await tryRefreshViaBackend(session.refresh_token)
    return newToken ?? session.access_token            // fallback al token actual
  }

  return session.access_token
}

/**
 * Wrapper de fetch que automáticamente:
 * 1. Obtiene (y refresca si es necesario) el JWT vía backend proxy
 * 2. Agrega Content-Type: application/json
 * 3. Lanza ApiError si la respuesta no es ok (4xx, 5xx)
 * 4. Maneja 204 No Content (sin body)
 */
async function apiClient(endpoint, options = {}) {
  const token = await getValidToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const response = await fetch(`${BACKEND}${endpoint}`, { ...options, headers })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.error ?? errorData.detail ?? `Error ${response.status}`
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get:    (endpoint)        => apiClient(endpoint, { method: 'GET' }),
  post:   (endpoint, body)  => apiClient(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (endpoint, body)  => apiClient(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (endpoint)        => apiClient(endpoint, { method: 'DELETE' }),
}
