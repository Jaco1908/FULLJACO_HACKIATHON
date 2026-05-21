import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Clock, AlertTriangle, CheckCircle, Stethoscope, TrendingDown, Activity, DollarSign, BarChart2, ChevronDown, ChevronUp, MapPin, Building2, ShieldCheck } from 'lucide-react'

const urgenciaConfig = {
  emergencia: { color: '#ef4444', icon: <AlertTriangle size={14}/>, label: 'Emergencia' },
  urgente:    { color: '#f59e0b', icon: <Clock size={14}/>,         label: 'Urgente' },
  normal:     { color: '#10b981', icon: <CheckCircle size={14}/>,   label: 'Normal' }
}

export default function Historial() {
  const { user } = useAuth()
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('consultas').select('*').eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setConsultas(data || []); setLoading(false) })
  }, [user])

  if (loading) return <div className="page-loading">Cargando historial...</div>

  const totalCopago = consultas.reduce((s, c) => s + (Number(c.copago_estimado) || 0), 0)
  const especialidades = consultas.reduce((acc, c) => {
    if (c.especialidad_sugerida) acc[c.especialidad_sugerida] = (acc[c.especialidad_sugerida] || 0) + 1
    return acc
  }, {})
  const topEspecialidad = Object.entries(especialidades).sort((a, b) => b[1] - a[1])[0]
  const ahorroEstimado = consultas.reduce((s, c) => {
    const precio = c.resumen?.precio_consulta || 0
    const copago = Number(c.copago_estimado) || 0
    return s + (precio - copago)
  }, 0)

  return (
    <div className="historial-container">
      <h2><Clock size={22} /> Historial de consultas</h2>

      {consultas.length > 0 && (
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="dashboard-icon" style={{background:'#eff6ff'}}><DollarSign size={22} color="#2563eb"/></div>
            <div className="dashboard-info">
              <span className="dashboard-label">Total en copagos</span>
              <span className="dashboard-value">${totalCopago.toFixed(2)}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon" style={{background:'#f0fdf4'}}><TrendingDown size={22} color="#10b981"/></div>
            <div className="dashboard-info">
              <span className="dashboard-label">Ahorro estimado</span>
              <span className="dashboard-value" style={{color:'#10b981'}}>${ahorroEstimado.toFixed(2)}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon" style={{background:'#fefce8'}}><BarChart2 size={22} color="#f59e0b"/></div>
            <div className="dashboard-info">
              <span className="dashboard-label">Especialidad frecuente</span>
              <span className="dashboard-value" style={{fontSize:'0.95rem'}}>{topEspecialidad?.[0] || '—'}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon" style={{background:'#fef2f2'}}><Activity size={22} color="#ef4444"/></div>
            <div className="dashboard-info">
              <span className="dashboard-label">Total consultas</span>
              <span className="dashboard-value">{consultas.length}</span>
            </div>
          </div>
        </div>
      )}

      {consultas.length === 0 ? (
        <div className="empty-state">
          <Stethoscope size={48} color="#cbd5e1" />
          <p>Aún no tienes consultas registradas.</p>
        </div>
      ) : (
        <div className="consultas-list">
          {consultas.map(c => {
            const cfg = urgenciaConfig[c.nivel_urgencia] || urgenciaConfig.normal
            const abierto = expandido === c.id
            const res = c.resumen
            return (
              <div key={c.id} className={`consulta-card ${abierto ? 'consulta-card-open' : ''}`}>
                <div className="consulta-header" onClick={() => setExpandido(abierto ? null : c.id)} style={{cursor:'pointer'}}>
                  <span className="urgencia-badge" style={{ color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <span className="fecha">
                    {new Date(c.created_at).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </span>
                  <button className="btn-expand">{abierto ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
                </div>

                <p className="sintomas-text">"{c.sintomas}"</p>

                <div className="consulta-footer">
                  {c.especialidad_sugerida && <span className="tag">{c.especialidad_sugerida}</span>}
                  {c.copago_estimado != null && <span className="tag copago-tag">Copago: ${Number(c.copago_estimado).toFixed(2)}</span>}
                  {res?.precio_consulta && <span className="tag">Lista: ${res.precio_consulta}</span>}
                </div>

                {abierto && res && (
                  <div className="consulta-detalle">
                    <div className="detalle-grid">
                      {res.aseguradora && (
                        <div className="detalle-item">
                          <ShieldCheck size={14} color="var(--accent)"/>
                          <div><span className="detalle-label">Aseguradora</span><span className="detalle-val">{res.aseguradora}</span></div>
                        </div>
                      )}
                      {res.plan_nombre && (
                        <div className="detalle-item">
                          <Activity size={14} color="var(--accent)"/>
                          <div><span className="detalle-label">Plan</span><span className="detalle-val">{res.plan_nombre}</span></div>
                        </div>
                      )}
                      {res.cobertura_aplicada != null && (
                        <div className="detalle-item">
                          <BarChart2 size={14} color="var(--accent)"/>
                          <div><span className="detalle-label">Cobertura</span><span className="detalle-val">{res.cobertura_aplicada}%</span></div>
                        </div>
                      )}
                      {res.hospital && (
                        <div className="detalle-item">
                          <Building2 size={14} color="var(--accent)"/>
                          <div><span className="detalle-label">Hospital</span><span className="detalle-val">{res.hospital}</span></div>
                        </div>
                      )}
                      {res.ciudad_hospital && (
                        <div className="detalle-item">
                          <MapPin size={14} color="var(--accent)"/>
                          <div><span className="detalle-label">Ciudad</span><span className="detalle-val">{res.ciudad_hospital}</span></div>
                        </div>
                      )}
                    </div>

                    {res.razon && (
                      <div className="detalle-razon">
                        <span className="detalle-label">Análisis IA</span>
                        <p>{res.razon}</p>
                      </div>
                    )}

                    {res.hospitales_disponibles?.length > 0 && (
                      <div className="detalle-hospitales">
                        <span className="detalle-label">Hospitales sugeridos</span>
                        {res.hospitales_disponibles.map((h, i) => (
                          <div key={i} className="detalle-hospital-row">
                            <span>{i === 0 ? '★ ' : ''}{h.nombre}</span>
                            <span className="detalle-ciudad"><MapPin size={11}/> {h.ciudad}</span>
                            <span className="detalle-precio">${h.precio}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
