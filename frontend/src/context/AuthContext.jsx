import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPerfil, actualizarPerfil } from '../api/perfil.api'

const AuthContext = createContext({})

const BACKEND = import.meta.env.VITE_BACKEND_URL

/**
 * Clave de localStorage donde el SDK de Supabase guarda la sesión.
 * Formato: sb-{project_ref}-auth-token
 * Se deriva automáticamente de VITE_SUPABASE_URL para no hardcodear el project_ref.
 */
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL ?? ''
const PROJECT_REF      = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] ?? ''
const SDK_STORAGE_KEY  = `sb-${PROJECT_REF}-auth-token`

/**
 * Escribe la sesión en localStorage en el formato que espera el SDK de Supabase.
 * Esto evita llamar a supabase.auth.setSession(), que hace una petición de red
 * a supabase.co (bloqueada en este browser) para validar el token.
 */
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

function clearSessionFromStorage() {
  localStorage.removeItem(SDK_STORAGE_KEY)
}

/**
 * POST al backend para autenticación.
 * El frontend NUNCA llama a Supabase directamente — usa localhost:8000.
 */
async function authFetch(endpoint, body) {
  const response = await fetch(`${BACKEND}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `Error ${response.status}`)
  }
  return response.json()
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [perfil, setPerfil]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // getSession() lee desde localStorage — instantáneo, sin red.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        cargarPerfil()
      } else {
        setLoading(false)
      }
    })

    // Solo escuchar SIGNED_OUT para limpiar estado al cerrar sesión.
    // SIGNED_IN ya lo manejamos directamente en iniciarSesion/registrar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null)
        setPerfil(null)
        setLoading(false)
      }
      // PASSWORD_RECOVERY: el SDK lo maneja internamente para ResetPassword.jsx
    })

    return () => subscription.unsubscribe()
  }, [])

  /** Carga el perfil desde el backend (plan, aseguradora, coberturas, es_admin). */
  async function cargarPerfil() {
    try {
      const data = await getPerfil()
      setPerfil(data)
    } catch (error) {
      console.error('[AuthContext] Error al cargar perfil:', error)
      setPerfil(null)
    } finally {
      setLoading(false)
    }
  }

  async function recargarPerfil() {
    await cargarPerfil()
  }

  /**
   * Login: frontend → backend → Supabase.
   * La sesión se escribe directamente en localStorage (sin pasar por setSession()
   * que hace una petición de red a Supabase y se cuelga en este browser).
   */
  async function iniciarSesion(email, password) {
    const sessionData = await authFetch('/auth/login', { email, password })

    // Escribir en localStorage en el formato del SDK → getSession() lo leerá sin red
    writeSessionToStorage(sessionData)

    // Actualizar estado de React directamente (sin esperar onAuthStateChange)
    setUser(sessionData.user)
    cargarPerfil() // fire-and-forget: no bloquea el navigate('/chat')

    return sessionData
  }

  /**
   * Registro: frontend → backend → Supabase.
   * Mismo patrón que iniciarSesion.
   */
  async function registrar(nombre, email, password, planSeguroId) {
    const result = await authFetch('/auth/register', {
      email,
      password,
      nombre_completo: nombre,
    })

    if (result.email_confirmation_required) {
      const err = new Error('EMAIL_CONFIRMATION_REQUIRED')
      err.email = email
      throw err
    }

    writeSessionToStorage(result)
    setUser(result.user)
    cargarPerfil()

    if (result.user && planSeguroId) {
      await new Promise(r => setTimeout(r, 600))
      try {
        await actualizarPerfil({ plan_seguro_id: planSeguroId })
      } catch (profileErr) {
        console.warn('[AuthContext] No se pudo guardar el plan inicial:', profileErr)
      }
    }

    return result
  }

  async function cerrarSesion() {
    clearSessionFromStorage()
    setUser(null)
    setPerfil(null)
    // signOut() limpia el estado interno del SDK (cookies, etc.)
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <AuthContext.Provider value={{
      user, perfil, loading,
      registrar, iniciarSesion, cerrarSesion, recargarPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
