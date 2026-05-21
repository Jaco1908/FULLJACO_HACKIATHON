import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity, MessageCircle, Clock, LogOut, User, Settings, TrendingDown, ShieldCheck, Lightbulb } from 'lucide-react'

const ADMIN_EMAILS = ['bryanfamiliat@gmail.com']

export default function Navbar() {
  const { user, perfil, cerrarSesion } = useAuth()
  const esAdmin = user && ADMIN_EMAILS.includes(user.email)
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

  return (
    <nav className="navbar">
      <Link to="/chat" className="navbar-brand">
        <Activity size={24} color="#00ff9d" />
        <span>SaludIA</span>
      </Link>

      <div className="navbar-links">
        <Link to="/chat" className={`nav-link ${isActive('/chat')}`}>
          <MessageCircle size={18} /> Chat
        </Link>
        <Link to="/historial" className={`nav-link ${isActive('/historial')}`}>
          <Clock size={18} /> Historial
        </Link>
        <Link to="/comparador" className={`nav-link ${isActive('/comparador')}`}>
          <TrendingDown size={18} /> Comparador
        </Link>
        <Link to="/insights" className={`nav-link ${isActive('/insights')}`}>
          <Lightbulb size={18} /> Insights
        </Link>
        <Link to="/perfil" className={`nav-link ${isActive('/perfil')}`}>
          <ShieldCheck size={18} /> Mi Plan
        </Link>
        {esAdmin && (
          <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
            <Settings size={18} /> Admin
          </Link>
        )}
      </div>

      <div className="navbar-user">
        <span className="user-info">
          <User size={16} />
          {perfil?.nombre_completo?.split(' ')[0] || user?.email}
        </span>
        {perfil?.plan_seguro && (
          <span className="plan-badge">{perfil.plan_seguro.nombre}</span>
        )}
        <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  )
}
