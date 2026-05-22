import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAseguradoras, getPlanes } from '../api/planes.api'
import { Activity, ArrowLeft, ArrowRight, Check, ShieldCheck, User, Mail, Lock } from 'lucide-react'

const TOTAL_STEPS = 4

export default function Registro() {
  const { registrar } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [aseguradoras, setAseguradoras] = useState([])
  const [planes, setPlanes] = useState([])
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmPassword: '', aseguradoraId: '', aseguradoraNombre: '', planId: '', planNombre: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmacionEnviada, setConfirmacionEnviada] = useState(false)

  useEffect(() => {
    getAseguradoras()
      .then(data => setAseguradoras(data || []))
      .catch(err => console.error('[Registro] Error al cargar aseguradoras:', err))
  }, [])

  useEffect(() => {
    if (!form.aseguradoraId) { setPlanes([]); return }
    getPlanes(form.aseguradoraId)
      .then(data => setPlanes(data || []))
      .catch(err => console.error('[Registro] Error al cargar planes:', err))
  }, [form.aseguradoraId])

  function next() { setError(''); setStep(s => s + 1) }
  function back() { setError(''); setStep(s => s - 1) }

  function validarPaso1() {
    if (!form.nombre.trim()) { setError('Ingresa tu nombre completo'); return false }
    if (!form.email.trim()) { setError('Ingresa tu correo'); return false }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return false }
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return false }
    return true
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      await registrar(form.nombre, form.email, form.password, form.planId || null)
      navigate('/chat')
    } catch (err) {
      const msg = err.message || ''

      if (msg === 'EMAIL_CONFIRMATION_REQUIRED') {
        // Supabase envió un correo de confirmación — mostrar pantalla informativa
        setConfirmacionEnviada(true)
      } else if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already been registered') ||
        msg.toLowerCase().includes('user already registered')
      ) {
        setError('Este correo ya tiene una cuenta. Ve a Iniciar sesión.')
        setStep(1)
      } else {
        setError(msg || 'Error al crear la cuenta')
        setStep(1)
      }
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de confirmación de email (Supabase requiere verificar el correo antes de iniciar sesión)
  if (confirmacionEnviada) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div className="auth-logo">
            <Activity size={34} color="#2563eb" />
            <h1>SaludIA</h1>
          </div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ marginBottom: '0.5rem' }}>¡Revisa tu correo!</h2>
          <p style={{ color: 'var(--text2)', marginBottom: '0.25rem' }}>
            Te enviamos un enlace de confirmación a:
          </p>
          <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: '1.25rem' }}>
            {form.email}
          </p>
          <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Haz clic en el enlace del correo para activar tu cuenta y luego inicia sesión.
            Si no lo ves, revisa tu carpeta de spam.
          </p>
          <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            Ir a Iniciar sesión →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wizard-container">
      <div className="wizard-card">
        {/* Header */}
        <div className="wizard-header">
          <div className="wizard-logo">
            <Activity size={26} color="#2563eb" />
            SaludIA
          </div>
          <div className="wizard-steps">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`wizard-step-dot ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}`} />
            ))}
          </div>
        </div>

        {/* PASO 1: Datos personales */}
        {step === 1 && (
          <>
            <p className="wizard-step-title">¡Bienvenido a SaludIA!</p>
            <p className="wizard-step-sub">Comencemos con tus datos básicos</p>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label><User size={13} style={{marginRight:4}}/>Nombre completo</label>
              <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Juan Pérez" autoFocus />
            </div>
            <div className="form-group">
              <label><Mail size={13} style={{marginRight:4}}/>Correo electrónico</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="juan@correo.com" />
            </div>
            <div className="form-group">
              <label><Lock size={13} style={{marginRight:4}}/>Contraseña</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="form-group">
              <label><Lock size={13} style={{marginRight:4}}/>Confirmar contraseña</label>
              <input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} placeholder="Repite tu contraseña" />
            </div>
            <div className="wizard-actions">
              <button className="btn-primary" onClick={() => validarPaso1() && next()}>
                Continuar <ArrowRight size={16} />
              </button>
            </div>
            <p className="auth-footer" style={{marginTop:'1rem'}}>
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
          </>
        )}

        {/* PASO 2: ¿Tienes seguro? */}
        {step === 2 && (
          <>
            <p className="wizard-step-title">¿Tienes seguro de salud?</p>
            <p className="wizard-step-sub">Esto nos permite calcular exactamente tu copago en cada consulta</p>
            <div className="options-grid" style={{gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
              <div className="option-btn" style={{padding:'1.5rem', alignItems:'center', textAlign:'center'}} onClick={next}>
                <ShieldCheck size={32} color="#2563eb" style={{marginBottom:'0.5rem', alignSelf:'center'}}/>
                <span className="opt-name" style={{textAlign:'center'}}>Sí, tengo seguro</span>
                <span className="opt-desc" style={{textAlign:'center'}}>Quiero indicar mi aseguradora</span>
              </div>
              <div className="option-btn" style={{padding:'1.5rem', alignItems:'center', textAlign:'center'}} onClick={() => setStep(4)}>
                <User size={32} color="#94a3b8" style={{marginBottom:'0.5rem', alignSelf:'center'}}/>
                <span className="opt-name" style={{textAlign:'center', color:'#475569'}}>No tengo seguro</span>
                <span className="opt-desc" style={{textAlign:'center'}}>Usar precio de lista</span>
              </div>
            </div>
            <div className="wizard-actions">
              <button className="btn-back" onClick={back}><ArrowLeft size={15}/> Atrás</button>
            </div>
          </>
        )}

        {/* PASO 3: Elegir aseguradora y plan */}
        {step === 3 && (
          <>
            <p className="wizard-step-title">
              {!form.aseguradoraId ? '¿Con qué aseguradora tienes tu seguro?' : `Elige tu plan de ${form.aseguradoraNombre}`}
            </p>
            <p className="wizard-step-sub">
              {!form.aseguradoraId ? 'Selecciona tu compañía de seguros' : 'Selecciona el plan que tienes contratado'}
            </p>

            {!form.aseguradoraId ? (
              <div className="options-grid">
                {aseguradoras.map(a => (
                  <div key={a.id} className="option-btn" onClick={() => setForm({...form, aseguradoraId: a.id, aseguradoraNombre: a.nombre, planId: '', planNombre: ''})}>
                    <span className="opt-name">{a.nombre}</span>
                    <span className="opt-desc">{a.descripcion?.substring(0, 50)}...</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <button className="skip-link" style={{textAlign:'left', marginBottom:'0.75rem', color:'var(--accent)'}} onClick={() => setForm({...form, aseguradoraId:'', aseguradoraNombre:'', planId:'', planNombre:''})}>
                  ← Cambiar aseguradora
                </button>
                <div className="planes-wizard-grid">
                  {planes.map(p => (
                    <div key={p.id} className={`plan-wizard-card ${form.planId === p.id ? 'selected' : ''}`} onClick={() => setForm({...form, planId: p.id, planNombre: p.nombre})}>
                      <div className="plan-wizard-info">
                        <div className="plan-wizard-nombre">{p.nombre}</div>
                        {p.descripcion && <div className="plan-wizard-desc">{p.descripcion}</div>}
                        {p.deducible_anual > 0 && <div className="plan-wizard-deducible">Deducible anual: ${p.deducible_anual}</div>}
                      </div>
                      <div className="plan-wizard-precio">
                        <div className="precio-monto">${p.prima_mensual}</div>
                        <div className="precio-label">/mes</div>
                      </div>
                      <div className="plan-wizard-check">
                        {form.planId === p.id && <Check size={13}/>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="wizard-actions">
              <button className="btn-back" onClick={() => { setForm({...form, aseguradoraId:'', planId:'', planNombre:''}); back() }}>
                <ArrowLeft size={15}/> Atrás
              </button>
              {form.planId && (
                <button className="btn-primary" onClick={next}>
                  Continuar <ArrowRight size={16}/>
                </button>
              )}
            </div>
            <span className="skip-link" onClick={() => setStep(4)}>Omitir este paso</span>
          </>
        )}

        {/* PASO 4: Confirmación */}
        {step === 4 && (
          <>
            <p className="wizard-step-title">¡Todo listo!</p>
            <p className="wizard-step-sub">Revisa tu información antes de crear la cuenta</p>
            {error && <div className="error-msg">{error}</div>}

            <div style={{background:'var(--bg3)', borderRadius:'var(--radius)', padding:'1.25rem', marginBottom:'1.5rem', border:'1px solid var(--border)'}}>
              <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span style={{fontSize:'0.8rem', color:'var(--text-dim)', fontWeight:600}}>NOMBRE</span>
                  <span style={{fontSize:'0.9rem', color:'var(--text)', fontWeight:500}}>{form.nombre}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span style={{fontSize:'0.8rem', color:'var(--text-dim)', fontWeight:600}}>CORREO</span>
                  <span style={{fontSize:'0.9rem', color:'var(--text)', fontWeight:500}}>{form.email}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span style={{fontSize:'0.8rem', color:'var(--text-dim)', fontWeight:600}}>ASEGURADORA</span>
                  <span style={{fontSize:'0.9rem', color:'var(--text)', fontWeight:500}}>{form.aseguradoraNombre || 'Sin seguro'}</span>
                </div>
                {form.planNombre && (
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span style={{fontSize:'0.8rem', color:'var(--text-dim)', fontWeight:600}}>PLAN</span>
                    <span style={{fontSize:'0.9rem', color:'var(--accent)', fontWeight:700}}>{form.planNombre}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="wizard-actions">
              <button className="btn-back" onClick={back}><ArrowLeft size={15}/> Atrás</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creando cuenta...' : <><Check size={16}/> Crear cuenta</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
