import { useState, useEffect } from 'react'
import {
  adminAseguradoras, adminPlanes,
  adminCoberturas, adminHospitales,
} from '../api/admin.api'
import { ESPECIALIDADES } from '../constants/especialidades'
import {
  Plus, Pencil, Trash2, Save, X, Building2,
  ShieldCheck, BarChart2, ChevronDown, ChevronUp, Landmark,
} from 'lucide-react'

export default function Admin() {
  const [tab, setTab] = useState('aseguradoras')

  return (
    <div className="admin-container">
      <h2>Panel de Administración</h2>
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'aseguradoras' ? 'active' : ''}`} onClick={() => setTab('aseguradoras')}>
          <Landmark size={16}/> Aseguradoras
        </button>
        <button className={`admin-tab ${tab === 'planes' ? 'active' : ''}`} onClick={() => setTab('planes')}>
          <ShieldCheck size={16}/> Planes
        </button>
        <button className={`admin-tab ${tab === 'coberturas' ? 'active' : ''}`} onClick={() => setTab('coberturas')}>
          <BarChart2 size={16}/> Coberturas
        </button>
        <button className={`admin-tab ${tab === 'hospitales' ? 'active' : ''}`} onClick={() => setTab('hospitales')}>
          <Building2 size={16}/> Hospitales
        </button>
      </div>
      {tab === 'aseguradoras' && <GestionAseguradoras />}
      {tab === 'planes'       && <GestionPlanes />}
      {tab === 'coberturas'   && <GestionCoberturas />}
      {tab === 'hospitales'   && <GestionHospitales />}
    </div>
  )
}

/* ─────────────────────────────────────────
   ASEGURADORAS
───────────────────────────────────────── */
function GestionAseguradoras() {
  const [aseguradoras, setAseguradoras] = useState([])
  const [loading, setLoading]           = useState(true)
  const [editando, setEditando]         = useState(null)
  const [nuevo, setNuevo]               = useState(false)
  const [form, setForm]                 = useState({ nombre: '', descripcion: '', activa: true })
  const [error, setError]               = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)   // id a confirmar

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const data = await adminAseguradoras.listar()
      setAseguradoras(data || [])
    } catch (err) {
      console.error('[Admin] Error al cargar aseguradoras:', err)
      setError('Error al cargar aseguradoras')
    } finally {
      setLoading(false)
    }
  }

  async function guardar() {
    setError('')
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    try {
      if (editando) {
        await adminAseguradoras.actualizar(editando, form)
      } else {
        await adminAseguradoras.crear(form)
      }
      cancelar()
      cargar()
    } catch (err) {
      console.error('[Admin] Error al guardar aseguradora:', err)
      setError(err.message || 'Error al guardar')
    }
  }

  async function eliminar(id) {
    try {
      await adminAseguradoras.eliminar(id)
      setConfirmDelete(null)
      cargar()
    } catch (err) {
      console.error('[Admin] Error al eliminar aseguradora:', err)
      setError(err.message || 'Error al eliminar')
    }
  }

  function editar(a) {
    setForm({ nombre: a.nombre, descripcion: a.descripcion || '', activa: a.activa ?? true })
    setEditando(a.id)
    setNuevo(true)
  }

  function cancelar() {
    setEditando(null)
    setNuevo(false)
    setForm({ nombre: '', descripcion: '', activa: true })
    setError('')
  }

  if (loading) return <div className="page-loading">Cargando...</div>

  return (
    <div className="admin-section">
      <div className="admin-header">
        <span>{aseguradoras.length} aseguradoras registradas</span>
        {!nuevo && (
          <button className="btn-admin-add" onClick={() => setNuevo(true)}>
            <Plus size={16}/> Agregar aseguradora
          </button>
        )}
      </div>

      {nuevo && (
        <div className="admin-form">
          <h4>{editando ? 'Editar aseguradora' : 'Nueva aseguradora'}</h4>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Saludsa, BMI..."
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción breve..."
              />
            </div>
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', display: 'flex' }}>
            <input
              type="checkbox" id="activa" checked={form.activa}
              onChange={e => setForm({ ...form, activa: e.target.checked })}
              style={{ width: 'auto' }}
            />
            <label htmlFor="activa" style={{ marginBottom: 0 }}>Aseguradora activa (visible en registro)</label>
          </div>
          <div className="form-actions">
            <button className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }} onClick={guardar}>
              <Save size={15}/> Guardar
            </button>
            <button className="btn-secondary" style={{ marginTop: 0 }} onClick={cancelar}>
              <X size={15}/> Cancelar
            </button>
          </div>
        </div>
      )}

      {error && !nuevo && <div className="error-msg">{error}</div>}

      <table className="admin-table">
        <thead><tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {aseguradoras.map(a => (
            <tr key={a.id}>
              <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{a.nombre}</td>
              <td style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{a.descripcion || '—'}</td>
              <td>
                <span className="tag" style={{
                  color: a.activa ? 'var(--success)' : 'var(--text-dim)',
                  borderColor: a.activa ? 'var(--success)' : 'var(--border)',
                }}>
                  {a.activa ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td>
                <button className="btn-icon" onClick={() => editar(a)}><Pencil size={14}/></button>
                {confirmDelete === a.id ? (
                  <>
                    <button className="btn-icon danger" onClick={() => eliminar(a.id)}>Confirmar</button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                  </>
                ) : (
                  <button className="btn-icon danger" onClick={() => setConfirmDelete(a.id)}>
                    <Trash2 size={14}/>
                  </button>
                )}
              </td>
            </tr>
          ))}
          {aseguradoras.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                No hay aseguradoras registradas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────
   PLANES
───────────────────────────────────────── */
function GestionPlanes() {
  const [planes, setPlanes]             = useState([])
  const [aseguradoras, setAseguradoras] = useState([])
  const [loading, setLoading]           = useState(true)
  const [editando, setEditando]         = useState(null)
  const [nuevo, setNuevo]               = useState(false)
  const [form, setForm] = useState({
    nombre: '', aseguradora_id: '', prima_mensual: '',
    deducible_anual: '', descripcion: '', activo: true,
  })
  const [error, setError]               = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const [p, a] = await Promise.all([
        adminPlanes.listar(),
        adminAseguradoras.listar(),
      ])
      setPlanes(p || [])
      setAseguradoras(a || [])
    } catch (err) {
      console.error('[Admin] Error al cargar planes:', err)
      setError('Error al cargar planes')
    } finally {
      setLoading(false)
    }
  }

  async function guardar() {
    setError('')
    if (!form.nombre.trim())  { setError('El nombre es requerido'); return }
    if (!form.aseguradora_id) { setError('Selecciona una aseguradora'); return }
    if (!form.prima_mensual)  { setError('La prima mensual es requerida'); return }

    const payload = {
      nombre:          form.nombre,
      aseguradora_id:  form.aseguradora_id,
      prima_mensual:   Number(form.prima_mensual),
      deducible_anual: Number(form.deducible_anual) || 0,
      descripcion:     form.descripcion,
      activo:          form.activo,
    }
    try {
      if (editando) {
        await adminPlanes.actualizar(editando, payload)
      } else {
        await adminPlanes.crear(payload)
      }
      cancelar()
      cargar()
    } catch (err) {
      console.error('[Admin] Error al guardar plan:', err)
      setError(err.message || 'Error al guardar')
    }
  }

  async function eliminar(id) {
    try {
      await adminPlanes.eliminar(id)
      setConfirmDelete(null)
      cargar()
    } catch (err) {
      console.error('[Admin] Error al eliminar plan:', err)
      setError(err.message || 'Error al eliminar')
    }
  }

  function editar(p) {
    setForm({
      nombre:          p.nombre,
      aseguradora_id:  p.aseguradora_id || '',
      prima_mensual:   p.prima_mensual || '',
      deducible_anual: p.deducible_anual || '',
      descripcion:     p.descripcion || '',
      activo:          p.activo ?? true,
    })
    setEditando(p.id)
    setNuevo(true)
  }

  function cancelar() {
    setEditando(null)
    setNuevo(false)
    setForm({ nombre: '', aseguradora_id: '', prima_mensual: '', deducible_anual: '', descripcion: '', activo: true })
    setError('')
  }

  if (loading) return <div className="page-loading">Cargando...</div>

  return (
    <div className="admin-section">
      <div className="admin-header">
        <span>{planes.length} planes registrados</span>
        {!nuevo && (
          <button className="btn-admin-add" onClick={() => setNuevo(true)}>
            <Plus size={16}/> Agregar plan
          </button>
        )}
      </div>

      {nuevo && (
        <div className="admin-form">
          <h4>{editando ? 'Editar plan' : 'Nuevo plan'}</h4>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Aseguradora *</label>
              <select value={form.aseguradora_id} onChange={e => setForm({ ...form, aseguradora_id: e.target.value })}>
                <option value="">Selecciona aseguradora...</option>
                {aseguradoras.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nombre del plan *</label>
              <input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Plan Básico, Premium..."
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Prima mensual ($) *</label>
              <input
                type="number" min="0" value={form.prima_mensual}
                onChange={e => setForm({ ...form, prima_mensual: e.target.value })}
                placeholder="120"
              />
            </div>
            <div className="form-group">
              <label>Deducible anual ($)</label>
              <input
                type="number" min="0" value={form.deducible_anual}
                onChange={e => setForm({ ...form, deducible_anual: e.target.value })}
                placeholder="500"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción del plan..."
            />
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', display: 'flex' }}>
            <input
              type="checkbox" id="activo" checked={form.activo}
              onChange={e => setForm({ ...form, activo: e.target.checked })}
              style={{ width: 'auto' }}
            />
            <label htmlFor="activo" style={{ marginBottom: 0 }}>Plan activo (visible para usuarios)</label>
          </div>
          <div className="form-actions">
            <button className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }} onClick={guardar}>
              <Save size={15}/> Guardar
            </button>
            <button className="btn-secondary" style={{ marginTop: 0 }} onClick={cancelar}>
              <X size={15}/> Cancelar
            </button>
          </div>
        </div>
      )}

      {error && !nuevo && <div className="error-msg">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr><th>Aseguradora</th><th>Plan</th><th>Prima/mes</th><th>Deducible</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {planes.map(p => (
            <tr key={p.id}>
              <td style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{p.aseguradora?.nombre || p.aseguradora_nombre || '—'}</td>
              <td style={{ fontWeight: 600 }}>{p.nombre}</td>
              <td>${p.prima_mensual}/mes</td>
              <td>${p.deducible_anual || 0}/año</td>
              <td>
                <span className="tag" style={{
                  color: p.activo ? 'var(--success)' : 'var(--text-dim)',
                  borderColor: p.activo ? 'var(--success)' : 'var(--border)',
                }}>
                  {p.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>
                <button className="btn-icon" onClick={() => editar(p)}><Pencil size={14}/></button>
                {confirmDelete === p.id ? (
                  <>
                    <button className="btn-icon danger" onClick={() => eliminar(p.id)}>Confirmar</button>
                    <button className="btn-icon" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                  </>
                ) : (
                  <button className="btn-icon danger" onClick={() => setConfirmDelete(p.id)}>
                    <Trash2 size={14}/>
                  </button>
                )}
              </td>
            </tr>
          ))}
          {planes.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                No hay planes registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────
   COBERTURAS
───────────────────────────────────────── */
function GestionCoberturas() {
  const [planes, setPlanes]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [expandido, setExpandido]   = useState(null)
  const [coberturas, setCoberturas] = useState({})
  const [editando, setEditando]     = useState(null)
  const [formCob, setFormCob]       = useState({
    especialidad: ESPECIALIDADES[0], porcentaje_cobertura: 80, copago_fijo: 0,
  })
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const data = await adminPlanes.listar()
      setPlanes((data || []).filter(p => p.activo !== false))
    } catch (err) {
      console.error('[Admin] Error al cargar planes para coberturas:', err)
      setError('Error al cargar planes')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCoberturas(planId) {
    try {
      const data = await adminCoberturas.listar(planId)
      setCoberturas(prev => ({ ...prev, [planId]: data || [] }))
    } catch (err) {
      console.error('[Admin] Error al cargar coberturas:', err)
    }
  }

  async function togglePlan(planId) {
    if (expandido === planId) { setExpandido(null); cancelarEdicion(); return }
    setExpandido(planId)
    cancelarEdicion()
    if (!coberturas[planId]) await fetchCoberturas(planId)
  }

  function cancelarEdicion() {
    setEditando(null)
    setFormCob({ especialidad: ESPECIALIDADES[0], porcentaje_cobertura: 80, copago_fijo: 0 })
    setError('')
  }

  async function guardarCobertura(planId) {
    setSaving(true)
    setError('')
    const pct = Number(formCob.porcentaje_cobertura)
    if (!pct && pct !== 0 || pct < 0 || pct > 100) {
      setError('La cobertura debe ser entre 0 y 100')
      setSaving(false)
      return
    }
    try {
      const payload = {
        porcentaje_cobertura: pct,
        copago_fijo: Number(formCob.copago_fijo),
        cubierta: true,
      }
      if (editando) {
        await adminCoberturas.actualizar(editando, payload)
      } else {
        await adminCoberturas.crear({ ...payload, plan_id: planId, especialidad: formCob.especialidad })
      }
      await fetchCoberturas(planId)
      cancelarEdicion()
    } catch (err) {
      console.error('[Admin] Error al guardar cobertura:', err)
      setError(err.message || 'Error al guardar cobertura')
    } finally {
      setSaving(false)
    }
  }

  async function eliminarCobertura(planId, cobId) {
    try {
      await adminCoberturas.eliminar(cobId)
      setConfirmDelete(null)
      await fetchCoberturas(planId)
    } catch (err) {
      console.error('[Admin] Error al eliminar cobertura:', err)
      setError(err.message || 'Error al eliminar cobertura')
    }
  }

  function iniciarEdicion(cob) {
    setEditando(cob.id)
    setFormCob({
      especialidad:        cob.especialidad,
      porcentaje_cobertura: cob.porcentaje_cobertura,
      copago_fijo:         cob.copago_fijo || 0,
    })
    setError('')
  }

  if (loading) return <div className="page-loading">Cargando planes...</div>

  return (
    <div className="admin-section">
      <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Gestiona el porcentaje de cobertura por especialidad para cada plan.
      </p>
      {planes.length === 0 && (
        <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>
          No hay planes activos. Crea uno en la pestaña <strong>Planes</strong> primero.
        </div>
      )}
      {planes.map(plan => (
        <div key={plan.id} className="cob-plan-block">
          <button className="cob-plan-header" onClick={() => togglePlan(plan.id)}>
            <div>
              <span className="cob-plan-nombre">{plan.nombre}</span>
              <span className="cob-plan-aseg">{plan.aseguradora?.nombre || plan.aseguradora_nombre}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="tag">${plan.prima_mensual}/mes</span>
              {expandido === plan.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
            </div>
          </button>

          {expandido === plan.id && (
            <div className="cob-plan-body">
              {error && <div className="error-msg">{error}</div>}
              <div className="cob-form">
                <h5>{editando ? `Editando: ${formCob.especialidad}` : 'Nueva cobertura'}</h5>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Especialidad{' '}
                      {editando && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(no editable)</span>}
                    </label>
                    {editando ? (
                      <input value={formCob.especialidad} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}/>
                    ) : (
                      <select
                        value={formCob.especialidad}
                        onChange={e => setFormCob({ ...formCob, especialidad: e.target.value })}
                      >
                        {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="form-group" style={{ maxWidth: 140 }}>
                    <label>Cobertura (%)</label>
                    <input
                      type="number" min="0" max="100"
                      value={formCob.porcentaje_cobertura}
                      onChange={e => setFormCob({ ...formCob, porcentaje_cobertura: e.target.value })}
                      autoFocus={!!editando}
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: 140 }}>
                    <label>Copago fijo ($)</label>
                    <input
                      type="number" min="0"
                      value={formCob.copago_fijo}
                      onChange={e => setFormCob({ ...formCob, copago_fijo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    className="btn-primary"
                    style={{ width: 'auto', padding: '0.45rem 1.1rem' }}
                    onClick={() => guardarCobertura(plan.id)}
                    disabled={saving}
                  >
                    <Save size={14}/> {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
                  </button>
                  {editando && (
                    <button className="btn-secondary" style={{ marginTop: 0 }} onClick={cancelarEdicion}>
                      <X size={14}/> Cancelar edición
                    </button>
                  )}
                </div>
              </div>

              {coberturas[plan.id] === undefined ? (
                <div className="page-loading" style={{ padding: '1rem' }}>Cargando...</div>
              ) : coberturas[plan.id]?.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '0.75rem 0' }}>
                  Sin coberturas registradas aún.
                </p>
              ) : (
                <table className="admin-table" style={{ marginTop: '0.75rem' }}>
                  <thead>
                    <tr><th>Especialidad</th><th>Cobertura</th><th>Copago fijo</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {coberturas[plan.id]?.map(c => (
                      <tr key={c.id}>
                        <td>{c.especialidad}</td>
                        <td>
                          <div className="cobertura-bar-wrap">
                            <div className="cobertura-bar" style={{ width: `${c.porcentaje_cobertura}%` }}/>
                            <span style={{ fontWeight: 700 }}>{c.porcentaje_cobertura}%</span>
                          </div>
                        </td>
                        <td>${c.copago_fijo || 0}</td>
                        <td>
                          <button className="btn-icon" onClick={() => iniciarEdicion(c)}>
                            <Pencil size={14}/>
                          </button>
                          {confirmDelete === c.id ? (
                            <>
                              <button className="btn-icon danger" onClick={() => eliminarCobertura(plan.id, c.id)}>
                                Confirmar
                              </button>
                              <button className="btn-icon" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                            </>
                          ) : (
                            <button className="btn-icon danger" onClick={() => setConfirmDelete(c.id)}>
                              <Trash2 size={14}/>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   HOSPITALES
───────────────────────────────────────── */
function GestionHospitales() {
  const [hospitales, setHospitales] = useState([])
  const [loading, setLoading]       = useState(true)
  const [editando, setEditando]     = useState(null)
  const [nuevo, setNuevo]           = useState(false)
  const [form, setForm]             = useState({ nombre: '', direccion: '', ciudad: '', nivel: 'intermedio' })
  const [error, setError]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const data = await adminHospitales.listar()
      setHospitales(data || [])
    } catch (err) {
      console.error('[Admin] Error al cargar hospitales:', err)
      setError('Error al cargar hospitales')
    } finally {
      setLoading(false)
    }
  }

  async function guardar() {
    setError('')
    if (!form.nombre || !form.ciudad) { setError('Nombre y ciudad son requeridos'); return }
    try {
      if (editando) {
        await adminHospitales.actualizar(editando, form)
      } else {
        await adminHospitales.crear(form)
      }
      cancelar()
      cargar()
    } catch (err) {
      console.error('[Admin] Error al guardar hospital:', err)
      setError(err.message || 'Error al guardar')
    }
  }

  async function eliminar(id) {
    try {
      await adminHospitales.eliminar(id)
      setConfirmDelete(null)
      cargar()
    } catch (err) {
      console.error('[Admin] Error al eliminar hospital:', err)
      setError(err.message || 'Error al eliminar')
    }
  }

  function editar(h) {
    setForm({ nombre: h.nombre, direccion: h.direccion || '', ciudad: h.ciudad || '', nivel: h.nivel || 'intermedio' })
    setEditando(h.id)
    setNuevo(true)
  }

  function cancelar() {
    setEditando(null)
    setNuevo(false)
    setForm({ nombre: '', direccion: '', ciudad: '', nivel: 'intermedio' })
    setError('')
  }

  if (loading) return <div className="page-loading">Cargando...</div>

  const quito     = hospitales.filter(h => h.ciudad === 'Quito')
  const guayaquil = hospitales.filter(h => h.ciudad === 'Guayaquil')
  const otros     = hospitales.filter(h => h.ciudad !== 'Quito' && h.ciudad !== 'Guayaquil')

  return (
    <div className="admin-section">
      <div className="admin-header">
        <span>{hospitales.length} hospitales registrados</span>
        {!nuevo && (
          <button className="btn-admin-add" onClick={() => setNuevo(true)}>
            <Plus size={16}/> Agregar hospital
          </button>
        )}
      </div>

      {nuevo && (
        <div className="admin-form">
          <h4>{editando ? 'Editar hospital' : 'Nuevo hospital'}</h4>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Hospital..."
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Ciudad</label>
              <select value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })}>
                <option value="">Selecciona ciudad...</option>
                <option value="Quito">Quito</option>
                <option value="Guayaquil">Guayaquil</option>
                <option value="Cuenca">Cuenca</option>
                <option value="Ambato">Ambato</option>
                <option value="Manta">Manta</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Dirección</label>
              <input
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
                placeholder="Av. ..."
              />
            </div>
            <div className="form-group">
              <label>Nivel</label>
              <select value={form.nivel} onChange={e => setForm({ ...form, nivel: e.target.value })}>
                <option value="basico">Básico</option>
                <option value="intermedio">Intermedio</option>
                <option value="especializado">Especializado</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1.2rem' }} onClick={guardar}>
              <Save size={15}/> Guardar
            </button>
            <button className="btn-secondary" style={{ marginTop: 0 }} onClick={cancelar}>
              <X size={15}/> Cancelar
            </button>
          </div>
        </div>
      )}

      {error && !nuevo && <div className="error-msg">{error}</div>}

      {[['Quito', quito], ['Guayaquil', guayaquil], ['Otros', otros]].map(([ciudad, lista]) =>
        lista.length > 0 && (
          <div key={ciudad} style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', padding: '0 0.25rem',
            }}>
              {ciudad} — {lista.length} hospitales
            </div>
            <table className="admin-table">
              <thead><tr><th>Nombre</th><th>Nivel</th><th>Dirección</th><th>Acciones</th></tr></thead>
              <tbody>
                {lista.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600 }}>{h.nombre}</td>
                    <td><span className="tag">{h.nivel || '—'}</span></td>
                    <td style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{h.direccion || '—'}</td>
                    <td>
                      <button className="btn-icon" onClick={() => editar(h)}><Pencil size={14}/></button>
                      {confirmDelete === h.id ? (
                        <>
                          <button className="btn-icon danger" onClick={() => eliminar(h.id)}>Confirmar</button>
                          <button className="btn-icon" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                        </>
                      ) : (
                        <button className="btn-icon danger" onClick={() => setConfirmDelete(h.id)}>
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
