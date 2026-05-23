import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { actualizarPerfil } from '../api/perfil.api'
import { getAseguradoras, getPlanes } from '../api/planes.api'
import {
  User, ShieldCheck, Save, CheckCircle, RefreshCw,
  ChevronRight, ChevronDown, Star, AlertCircle, Building2,
} from 'lucide-react'

export default function Perfil() {
  const { user, perfil, loading: authLoading, recargarPerfil } = useAuth()

  const [aseguradoras, setAseguradoras]   = useState([])
  const [planes, setPlanes]               = useState([])
  const [aseguradoraId, setAseguradoraId] = useState('')
  const [planId, setPlanId]               = useState('')
  const [nombre, setNombre]               = useState('')
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState('')
  const [expandirCambio, setExpandirCambio] = useState(false)

  // Cargar aseguradoras
  useEffect(() => {
    getAseguradoras()
      .then(data => setAseguradoras(data || []))
      .catch(err => console.error('[Perfil] Error aseguradoras:', err))
  }, [])

  // Sincronizar con perfil del contexto
  useEffect(() => {
    if (!perfil) return
    // Nombre: usar el del perfil, o derivar del email si está vacío
    const nombreGuardado = perfil.nombre_completo?.trim()
    const fallbackNombre = user?.email?.split('@')[0] || ''
    setNombre(nombreGuardado || fallbackNombre)

    // Pre-seleccionar aseguradora y plan actuales
    const aid = perfil.plan_seguro?.aseguradora_id || ''
    const pid = perfil.plan_seguro?.id || ''
    setAseguradoraId(aid)
    setPlanId(pid)
  }, [perfil, user])

  // Cargar planes cuando cambia la aseguradora seleccionada
  useEffect(() => {
    if (!aseguradoraId) { setPlanes([]); return }
    getPlanes(aseguradoraId)
      .then(data => setPlanes(data || []))
      .catch(err => console.error('[Perfil] Error planes:', err))
  }, [aseguradoraId])

  async function guardar() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await actualizarPerfil({
        plan_seguro_id: planId || null,
      })
      await recargarPerfil()
      setSaved(true)
      setExpandirCambio(false)
      setTimeout(() => setSaved(false), 3500)
    } catch (err) {
      console.error('[Perfil] Error al guardar:', err)
      setError(err.message || 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return <div className="page-loading">Cargando...</div>

  if (!perfil && user) return (
    <div className="page-loading" style={{ flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: 'var(--text2)' }}>El servidor tardó en cargar tu perfil.</p>
      <button className="btn-primary" style={{ width: 'auto' }} onClick={recargarPerfil}>
        <RefreshCw size={15} /> Recargar perfil
      </button>
    </div>
  )

  const planActual = perfil?.plan_seguro

  return (
    <div className="perfil-container">
      <h2><User size={20} /> Mi perfil</h2>

      <div className="perfil-grid">

        {/* ── Datos personales ── */}
        <div className="perfil-card">
          <h3><User size={16} /> Datos personales</h3>
          <div className="form-group">
            <label>Nombre completo</label>
            <input
              value={nombre}
              disabled
              style={{ opacity: 0.65, cursor: 'not-allowed' }}
            />
          </div>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.55, cursor: 'not-allowed' }}
            />
          </div>
        </div>

        {/* ── Plan activo ── */}
        <div className="perfil-card">
          <h3><ShieldCheck size={16} /> Plan de seguro activo</h3>
          {planActual ? (
            <div className="plan-actual-info">
              {/* Aseguradora — campo plano del DTO */}
              {planActual.aseguradora_nombre && (
                <div className="plan-actual-aseg">{planActual.aseguradora_nombre}</div>
              )}
              <div className="plan-actual-nombre">{planActual.nombre}</div>
              <div className="plan-actual-detalle">
                ${planActual.prima_mensual ?? '—'}/mes
                {planActual.deducible_anual != null && ` · Deducible: $${planActual.deducible_anual}/año`}
              </div>

              {/* Coberturas destacadas */}
              <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {planActual.coberturas?.slice(0, 4).map(c => (
                  <div key={c.especialidad} className="cobertura-pill">
                    {c.especialidad}: <strong style={{ marginLeft: 3 }}>{c.porcentaje_cobertura}%</strong>
                  </div>
                ))}
                {(planActual.coberturas?.length || 0) > 4 && (
                  <span className="cobertura-pill-more">
                    +{planActual.coberturas.length - 4} más
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="perfil-sin-plan">
              <AlertCircle size={32} color="var(--text-dim)" />
              <p>No tienes un plan registrado.</p>
              <button
                className="btn-secondary"
                style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                onClick={() => setExpandirCambio(true)}
              >
                Agregar plan
              </button>
            </div>
          )}
        </div>

        {/* ── Cambiar / Asignar plan ── */}
        <div className="perfil-card perfil-card-full">
          <button
            className="perfil-cambio-toggle"
            onClick={() => setExpandirCambio(v => !v)}
          >
            <span>
              <Building2 size={16} />
              {planActual ? 'Cambiar plan de seguro' : 'Asignar plan de seguro'}
            </span>
            {expandirCambio ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {expandirCambio && (
            <div className="perfil-cambio-body">

              {/* Paso 1: seleccionar aseguradora */}
              <div className="perfil-cambio-step">
                <p className="perfil-cambio-label">
                  <span className="paso-num">1</span>
                  Selecciona tu aseguradora
                </p>
                <div className="aseg-cards-grid">
                  {/* Opción "Sin seguro" */}
                  <button
                    className={`aseg-card ${!aseguradoraId ? 'aseg-card-selected' : ''}`}
                    onClick={() => { setAseguradoraId(''); setPlanId('') }}
                  >
                    <div className="aseg-card-icon aseg-card-icon-none">
                      <AlertCircle size={20} color="var(--text-dim)" />
                    </div>
                    <span className="aseg-card-name">Sin seguro</span>
                    {!aseguradoraId && <div className="aseg-card-check"><CheckCircle size={14} /></div>}
                  </button>

                  {aseguradoras.map(a => (
                    <button
                      key={a.id}
                      className={`aseg-card ${aseguradoraId === a.id ? 'aseg-card-selected' : ''}`}
                      onClick={() => { setAseguradoraId(a.id); setPlanId('') }}
                    >
                      <div className="aseg-card-icon">
                        <ShieldCheck size={20} color={aseguradoraId === a.id ? '#fff' : 'var(--accent)'} />
                      </div>
                      <span className="aseg-card-name">{a.nombre}</span>
                      {aseguradoraId === a.id && (
                        <div className="aseg-card-check"><CheckCircle size={14} /></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 2: seleccionar plan */}
              {aseguradoraId && (
                <div className="perfil-cambio-step">
                  <p className="perfil-cambio-label">
                    <span className="paso-num">2</span>
                    Elige tu plan
                  </p>
                  {planes.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      Cargando planes...
                    </p>
                  ) : (
                    <div className="planes-cards-grid">
                      {planes.map(p => {
                        const esActual = planActual?.id === p.id
                        const seleccionado = planId === p.id
                        return (
                          <button
                            key={p.id}
                            className={`plan-card ${seleccionado ? 'plan-card-selected' : ''} ${esActual ? 'plan-card-actual' : ''}`}
                            onClick={() => setPlanId(p.id)}
                          >
                            {esActual && (
                              <div className="plan-card-badge-actual">
                                <Star size={10} /> Plan actual
                              </div>
                            )}
                            <div className="plan-card-header">
                              <span className="plan-card-nombre">{p.nombre}</span>
                              {seleccionado && !esActual && (
                                <CheckCircle size={16} color="var(--accent)" />
                              )}
                            </div>
                            <div className="plan-card-precio">
                              ${p.prima_mensual ?? '—'}<span>/mes</span>
                            </div>
                            {p.deducible_anual != null && (
                              <div className="plan-card-detalle">
                                Deducible: ${p.deducible_anual}/año
                              </div>
                            )}
                            {p.descripcion && (
                              <div className="plan-card-desc">{p.descripcion}</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="error-msg" style={{ maxWidth: 720 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {saved && (
        <div className="success-msg" style={{ maxWidth: 720 }}>
          <CheckCircle size={15} /> Perfil actualizado correctamente
        </div>
      )}

      <button
        className="btn-primary"
        style={{ width: 'auto', padding: '0.78rem 2rem', marginTop: '0.25rem' }}
        onClick={guardar}
        disabled={saving}
      >
        <Save size={15} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
