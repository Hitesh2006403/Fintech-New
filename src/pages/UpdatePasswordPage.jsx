import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { Background3D } from '../components/common/Background3D.jsx';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient.js';
import { authService } from '../services/authService.js';

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Verification & Form State
  // status: 'verifying' | 'ready' | 'success' | 'invalid'
  const [status, setStatus] = useState('verifying');
  const [errorMessage, setErrorMessage] = useState(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Empty', color: '#64748B' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#EF4444' };
    if (score === 2) return { score: 2, label: 'Fair', color: '#F59E0B' };
    if (score === 3) return { score: 3, label: 'Good', color: '#3B82F6' };
    return { score: 4, label: 'Strong', color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
  const passwordMismatch = Boolean(confirmPassword && password !== confirmPassword);

  // 1. Process Recovery Token from URL hash, search params, or Supabase Auth session
  useEffect(() => {
    let authSubscription = null;
    let isCancelled = false;

    async function processRecoveryFlow() {
      // Check for error in hash or search query
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      if (hash.includes('error=') || search.includes('error=')) {
        const params = new URLSearchParams(hash.replace(/^#/, '') || search.replace(/^\?/, ''));
        const desc = params.get('error_description') || params.get('error') || 'Recovery link has expired or is invalid.';
        if (!isCancelled) {
          setErrorMessage(decodeURIComponent(desc.replace(/\+/g, ' ')));
          setStatus('invalid');
        }
        return;
      }

      // Check for direct recovery token in query string (?token=...&email=...)
      if (search.includes('token=')) {
        const queryParams = new URLSearchParams(search);
        const token = queryParams.get('token');
        const email = queryParams.get('email');
        if (token) {
          if (!isCancelled) {
            setRecoveryToken(token);
            if (email) setRecoveryEmail(decodeURIComponent(email));
            setStatus('ready');
            cleanUrl();
          }
          return;
        }
      }

      // Check for PKCE code in query string
      if (search.includes('code=') && isSupabaseConfigured && supabase) {
        const queryParams = new URLSearchParams(search);
        const code = queryParams.get('code');
        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session) {
              if (!isCancelled) {
                setRecoveryToken(data.session.access_token);
                setRecoveryEmail(data.session.user?.email || '');
                setStatus('ready');
                cleanUrl();
              }
              return;
            }
          } catch (codeErr) {
            console.warn('PKCE exchange notice:', codeErr);
          }
        }
      }

      // Listen to Supabase Auth state change (detects PASSWORD_RECOVERY event)
      if (isSupabaseConfigured && supabase) {
        const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (isCancelled) return;

          if (event === 'PASSWORD_RECOVERY' || (session && session.user)) {
            setRecoveryToken(session?.access_token || null);
            setRecoveryEmail(session?.user?.email || '');
            setStatus('ready');
            cleanUrl();
          }
        });
        authSubscription = sub?.subscription;

        // Also check if an active recovery session already exists
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session?.user) {
            if (!isCancelled) {
              setRecoveryToken(session.access_token);
              setRecoveryEmail(session.user.email || '');
              setStatus('ready');
              cleanUrl();
              return;
            }
          }
        } catch (sessErr) {
          console.warn('Session check notice:', sessErr);
        }
      }

      // Check direct hash parameters (implicit recovery flow: #access_token=...&type=recovery)
      if (hash.includes('access_token=')) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const token = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (token && (type === 'recovery' || !type)) {
          if (!isCancelled) {
            setRecoveryToken(token);
            setStatus('ready');
            cleanUrl();
          }
          return;
        }
      }

      // If no valid tokens after short delay, transition out of verifying state
      setTimeout(() => {
        if (!isCancelled && status === 'verifying') {
          // If already set to ready, do not overwrite
          setStatus(prev => (prev === 'verifying' ? 'invalid' : prev));
          setErrorMessage('No valid password recovery token was found. Your recovery link may have expired or already been used.');
        }
      }, 2000);
    }

    function cleanUrl() {
      try {
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {
        // Safe fallback
      }
    }

    processRecoveryFlow();

    return () => {
      isCancelled = true;
      if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // 2. Handle New Password Submission
  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!password || password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setSubmitting(true);

    try {
      await authService.updatePassword({
        password,
        email: recoveryEmail,
        recoveryToken
      });

      setStatus('success');
    } catch (err) {
      console.error('Password update failure:', err);
      setSubmitError(err.message || 'Failed to update password. Your recovery link may have expired. Please request a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-root user-neumorphic-root update-password-page-root">
      {/* 3D Visual Atmosphere */}
      <Background3D />

      <div className="auth-card-surface update-password-card">
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <div className="logo-badge" style={{ width: 42, height: 42, borderRadius: 12 }}>
            <KeyRound size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--neu-text-primary)', letterSpacing: -0.3 }}>
              FinSight
            </div>
            <div style={{ fontSize: 12, color: 'var(--neu-text-secondary)', fontWeight: 500 }}>
              Secure Password Recovery
            </div>
          </div>
        </div>

        {/* STATE 1: Verifying Recovery Link */}
        {status === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{
              width: 44,
              height: 44,
              border: '3px solid rgba(5, 150, 105, 0.2)',
              borderTopColor: 'var(--neu-brand-primary)',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 0.8s linear infinite'
            }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--neu-text-primary)', margin: '0 0 6px 0' }}>
              Verifying Recovery Link
            </h2>
            <p style={{ fontSize: 13, color: 'var(--neu-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Cryptographically validating your authentication token...
            </p>
          </div>
        )}

        {/* STATE 2: Form Ready for New Password */}
        {status === 'ready' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-text-primary)', margin: '0 0 6px 0', letterSpacing: -0.4 }}>
              Set New Password
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--neu-text-secondary)', margin: '0 0 22px 0', lineHeight: 1.5 }}>
              {recoveryEmail ? (
                <>Updating password for <strong style={{ color: 'var(--neu-brand-primary)' }}>{recoveryEmail}</strong>.</>
              ) : (
                'Choose a secure new password for your FinSight account.'
              )}
            </p>

            {submitError && (
              <div className="auth-alert-error" role="alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>{submitError}</div>
              </div>
            )}

            <form onSubmit={handleSubmitNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* New Password Field */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--neu-text-primary)', marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--neu-text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="form-input-control auth-neu-input"
                    style={{ paddingLeft: 40, paddingRight: 40 }}
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
                      color: 'var(--neu-text-secondary)',
                      cursor: 'pointer',
                      padding: 4
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: 'var(--neu-text-secondary)' }}>Strength:</span>
                      <span style={{ color: passwordStrength.color, fontWeight: 700 }}>{passwordStrength.label}</span>
                    </div>
                    <div style={{ height: 4, width: '100%', background: 'var(--neu-border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(passwordStrength.score / 4) * 100}%`,
                        background: passwordStrength.color,
                        boxShadow: `0 0 6px ${passwordStrength.color}40`,
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--neu-text-primary)', marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--neu-text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="form-input-control auth-neu-input"
                    style={{
                      paddingLeft: 40,
                      paddingRight: 40,
                      borderColor: passwordMismatch
                        ? 'var(--neu-danger)'
                        : passwordsMatch
                        ? 'var(--neu-brand-primary)'
                        : undefined
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--neu-text-secondary)',
                      cursor: 'pointer',
                      padding: 4
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {passwordMismatch && (
                  <div style={{ fontSize: 11.5, color: 'var(--neu-danger)', marginTop: 4, fontWeight: 600 }}>
                    Passwords do not match
                  </div>
                )}
                {passwordsMatch && (
                  <div style={{ fontSize: 11.5, color: 'var(--neu-brand-primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <ShieldCheck size={13} />
                    Passwords match
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !passwordsMatch || password.length < 8}
                style={{
                  width: '100%',
                  padding: '12.5px 18px',
                  marginTop: 6,
                  fontSize: 14.5
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={17} />
                    <span>Update Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STATE 3: Success Screen */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--neu-success-bg)',
              color: 'var(--neu-success-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid var(--neu-success-border)',
              boxShadow: 'var(--neu-shadow-raised-sm)'
            }}>
              <CheckCircle2 size={28} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--neu-text-primary)', margin: '0 0 8px 0' }}>
              Password Updated Successfully!
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--neu-text-secondary)', margin: '0 0 24px 0', lineHeight: 1.55 }}>
              Your account password has been changed. You can now securely sign in to FinSight with your new credentials.
            </p>

            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '12.5px 18px',
                fontSize: 14.5
              }}
            >
              <span>Proceed to Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STATE 4: Invalid or Expired Token */}
        {status === 'invalid' && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--neu-danger-bg)',
              color: 'var(--neu-danger-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid var(--neu-danger-border)',
              boxShadow: 'var(--neu-shadow-raised-sm)'
            }}>
              <AlertCircle size={28} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--neu-text-primary)', margin: '0 0 8px 0' }}>
              Recovery Link Expired or Invalid
            </h2>
            <p style={{ fontSize: 13, color: 'var(--neu-text-secondary)', margin: '0 0 24px 0', lineHeight: 1.55 }}>
              {errorMessage || 'This password recovery link has either expired, already been used, or contains an invalid security token. Please request a new recovery email.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/reset-password')}
                style={{
                  width: '100%',
                  padding: '12.5px 18px',
                  fontSize: 13.5
                }}
              >
                <span>Request New Recovery Link</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/login')}
                style={{
                  width: '100%',
                  padding: '10px 18px',
                  fontSize: 13
                }}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div style={{
          marginTop: 26,
          paddingTop: 18,
          borderTop: '1px solid var(--neu-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => navigate('/login')}
            style={{
              padding: '6px 12px',
              fontSize: 12
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </button>

          <span style={{ fontSize: 11.5, color: 'var(--neu-text-secondary)', fontWeight: 500 }}>
            FinSight Security • 2026
          </span>
        </div>
      </div>
    </div>
  );
}
