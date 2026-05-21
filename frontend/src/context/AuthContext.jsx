import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setUser(session?.user ?? null)
        if (session?.user) cargarPerfil(session.user.id)
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null); setPerfil(null); setLoading(false)
      } else {
        setUser(session?.user ?? null)
        if (session?.user) cargarPerfil(session.user.id)
        else { setPerfil(null); setLoading(false) }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId) {
    const { data } = await supabase
      .from('perfiles')
      .select(`
        *,
        planes(*),
        plan_seguro:plan_seguro_id(
          *,
          aseguradora:aseguradora_id(*),
          coberturas:coberturas_especialidad(*)
        )
      `)
      .eq('id', userId)
      .single()
    setPerfil(data)
    setLoading(false)
  }

  async function registrar(nombre, email, password, planSeguroId) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre_completo: nombre } }
    })
    if (error) throw error
    if (data.user && planSeguroId) {
      await supabase.from('perfiles')
        .update({ plan_seguro_id: planSeguroId })
        .eq('id', data.user.id)
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
    <AuthContext.Provider value={{ user, perfil, loading, registrar, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
