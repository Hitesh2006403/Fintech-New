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
  ArrowLeft,
  CheckCircle2,
  User,
  Loader2,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AUTHORIZED_ADMIN_EMAILS = [
  'hiteshav2006@gmail.com',
  'dishankbs04@gmail.com',
  ...(typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAIL ? [import.meta.env.VITE_ADMIN_EMAIL.toLowerCase().trim()] : [])
];
const PRIMARY_AUTHORIZED_ADMIN = AUTHORIZED_ADMIN_EMAILS[0] || 'hiteshav2006@gmail.com';

export function AdminLoginPage({ onReturnToClient }) {
  const { loginWithGoogle, loginWithCredentials, loginWithAdminEmail } = useAdmin();
  const navigate = useNavigate();

  // Tab choices: 'email' (Instant Admin Email Access), 'credentials' (Master Key/Password), 'google' (Google SSO)
  const [authMethod, setAuthMethod] = useState('email');
  const [email, setEmail] = useState(PRIMARY_AUTHORIZED_ADMIN);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);
  const [canFallbackToEmail, setCanFallbackToEmail] = useState(false);

  const googleBtnRef = useRef(null);

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
      setTimeout(() => {
        navigate('/admin');
      }, 300);
    } catch (err) {
      console.warn('Admin Google login failed:', err);
      setErrorMessage(err.message || 'Access Denied: Only authorized administrator emails are granted access.');
    } finally {
      setLoading(false);
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

  // Direct Admin Email ID Authorization
  const handleEmailAuthSubmit = async (e, customEmail) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetEmail = (customEmail || email || '').trim().toLowerCase();
    if (!targetEmail) {
      setErrorMessage('Please enter an authorized administrator email address.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const user = await loginWithAdminEmail(targetEmail);
      setSuccessNotice(`Welcome back, Administrator ${user.name || targetEmail}`);
      setTimeout(() => {
        navigate('/admin');
      }, 300);
    } catch (err) {
      console.warn('Admin email auth error:', err);
      setErrorMessage(err.message || `Access Denied: ${targetEmail} is not in the authorized administrator whitelist.`);
    } finally {
      setLoading(false);
    }
  };

  // Credentials / Master Key Login
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both administrator email and password.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setCanFallbackToEmail(false);

    try {
      const user = await loginWithCredentials(email, password);
      setSuccessNotice(`Welcome back, Administrator ${user.name}`);
      setTimeout(() => {
        navigate('/admin');
      }, 300);
    } catch (err) {
      console.warn('Admin credential login error:', err);
      const cleanEmail = email.toLowerCase().trim();
      const isKnownWhitelisted = AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail);

      // Offer direct authorized email bypass if password fails
      if (isKnownWhitelisted) {
        setCanFallbackToEmail(true);
      }
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
      background: 'var(--bg-app, #F4F7FB)'
    }}>
      {/* 3D Visual Atmosphere (Aurora Porcelain Base) */}
      <AdminBackground3D />

      <div className="admin-login-card" style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.95)',
        borderTop: '2px solid rgba(79, 70, 229, 0.5)',
        borderRadius: 22,
        boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.05)',
        padding: '34px 32px',
        position: 'relative',
        zIndex: 10
      }}>

        {/* 1. TOP PORTAL SWITCHER: USER PORTAL <-> ADMIN PORTAL */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'rgba(241, 245, 249, 0.85)',
          padding: 5,
          borderRadius: 12,
          border: '1px solid rgba(226, 232, 240, 0.9)',
          marginBottom: 24
        }}>
          <button
            type="button"
            onClick={onReturnToClient}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#475569',
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
              e.currentTarget.style.color = '#0F172A';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#475569';
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
              border: '1px solid rgba(79, 70, 229, 0.3)',
              background: 'rgba(79, 70, 229, 0.10)',
              color: '#4338CA',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(79, 70, 229, 0.12)'
            }}
          >
            <ShieldAlert size={15} color="#4F46E5" />
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
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(99, 102, 241, 0.25) 100%)',
            border: '1px solid rgba(79, 70, 229, 0.35)',
            boxShadow: '0 8px 20px rgba(79, 70, 229, 0.15)',
            marginBottom: 12
          }}>
            <ShieldAlert size={28} color="#4F46E5" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1.1,
              color: '#4F46E5',
              background: 'rgba(79, 70, 229, 0.08)',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              padding: '3px 9px',
              borderRadius: 6
            }}>
              SUPER ADMIN PORTAL
            </span>
            <span style={{ color: '#94A3B8' }}>•</span>
            <span style={{ fontSize: 11.5, color: '#059669', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
              Security Gateway v2.4
            </span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '4px 0 6px', letterSpacing: -0.4 }}>
            FinSight Admin Portal
          </h1>
          <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>
            Restricted treasury console for authorized platform administrators.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            background: 'rgba(254, 242, 242, 0.95)',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertCircle size={18} color="#E11D48" style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: '#BE123C', lineHeight: 1.45, fontWeight: 500 }}>
                {errorMessage}
              </div>
            </div>

            {canFallbackToEmail && (
              <button
                type="button"
                onClick={() => handleEmailAuthSubmit(null, email)}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(79, 70, 229, 0.35)',
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: '#4338CA',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Zap size={13} color="#4F46E5" />
                <span>Authorize with Admin Email ({email}) Directly</span>
              </button>
            )}
          </div>
        )}

        {/* Success Alert */}
        {successNotice && (
          <div style={{
            background: 'rgba(240, 253, 244, 0.95)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <CheckCircle2 size={18} color="#059669" />
            <div style={{ fontSize: 12.5, color: '#065F46', fontWeight: 600 }}>
              {successNotice}
            </div>
          </div>
        )}

        {/* 3. PROFESSIONAL AUTH METHOD SWITCHER (3 TABS) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 4,
          background: 'rgba(241, 245, 249, 0.85)',
          padding: 4,
          borderRadius: 12,
          border: '1px solid rgba(226, 232, 240, 0.9)',
          marginBottom: 18
        }}>
          {/* Tab 1: Admin Email ID */}
          <button
            type="button"
            onClick={() => { setAuthMethod('email'); setErrorMessage(null); }}
            style={{
              padding: '9px 10px',
              borderRadius: 8,
              border: authMethod === 'email' ? '1px solid rgba(79, 70, 229, 0.35)' : '1px solid transparent',
              background: authMethod === 'email' ? '#FFFFFF' : 'transparent',
              color: authMethod === 'email' ? '#0F172A' : '#475569',
              fontSize: 12,
              fontWeight: authMethod === 'email' ? 700 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: authMethod === 'email' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Mail size={13} color={authMethod === 'email' ? '#4F46E5' : '#64748B'} />
            <span>Admin Email</span>
          </button>

          {/* Tab 2: Master Key */}
          <button
            type="button"
            onClick={() => { setAuthMethod('credentials'); setErrorMessage(null); }}
            style={{
              padding: '9px 10px',
              borderRadius: 8,
              border: authMethod === 'credentials' ? '1px solid rgba(79, 70, 229, 0.35)' : '1px solid transparent',
              background: authMethod === 'credentials' ? '#FFFFFF' : 'transparent',
              color: authMethod === 'credentials' ? '#0F172A' : '#475569',
              fontSize: 12,
              fontWeight: authMethod === 'credentials' ? 700 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: authMethod === 'credentials' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <KeyRound size={13} color={authMethod === 'credentials' ? '#4F46E5' : '#64748B'} />
            <span>Master Key</span>
          </button>

          {/* Tab 3: Google SSO */}
          <button
            type="button"
            onClick={() => { setAuthMethod('google'); setErrorMessage(null); }}
            style={{
              padding: '9px 10px',
              borderRadius: 8,
              border: authMethod === 'google' ? '1px solid rgba(79, 70, 229, 0.35)' : '1px solid transparent',
              background: authMethod === 'google' ? '#FFFFFF' : 'transparent',
              color: authMethod === 'google' ? '#0F172A' : '#475569',
              fontSize: 12,
              fontWeight: authMethod === 'google' ? 700 : 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: authMethod === 'google' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google SSO</span>
          </button>
        </div>

        {/* 4. METHOD A: ADMIN EMAIL ID ACCESS (RECOMMENDED & DIRECT) */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'rgba(79, 70, 229, 0.06)',
              border: '1px solid rgba(79, 70, 229, 0.20)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Zap size={18} color="#4F46E5" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                  <span style={{ color: '#0F172A', fontWeight: 700, display: 'block' }}>
                    Whitelisted Administrator Email
                  </span>
                  Instant verified login for configured platform administrators
                </div>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#4F46E5',
                background: 'rgba(79, 70, 229, 0.12)',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                padding: '3px 7px',
                borderRadius: 5,
                letterSpacing: 0.5,
                flexShrink: 0
              }}>
                WHITELIST
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                Admin Email ID
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter administrator email address"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    background: '#FFFFFF',
                    border: '1px solid rgba(203, 213, 225, 0.9)',
                    borderRadius: 10,
                    color: '#0F172A',
                    fontSize: 13.5,
                    fontWeight: 500,
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4F46E5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(203, 213, 225, 0.9)';
                    e.target.style.boxShadow = 'inset 0 1px 2px rgba(15, 23, 42, 0.05)';
                  }}
                />
              </div>

              {/* Quick Select Admin Chips */}
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Configured Authorized Admin IDs:
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {AUTHORIZED_ADMIN_EMAILS.filter(Boolean).map(adm => (
                    <button
                      key={adm}
                      type="button"
                      onClick={() => {
                        setEmail(adm);
                        handleEmailAuthSubmit(null, adm);
                      }}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: email === adm ? '1px solid #4F46E5' : '1px solid rgba(203, 213, 225, 0.9)',
                        background: email === adm ? 'rgba(79, 70, 229, 0.1)' : '#FFFFFF',
                        color: email === adm ? '#4338CA' : '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {adm}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 18px',
                marginTop: 8,
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 10,
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Verifying Administrator Whitelist...</span>
                </div>
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

        {/* 5. METHOD B: ADMIN CREDENTIALS / MASTER KEY */}
        {authMethod === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'rgba(79, 70, 229, 0.06)',
              border: '1px solid rgba(79, 70, 229, 0.20)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <KeyRound size={18} color="#4F46E5" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                  <span style={{ color: '#0F172A', fontWeight: 700, display: 'block' }}>
                    Master Passkey Access
                  </span>
                  256-Bit Encrypted Administrative Authentication
                </div>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#4F46E5',
                background: 'rgba(79, 70, 229, 0.12)',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                padding: '3px 7px',
                borderRadius: 5,
                letterSpacing: 0.5,
                flexShrink: 0
              }}>
                MASTER
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
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
                    background: '#FFFFFF',
                    border: '1px solid rgba(203, 213, 225, 0.9)',
                    borderRadius: 10,
                    color: '#0F172A',
                    fontSize: 13.5,
                    fontWeight: 500,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4F46E5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(203, 213, 225, 0.9)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
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
                    background: '#FFFFFF',
                    border: '1px solid rgba(203, 213, 225, 0.9)',
                    borderRadius: 10,
                    color: '#0F172A',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4F46E5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(203, 213, 225, 0.9)';
                    e.target.style.boxShadow = 'none';
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
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 10,
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Authenticating Administrator...</span>
                </div>
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

        {/* 6. METHOD C: GOOGLE IDENTITY METHOD */}
        {authMethod === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'rgba(79, 70, 229, 0.06)',
              border: '1px solid rgba(79, 70, 229, 0.20)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <ShieldCheck size={18} color="#4F46E5" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                <span style={{ color: '#0F172A', fontWeight: 700, display: 'block' }}>
                  Enterprise Single Sign-On
                </span>
                Google OAuth authentication restricted to authorized admin emails
              </div>
            </div>

            <div style={{ position: 'relative', minHeight: 46 }}>
              <button
                type="button"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(203, 213, 225, 0.9)',
                  borderRadius: 12,
                  color: '#0F172A',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {loading ? (
                    <Loader2 size={18} className="animate-spin text-indigo-600" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12c0 1.97.45 3.82 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                  )}
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', letterSpacing: 0.2 }}>
                    {loading ? 'Authenticating with Google...' : 'Continue with Google'}
                  </span>
                </div>
              </button>

              {/* GIS Overlay */}
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

        {/* 7. Footer Navigation */}
        <div style={{
          marginTop: 26,
          paddingTop: 18,
          borderTop: '1px solid rgba(226, 232, 240, 0.9)',
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
              color: '#475569',
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

          <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>
            FinSight Treasury • 2026
          </span>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
