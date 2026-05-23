import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { actualizarPerfil } from '../api/perfil.api'
import { getAseguradoras, getPlanes } from '../api/planes.api'
import { User, ShieldCheck, Save, CheckCircle, RefreshCw } from 'lucide-react'

export default function Perfil() {
  const { user, perfil, loading: authLoading, recargarPerfil } = useAuth()
  const [aseguradoras, setAseguradoras] = useState([])
  const [planes, setPlanes]             = useState([])
  const [aseguradoraId, setAseguradoraId] = useState('')
  const [planId, setPlanId]             = useState('')
  const [nombre, setNombre]             = useState('')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState('')

  // Cargar aseguradoras vía backend
  useEffect(() => {
    getAseguradoras()
      .then(data => setAseguradoras(data || []))
      .catch(err => console.error('[Perfil] Error al cargar aseguradoras:', err))
  }, [])

  // Sincronizar formulario con perfil del contexto
  useEffect(() => {
    if (perfil) {
      setNombre(perfil.nombre_completo || '')
      const aid = perfil.plan_seguro?.aseguradora_id || perfil.plan_seguro?.aseguradora?.id || ''
      setAseguradoraId(aid)
      setPlanId(perfil.plan_seguro?.id || perfil.plan_seguro_id || '')
    }
  }, [perfil])

  // Cargar planes cuando cambia la aseguradora seleccionada
  useEffect(() => {
    if (!aseguradoraId) { setPlanes([]); return }
    getPlanes(aseguradoraId)
      .then(data => setPlanes(data || []))
      .catch(err => console.error('[Perfil] Error al cargar planes:', err))
  }, [aseguradoraId])

  async function guardar() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await actualizarPerfil({
        nombre_completo: nombre,
        plan_seguro_id: planId || null,
      })
      await recargarPerfil()   // actualiza el perfil en el contexto global
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('[Perfil] Error al guardar:', err)
      setError(err.message || 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return <div className="page-loading">Cargando...</div>

  // Perfil vacío pero usuario logueado → el backend tardó en responder
  if (!perfil && user) return (
    <div className="page-loading" style={{ flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: 'var(--text2)' }}>El servidor tardó en cargar tu perfil.</p>
      <button className="btn-primary" style={{ width: 'auto' }} onClick={recargarPerfil}>
        <RefreshCw size={15}/> Recargar perfil
      </button>
    </div>
  )

  const planActual        = perfil?.plan_seguro
  const aseguradoraActual = planActual?.aseguradora

  return (
    <div className="perfil-container">
      <h2><User size={22} /> Mi perfil</h2>

      <div className="perfil-grid">
        {/* Datos personales */}
        <div className="perfil-card">
          <h3>Datos personales</h3>
          <div className="form-group">
            <label>Nombre completo</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
        </div>

        {/* Plan actual */}
        <div className="perfil-card">
          <h3><ShieldCheck size={18} /> Plan de seguro actual</h3>
          {planActual ? (
            <div className="plan-actual-info">
              <div className="plan-actual-aseg">{aseguradoraActual?.nombre}</div>
              <div className="plan-actual-nombre">{planActual.nombre}</div>
              <div className="plan-actual-detalle">
                ${planActual.prima_mensual}/mes · Deducible: ${planActual.deducible_anual}/año
              </div>
              {planActual.coberturas?.slice(0, 4).map(c => (
                <div key={c.especialidad} className="cobertura-pill">
                  {c.especialidad}: <strong>{c.porcentaje_cobertura}%</strong>
                </div>
              ))}
              {(planActual.coberturas?.length || 0) > 4 && (
                <span className="cobertura-pill-more">+{planActual.coberturas.length - 4} más</span>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No tienes un plan registrado.</p>
          )}
        </div>

        {/* Cambiar plan */}
        <div className="perfil-card perfil-card-full">
          <h3>Cambiar plan de seguro</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Aseguradora</label>
              <select value={aseguradoraId} onChange={e => { setAseguradoraId(e.target.value); setPlanId('') }}>
                <option value="">Sin seguro</option>
                {aseguradoras.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            {planes.length > 0 && (
              <div className="form-group">
                <label>Plan</label>
                <select value={planId} onChange={e => setPlanId(e.target.value)}>
                  <option value="">Selecciona un plan</option>
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — ${p.prima_mensual}/mes</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="error-msg" style={{ maxWidth: 700 }}>{error}</div>}
      {saved && (
        <div className="success-msg" style={{ maxWidth: 700 }}>
          <CheckCircle size={15} /> Perfil actualizado correctamente
        </div>
      )}

      <button
        className="btn-primary"
        style={{ width: 'auto', padding: '0.75rem 2rem', marginTop: '0.5rem' }}
        onClick={guardar}
        disabled={saving}
      >
        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
