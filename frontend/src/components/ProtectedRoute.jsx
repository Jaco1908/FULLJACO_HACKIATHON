import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ color: '#00ff9d', fontFamily: 'monospace', fontSize: '1.2rem' }}>Cargando...</div>
    </div>
  )

  return user ? children : <Navigate to="/login" />
}
