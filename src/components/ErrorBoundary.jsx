import React from 'react'

/**
 * ErrorBoundary — safety net so an unexpected runtime exception can never
 * leave the user staring at a blank page. Real failures are still surfaced
 * loudly (raw message + console print + reload action), never swallowed.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    // Report the real failure — do not silence it.
    console.error('[GridPilot] runtime error captured by ErrorBoundary:', error, errorInfo?.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  handleResetToIdle = () => {
    // A plain remount without reload when possible.
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#0f172a',
            color: '#f8fafc',
            fontFamily: "'Fira Sans', system-ui, sans-serif",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 560, background: '#1b2336', border: '1px solid #ef4444', borderRadius: 14, padding: 24 }}>
            <h1 style={{ margin: '0 0 10px', fontSize: 17, color: '#fca5a5' }}>
              GridPilot hit an unexpected error
            </h1>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#94a3b8' }}>
              The simulation stopped instead of failing silently. The error details below are the
              real failure — please report them if they persist.
            </p>
            <pre
              style={{
                margin: '0 0 16px',
                padding: 12,
                background: '#0b1120',
                border: '1px solid rgba(148,163,184,0.2)',
                borderRadius: 8,
                overflowX: 'auto',
                fontSize: 11.5,
                fontFamily: "'Fira Code', monospace",
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {String(this.state.error?.message ?? this.state.error ?? 'Unknown error')}
            </pre>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={this.handleResetToIdle}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #334155', background: '#272f42', color: '#f8fafc', cursor: 'pointer' }}
              >
                Try to recover
              </button>
              <button
                onClick={this.handleReload}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #14b8a6', background: '#0d9488', color: '#04211c', fontWeight: 600, cursor: 'pointer' }}
              >
                Reload application
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
