import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { AdminBackground3D } from '../../components/admin/AdminBackground3D.jsx';
import { GOOGLE_CLIENT_ID, getOAuthOriginDiagnostics } from '../../config/authConfig.js';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  User,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2
} from 'lucide-react';

const AUTHORIZED_ADMIN_EMAILS = ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'];
const PRIMARY_AUTHORIZED_ADMIN = 'hiteshav2006@gmail.com';

export function AdminLoginPage({ onReturnToClient }) {
  const { loginWithGoogle, loginWithCredentials } = useAdmin();

  const [authMethod, setAuthMethod] = useState('google'); // 'google' | 'credentials'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);
  const [showOriginHelp, setShowOriginHelp] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [copiedClientId, setCopiedClientId] = useState(false);

  const googleBtnRef = useRef(null);
  const originDiag = getOAuthOriginDiagnostics();

  // Handle Google Credential Response from GIS
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setErrorMessage('Google authentication was cancelled or no token was received.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const user = await loginWithGoogle(response.credential);
      setSuccessNotice(`Welcome back, Administrator ${user.name}`);
    } catch (err) {
      console.warn('Admin Google login failed:', err);
      setErrorMessage(err.message || 'Access Denied: Only authorized administrator emails are granted access.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      if (type === 'origin') {
        setCopiedOrigin(true);
        setTimeout(() => setCopiedOrigin(false), 2000);
      } else if (type === 'client') {
        setCopiedClientId(true);
        setTimeout(() => setCopiedClientId(false), 2000);
      }
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
  };

  // Initialize Google Identity Services
  useEffect(() => {
    let intervalId = null;

    const setupGis = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            itp_support: true
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            const containerWidth = googleBtnRef.current.offsetWidth || (typeof window !== 'undefined' && window.innerWidth < 420 ? window.innerWidth - 64 : 360);
            const btnWidth = Math.min(400, Math.max(220, containerWidth));

            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: btnWidth
            });
          }
        } catch (e) {
          console.error('Failed to initialize GIS on Admin Portal:', e);
        }
        if (intervalId) clearInterval(intervalId);
      }
    };

    setupGis();
    intervalId = setInterval(setupGis, 300);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [authMethod]);

  // Fallback trigger if user clicks the button before/around overlay
  const handleGoogleBtnClick = () => {
    setErrorMessage(null);
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            console.warn('GIS One Tap prompt not displayed on Admin:', notification.getNotDisplayedReason());
          } else if (notification.isSkippedMoment()) {
            console.warn('GIS One Tap prompt skipped on Admin:', notification.getSkippedReason());
          } else if (notification.isDismissedMoment()) {
            console.warn('GIS One Tap prompt dismissed on Admin:', notification.getDismissedReason());
          }
        });
      } catch (err) {
        console.warn('GIS prompt trigger error:', err);
      }
    } else {
      setErrorMessage('Google Identity Services library is connecting. Please check your network and retry.');
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both administrator email and password.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const user = await loginWithCredentials(email, password);
      setSuccessNotice(`Welcome back, ${user.name}`);
    } catch (err) {
      console.warn('Admin credential login error:', err);
      setErrorMessage(err.message || 'Invalid administrator credentials. Access forbidden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
      background: '#090D14'
    }}>
      {/* 3D Visual Atmosphere (Calm, Executive Obsidian Slate) */}
      <AdminBackground3D />

      <div className="admin-login-card" style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(14, 21, 34, 0.82)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: 22,
        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.08)',
        padding: '34px 32px',
        position: 'relative',
        zIndex: 10
      }}>

        {/* 1. TOP PORTAL SWITCHER: USER PORTAL <-> ADMIN PORTAL */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'rgba(8, 12, 20, 0.85)',
          padding: 5,
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.07)',
          marginBottom: 24,
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          <button
            type="button"
            onClick={onReturnToClient}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#94A3B8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F8FAFC';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94A3B8';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <User size={15} />
            <span>User Portal</span>
          </button>

          <button
            type="button"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid rgba(99, 102, 241, 0.38)',
              background: 'rgba(99, 102, 241, 0.16)',
              color: '#F8FAFC',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
            }}
          >
            <ShieldAlert size={15} color="#818CF8" />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* 2. Brand Header (FinSight Branding) */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(79, 70, 229, 0.18) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.22)',
            marginBottom: 12
          }}>
            <ShieldAlert size={28} color="#818CF8" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1.1,
              color: '#818CF8',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.28)',
              padding: '3px 9px',
              borderRadius: 6
            }}>
              SUPER ADMIN PORTAL
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
            <span style={{ fontSize: 11.5, color: '#10B981', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
              Security Gateway v2.4
            </span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', margin: '4px 0 6px', letterSpacing: -0.4 }}>
            FinSight Admin Portal
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
            Restricted treasury console for authorized platform administrators.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.14)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            animation: 'fadeIn 0.2s ease'
          }}>
            <AlertCircle size={18} color="#F87171" style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: '#FCA5A5', lineHeight: 1.45 }}>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successNotice && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.14)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <CheckCircle2 size={18} color="#34D399" />
            <div style={{ fontSize: 12.5, color: '#6EE7B7' }}>
              {successNotice}
            </div>
          </div>
        )}

        {/* 3. PROFESSIONAL AUTH METHOD SWITCHER */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'rgba(8, 12, 20, 0.85)',
          padding: 4,
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.07)',
          marginBottom: 18,
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.35)'
        }}>
          <button
            type="button"
            onClick={() => { setAuthMethod('google'); setErrorMessage(null); }}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: authMethod === 'google' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              background: authMethod === 'google'
                ? 'rgba(99, 102, 241, 0.16)'
                : 'transparent',
              color: authMethod === 'google' ? '#F8FAFC' : '#94A3B8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: authMethod === 'google' ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google SSO</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMethod('credentials'); setErrorMessage(null); }}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: authMethod === 'credentials' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              background: authMethod === 'credentials'
                ? 'rgba(99, 102, 241, 0.16)'
                : 'transparent',
              color: authMethod === 'credentials' ? '#F8FAFC' : '#94A3B8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: authMethod === 'credentials' ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <KeyRound size={15} color={authMethod === 'credentials' ? '#818CF8' : '#94A3B8'} />
            <span>Master Key</span>
          </button>
        </div>

        {/* 4. Google Identity Method Content */}
        {authMethod === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Contextual Google SSO Banner */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.22)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={18} color="#818CF8" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>
                  <span style={{ color: '#F8FAFC', fontWeight: 700, display: 'block' }}>
                    Authorized Google SSO
                  </span>
                  Restricted to verified organization administrators only.
                </div>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                padding: '3px 7px',
                borderRadius: 5,
                letterSpacing: 0.5,
                flexShrink: 0
              }}>
                WHITELIST
              </span>
            </div>

            {/* Genuine Google SSO Button with Transparent GIS Overlay */}
            <div style={{ position: 'relative', width: '100%', minHeight: 48 }}>
              <button
                type="button"
                id="admin-google-sso-btn"
                onClick={handleGoogleBtnClick}
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 12,
                  color: '#F8FAFC',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {loading ? (
                    <Loader2 size={18} className="animate-spin text-indigo-400" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12c0 1.97.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  )}
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#F8FAFC', letterSpacing: 0.2 }}>
                    {loading ? 'Authenticating with Google...' : 'Continue with Google'}
                  </span>
                </div>
              </button>

              {/* GIS Overlay (transparently captures clicks and renders Google dialog) */}
              <div
                ref={googleBtnRef}
                className="gis-button-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0.001,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: loading ? 'none' : 'auto'
                }}
                title="Continue with Google SSO"
              />
            </div>
          </div>
        )}

        {/* 5. Admin Credentials Method Content */}
        {authMethod === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Contextual Master Key Banner */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.22)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <KeyRound size={18} color="#818CF8" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>
                  <span style={{ color: '#F8FAFC', fontWeight: 700, display: 'block' }}>
                    Master Passkey Access
                  </span>
                  256-Bit Encrypted Administrative Emergency Authentication
                </div>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#818CF8',
                background: 'rgba(99, 102, 241, 0.14)',
                border: '1px solid rgba(99, 102, 241, 0.28)',
                padding: '3px 7px',
                borderRadius: 5,
                letterSpacing: 0.5,
                flexShrink: 0
              }}>
                MASTER
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                Admin Email / Whitelisted ID
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourorganization.com"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    background: 'rgba(8, 12, 20, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    borderRadius: 10,
                    color: '#F8FAFC',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>
                Admin Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 40px',
                    background: 'rgba(8, 12, 20, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    borderRadius: 10,
                    color: '#F8FAFC',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: 4
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 18px',
                marginTop: 6,
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 10,
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                <span>Authenticating Administrator...</span>
              ) : (
                <>
                  <ShieldCheck size={17} />
                  <span>Authenticate Admin</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* 7. Footer Navigation */}
        <div style={{
          marginTop: 26,
          paddingTop: 18,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={onReturnToClient}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 0
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to User App</span>
          </button>

          <span style={{ fontSize: 11.5, color: '#64748B' }}>
            FinSight Treasury • 2026
          </span>
        </div>
      </div>
    </div>
  );
}
