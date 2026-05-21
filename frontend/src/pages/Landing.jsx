import { Link } from 'react-router-dom'
import { Activity, ShieldCheck, Building2, MessageCircle, TrendingDown, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react'

export default function Landing() {
  return (
    <div className="landing">
      {/* NAVBAR */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <Activity size={26} color="#2563eb" />
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
          <div className="landing-badge">🇪🇨 Hecho para Ecuador</div>
          <h1>Conoce tu copago <span>antes</span> de ir al médico</h1>
          <p>SaludIA analiza tus síntomas con inteligencia artificial, identifica la especialidad que necesitas y calcula exactamente cuánto pagarás con tu seguro de salud.</p>
          <div className="landing-hero-actions">
            <Link to="/registro" className="btn-hero-primary">
              Registrarme gratis <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-hero-secondary">Ya tengo cuenta</Link>
          </div>
          <div className="landing-stats">
            <div className="landing-stat"><strong>6</strong><span>Aseguradoras</span></div>
            <div className="landing-stat-divider" />
            <div className="landing-stat"><strong>17</strong><span>Especialidades</span></div>
            <div className="landing-stat-divider" />
            <div className="landing-stat"><strong>5</strong><span>Hospitales</span></div>
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
              { n: '1', icon: <MessageCircle size={28} color="#2563eb" />, title: 'Describe tus síntomas', desc: 'Cuéntale a SaludIA cómo te sientes en lenguaje natural, como si hablaras con un médico.' },
              { n: '2', icon: <Activity size={28} color="#2563eb" />, title: 'La IA analiza y sugiere', desc: 'Nuestra IA (Llama 3.3 70B) identifica la especialidad médica más adecuada para tus síntomas.' },
              { n: '3', icon: <ShieldCheck size={28} color="#2563eb" />, title: 'Consulta tu cobertura', desc: 'Cruzamos tus síntomas con tu plan de seguro (Saludsa, BMI, Humana, etc.) para calcular tu copago real.' },
              { n: '4', icon: <Building2 size={28} color="#2563eb" />, title: 'Elige el mejor hospital', desc: 'Te mostramos los hospitales afiliados disponibles ordenados por copago, para que elijas el más conveniente.' },
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
          <h2 style={{color:'#fff'}}>¿Por qué usar SaludIA?</h2>
          <p className="landing-section-sub" style={{color:'rgba(255,255,255,0.7)'}}>Toma decisiones informadas sobre tu salud</p>
          <div className="landing-benefits">
            {[
              { icon: <TrendingDown size={24} />, title: 'Evita sorpresas económicas', desc: 'Conoce el costo exacto antes de tu cita. Sin letras pequeñas, sin sorpresas.' },
              { icon: <ShieldCheck size={24} />, title: 'Usa tu seguro al máximo', desc: 'Muchos pacientes no saben qué cubre su seguro. SaludIA lo descifra por ti.' },
              { icon: <AlertTriangle size={24} />, title: 'Detecta emergencias', desc: 'Si tus síntomas son urgentes, SaludIA te alerta inmediatamente y te guía.' },
              { icon: <Building2 size={24} />, title: 'Elige el hospital correcto', desc: 'Compara hospitales afiliados y elige el que mejor se adapta a tu bolsillo.' },
              { icon: <Activity size={24} />, title: 'IA médica avanzada', desc: 'Llama 3.3 70B, uno de los modelos más potentes del mundo, analiza tus síntomas.' },
              { icon: <CheckCircle size={24} />, title: 'Historial de consultas', desc: 'Guarda todas tus consultas anteriores para llevar un registro de tu salud.' },
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
      <section className="landing-section">
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
          Registrarme gratis <ArrowRight size={18} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-brand">
          <Activity size={20} color="#2563eb" />
          <span>SaludIA</span>
        </div>
        <p>Desarrollado para la HackIAthon 2025 · Ecuador</p>
      </footer>
    </div>
  )
}
