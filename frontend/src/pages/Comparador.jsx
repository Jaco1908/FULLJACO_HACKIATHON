import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { TrendingDown, ShieldCheck, Search, Star } from 'lucide-react'

const ESPECIALIDADES = [
  'Medicina General','Neurología','Cardiología','Gastroenterología','Traumatología',
  'Pediatría','Ginecología','Dermatología','Oncología','Oftalmología','Urología',
  'Psiquiatría','Endocrinología','Reumatología','Otorrinolaringología','Neumología','Nefrología'
]

const PRECIO_FALLBACK = {
  'Medicina General': 40, 'Neurología': 110, 'Cardiología': 120, 'Gastroenterología': 100,
  'Traumatología': 90, 'Pediatría': 60, 'Ginecología': 80, 'Dermatología': 70,
  'Oncología': 150, 'Oftalmología': 85, 'Urología': 92, 'Psiquiatría': 105,
  'Endocrinología': 100, 'Reumatología': 97, 'Otorrinolaringología': 82, 'Neumología': 95, 'Nefrología': 125
}

const BACKEND = import.meta.env.VITE_BACKEND_URL

export default function Comparador() {
  const { perfil } = useAuth()
  const [especialidad, setEspecialidad] = useState('Medicina General')
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(false)
  const [preciosReales, setPreciosReales] = useState({})

  const miPlanId = perfil?.plan_seguro_id

  useEffect(() => {
    fetch(`${BACKEND}/precios`)
      .then(r => r.json())
      .then(data => setPreciosReales(data))
      .catch(() => {}) // usa fallback si backend no responde
  }, [])

  useEffect(() => { buscar() }, [especialidad])

  async function buscar() {
    setLoading(true)
    const { data } = await supabase
      .from('coberturas_especialidad')
      .select('*, plan:plan_id(*, aseguradora:aseguradora_id(nombre))')
      .eq('especialidad', especialidad)
      .eq('cubierta', true)
      .order('porcentaje_cobertura', { ascending: false })
    setPlanes(data || [])
    setLoading(false)
  }

  const precio = preciosReales[especialidad] || PRECIO_FALLBACK[especialidad] || 80

  return (
    <div className="comparador-container">
      <h2><TrendingDown size={22} /> Comparador de planes</h2>
      <p className="comparador-sub">Selecciona una especialidad y compara cuánto pagarías con cada plan de seguro</p>

      {miPlanId && (
        <div className="comparador-mi-plan-info">
          <Star size={14} color="#f59e0b" fill="#f59e0b"/>
          Tu plan actual: <strong>{perfil?.plan_seguro?.nombre}</strong> — {perfil?.plan_seguro?.aseguradora?.nombre}
        </div>
      )}

      <div className="comparador-filtro">
        <Search size={18} color="var(--text-dim)" />
        <select value={especialidad} onChange={e => setEspecialidad(e.target.value)}>
          {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <span className="precio-referencia">Precio de referencia: <strong>${precio}</strong></span>
      </div>

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
              {planes.map((c, i) => {
                const copago = precio - (precio * c.porcentaje_cobertura / 100)
                const esMejor = i === 0
                const esMiPlan = c.plan_id === miPlanId
                return (
                  <tr key={c.id} className={`${esMejor ? 'fila-mejor' : ''} ${esMiPlan ? 'fila-mi-plan' : ''}`}>
                    <td>
                      <span className="aseg-nombre">{c.plan?.aseguradora?.nombre}</span>
                    </td>
                    <td>
                      <span style={{display:'flex', alignItems:'center', gap:'0.4rem'}}>
                        {c.plan?.nombre}
                        {esMiPlan && <span className="badge-mi-plan"><Star size={10} fill="currentColor"/> Mi plan</span>}
                      </span>
                    </td>
                    <td>${c.plan?.prima_mensual}/mes</td>
                    <td>
                      <div className="cobertura-bar-wrap">
                        <div className="cobertura-bar" style={{width: `${c.porcentaje_cobertura}%`}} />
                        <span>{c.porcentaje_cobertura}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`copago-valor ${esMejor ? 'copago-mejor' : ''}`}>
                        ${copago.toFixed(2)}
                      </span>
                      {esMejor && <span className="badge-mejor">Mejor precio</span>}
                    </td>
                    <td className="copago-fijo">${c.copago_fijo || 0}</td>
                  </tr>
                )
              })}
              {planes.length === 0 && (
                <tr><td colSpan={6} style={{textAlign:'center', color:'var(--text-dim)', padding:'2rem'}}>No hay planes con cobertura para esta especialidad</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="comparador-nota">
        <ShieldCheck size={14} /> Los copagos son estimados basados en el precio de referencia. El valor exacto puede variar según el hospital y condiciones del contrato.
      </div>
    </div>
  )
}
