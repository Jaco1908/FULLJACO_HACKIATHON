import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { TrendingDown, TrendingUp, Lightbulb, ShieldCheck, Calendar, DollarSign, ArrowRight, Star } from 'lucide-react'

export default function Insights() {
  const { user, perfil } = useAuth()
  const [consultas, setConsultas]   = useState([])
  const [planes, setPlanes]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [mesSelec, setMesSelec]     = useState(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('consultas').select('*').eq('usuario_id', user.id).order('created_at', { ascending: false }),
      supabase.from('coberturas_especialidad').select('*, plan:plan_id(*, aseguradora:aseguradora_id(nombre))').eq('cubierta', true)
    ]).then(([{ data: c }, { data: p }]) => {
      setConsultas(c || [])
      setPlanes(p || [])
      setLoading(false)
    })
  }, [user])

  if (loading) return <div className="page-loading">Calculando insights...</div>

  const miPlanId = perfil?.plan_seguro_id

  /* ── Resumen mensual ── */
  const meses = {}
  consultas.forEach(c => {
    const key = new Date(c.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    if (!meses[key]) meses[key] = { consultas: 0, copago: 0, especialidades: [] }
    meses[key].consultas++
    meses[key].copago += Number(c.copago_estimado) || 0
    if (c.especialidad_sugerida) meses[key].especialidades.push(c.especialidad_sugerida)
  })
  const mesesArr = Object.entries(meses)

  /* ── Comparador antes/después de plan ── */
  const planesUnicos = {}
  planes.forEach(c => {
    const pid = c.plan?.id
    if (!pid || !c.plan) return
    if (!planesUnicos[pid]) planesUnicos[pid] = { plan: c.plan, coberturas: {} }
    if (c.especialidad) planesUnicos[pid].coberturas[c.especialidad] = c.porcentaje_cobertura ?? 0
  })

  function calcularCostoHistorial(coberturas) {
    if (!coberturas) return 0
    return consultas.reduce((total, c) => {
      const esp = c.especialidad_sugerida
      const precio = c.resumen?.precio_consulta || 0
      if (!precio || !esp) return total
      const pct = coberturas[esp] ?? 0
      return total + (precio - precio * pct / 100)
    }, 0)
  }

  const costoActual = miPlanId && planesUnicos[miPlanId]
    ? calcularCostoHistorial(planesUnicos[miPlanId].coberturas)
    : null

  const comparaciones = Object.values(planesUnicos)
    .filter(p => p.plan.id !== miPlanId)
    .map(p => ({
      plan: p.plan,
      costo: calcularCostoHistorial(p.coberturas),
      ahorro: costoActual != null ? costoActual - calcularCostoHistorial(p.coberturas) : 0
    }))
    .sort((a, b) => a.costo - b.costo)
    .slice(0, 5)

  /* ── Recomendación si no tiene seguro ── */
  const sinSeguro = !miPlanId
  const especialidadesFrec = consultas.reduce((acc, c) => {
    if (c.especialidad_sugerida) acc[c.especialidad_sugerida] = (acc[c.especialidad_sugerida] || 0) + 1
    return acc
  }, {})
  const topEsp = Object.entries(especialidadesFrec).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0])

  const recomendaciones = sinSeguro && topEsp.length > 0
    ? Object.values(planesUnicos)
        .map(p => {
          const score = topEsp.reduce((s, esp) => s + (p.coberturas[esp] || 0), 0) / topEsp.length
          return { plan: p.plan, score: Math.round(score) }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : []

  return (
    <div className="insights-container">
      <h2><Lightbulb size={22}/> Insights de salud</h2>
      <p className="insights-sub">Análisis inteligente basado en tu historial de consultas</p>

      {consultas.length === 0 && (
        <div className="empty-state">
          <Lightbulb size={48} color="#cbd5e1"/>
          <p>Aún no tienes consultas. Usa el chat para generar tu primer análisis.</p>
        </div>
      )}

      {/* ── RESUMEN MENSUAL ── */}
      {mesesArr.length > 0 && (
        <section className="insights-section">
          <h3><Calendar size={18}/> Resumen mensual</h3>
          <div className="meses-grid">
            {mesesArr.map(([mes, datos]) => {
              const topEspMes = [...new Set(datos.especialidades)].slice(0, 2)
              const activo = mesSelec === mes
              return (
                <div key={mes} className={`mes-card ${activo ? 'mes-card-active' : ''}`} onClick={() => setMesSelec(activo ? null : mes)}>
                  <div className="mes-nombre">{mes}</div>
                  <div className="mes-stats">
                    <span><strong>{datos.consultas}</strong> consulta{datos.consultas !== 1 ? 's' : ''}</span>
                    <span style={{color:'var(--accent)'}}><strong>${datos.copago.toFixed(2)}</strong> en copagos</span>
                  </div>
                  {topEspMes.length > 0 && (
                    <div className="mes-especialidades">
                      {topEspMes.map(e => <span key={e} className="tag" style={{fontSize:'0.7rem'}}>{e}</span>)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── MODO SIN SEGURO: RECOMENDACIÓN ── */}
      {sinSeguro && recomendaciones.length > 0 && (
        <section className="insights-section">
          <h3><ShieldCheck size={18}/> Planes recomendados para ti</h3>
          <p className="insights-hint">Basado en tus especialidades más frecuentes: <strong>{topEsp.join(', ')}</strong></p>
          <div className="recomendaciones-grid">
            {recomendaciones.map((r, i) => (
              <div key={r.plan.id} className={`recomendacion-card ${i === 0 ? 'recomendacion-top' : ''}`}>
                {i === 0 && <div className="recomendacion-badge"><Star size={12} fill="currentColor"/> Mejor para ti</div>}
                <div className="rec-aseg">{r.plan.aseguradora?.nombre}</div>
                <div className="rec-plan">{r.plan.nombre}</div>
                <div className="rec-prima">${r.plan.prima_mensual}/mes</div>
                <div className="rec-cobertura">
                  Cubre tus especialidades en promedio: <strong>{r.score}%</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── COMPARADOR ANTES / DESPUÉS ── */}
      {!sinSeguro && costoActual != null && comparaciones.length > 0 && (
        <section className="insights-section">
          <h3><TrendingDown size={18}/> ¿Conviene cambiar de plan?</h3>
          <p className="insights-hint">Si hubieras tenido estos planes en tus consultas anteriores, esto es lo que habrías pagado:</p>

          <div className="plan-actual-badge">
            <ShieldCheck size={16} color="var(--accent)"/>
            <span>Plan actual: <strong>{perfil?.plan_seguro?.nombre}</strong> — {perfil?.plan_seguro?.aseguradora?.nombre}</span>
            <span className="plan-actual-costo">${costoActual.toFixed(2)} pagado en total</span>
          </div>

          <div className="comparacion-lista">
            {comparaciones.map(c => {
              const ahorra = c.ahorro > 0
              return (
                <div key={c.plan.id} className={`comparacion-row ${ahorra ? 'comparacion-ahorro' : 'comparacion-gasto'}`}>
                  <div className="comp-plan-info">
                    <span className="comp-aseg">{c.plan.aseguradora?.nombre}</span>
                    <span className="comp-nombre">{c.plan.nombre}</span>
                    <span className="comp-prima">${c.plan.prima_mensual}/mes</span>
                  </div>
                  <div className="comp-resultado">
                    <span className="comp-costo">${c.costo.toFixed(2)}</span>
                    <span className={`comp-diff ${ahorra ? 'diff-ahorro' : 'diff-gasto'}`}>
                      {ahorra ? <TrendingDown size={13}/> : <TrendingUp size={13}/>}
                      {ahorra ? `Ahorras $${c.ahorro.toFixed(2)}` : `Gastas $${Math.abs(c.ahorro).toFixed(2)} más`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="insights-nota">* Basado en tu historial de consultas anteriores. Considera también la prima mensual.</p>
        </section>
      )}
    </div>
  )
}
