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

/**
 * Wrapper de fetch que automáticamente:
 * 1. Obtiene el JWT de Supabase Auth y lo pone en Authorization
 * 2. Agrega Content-Type: application/json
 * 3. Lanza ApiError si la respuesta no es ok (4xx, 5xx)
 * 4. Maneja 204 No Content (sin body)
 */
async function apiClient(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

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
