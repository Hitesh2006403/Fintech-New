import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Background3D } from '../components/common/Background3D.jsx';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * OAuth Callback Handler Component
 * Catches all OAuth redirect flows (/auth/callback, /callback, /login/callback, etc.)
 * Extracts Google credentials, tokens, or session claims, verifies authentication state,
 * and navigates reliably to the appropriate role dashboard (/admin or /dashboard).
 * Eliminates "HTTP 404 — Route Unresolved" on OAuth redirect returns.
 */
export function OAuthCallbackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loginWithGoogle, authLoading } = useApp();
  const [statusMessage, setStatusMessage] = useState('Completing secure Google sign-in...');
  const [errorMessage, setErrorMessage] = useState(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: If processing takes > 8 seconds, give user actionable options
    const timer = setTimeout(() => {
      if (isMounted) setTimedOut(true);
    }, 8000);

    async function processCallback() {
      try {
        // 1. Check URL query parameters and hash fragments
        const searchParams = new URLSearchParams(location.search || '');
        const hashParams = new URLSearchParams((location.hash || '').replace(/^#/, ''));

        const credential = searchParams.get('credential') || hashParams.get('credential') || hashParams.get('id_token');
        const token = searchParams.get('token') || hashParams.get('token') || hashParams.get('access_token');
        const oauthError = searchParams.get('error') || hashParams.get('error');
        const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

        if (oauthError) {
          throw new Error(errorDesc || `Authentication was cancelled or denied (${oauthError}).`);
        }

        // 2. If a Google credential was passed in URL
        if (credential) {
          setStatusMessage('Verifying credentials with secure backend...');
          const data = await loginWithGoogle(credential);
          const isAdminUser = Boolean(
            data?.user?.isAdmin ||
            data?.role === 'admin' ||
            data?.user?.role === 'Super Administrator' ||
            ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((data?.user?.email || '').toLowerCase().trim())
          );
          const target = data?.redirectTo || (isAdminUser ? '/admin' : '/dashboard');
          if (isMounted) navigate(target, { replace: true });
          return;
        }

        // 3. If an existing authenticated session already exists
        if (user && user.isAuthenticated) {
          const isAdminUser = Boolean(
            user.isAdmin ||
            user.role === 'Super Administrator' ||
            ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((user.email || '').toLowerCase().trim())
          );
          if (isMounted) navigate(isAdminUser ? '/admin' : '/dashboard', { replace: true });
          return;
        }

        // 4. If wait for authLoading is still active, hold on
        if (authLoading) {
          return;
        }

        // 5. If no credentials and not logged in, return safely to login
        if (isMounted) {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('OAuth Callback Processing Error:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Google authentication could not be completed.');
        }
      }
    }

    processCallback();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [location, user, authLoading, loginWithGoogle, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0B1220',
      position: 'relative',
      padding: '24px',
      color: '#F8FAFC',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <Background3D />

      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 460,
        width: '100%',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderTop: '1px solid rgba(56, 189, 248, 0.45)',
        borderRadius: 20,
        padding: '36px 28px',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(56, 189, 248, 0.15)'
      }}>
        {errorMessage ? (
          <>
            <div style={{
              width: 56,
              height: 56,
              margin: '0 auto 16px',
              borderRadius: 16,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={28} color="#F87171" />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0', color: '#F8FAFC' }}>
              Sign-In Failed
            </h2>

            <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: 44,
              height: 44,
              margin: '0 auto 18px',
              border: '3px solid rgba(56, 189, 248, 0.25)',
              borderTopColor: '#38BDF8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)'
            }} />

            <div style={{ fontSize: 14, color: '#F8FAFC', fontWeight: 600, marginBottom: 8 }}>
              {statusMessage}
            </div>

            <div style={{ fontSize: 12, color: '#94A3B8' }}>
              Validating cryptographic Google Identity token...
            </div>

            {timedOut && (
              <div style={{ marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#94A3B8',
                    fontSize: 12.5,
                    cursor: 'pointer'
                  }}
                >
                  Taking longer than expected? Return to Login
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
