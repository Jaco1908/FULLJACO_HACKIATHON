import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Activity, Lock, CheckCircle } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase pone el token en el hash de la URL; onAuthStateChange lo procesa
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
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
          <div className="success-msg" style={{textAlign:'center', padding:'1.5rem'}}>
            <CheckCircle size={32} color="#10b981" style={{marginBottom:'0.5rem'}}/>
            <p>¡Contraseña actualizada! Redirigiendo al login...</p>
          </div>
        ) : !ready ? (
          <div style={{textAlign:'center', color:'var(--text2)', padding:'1.5rem'}}>
            <p>Verificando enlace...</p>
            <p style={{fontSize:'0.8rem', marginTop:'0.5rem', color:'var(--text-dim)'}}>Si esta página no carga, vuelve a solicitar el correo de recuperación.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label><Lock size={13} style={{marginRight:4}}/>Nueva contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" autoFocus />
            </div>
            <div className="form-group">
              <label><Lock size={13} style={{marginRight:4}}/>Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repite tu nueva contraseña" />
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
