import { Link } from 'react-router-dom'
import { Activity, ShieldCheck, Building2, MessageCircle, TrendingDown, AlertTriangle, ArrowRight, CheckCircle, Zap } from 'lucide-react'

export default function Landing() {
  return (
    <div className="landing">
      {/* NAVBAR */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-brand-icon">
              <Activity size={18} color="#fff" />
            </div>
            <span>SaludIA</span>
          </div>
          <div className="landing-nav-links">
            <Link to="/login" className="landing-nav-login">Iniciar sesión</Link>
            <Link to="/registro" className="landing-nav-cta">Comenzar gratis</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-badge">
            🇪🇨 <span>Diseñado para Ecuador</span>
          </div>
          <h1>Conoce tu copago <span>antes</span> de ir al médico</h1>
          <p>
            SaludIA analiza tus síntomas con IA, identifica la especialidad que necesitas
            y calcula exactamente cuánto pagarás con tu seguro de salud.
          </p>
          <div className="landing-hero-actions">
            <Link to="/registro" className="btn-hero-primary">
              Comenzar gratis <ArrowRight size={17} />
            </Link>
            <Link to="/login" className="btn-hero-secondary">Ya tengo cuenta</Link>
          </div>

          {/* Stats */}
          <div className="landing-stats">
            <div className="landing-stat">
              <strong>6</strong>
              <span>Aseguradoras</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <strong>17</strong>
              <span>Especialidades</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <strong>2 min</strong>
              <span>Para saber tu copago</span>
            </div>
          </div>

          {/* Demo card flotante */}
          <div className="hero-demo-card">
            <div className="hero-demo-header">
              <div className="hero-demo-avatar">
                <Activity size={14} color="#fff" />
              </div>
              <div>
                <div className="hero-demo-name">SaludIA</div>
                <div className="hero-demo-status">
                  <span className="hero-demo-dot" /> Análisis completado
                </div>
              </div>
            </div>
            <div className="hero-demo-bubble">
              "Tengo dolor en el pecho y falta de aire desde hace 2 días."
            </div>
            <div className="hero-demo-result">
              <div className="hero-demo-row">
                <span className="hero-demo-lbl">Especialidad</span>
                <span className="hero-demo-val">Cardiología</span>
              </div>
              <div className="hero-demo-row">
                <span className="hero-demo-lbl">Aseguradora</span>
                <span className="hero-demo-val">Saludsa</span>
              </div>
              <div className="hero-demo-row" style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed rgba(37,99,235,0.15)' }}>
                <span className="hero-demo-lbl">Tu copago estimado</span>
                <span className="hero-demo-copago">$18.50</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <h2>¿Cómo funciona?</h2>
          <p className="landing-section-sub">En menos de 2 minutos sabrás exactamente cuánto pagar</p>
          <div className="landing-steps">
            {[
              {
                n: '1',
                icon: <MessageCircle size={24} color="#2563eb" />,
                title: 'Describe tus síntomas',
                desc: 'Cuéntale a SaludIA cómo te sientes en lenguaje natural, como si hablaras con un médico de confianza.',
              },
              {
                n: '2',
                icon: <Zap size={24} color="#2563eb" />,
                title: 'La IA analiza y sugiere',
                desc: 'Nuestra IA identifica la especialidad médica más adecuada para tus síntomas con alta precisión.',
              },
              {
                n: '3',
                icon: <ShieldCheck size={24} color="#2563eb" />,
                title: 'Calcula tu cobertura',
                desc: 'Cruzamos tus síntomas con tu plan de seguro (Saludsa, BMI, Humana…) para darte el copago real.',
              },
              {
                n: '4',
                icon: <Building2 size={24} color="#2563eb" />,
                title: 'Elige el mejor hospital',
                desc: 'Te mostramos hospitales afiliados ordenados por copago, para que elijas el más conveniente.',
              },
            ].map((s, i) => (
              <div key={i} className="landing-step-card">
                <div className="landing-step-num">{s.n}</div>
                <div className="landing-step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="landing-section landing-section-blue">
        <div className="landing-section-inner">
          <h2>¿Por qué usar SaludIA?</h2>
          <p className="landing-section-sub">Toma decisiones informadas sobre tu salud y tu bolsillo</p>
          <div className="landing-benefits">
            {[
              {
                icon: <TrendingDown size={22} />,
                title: 'Sin sorpresas económicas',
                desc: 'Conoce el costo exacto antes de tu cita. Sin letras pequeñas, sin sorpresas en la caja.',
              },
              {
                icon: <ShieldCheck size={22} />,
                title: 'Usa tu seguro al máximo',
                desc: 'Muchos pacientes no saben qué cubre su seguro. SaludIA lo descifra en segundos.',
              },
              {
                icon: <AlertTriangle size={22} />,
                title: 'Detecta emergencias',
                desc: 'Si tus síntomas son urgentes, SaludIA te alerta de inmediato y te guía al paso correcto.',
              },
              {
                icon: <Building2 size={22} />,
                title: 'Hospital correcto',
                desc: 'Compara hospitales afiliados y elige el que mejor se adapta a tu cobertura y ubicación.',
              },
              {
                icon: <Activity size={22} />,
                title: 'IA médica avanzada',
                desc: 'Llama 3.3 70B, uno de los modelos más precisos del mundo, analiza tus síntomas.',
              },
              {
                icon: <CheckCircle size={22} />,
                title: 'Historial de consultas',
                desc: 'Guarda todas tus consultas y lleva un registro ordenado de tu salud.',
              },
            ].map((b, i) => (
              <div key={i} className="landing-benefit-card">
                <div className="landing-benefit-icon">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ASEGURADORAS */}
      <section className="landing-section" style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
        <div className="landing-section-inner">
          <h2>Compatible con las principales aseguradoras de Ecuador</h2>
          <div className="landing-aseguradoras">
            {['Saludsa', 'BMI del Ecuador', 'Humana', 'Ecuasanitas', 'Confiamed', 'Bupa Ecuador'].map(a => (
              <div key={a} className="landing-aseguradora-badge">{a}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="landing-cta">
        <h2>Comienza ahora — es completamente gratis</h2>
        <p>Regístrate en menos de 2 minutos e ingresa tu plan de seguro</p>
        <Link to="/registro" className="btn-hero-primary">
          Registrarme gratis <ArrowRight size={17} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-brand">
          <div className="landing-brand-icon" style={{ width: 26, height: 26, borderRadius: 7 }}>
            <Activity size={14} color="#fff" />
          </div>
          <span>SaludIA</span>
        </div>
        <p>Desarrollado para la HackIAthon 2025 · Ecuador</p>
      </footer>
    </div>
  )
}
