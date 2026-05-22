import { Component } from 'react'

/**
 * ErrorBoundary — captura errores de render en el árbol de componentes hijos.
 * Envuelve toda la aplicación en App.jsx.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Error capturado:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '1rem', padding: '2rem',
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ color: 'var(--navy)', margin: 0 }}>Algo salió mal</h2>
          <p style={{ color: 'var(--text2)', textAlign: 'center', maxWidth: 400 }}>
            Ocurrió un error inesperado. Por favor recarga la página.
          </p>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '0.75rem 2rem' }}
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
