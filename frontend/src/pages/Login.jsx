import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity } from 'lucide-react'

const BACKEND = import.meta.env.VITE_BACKEND_URL

export default function Login() {
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await iniciarSesion(form.email, form.password)
      navigate('/chat')
    } catch (err) {
      const msg = err?.message || ''
      const msgLow = msg.toLowerCase()
      if (msgLow.includes('email not confirmed') || msgLow.includes('debes confirmar')) {
        setError('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.')
      } else if (msgLow.includes('invalid login credentials') || msgLow.includes('invalid credentials')) {
        setError('Correo o contraseña incorrectos')
      } else if (err?.status === 429 || msgLow.includes('too many') || msgLow.includes('rate limit')) {
        setError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
      } else if (err?.status === 503 || msgLow.includes('no se pudo conectar') || msgLow.includes('servidor de autenticación')) {
        setError('El servidor de autenticación no responde. Intenta de nuevo en unos segundos.')
      } else if (msgLow.includes('failed to fetch') || msgLow.includes('network') || msgLow.includes('load failed')) {
        setError('No se puede conectar al servidor. Verifica tu conexión e intenta de nuevo.')
      } else if (msg) {
        setError(msg)
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!form.email.trim()) { setError('Ingresa tu correo primero para recuperar la contraseña'); return }
    setResetLoading(true); setError('')
    try {
      await fetch(`${BACKEND}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          redirect_to: `${window.location.origin}/reset-password`,
        }),
      })
      setResetSent(true)
    } catch {
      setError('Error al enviar el correo. Verifica tu conexión.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <Activity size={34} color="#2563eb" />
          <h1>SaludIA</h1>
        </div>
        <h2>Bienvenido de vuelta</h2>
        <p className="subtitle">Inicia sesión para continuar</p>

        {resetSent ? (
          <div className="success-msg" style={{textAlign:'center', padding:'1.5rem'}}>
            ✅ Te enviamos un correo a <strong>{form.email}</strong> con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
            <br/><br/>
            <button className="btn-secondary" style={{marginTop:0}} onClick={() => setResetSent(false)}>
              Volver al login
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Correo electrónico</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="tu@correo.com" required autoFocus />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" required />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Conectando con el servidor...' : 'Iniciar sesión'}
              </button>
            </form>
            <p style={{textAlign:'center', marginTop:'0.75rem'}}>
              <button onClick={handleReset} disabled={resetLoading}
                style={{background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'0.875rem', textDecoration:'underline'}}>
                {resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
              </button>
            </p>
          </>
        )}

        <p className="auth-footer">
          ¿No tienes cuenta? <Link to="/registro">Regístrate gratis</Link>
        </p>
      </div>
    </div>
  )
}
