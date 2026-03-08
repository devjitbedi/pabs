import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ink)',
          color: 'var(--muted)',
          gap: 16,
          padding: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
            Something went wrong
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: 'var(--cream)' }}>
            {this.state.error?.message ?? 'Unexpected error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: '10px 24px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 8,
              color: 'var(--cream)',
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
