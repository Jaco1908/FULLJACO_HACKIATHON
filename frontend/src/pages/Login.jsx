import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Activity } from 'lucide-react'

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
    } catch {
      setError('Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!form.email.trim()) { setError('Ingresa tu correo primero para recuperar la contraseña'); return }
    setResetLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setResetLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
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
                {loading ? 'Ingresando...' : 'Iniciar sesión'}
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
