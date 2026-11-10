import React from 'react';
import { ShieldAlert, RefreshCw, LogIn, LayoutDashboard, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Production-Grade React Error Boundary for FinSight Treasury
 * Captures any render or lifecycle exceptions and prevents blank screens (#0B1220).
 * Provides actionable recovery options (Try Again, Return to Dashboard, Reset Session).
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Safe error logging - never logs sensitive user credentials or tokens
    console.error('[FinSight Error Boundary] Caught exception:', {
      message: error?.message,
      name: error?.name,
      componentStack: errorInfo?.componentStack
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Ignore storage errors
    }
    window.location.href = '/login';
  };

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env?.DEV;
      const errorMessage = this.state.error?.message || 'An unexpected runtime issue occurred.';

      return (
        <div style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B1220',
          color: '#F8FAFC',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: '24px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: 520,
            width: '100%',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderTop: '1px solid rgba(56, 189, 248, 0.45)',
            borderRadius: 20,
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.12)'
          }}>
            {/* Header Shield Icon */}
            <div style={{
              width: 64,
              height: 64,
              margin: '0 auto 20px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(99, 102, 241, 0.22) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.25)'
            }}>
              <ShieldAlert size={32} color="#F87171" />
            </div>

            {/* Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.8,
              padding: '4px 12px',
              borderRadius: 20,
              marginBottom: 16,
              textTransform: 'uppercase'
            }}>
              System Protection Active
            </div>

            <h1 style={{
              fontSize: 24,
              fontWeight: 800,
              margin: '0 0 10px 0',
              letterSpacing: -0.4,
              color: '#F8FAFC'
            }}>
              FinSight Interface Recovery
            </h1>

            <p style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: '#94A3B8',
              margin: '0 0 24px 0'
            }}>
              An unexpected render issue occurred, but your financial data is safe. You can reload the page or return to your dashboard.
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  color: '#FFFFFF',
                  fontSize: 13.5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                <RefreshCw size={16} />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoDashboard}
                style={{
                  width: '100%',
                  padding: '11px 18px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#F8FAFC',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutDashboard size={15} color="#38BDF8" />
                <span>Return to User Dashboard</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                style={{
                  width: '100%',
                  padding: '10px 18px',
                  borderRadius: 12,
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: '#94A3B8',
                  fontSize: 12.5,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <LogIn size={14} />
                <span>Reset Session &amp; Return to Login</span>
              </button>
            </div>

            {/* Collapsible Technical Diagnostics */}
            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: 11.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: 0,
                  margin: '0 auto 8px auto'
                }}
              >
                <span>{this.state.showDetails ? 'Hide' : 'Show'} Diagnostics</span>
                {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {this.state.showDetails && (
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 11,
                  color: '#F87171',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  {errorMessage}
                  {this.state.error?.stack && `\n\nStack:\n${this.state.error.stack}`}
                </pre>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
