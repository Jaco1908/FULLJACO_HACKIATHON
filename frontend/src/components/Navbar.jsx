import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity, MessageCircle, Clock, LogOut, Settings, TrendingDown, ShieldCheck, Lightbulb } from 'lucide-react'

export default function Navbar() {
  const { user, perfil, cerrarSesion } = useAuth()
  const esAdmin = !!perfil?.es_admin
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    try {
      await cerrarSesion()
    } catch (e) {
      console.error('logout error', e)
    }
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  // Iniciales para el avatar
  const nombre = perfil?.nombre_completo || user?.email || ''
  const iniciales = nombre
    ? nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'
  const primerNombre = perfil?.nombre_completo?.split(' ')[0] || user?.email?.split('@')[0] || ''

  return (
    <nav className="navbar">
      <Link to="/chat" className="navbar-brand">
        <Activity size={20} color="#60d4fa" />
        <span>SaludIA</span>
      </Link>

      <div className="navbar-links">
        <Link to="/chat" className={`nav-link ${isActive('/chat')}`}>
          <MessageCircle size={16} /> Chat
        </Link>
        <Link to="/historial" className={`nav-link ${isActive('/historial')}`}>
          <Clock size={16} /> Historial
        </Link>
        <Link to="/comparador" className={`nav-link ${isActive('/comparador')}`}>
          <TrendingDown size={16} /> Comparador
        </Link>
        <Link to="/insights" className={`nav-link ${isActive('/insights')}`}>
          <Lightbulb size={16} /> Insights
        </Link>
        <Link to="/perfil" className={`nav-link ${isActive('/perfil')}`}>
          <ShieldCheck size={16} /> Mi Plan
        </Link>
        {esAdmin && (
          <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
            <Settings size={16} /> Admin
          </Link>
        )}
      </div>

      <div className="navbar-user">
        <div className="user-info">
          <div className="user-avatar">{iniciales}</div>
          <span>{primerNombre}</span>
        </div>
        {perfil?.plan_seguro && (
          <span className="plan-badge">{perfil.plan_seguro.nombre}</span>
        )}
        <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}
