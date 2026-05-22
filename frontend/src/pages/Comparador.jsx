import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { compararPlanes } from '../api/planes.api'
import { ESPECIALIDADES } from '../constants/especialidades'
import { TrendingDown, ShieldCheck, Search, Star } from 'lucide-react'

export default function Comparador() {
  const { perfil } = useAuth()
  const [especialidad, setEspecialidad] = useState('Medicina General')
  const [resultado, setResultado]       = useState(null)  // { especialidad, precio_referencia, planes }
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  const miPlanId = perfil?.plan_seguro?.id || perfil?.plan_seguro_id

  useEffect(() => {
    buscar()
  }, [especialidad])  // eslint-disable-line react-hooks/exhaustive-deps

  async function buscar() {
    setLoading(true)
    setError(null)
    try {
      const data = await compararPlanes(especialidad)
      setResultado(data)
    } catch (err) {
      console.error('[Comparador] Error al comparar planes:', err)
      setError('No se pudo cargar la comparación. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="comparador-container">
      <h2><TrendingDown size={22} /> Comparador de planes</h2>
      <p className="comparador-sub">
        Selecciona una especialidad y compara cuánto pagarías con cada plan de seguro
      </p>

      {miPlanId && (
        <div className="comparador-mi-plan-info">
          <Star size={14} color="#f59e0b" fill="#f59e0b"/>
          Tu plan actual: <strong>{perfil?.plan_seguro?.nombre}</strong>
          {perfil?.plan_seguro?.aseguradora?.nombre && ` — ${perfil.plan_seguro.aseguradora.nombre}`}
        </div>
      )}

      <div className="comparador-filtro">
        <Search size={18} color="var(--text-dim)" />
        <select value={especialidad} onChange={e => setEspecialidad(e.target.value)}>
          {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {resultado && (
          <span className="precio-referencia">
            Precio de referencia: <strong>${resultado.precio_referencia}</strong>
          </span>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="page-loading">Cargando planes...</div>
      ) : (
        <div className="comparador-table-wrap">
          <table className="comparador-table">
            <thead>
              <tr>
                <th>Aseguradora</th>
                <th>Plan</th>
                <th>Prima mensual</th>
                <th>Cobertura</th>
                <th>Copago estimado</th>
                <th>Copago fijo</th>
              </tr>
            </thead>
            <tbody>
              {(resultado?.planes || []).map((c, i) => {
                const esMejor  = i === 0
                const esMiPlan = c.plan_id === miPlanId
                return (
                  <tr
                    key={c.plan_id}
                    className={`${esMejor ? 'fila-mejor' : ''} ${esMiPlan ? 'fila-mi-plan' : ''}`}
                  >
                    <td><span className="aseg-nombre">{c.aseguradora_nombre}</span></td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {c.plan_nombre}
                        {esMiPlan && (
                          <span className="badge-mi-plan">
                            <Star size={10} fill="currentColor"/> Mi plan
                          </span>
                        )}
                      </span>
                    </td>
                    <td>${c.prima_mensual}/mes</td>
                    <td>
                      <div className="cobertura-bar-wrap">
                        <div className="cobertura-bar" style={{ width: `${c.porcentaje_cobertura}%` }} />
                        <span>{c.porcentaje_cobertura}%</span>
                      </div>
                    </td>
                    <td>
                      {/* copago_estimado lo calcula el backend — no hay fórmula en el frontend */}
                      <span className={`copago-valor ${esMejor ? 'copago-mejor' : ''}`}>
                        ${Number(c.copago_estimado).toFixed(2)}
                      </span>
                      {esMejor && <span className="badge-mejor">Mejor precio</span>}
                    </td>
                    <td className="copago-fijo">${c.copago_fijo || 0}</td>
                  </tr>
                )
              })}
              {(resultado?.planes || []).length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                    No hay planes con cobertura para esta especialidad
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="comparador-nota">
        <ShieldCheck size={14} /> Los copagos son estimados basados en el precio de referencia.
        El valor exacto puede variar según el hospital y condiciones del contrato.
      </div>
    </div>
  )
}
