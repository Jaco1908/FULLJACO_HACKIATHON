import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

export default function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1600)
    const t2 = setTimeout(() => onDone(), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`splash ${fade ? 'splash-fade' : ''}`}>
      <div className="splash-inner">
        <div className="splash-logo">
          <Activity size={52} color="#fff" strokeWidth={2.5}/>
        </div>
        <h1 className="splash-title">SaludIA</h1>
        <p className="splash-sub">Tu copago, antes de ir al médico</p>
        <div className="splash-dots">
          <span/><span/><span/>
        </div>
      </div>
    </div>
  )
}
