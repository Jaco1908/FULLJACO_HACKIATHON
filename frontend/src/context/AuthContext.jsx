import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPerfil, actualizarPerfil } from '../api/perfil.api'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [perfil, setPerfil]   = useState(null)   // viene del backend, no de Supabase directamente
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // getUser() valida el token con el servidor — más seguro que getSession()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null)
      if (user) {
        cargarPerfil()
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null)
        await cargarPerfil()
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre_completo: nombre } },
    })
    if (error) throw error

    // Si tiene plan, actualizar vía backend (no Supabase directo)
    if (data.user && planSeguroId) {
      // Esperar a que el trigger de Supabase cree el perfil
      await new Promise(r => setTimeout(r, 500))
      await actualizarPerfil({ plan_seguro_id: planSeguroId })
    }
    return data
  }

  async function iniciarSesion(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
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
