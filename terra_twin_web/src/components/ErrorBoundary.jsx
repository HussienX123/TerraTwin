import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Graceful error logging
    if (import.meta.env.DEV) {
      console.error('TerraTwin ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section
          className="card error-box"
          role="alert"
          style={{ maxWidth: '640px', margin: '2rem auto', padding: '1.5rem', textAlign: 'center' }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--red)' }}>
            Something interrupted this view
          </h2>
          <p style={{ marginBottom: '1rem', color: 'var(--navy)' }}>
            An unexpected display error occurred. Your screening data, cells, and settings are safe.
          </p>
          {this.state.error && (
            <p className="small-note muted" style={{ fontFamily: 'monospace', marginBottom: '1.25rem', wordBreak: 'break-word' }}>
              {this.state.error.message || String(this.state.error)}
            </p>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/?view=map#map';
              }}
            >
              Return to 2D Map
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
