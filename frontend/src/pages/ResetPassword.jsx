import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Activity, Lock, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  // ready: el token del enlace fue verificado por Supabase
  const [ready, setReady] = useState(false)
  // invalid: el enlace expiró o es inválido
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    // Verificar que la URL tenga un token de recuperación antes de esperar
    const hash = window.location.hash
    const search = window.location.search
    const tieneToken = hash.includes('access_token') || hash.includes('type=recovery') || search.includes('code=')

    if (!tieneToken) {
      setInvalid(true)
      return
    }

    let recuperado = false

    // Escuchar el evento PASSWORD_RECOVERY
    // IMPORTANTE: no marcar inválido en SIGNED_OUT — Supabase lo dispara ANTES de PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recuperado = true
        setReady(true)
        setInvalid(false)
      }
    })

    // Fallback: si en 20 segundos no llegó el evento, marcar inválido
    const timeout = setTimeout(() => {
      if (!recuperado) setInvalid(true)
    }, 20000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) { setError(updateError.message); return }
    setDone(true)
    setTimeout(() => navigate('/login'), 3000)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <Activity size={34} color="#2563eb" />
          <h1>SaludIA</h1>
        </div>
        <h2>Nueva contraseña</h2>

        {done ? (
          <div className="success-msg" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <CheckCircle size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
            <p>¡Contraseña actualizada! Redirigiendo al login...</p>
          </div>

        ) : invalid ? (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <AlertCircle size={32} color="#ef4444" style={{ marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>
              El enlace no es válido o expiró
            </p>
            <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Los enlaces de recuperación expiran en 1 hora. Solicita uno nuevo desde la pantalla de Login.
            </p>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Volver al Login
            </button>
          </div>

        ) : !ready ? (
          <div style={{ textAlign: 'center', color: 'var(--text2)', padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>🔐</div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Verificando enlace...</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Si esta página no avanza, el enlace puede haber expirado.<br />
              Vuelve a solicitar el correo de recuperación desde Login.
            </p>
          </div>

        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label><Lock size={13} style={{ marginRight: 4 }} />Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label><Lock size={13} style={{ marginRight: 4 }} />Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite tu nueva contraseña"
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
