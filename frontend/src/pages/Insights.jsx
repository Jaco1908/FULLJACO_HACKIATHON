import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getInsights } from '../api/insights.api'
import {
  TrendingDown, TrendingUp, Lightbulb, ShieldCheck,
  Calendar, DollarSign, ArrowRight, Star, Activity,
} from 'lucide-react'

/**
 * Insights — muestra datos calculados por el backend.
 * NO hay cálculos de negocio aquí: sumas, comparativas ni recomendaciones.
 */
export default function Insights() {
  const { perfil }          = useAuth()
  const [insights, setInsights] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [mesSelec, setMesSelec] = useState(null)

  useEffect(() => {
    getInsights()
      .then(data => setInsights(data))
      .catch(err => {
        console.error('[Insights] Error al cargar insights:', err)
        setError('No se pudieron cargar los insights. Intenta de nuevo.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">Calculando insights...</div>
  if (error)   return <div className="error-msg" style={{ margin: '2rem auto', maxWidth: 500 }}>{error}</div>

  const {
    total_consultas,
    total_copago,
    resumen_mensual     = [],
    especialidades_frecuentes = [],
    comparativa_planes  = null,
    recomendaciones     = null,
  } = insights ?? {}

  const sinSeguro    = !perfil?.plan_seguro?.id && !perfil?.plan_seguro_id
  const topEspLabels = especialidades_frecuentes.slice(0, 3).map(e => e.especialidad)

  return (
    <div className="insights-container">
      <h2><Lightbulb size={22}/> Insights de salud</h2>
      <p className="insights-sub">Análisis inteligente basado en tu historial de consultas</p>

      {total_consultas === 0 && (
        <div className="empty-state">
          <Lightbulb size={48} color="#cbd5e1"/>
          <p>Aún no tienes consultas. Usa el chat para generar tu primer análisis.</p>
        </div>
      )}

      {/* ── RESUMEN GLOBAL ── */}
      {total_consultas > 0 && (
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="dashboard-card">
            <div className="dashboard-icon" style={{ background: '#eff6ff' }}>
              <Activity size={22} color="#2563eb"/>
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">Total consultas</span>
              <span className="dashboard-value">{total_consultas}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon" style={{ background: '#fef2f2' }}>
              <DollarSign size={22} color="#ef4444"/>
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">Total en copagos</span>
              <span className="dashboard-value">${Number(total_copago).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── RESUMEN MENSUAL ── */}
      {resumen_mensual.length > 0 && (
        <section className="insights-section">
          <h3><Calendar size={18}/> Resumen mensual</h3>
          <div className="meses-grid">
            {resumen_mensual.map(({ mes, consultas, copago, especialidades }) => {
              const topEspMes = [...new Set(especialidades)].slice(0, 2)
              const activo    = mesSelec === mes
              return (
                <div
                  key={mes}
                  className={`mes-card ${activo ? 'mes-card-active' : ''}`}
                  onClick={() => setMesSelec(activo ? null : mes)}
                >
                  <div className="mes-nombre">{mes}</div>
                  <div className="mes-stats">
                    <span><strong>{consultas}</strong> consulta{consultas !== 1 ? 's' : ''}</span>
                    <span style={{ color: 'var(--accent)' }}>
                      <strong>${Number(copago).toFixed(2)}</strong> en copagos
                    </span>
                  </div>
                  {topEspMes.length > 0 && (
                    <div className="mes-especialidades">
                      {topEspMes.map(e => (
                        <span key={e} className="tag" style={{ fontSize: '0.7rem' }}>{e}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── SIN SEGURO: RECOMENDACIONES ── */}
      {sinSeguro && recomendaciones?.length > 0 && (
        <section className="insights-section">
          <h3><ShieldCheck size={18}/> Planes recomendados para ti</h3>
          {topEspLabels.length > 0 && (
            <p className="insights-hint">
              Basado en tus especialidades más frecuentes: <strong>{topEspLabels.join(', ')}</strong>
            </p>
          )}
          <div className="recomendaciones-grid">
            {recomendaciones.map(({ plan, score }, i) => (
              <div key={plan.id} className={`recomendacion-card ${i === 0 ? 'recomendacion-top' : ''}`}>
                {i === 0 && (
                  <div className="recomendacion-badge">
                    <Star size={12} fill="currentColor"/> Mejor para ti
                  </div>
                )}
                <div className="rec-aseg">{plan.aseguradora?.nombre}</div>
                <div className="rec-plan">{plan.nombre}</div>
                <div className="rec-prima">${plan.prima_mensual}/mes</div>
                <div className="rec-cobertura">
                  Cubre tus especialidades en promedio: <strong>{score}%</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CON SEGURO: COMPARATIVA DE PLANES ── */}
      {!sinSeguro && comparativa_planes?.length > 0 && (
        <section className="insights-section">
          <h3><TrendingDown size={18}/> ¿Conviene cambiar de plan?</h3>
          <p className="insights-hint">
            Si hubieras tenido estos planes en tus consultas anteriores, esto es lo que habrías pagado:
          </p>

          <div className="plan-actual-badge">
            <ShieldCheck size={16} color="var(--accent)"/>
            <span>
              Plan actual: <strong>{perfil?.plan_seguro?.nombre}</strong>
              {perfil?.plan_seguro?.aseguradora?.nombre && ` — ${perfil.plan_seguro.aseguradora.nombre}`}
            </span>
            <span className="plan-actual-costo">${Number(total_copago).toFixed(2)} pagado en total</span>
          </div>

          <div className="comparacion-lista">
            {comparativa_planes.map(({ plan, costo_historico }) => {
              const ahorro  = total_copago - costo_historico
              const ahorra  = ahorro > 0
              return (
                <div
                  key={plan.id}
                  className={`comparacion-row ${ahorra ? 'comparacion-ahorro' : 'comparacion-gasto'}`}
                >
                  <div className="comp-plan-info">
                    <span className="comp-aseg">{plan.aseguradora?.nombre}</span>
                    <span className="comp-nombre">{plan.nombre}</span>
                    <span className="comp-prima">${plan.prima_mensual}/mes</span>
                  </div>
                  <div className="comp-resultado">
                    <span className="comp-costo">${Number(costo_historico).toFixed(2)}</span>
                    <span className={`comp-diff ${ahorra ? 'diff-ahorro' : 'diff-gasto'}`}>
                      {ahorra ? <TrendingDown size={13}/> : <TrendingUp size={13}/>}
                      {ahorra
                        ? `Ahorras $${ahorro.toFixed(2)}`
                        : `Gastas $${Math.abs(ahorro).toFixed(2)} más`
                      }
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="insights-nota">
            * Basado en tu historial de consultas anteriores. Considera también la prima mensual.
          </p>
        </section>
      )}
    </div>
  )
}
