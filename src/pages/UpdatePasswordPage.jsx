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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
      background: '#090D14'
    }}>
      {/* 3D Visual Atmosphere */}
      <Background3D />

      <div style={{
        width: '100%',
        maxWidth: 460,
        background: 'rgba(14, 21, 34, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: 22,
        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 35px rgba(56, 189, 248, 0.1)',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 10
      }}>

        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #38BDF8 0%, #6366F1 50%, #A78BFA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <KeyRound size={22} color="#0B1220" />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#F8FAFC', letterSpacing: -0.3 }}>
              FinSight
            </div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 500 }}>
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
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38BDF8',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 0.8s linear infinite'
            }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC', margin: '0 0 6px 0' }}>
              Verifying Recovery Link
            </h2>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
              Cryptographically validating your authentication token...
            </p>
          </div>
        )}

        {/* STATE 2: Form Ready for New Password */}
        {status === 'ready' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', margin: '0 0 6px 0', letterSpacing: -0.4 }}>
              Set New Password
            </h1>
            <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '0 0 22px 0', lineHeight: 1.5 }}>
              {recoveryEmail ? (
                <>Updating password for <strong style={{ color: '#38BDF8' }}>{recoveryEmail}</strong>.</>
              ) : (
                'Choose a secure new password for your FinSight account.'
              )}
            </p>

            {submitError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 18,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                color: '#FCA5A5',
                fontSize: 13,
                lineHeight: 1.45
              }}>
                <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>{submitError}</div>
              </div>
            )}

            <form onSubmit={handleSubmitNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* New Password Field */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 40px',
                      background: 'rgba(8, 12, 20, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
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

                {/* Password Strength Meter */}
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: '#94A3B8' }}>Strength:</span>
                      <span style={{ color: passwordStrength.color, fontWeight: 700 }}>{passwordStrength.label}</span>
                    </div>
                    <div style={{ height: 4, width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(passwordStrength.score / 4) * 100}%`,
                        background: passwordStrength.color,
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 40px',
                      background: 'rgba(8, 12, 20, 0.85)',
                      border: passwordMismatch
                        ? '1px solid #EF4444'
                        : passwordsMatch
                        ? '1px solid #10B981'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 10,
                      color: '#F8FAFC',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box'
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
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 4
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {passwordMismatch && (
                  <div style={{ fontSize: 11.5, color: '#EF4444', marginTop: 4 }}>
                    Passwords do not match
                  </div>
                )}
                {passwordsMatch && (
                  <div style={{ fontSize: 11.5, color: '#10B981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={13} />
                    Passwords match
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !passwordsMatch || password.length < 8}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  marginTop: 6,
                  background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submitting || !passwordsMatch || password.length < 8 ? 'not-allowed' : 'pointer',
                  opacity: submitting || !passwordsMatch || password.length < 8 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 18px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.15s ease'
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
              background: 'rgba(16, 185, 129, 0.18)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={28} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 8px 0' }}>
              Password Updated Successfully!
            </h2>
            <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '0 0 24px 0', lineHeight: 1.55 }}>
              Your account password has been changed. You can now securely sign in to FinSight with your new credentials.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '12px 18px',
                background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 10,
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 18px rgba(37, 99, 235, 0.35)'
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
              background: 'rgba(239, 68, 68, 0.18)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.25)'
            }}>
              <AlertCircle size={28} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#F8FAFC', margin: '0 0 8px 0' }}>
              Recovery Link Expired or Invalid
            </h2>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 24px 0', lineHeight: 1.55 }}>
              {errorMessage || 'This password recovery link has either expired, already been used, or contains an invalid security token. Please request a new recovery email.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 18px rgba(37, 99, 235, 0.35)'
                }}
              >
                <span>Request New Recovery Link</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 8
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
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
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
            <span>Back to Sign In</span>
          </button>

          <span style={{ fontSize: 11.5, color: '#64748B' }}>
            FinSight Security • 2026
          </span>
        </div>
      </div>
    </div>
  );
}
