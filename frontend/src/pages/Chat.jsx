import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { analizarSintomas } from '../api/analizar.api'
import { getConsultasRecientes, guardarConsulta } from '../api/consultas.api'
import {
  Send, AlertTriangle, CheckCircle, MapPin, Building2,
  ShieldCheck, Bell, XCircle, Info, Download, Activity,
} from 'lucide-react'
import jsPDF from 'jspdf'

const ESPECIALIDADES_ALTO_COSTO = ['Oncología', 'Nefrología', 'Psiquiatría', 'Cardiología', 'Neurología']
const CHAT_KEY = 'saludia_chat_session'

function mensajeInicial(nombre) {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: `¡Hola${nombre ? ', ' + nombre : ''}! Soy SaludIA. Cuéntame qué síntomas o molestias tienes hoy y te ayudaré a orientarte.`,
    ts: new Date(),
  }
}

export default function Chat() {
  const { user, perfil } = useAuth()

  const [mensajes, setMensajes] = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.mensajes?.length
          ? parsed.mensajes
          : [mensajeInicial(perfil?.nombre_completo?.split(' ')[0])]
      }
    } catch (err) {
      console.error('[Chat] Error al leer caché:', err)
    }
    return [mensajeInicial(perfil?.nombre_completo?.split(' ')[0])]
  })

  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_KEY))?.resultado || null } catch (err) { return null }
  })
  const [historialIA, setHistorialIA] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_KEY))?.historialIA || [] } catch (err) { return [] }
  })
  const [alertas, setAlertas]               = useState([])
  const [emergenciaModal, setEmergenciaModal] = useState(null)
  const [ultimasConsultas, setUltimasConsultas] = useState([])
  const [hospitalSeleccionado, setHospitalSeleccionado] = useState(null)
  const bottomRef = useRef(null)

  // Persistir chat en localStorage
  useEffect(() => {
    if (mensajes.length > 1 || resultado) {
      localStorage.setItem(CHAT_KEY, JSON.stringify({ mensajes, resultado, historialIA }))
    }
  }, [mensajes, resultado, historialIA])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, resultado])

  // Cargar últimas consultas vía backend (no Supabase directo)
  useEffect(() => {
    if (!user) return
    getConsultasRecientes()
      .then(data => setUltimasConsultas(data || []))
      .catch(err => console.error('[Chat] Error al cargar consultas recientes:', err))
  }, [user])

  /** Genera alertas de cobertura usando datos que ya devuelve el backend. */
  function generarAlertas(data) {
    const alertasNuevas = []
    const { especialidad, cobertura_aplicada: cob, precio_consulta, copago } = data

    if (cob < 60) {
      alertasNuevas.push({
        tipo: 'warning',
        titulo: 'Cobertura limitada',
        mensaje: `Tu plan cubre solo el ${cob}% de ${especialidad}.`,
      })
    }
    if (cob === 0) {
      alertasNuevas.push({
        tipo: 'danger',
        titulo: 'Especialidad no cubierta',
        mensaje: `Tu plan no tiene cobertura para ${especialidad}. Precio completo: $${precio_consulta}.`,
      })
    }
    if (ESPECIALIDADES_ALTO_COSTO.includes(especialidad) && cob < 70) {
      alertasNuevas.push({
        tipo: 'info',
        titulo: 'Consulta de alto costo',
        mensaje: `${especialidad} es costosa. Con ${cob}% de cobertura tu copago es $${Number(copago).toFixed(2)}.`,
      })
    }
    if (data.nivel_urgencia === 'urgente' && !perfil?.plan_seguro) {
      alertasNuevas.push({
        tipo: 'warning',
        titulo: 'Sin seguro activo',
        mensaje: `Síntomas urgentes sin plan registrado. Pagarás precio completo: $${precio_consulta}.`,
      })
    }
    setAlertas(alertasNuevas)
  }

  async function enviar(texto) {
    if (!texto.trim()) return
    const ts = new Date()
    setMensajes(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: texto, ts }])
    setInput('')
    setLoading(true)
    setAlertas([])

    try {
      // El backend obtiene el plan del usuario autenticado — no se envía desde el frontend
      const data = await analizarSintomas(texto, historialIA)
      const tsResp = new Date()

      if (data.tipo === 'emergencia') {
        setHistorialIA(prev => [...prev, texto, data.mensaje])
        setEmergenciaModal(data.mensaje)
        setMensajes(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant',
          content: data.mensaje, tipo: 'emergencia', ts: tsResp,
        }])
        await guardarConsulta({
          sintomas: texto, nivel_urgencia: 'emergencia', resumen: data,
        })

      } else if (data.tipo === 'pregunta') {
        setHistorialIA(prev => [...prev, texto, data.pregunta])
        setMensajes(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant',
          content: data.pregunta, opciones: data.opciones, tipo: 'pregunta', ts: tsResp,
        }])

      } else if (data.tipo === 'diagnostico') {
        setHistorialIA(prev => [...prev, texto])
        setMensajes(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant',
          content: 'He analizado tus síntomas. Aquí tienes tu estimación de copago:',
          tipo: 'diagnostico', ts: tsResp,
        }])
        setResultado(data)
        generarAlertas(data)   // usa datos del backend, sin calcular nada aquí
        await guardarConsulta({
          sintomas: texto,
          especialidad_sugerida: data.especialidad,
          nivel_urgencia: data.nivel_urgencia,
          copago_estimado: data.copago,
          resumen: data,
        })
      }

    } catch (error) {
      console.error('[Chat] Error en análisis:', error)
      const mensaje = error.status === 401
        ? 'Tu sesión expiró. Por favor recarga la página.'
        : 'Error al conectar con el servicio. Verifica tu conexión.'
      setMensajes(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant', content: mensaje, ts: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function nuevaConsulta() {
    localStorage.removeItem(CHAT_KEY)
    setMensajes([{
      id: crypto.randomUUID(), role: 'assistant',
      content: '¡Nueva consulta! Cuéntame qué síntomas tienes.', ts: new Date(),
    }])
    setResultado(null)
    setHistorialIA([])
    setAlertas([])
    setEmergenciaModal(null)
    setHospitalSeleccionado(null)
  }

  function exportarPDF() {
    if (!resultado) return
    const doc  = new jsPDF()
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

    // Header
    doc.setFillColor(15, 45, 94)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('SaludIA', 20, 20)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Estimación de Copago y Cobertura', 20, 29)

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(10)
    doc.text(`Generado el ${fecha}`, 150, 20)
    doc.text(`Paciente: ${perfil?.nombre_completo || user?.email || ''}`, 150, 27)

    // Resultado principal
    doc.setTextColor(15, 45, 94)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Resultado del Análisis', 20, 50)
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(0.5)
    doc.line(20, 53, 190, 53)

    const items = [
      ['Especialidad sugerida', resultado.especialidad],
      ['Nivel de urgencia', { normal: 'Normal', urgente: 'Urgente', emergencia: 'EMERGENCIA' }[resultado.nivel_urgencia] || resultado.nivel_urgencia],
      ['Aseguradora',          resultado.aseguradora || 'Sin seguro'],
      ['Plan de seguro',       resultado.plan_nombre || 'Sin plan'],
      ['Cobertura aplicada',   `${resultado.cobertura_aplicada}%`],
      ['Precio de consulta',   `$${Number(resultado.precio_consulta).toFixed(2)}`],
      ['Hospital recomendado', resultado.hospital || '—'],
    ]

    let y = 62
    doc.setFontSize(11)
    items.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text(label + ':', 20, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 41, 59)
      doc.text(String(value ?? '—'), 90, y)
      y += 9
    })

    // Copago destacado
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(20, y, 170, 22, 4, 4, 'F')
    doc.setDrawColor(37, 99, 235)
    doc.roundedRect(20, y, 170, 22, 4, 4, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 45, 94)
    doc.text('TU COPAGO ESTIMADO:', 28, y + 10)
    doc.setFontSize(20)
    doc.setTextColor(37, 99, 235)
    doc.text(`$${Number(resultado.copago).toFixed(2)}`, 145, y + 13)
    y += 32

    // Razón
    if (resultado.razon) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 45, 94)
      doc.text('Análisis de síntomas:', 20, y)
      y += 7
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(71, 85, 105)
      const lines = doc.splitTextToSize(resultado.razon, 170)
      doc.text(lines, 20, y)
      y += lines.length * 6 + 8
    }

    // Hospitales — el backend devuelve h.copago calculado
    if (resultado.hospitales_disponibles?.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(15, 45, 94)
      doc.text('Hospitales disponibles:', 20, y)
      y += 8
      resultado.hospitales_disponibles.forEach((h, i) => {
        // Usar el copago que devuelve el backend directamente
        const copagoH = h.copago ?? 0
        doc.setFont('helvetica', i === 0 ? 'bold' : 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30, 41, 59)
        doc.text(`${i + 1}. ${h.nombre} (${h.ciudad}) — Copago: $${Number(copagoH).toFixed(2)}`, 25, y)
        y += 7
      })
    }

    // Footer
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 275, 210, 22, 'F')
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text('Este documento es una estimación. Los valores exactos pueden variar según condiciones del contrato.', 20, 284)
    doc.text('SaludIA — HackIAthon 2025 · Ecuador', 20, 291)

    doc.save(`SaludIA_Copago_${resultado.especialidad}_${fecha.replace(/ /g, '_')}.pdf`)
  }

  const urgenciaColor = { normal: '#10b981', urgente: '#f59e0b', emergencia: '#ef4444' }
  const urgenciaLabel = { normal: 'Normal', urgente: 'Urgente', emergencia: 'Emergencia' }

  function fmtTime(ts) {
    if (!ts) return ''
    const d = ts instanceof Date ? ts : new Date(ts)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-container">

      {/* Modal emergencia */}
      {emergenciaModal && (
        <div className="emergencia-modal-overlay" onClick={() => setEmergenciaModal(null)}>
          <div className="emergencia-modal" onClick={e => e.stopPropagation()}>
            <div className="emergencia-modal-icon"><AlertTriangle size={40} color="#ef4444"/></div>
            <h2>EMERGENCIA MÉDICA</h2>
            <p>{emergenciaModal}</p>
            <div className="emergencia-modal-actions">
              <a href="tel:911" className="btn-emergencia-call">📞 Llamar al ECU 911</a>
              <button className="btn-emergencia-close" onClick={() => setEmergenciaModal(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de cobertura */}
      {alertas.length > 0 && (
        <div className="alertas-banner">
          <div className="alertas-header">
            <Bell size={16}/> {alertas.length} alerta{alertas.length > 1 ? 's' : ''} sobre tu cobertura
          </div>
          {alertas.map((a, i) => (
            <div key={i} className={`alerta-item alerta-${a.tipo}`}>
              {a.tipo === 'danger'  && <XCircle size={16}/>}
              {a.tipo === 'warning' && <AlertTriangle size={16}/>}
              {a.tipo === 'info'    && <Info size={16}/>}
              <div><strong>{a.titulo}</strong><p>{a.mensaje}</p></div>
              <button className="alerta-close" onClick={() => setAlertas(p => p.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {/* Contexto de consultas previas */}
        {ultimasConsultas.length > 0 && historialIA.length === 0 && !resultado && (
          <div className="contexto-previo">
            <span className="contexto-titulo">Tus últimas consultas:</span>
            {ultimasConsultas.map((c, i) => (
              <button
                key={c.id ?? i}
                className="contexto-item"
                onClick={() => setInput(`Tengo los mismos síntomas de antes: ${c.sintomas}`)}
              >
                <span className="contexto-esp">{c.especialidad_sugerida || 'Consulta'}</span>
                <span className="contexto-sint">
                  "{c.sintomas?.slice(0, 50)}{c.sintomas?.length > 50 ? '...' : ''}"
                </span>
                <span className="contexto-fecha">
                  {new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Lista de mensajes — key por ID único, nunca por índice */}
        {mensajes.map(m => (
          <div key={m.id} className={`message ${m.role}`}>
            {m.role === 'assistant' && (
              <div className="chat-avatar">
                <Activity size={16} color="#2563eb"/>
              </div>
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '0.2rem',
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              {m.tipo === 'emergencia' ? (
                <div className="alert-emergencia">
                  <AlertTriangle size={20}/>
                  <span>{m.content}</span>
                </div>
              ) : (
                <div className="bubble">
                  <p>{m.content}</p>
                  {m.opciones && (
                    <div className="opciones">
                      {m.opciones.map((op, j) => (
                        <button key={j} className="opcion-btn" onClick={() => enviar(op)}>{op}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <span className="msg-time">{fmtTime(m.ts)}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="chat-avatar"><Activity size={16} color="#2563eb"/></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div className="bubble typing"><span/><span/><span/></div>
              <span className="msg-time">SaludIA está analizando...</span>
            </div>
          </div>
        )}

        {/* Tarjeta de resultado */}
        {resultado && (
          <div className="resultado-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}><CheckCircle size={18}/> Estimación de copago</h3>
              <button className="btn-pdf" onClick={exportarPDF} title="Descargar PDF">
                <Download size={15}/> PDF
              </button>
            </div>

            {resultado.confianza != null && (
              <div className="confianza-bar-wrap">
                <div className="confianza-label">
                  <span>Confianza del diagnóstico</span>
                  <span className={`confianza-pct ${resultado.confianza >= 75 ? 'alta' : resultado.confianza >= 50 ? 'media' : 'baja'}`}>
                    {resultado.confianza}%
                  </span>
                </div>
                <div className="confianza-track">
                  <div className="confianza-fill" style={{
                    width: `${resultado.confianza}%`,
                    background: resultado.confianza >= 75 ? '#10b981' : resultado.confianza >= 50 ? '#f59e0b' : '#ef4444',
                  }}/>
                </div>
                <p className="confianza-hint">
                  {resultado.confianza >= 75
                    ? 'La IA identificó tu especialidad con alta certeza.'
                    : resultado.confianza >= 50
                      ? 'Diagnóstico probable. El médico confirmará en consulta.'
                      : 'Síntomas ambiguos. El médico general puede orientarte mejor.'}
                </p>
              </div>
            )}

            <div className="resultado-grid">
              <div className="resultado-item">
                <span className="label">Especialidad sugerida</span>
                <span className="value">{resultado.especialidad}</span>
              </div>
              <div className="resultado-item">
                <span className="label">Nivel de urgencia</span>
                <span className="value" style={{ color: urgenciaColor[resultado.nivel_urgencia] }}>
                  ● {urgenciaLabel[resultado.nivel_urgencia]}
                </span>
              </div>
              <div className="resultado-item">
                <span className="label"><ShieldCheck size={13}/> Aseguradora</span>
                <span className="value">{resultado.aseguradora || 'Sin seguro'}</span>
              </div>
              <div className="resultado-item">
                <span className="label">Plan activo</span>
                <span className="value">{resultado.plan_nombre || 'Sin plan'}</span>
              </div>
            </div>

            {/* Desglose del copago — valores calculados por el backend */}
            <div className="copago-breakdown">
              <h4 className="copago-breakdown-title">¿Cómo se calcula tu copago?</h4>
              <div className="copago-steps">
                <div className="copago-step">
                  <span className="step-num">1</span>
                  <span className="step-text">Precio de consulta ({resultado.especialidad})</span>
                  <span className="step-val">${Number(resultado.precio_consulta).toFixed(2)}</span>
                </div>
                <div className="copago-step copago-step-cover">
                  <span className="step-num">2</span>
                  <span className="step-text">Tu seguro cubre ({resultado.cobertura_aplicada}%)</span>
                  <span className="step-val" style={{ color: '#10b981' }}>
                    − ${Number(resultado.monto_cubierto).toFixed(2)}
                  </span>
                </div>
                <div className="copago-step copago-step-total">
                  <span className="step-num">✓</span>
                  <span className="step-text">Tu copago estimado</span>
                  <span className="step-val copago-final">${Number(resultado.copago).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {resultado.razon && <p className="razon">{resultado.razon}</p>}

            {resultado.hospitales_disponibles?.length > 0 && (
              <div className="hospitales-section">
                <h4><Building2 size={15}/> Hospitales disponibles para {resultado.especialidad}</h4>
                {resultado.hospitales_disponibles.map((h, i) => {
                  const seleccionado = hospitalSeleccionado?.nombre === h.nombre
                  // h.copago viene del backend — no se calcula en el frontend
                  const copagoH = h.copago ?? 0
                  return (
                    <div
                      key={h.nombre ?? i}
                      className={`hospital-row ${i === 0 && !hospitalSeleccionado ? 'hospital-recomendado' : ''} ${seleccionado ? 'hospital-seleccionado' : ''}`}
                      onClick={() => setHospitalSeleccionado(seleccionado ? null : h)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <span className="hospital-nombre">{h.nombre}</span>
                        {i === 0 && !hospitalSeleccionado && <span className="tag-recomendado">Recomendado</span>}
                        {seleccionado && <span className="tag-elegido">✓ Elegido</span>}
                        <br/>
                        <span className="hospital-ciudad"><MapPin size={11}/> {h.ciudad}</span>
                      </div>
                      <div className="hospital-precios">
                        <span className="precio-base">${h.precio}</span>
                        <span className="copago-hos">Copago: ${Number(copagoH).toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
                {hospitalSeleccionado && (
                  <div className="hospital-agenda-info">
                    <Building2 size={16}/>
                    <div>
                      <strong>{hospitalSeleccionado.nombre}</strong> — {hospitalSeleccionado.ciudad}
                      <p>
                        Para agendar tu cita de <strong>{resultado.especialidad}</strong>,
                        contacta directamente al hospital con esta estimación de copago:{' '}
                        <strong>${Number(hospitalSeleccionado.copago ?? 0).toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button className="btn-secondary" onClick={nuevaConsulta}>Nueva consulta</button>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      <form className="chat-input-bar" onSubmit={e => { e.preventDefault(); enviar(input) }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe tus síntomas..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}><Send size={20}/></button>
      </form>
    </div>
  )
}
