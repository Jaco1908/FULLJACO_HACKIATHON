import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protege rutas de administración.
 * El rol admin viene del backend (campo es_admin en perfiles) — nunca hardcodeado.
 */
export default function AdminRoute({ children }) {
  const { user, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--accent)', fontSize: '1rem' }}>Verificando permisos...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  // perfil.es_admin viene del backend — campo en la tabla 'perfiles' de Supabase
  if (!perfil?.es_admin) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: '1rem',
      }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2 style={{ color: 'var(--navy)', margin: 0 }}>Acceso restringido</h2>
        <p style={{ color: 'var(--text2)' }}>No tienes permisos para acceder al panel de administración.</p>
        <a href="/chat" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
          ← Volver al chat
        </a>
      </div>
    )
  }

  return children
}
