import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPerfil, actualizarPerfil } from '../api/perfil.api'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [perfil, setPerfil]   = useState(null)   // viene del backend, no de Supabase directamente
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Usamos getSession() en lugar de getUser() para la carga inicial:
    // getSession() lee desde localStorage (instantáneo, sin red) → evita que
    // la pantalla "Cargando..." se quede colgada si Supabase tarda en responder.
    // La validación real ocurre en cada llamada al backend (JWT verificado por el servidor).
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        cargarPerfil()
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        // Solo en login nuevo (no en refresco de token) para evitar cargas duplicadas
        setUser(session?.user ?? null)
        await cargarPerfil()
      } else if (event === 'TOKEN_REFRESHED') {
        // Actualizar el user sin recargar el perfil completo
        setUser(session?.user ?? null)
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null)
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /** Carga el perfil desde el BACKEND (incluye plan, aseguradora, coberturas, es_admin). */
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

  /** Llama al backend para actualizar perfil y recarga el contexto. */
  async function recargarPerfil() {
    await cargarPerfil()
  }

  async function registrar(nombre, email, password, planSeguroId) {
    // Timeout de 30 segundos (proyecto free puede tardar al despertar)
    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Sin respuesta del servidor. ¿El proyecto de Supabase está activo?')),
        30000
      )
    })

    let data, error
    try {
      const result = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre_completo: nombre } },
        }),
        timeoutPromise,
      ])
      data = result.data
      error = result.error
    } finally {
      clearTimeout(timeoutId)
    }
    if (error) throw error

    // Supabase puede requerir confirmación de email.
    // Si data.session es null, el usuario necesita confirmar su correo antes de poder iniciar sesión.
    if (!data.session) {
      // Lanzamos un error especial que Registro.jsx captura para mostrar la pantalla correcta.
      const err = new Error('EMAIL_CONFIRMATION_REQUIRED')
      err.email = email
      throw err
    }

    // Sesión activa → ya podemos actualizar el perfil si eligió un plan
    if (data.user && planSeguroId) {
      // Esperar a que el trigger de Supabase cree el perfil en tabla "perfiles"
      await new Promise(r => setTimeout(r, 600))
      try {
        await actualizarPerfil({ plan_seguro_id: planSeguroId })
      } catch (profileErr) {
        // No es crítico: el usuario puede elegir su plan después desde Perfil
        console.warn('[AuthContext] No se pudo guardar el plan inicial:', profileErr)
      }
    }
    return data
  }

  async function iniciarSesion(email, password) {
    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Sin respuesta del servidor. ¿El proyecto de Supabase está activo?')),
        30000
      )
    })

    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise,
      ])
      // Si llegamos aquí, ganó signInWithPassword (no el timeout)
      const { data, error } = result
      if (error) throw error
      return data
    } finally {
      // Siempre limpiar el timeout para no dejar timers colgados
      clearTimeout(timeoutId)
    }
  }

  async function cerrarSesion() {
    setUser(null)
    setPerfil(null)
    await supabase.auth.signOut()
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
