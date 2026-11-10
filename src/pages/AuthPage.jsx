import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR } from '../services/financialEngine.js';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Sliders,
  AlertCircle,
  Link2,
  RefreshCw,
  Check,
  User,
  ShieldAlert,
  Loader2,
  Mail
} from 'lucide-react';
import { Background3D } from '../components/common/Background3D.jsx';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authService, isPasswordRecoveryDisabled } from '../services/authService.js';
import { navigationTracker } from '../services/navigationTracker.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '261321779368-ruajq5gea9jtv1lkrqqa2cupa6jsim9a.apps.googleusercontent.com';

export function AuthPage({ initialMode = 'login', onOpenAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    user,
    preferences,
    loginWithGoogle,
    linkGoogleAccount,
    loginWithEmail,
    registerWithEmail,
    loginAsGuest,
    completeOnboarding,
    setPreferences
  } = useApp();

  // Local fallback for non-routed modal states like link_account
  const [internalMode, setInternalMode] = useState(initialMode);

  // Synchronize mode reactively based on route or initialMode
  const mode = React.useMemo(() => {
    if (location.pathname === '/register') return 'register';
    if (location.pathname === '/reset-password') return 'forgot';
    if (location.pathname === '/setup' || location.pathname === '/onboarding') return 'onboarding';
    if (location.pathname === '/login') return 'login';
    return internalMode || initialMode || 'login';
  }, [location.pathname, internalMode, initialMode]);

  const navigateToMode = (targetMode) => {
    setAuthError(null);
    if (targetMode === 'register') {
      navigate('/register');
    } else if (targetMode === 'login') {
      navigate('/login');
    } else if (targetMode === 'forgot') {
      navigate('/reset-password');
    } else if (targetMode === 'onboarding') {
      navigate('/setup?step=1');
    } else {
      setInternalMode(targetMode);
    }
  };

  const [email, setEmail] = useState('alex@example.com');
  const [password, setPassword] = useState('FinSight2026!Secured');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('Alex Vance');
  const [confirmPassword, setConfirmPassword] = useState('FinSight2026!Secured');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  
  // Password Recovery state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccessNotice, setForgotSuccessNotice] = useState(null);

  // Authentication status & error handling (Requirements 11 & 12)
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authNotice, setAuthNotice] = useState(null);

  // Account linking state (Requirement 8)
  const [conflictData, setConflictData] = useState(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  // Setup Wizard Step: Synchronized with URL search params (?step=1 | ?step=2)
  const stepQuery = searchParams.get('step');
  const onboardingStep = stepQuery === '2' ? 2 : 1;

  // Setup Wizard field state with persistent draft restoration
  const initialDraft = navigationTracker.loadSetupDraft(preferences);
  const [obBalance, setObBalance] = useState(initialDraft.balance);
  const [obBuffer, setObBuffer] = useState(initialDraft.buffer);
  const [obFrequency, setObFrequency] = useState(initialDraft.frequency);
  const [obThreshold, setObThreshold] = useState(initialDraft.threshold);

  // Persist wizard draft on field changes
  useEffect(() => {
    navigationTracker.saveSetupDraft({
      balance: obBalance,
      buffer: obBuffer,
      frequency: obFrequency,
      threshold: obThreshold
    });
  }, [obBalance, obBuffer, obFrequency, obThreshold]);

  // Google Identity Services (GIS) button ref & initialization tracking
  const googleBtnRef = useRef(null);
  const [gisReady, setGisReady] = useState(false);
  const gisInitializedRef = useRef(false);

  // Handle Google Credential Response
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setAuthError('Authentication canceled or no credential was returned by Google.');
      return;
    }

    if (loading) return; // Prevent multiple simultaneous login submissions

    setAuthError(null);
    setLoading(true);

    try {
      const data = await loginWithGoogle(response.credential);
      const isAdminUser = Boolean(
        data?.user?.isAdmin ||
        data?.role === 'admin' ||
        data?.user?.role === 'Super Administrator' ||
        ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((data?.user?.email || '').toLowerCase().trim())
      );

      // Direct, reliable role-based navigation without redirect loops
      const dest = isAdminUser ? '/admin' : '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      console.warn('Google authentication response notice:', err.message);
      if (err.code === 'EXISTING_LOCAL_ACCOUNT') {
        // Trigger secure account linking modal
        setConflictData({
          email: err.details?.email || email,
          credential: response.credential,
          message: err.message
        });
        setInternalMode('link_account');
      } else {
        setAuthError(err.message || 'Google authentication failed. Please check your network and retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setLoading(true);
    setAuthError(null);
    try {
      loginAsGuest();
    } catch (err) {
      setAuthError('Could not start guest session.');
      setLoading(false);
    }
  };

  // Initialize Google Identity Services (Requirements 1, 3, 4)
  useEffect(() => {
    let intervalId = null;

    const setupGis = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          if (!gisInitializedRef.current) {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleGoogleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
              context: 'signin',
              itp_support: true
            });
            gisInitializedRef.current = true;
          }

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            // Dynamically calculate appropriate button width for mobile/desktop
            const containerWidth = googleBtnRef.current.offsetWidth || (window.innerWidth < 420 ? window.innerWidth - 48 : 380);
            const btnWidth = Math.min(400, Math.max(240, containerWidth));

            // Render genuine GIS button
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'filled_black',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: btnWidth
            });
            setGisReady(true);
          }
        } catch (e) {
          console.error('Failed to initialize Google Identity Services:', e);
        }
        if (intervalId) clearInterval(intervalId);
      }
    };

    // Try immediately
    setupGis();

    // Check periodically if library script is still loading
    intervalId = setInterval(setupGis, 300);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode]);

  // Fallback trigger if user clicks the button before/around overlay
  const handleGoogleBtnClick = () => {
    setAuthError(null);
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            console.warn('GIS One Tap prompt not displayed:', notification.getNotDisplayedReason());
          } else if (notification.isSkippedMoment()) {
            console.warn('GIS One Tap prompt skipped:', notification.getSkippedReason());
          } else if (notification.isDismissedMoment()) {
            console.warn('GIS One Tap prompt dismissed:', notification.getDismissedReason());
          }
        });
      } catch (err) {
        console.warn('GIS prompt trigger error:', err);
      }
    } else {
      setAuthError('Google Identity Services library is still connecting. Please check your network and retry.');
    }
  };

  // Handle standard email/password login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      const data = await loginWithEmail(email, password);
      const isAdminUser = Boolean(
        data?.user?.isAdmin ||
        data?.role === 'admin' ||
        data?.user?.role === 'Super Administrator' ||
        ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((data?.user?.email || email || '').toLowerCase().trim())
      );
      if (data?.user && !data.user.onboardingCompleted && !isAdminUser) {
        navigate('/setup?step=1');
      } else {
        const dest = data?.redirectTo || (isAdminUser ? '/admin' : '/dashboard');
        navigate(dest);
      }
    } catch (err) {
      setAuthError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Empty', color: '#94A3B8' };
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

  // Handle email/password registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (!fullName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setAuthError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    if (!agreeTerms) {
      setAuthError('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const data = await registerWithEmail(email, fullName, password);
      const isAdminUser = Boolean(
        data?.user?.isAdmin ||
        data?.role === 'admin' ||
        data?.user?.role === 'Super Administrator' ||
        ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((data?.user?.email || email || '').toLowerCase().trim())
      );
      if (isAdminUser || data?.redirectTo === '/admin') {
        navigate(data?.redirectTo || '/admin');
      } else {
        navigate('/setup?step=1');
      }
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Account Linking (Requirement 8)
  const handleAccountLinkSubmit = async (e) => {
    e.preventDefault();
    if (!conflictData) return;

    setAuthError(null);
    setLinkLoading(true);

    try {
      const data = await linkGoogleAccount({
        email: conflictData.email,
        password: linkPassword,
        credential: conflictData.credential
      });
      setAuthNotice('Google account successfully linked!');
      const isAdminUser = Boolean(
        data?.user?.isAdmin ||
        data?.role === 'admin' ||
        data?.user?.role === 'Super Administrator' ||
        ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((data?.user?.email || conflictData?.email || '').toLowerCase().trim())
      );
      const dest = data?.redirectTo || (isAdminUser ? '/admin' : '/dashboard');
      navigate(dest);
    } catch (err) {
      setAuthError(err.message || 'Failed to link account. Please verify password.');
    } finally {
      setLinkLoading(false);
    }
  };

  // Handle Password Recovery Request (Task 2)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError(null);

    if (isPasswordRecoveryDisabled()) {
      setForgotError('Password recovery is temporarily unavailable. Please try again later.');
      return;
    }

    const targetEmail = (forgotEmail || email || '').trim();

    if (!targetEmail) {
      setForgotError('Please enter your account email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setForgotError('Please enter a valid email address format (e.g. name@example.com).');
      return;
    }

    setForgotLoading(true);

    try {
      const result = await authService.requestPasswordRecovery(targetEmail);
      setForgotSuccessNotice(
        result.message ||
        'If an account exists for this email address, a password recovery link will be sent.'
      );
      setForgotSubmitted(true);
    } catch (err) {
      console.error('Password recovery dispatch error:', err);
      setForgotError(err.message || 'Failed to dispatch password recovery email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Wizard Step Navigation Handlers
  const handleStep1Next = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!obBalance || isNaN(Number(obBalance))) {
      setAuthError('Please enter a valid Current Recorded Bank Balance.');
      return;
    }
    if (!obBuffer || isNaN(Number(obBuffer))) {
      setAuthError('Please enter a valid Minimum Safety Buffer Target.');
      return;
    }
    setAuthError(null);
    navigationTracker.saveSetupDraft({
      balance: obBalance,
      buffer: obBuffer,
      frequency: obFrequency,
      threshold: obThreshold
    });
    setSearchParams({ step: '2' });
  };

  const handleStep2Back = () => {
    setAuthError(null);
    navigationTracker.saveSetupDraft({
      balance: obBalance,
      buffer: obBuffer,
      frequency: obFrequency,
      threshold: obThreshold
    });
    if (navigationTracker.canGoBack()) {
      navigate(-1);
    } else {
      setSearchParams({ step: '1' });
    }
  };

  const handleStep1Back = () => {
    setAuthError(null);
    // Requirement 4.5: Navigate to genuine previous in-app page when one exists.
    // Otherwise provide appropriate in-app navigation option without forcing user out of website.
    if (navigationTracker.canGoBack()) {
      navigate(-1);
    } else {
      if (user && user.isAuthenticated) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }
  };

  // Handle Onboarding Completion (Requirement 10 & Flow 4.6)
  const handleOnboardingFinish = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      setPreferences(prev => ({
        ...prev,
        startingBalance: Number(obBalance),
        safetyBuffer: Number(obBuffer),
        incomeFrequency: obFrequency,
        lowBalanceAlertThreshold: Number(obThreshold)
      }));

      await completeOnboarding();
      navigationTracker.clearSetupDraft();

      const isAdminUser = Boolean(
        user?.isAdmin ||
        user?.role === 'Super Administrator' ||
        ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((user?.email || '').toLowerCase().trim())
      );
      // Requirement 4.6: Predictable navigation without trapping user in duplicate wizard history entries
      navigate(isAdminUser ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      console.error('Error completing onboarding:', err);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-root">
      {/* Background 3D Animated Scene */}
      <Background3D />
      
      {/* Left Showcase Panel */}
      <div className="auth-showcase-panel">
        {/* Glow & Curve background */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 450, height: 450, background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Brand Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #38BDF8 0%, #6366F1 50%, #A78BFA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(56, 189, 248, 0.45)', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B1220" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, color: '#F8FAFC' }}>FinSight</span>
            <span style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, padding: '3px 8px', borderRadius: 6, boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)' }}>
              UNCERTAIN INCOME PLANNER
            </span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 20, padding: '6px 14px', color: '#38BDF8', fontSize: 12.5, fontWeight: 600, marginBottom: 20 }}>
            <Sparkles size={14} color="#38BDF8" />
            <span>Built for Freelancers, Creators & Milestone Professionals</span>
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.16, letterSpacing: -0.8, marginBottom: 18, maxWidth: 520, color: '#F8FAFC' }}>
            Make smarter decisions with irregular money.
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#94A3B8', maxWidth: 480, marginBottom: 36 }}>
            Never wonder if you can afford rent before an invoice clears. Model payment delays, calculate pure Safe-to-Spend, and protect your cash buffer.
          </p>

          {/* Feature Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.82)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(56, 189, 248, 0.14)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(56, 189, 248, 0.25)', boxShadow: '0 0 12px rgba(56, 189, 248, 0.15)' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#F8FAFC' }}>True Safe-to-Spend Engine</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Separates actual bank cash from unreceived promises.</div>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.82)', border: '1px solid rgba(255, 255, 255, 0.08)', borderTop: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245, 158, 11, 0.14)', color: '#FBBF24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(245, 158, 11, 0.25)', boxShadow: '0 0 12px rgba(245, 158, 11, 0.15)' }}>
                <Sliders size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#F8FAFC' }}>Payment Delay Stress-Tester</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Simulate 10–30 day invoice delays before they trigger panic.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 20, fontSize: 12, color: '#94A3B8' }}>
          <span>Indian Currency Architecture (₹ INR)</span>
          <span>Google OAuth 2.0 & SOC-2 Verified</span>
        </div>
      </div>

      {/* Right Authentication & Onboarding Form Panel */}
      <div className="auth-form-panel">
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Mobile-Only Brand Header */}
          <div className="auth-mobile-brand-header">
            <div className="auth-mobile-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B1220" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.4, color: '#F8FAFC' }}>FinSight</span>
                <span style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
                  PLANNER
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Uncertain Income Treasury</div>
            </div>
          </div>

          {/* Feedback Alerts */}
          {authError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '13px',
                color: '#FCA5A5',
                backdropFilter: 'blur(8px)'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, lineHeight: '1.45' }}>{authError}</div>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', fontWeight: 700 }}
              >
                ×
              </button>
            </div>
          )}

          {authNotice && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#6EE7B7',
                backdropFilter: 'blur(8px)'
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{authNotice}</div>
            </div>
          )}
          


          {/* Mode 1: Login */}
          {mode === 'login' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h2 style={{ fontSize: 26, fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: -0.3 }}>
                  Welcome back
                </h2>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38BDF8',
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    setEmail('alex@example.com');
                    setPassword('FinSight2026!Secured');
                  }}
                  title="Auto-fill demo credentials"
                >
                  <Sparkles size={12} />
                  <span>Auto-fill</span>
                </button>
              </div>

              <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 20px 0' }}>
                Sign in to continue to your financial dashboard.
              </p>

              {/* Google SSO Button Container (Natively rendered GIS button + resilient mobile touch fallback) */}
              <div style={{ position: 'relative', width: '100%', marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  ref={googleBtnRef}
                  style={{
                    width: '100%',
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                />

                {/* Visible fallback button while GIS script is loading or if adblocker blocks GIS */}
                {!gisReady && (
                  <button
                    type="button"
                    className="btn-google-sso"
                    onClick={handleGoogleBtnClick}
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.22)',
                      borderRadius: '10px',
                      padding: '11px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: loading ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
                      opacity: loading ? 0.7 : 1,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {loading ? (
                        <RefreshCw size={18} className="spin" color="#38BDF8" />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24">
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
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#F8FAFC' }}>
                        {loading ? 'Authenticating with Google...' : 'Continue with Google'}
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase' }}>
                  OR CONTINUE WITH EMAIL
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              </div>

              <form onSubmit={handleLoginSubmit}>
                <div className="form-group-item">
                  <label className="form-label-title" style={{ color: '#F8FAFC' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      className="form-input-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="form-label-title" style={{ margin: 0, color: '#F8FAFC' }}>Password</label>
                    <a
                      href="#forgot"
                      style={{ fontSize: 12, color: '#38BDF8', textDecoration: 'none', fontWeight: 600 }}
                      onClick={(e) => { e.preventDefault(); navigateToMode('forgot'); }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      style={{ letterSpacing: showPassword ? 'normal' : '2px' }}
                    />
                    <button
                      type="button"
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember this device */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0 20px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: '#38BDF8', width: 16, height: 16, borderRadius: 4 }} />
                    <span>Remember this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14.5 }}
                >
                  {loading ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Guest Access Option for Zero-Friction 70% Prototype Evaluation */}
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={loading}
                  id="guest-login-button"
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38BDF8',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: loading ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 12px rgba(56, 189, 248, 0.12)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.16)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                  }}
                >
                  <User size={16} />
                  <span>Explore as Guest (Instant Access)</span>
                </button>
              </div>

              <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                Don't have an account?{' '}
                <a
                  href="#register"
                  style={{ color: '#38BDF8', fontWeight: 600, textDecoration: 'none' }}
                  onClick={(e) => { e.preventDefault(); navigateToMode('register'); }}
                >
                  Create account
                </a>
              </div>
            </div>
          )}

          {/* Mode 2: Register */}
          {mode === 'register' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={() => navigateToMode('login')}
                  aria-label="Back to Sign In"
                  id="register-back-button"
                >
                  <ArrowLeft size={15} />
                  <span>Back to Sign In</span>
                </button>
              </div>

              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#F8FAFC', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                Create Your Account
              </h2>
              <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 22px 0' }}>
                Set up your uncertain income workspace in 60 seconds.
              </p>

              <form onSubmit={handleRegisterSubmit}>
                {/* 1. Personal Information Section */}
                <div style={{ marginBottom: 16 }}>
                  <div className="form-group-item">
                    <label className="form-label-title" style={{ color: '#F8FAFC' }}>Full Name</label>
                    <input
                      type="text"
                      className="form-input-control"
                      placeholder="e.g. Alex Vance"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title" style={{ color: '#F8FAFC' }}>Email Address</label>
                    <input
                      type="email"
                      className="form-input-control"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* 2. Security & Credentials Section */}
                <div style={{ marginBottom: 12 }}>
                  <div className="form-group-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label-title" style={{ margin: 0, color: '#F8FAFC' }}>Create Password</label>
                      {password && (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: passwordStrength.color }}>
                          {passwordStrength.label}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input-control"
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        style={{ letterSpacing: showPassword ? 'normal' : '1.5px', paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: 4
                        }}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Interactive Password Strength Indicator */}
                    {password && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 2,
                              background: passwordStrength.score >= step ? passwordStrength.color : 'rgba(255, 255, 255, 0.1)',
                              transition: 'background 0.2s ease'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="form-group-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label-title" style={{ margin: 0, color: '#F8FAFC' }}>Confirm Password</label>
                      {confirmPassword && (
                        <span style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: passwordsMatch ? '#10B981' : '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          {passwordsMatch ? (
                            <>
                              <Check size={12} strokeWidth={3} />
                              <span>Passwords match</span>
                            </>
                          ) : (
                            <span>Passwords do not match</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-input-control"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        style={{
                          letterSpacing: showConfirmPassword ? 'normal' : '1.5px',
                          paddingRight: 40,
                          borderColor: passwordMismatch ? 'rgba(239, 68, 68, 0.5)' : (passwordsMatch ? 'rgba(16, 185, 129, 0.5)' : undefined)
                        }}
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: 4
                        }}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions Agreement */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 18px 0', fontSize: 12.5, color: '#94A3B8' }}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ accentColor: '#38BDF8', width: 16, height: 16, borderRadius: 4, cursor: 'pointer' }}
                    id="agreeTerms"
                  />
                  <label htmlFor="agreeTerms" style={{ cursor: 'pointer', userSelect: 'none' }}>
                    I agree to the <span style={{ color: '#38BDF8', fontWeight: 600 }}>Terms of Service</span> & <span style={{ color: '#38BDF8', fontWeight: 600 }}>Privacy Policy</span>
                  </label>
                </div>

                {/* 5. Primary Submit Button */}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '12.5px',
                    fontSize: 14.5
                  }}
                >
                  {loading ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <span>Continue to Financial Setup</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Guest Option in Register Mode */}
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={loading}
                  id="register-guest-button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.28)',
                    color: '#38BDF8',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: loading ? 'wait' : 'pointer'
                  }}
                >
                  <User size={15} />
                  <span>Skip and Explore as Guest</span>
                </button>
              </div>

              {/* 6. Footer Navigation Links */}
              <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  Already registered?{' '}
                  <a
                    href="#login"
                    style={{ color: '#38BDF8', fontWeight: 600, textDecoration: 'none' }}
                    onClick={(e) => { e.preventDefault(); setAuthError(null); navigateToMode('login'); }}
                  >
                    Sign in
                  </a>
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Trouble logging in?{' '}
                  <a
                    href="#forgot"
                    style={{ color: '#38BDF8', fontWeight: 500, textDecoration: 'none' }}
                    onClick={(e) => { e.preventDefault(); setAuthError(null); navigateToMode('forgot'); }}
                  >
                    Forgot password
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Mode: Account Linking Modal (Requirement 8) */}
          {mode === 'link_account' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={() => navigateToMode('login')}
                  aria-label="Return to Sign In"
                  id="link-account-back-button"
                >
                  <ArrowLeft size={15} />
                  <span>Return to Sign In</span>
                </button>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                <Link2 size={14} />
                <span>Account Linking Required</span>
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F8FAFC', margin: '0 0 6px 0' }}>
                Link Google Account
              </h2>
              <p style={{ fontSize: 13.5, color: '#94A3B8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                An existing account with <strong>{conflictData?.email}</strong> already exists. To securely connect your Google credentials and prevent unauthorized access, please confirm your account password.
              </p>

              <form onSubmit={handleAccountLinkSubmit}>
                <div className="form-group-item">
                  <label className="form-label-title" style={{ color: '#F8FAFC' }}>Account Email</label>
                  <input
                    type="email"
                    className="form-input-control"
                    value={conflictData?.email || ''}
                    disabled
                    style={{ background: 'rgba(15, 23, 42, 0.5)', cursor: 'not-allowed', color: '#94A3B8' }}
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label-title" style={{ color: '#F8FAFC' }}>Existing Account Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showLinkPassword ? 'text' : 'password'}
                      className="form-input-control"
                      value={linkPassword}
                      onChange={(e) => setLinkPassword(e.target.value)}
                      placeholder="Enter your existing password"
                      required
                      disabled={linkLoading}
                      autoFocus
                    />
                    <button
                      type="button"
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                      onClick={() => setShowLinkPassword(!showLinkPassword)}
                    >
                      {showLinkPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={linkLoading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14.5, marginTop: 10 }}
                >
                  {linkLoading ? (
                    <span>Verifying & Linking...</span>
                  ) : (
                    <>
                      <span>Verify & Link Google Account</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'center', color: '#94A3B8', fontSize: 12.5, marginTop: 14, cursor: 'pointer' }}
                  onClick={() => {
                    navigateToMode('login');
                    setConflictData(null);
                    setLinkPassword('');
                  }}
                >
                  ← Cancel and return to Sign In
                </button>
              </form>
            </div>
          )}

          {/* Mode 3: Forgot Password */}
          {mode === 'forgot' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={() => navigateToMode('login')}
                  aria-label="Back to Sign In"
                  id="forgot-back-button"
                >
                  <ArrowLeft size={15} />
                  <span>Back to Sign In</span>
                </button>
              </div>

              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#F8FAFC', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                Reset Password
              </h2>
              <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                Enter your account email address and we'll dispatch a secure, time-limited recovery link.
              </p>

              {/* Temporary Maintenance Advisory */}
              {isPasswordRecoveryDisabled() && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  color: '#FCD34D',
                  fontSize: 13,
                  lineHeight: 1.45
                }}>
                  <AlertCircle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong style={{ display: 'block', color: '#FDE68A', marginBottom: 2 }}>Maintenance Notice</strong>
                    Password recovery is temporarily unavailable. Please try again later.
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {forgotError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 10,
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
                  <div>{forgotError}</div>
                </div>
              )}

              {forgotSubmitted ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '26px 22px', borderRadius: 14, textAlign: 'center', backdropFilter: 'blur(12px)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1px solid rgba(16, 185, 129, 0.35)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)' }}>
                    <CheckCircle2 size={26} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC', margin: '0 0 8px 0' }}>
                    Recovery Link Dispatched
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#CBD5E1', margin: '0 0 12px 0', lineHeight: 1.55 }}>
                    {forgotSuccessNotice}
                  </p>
                  <p style={{ fontSize: 12.5, color: '#94A3B8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                    Please check your inbox (including your spam or junk folder). The recovery link will redirect you to update your password.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 13.5 }}
                      onClick={() => { setForgotSubmitted(false); setForgotError(null); navigateToMode('login'); }}
                    >
                      <span>Return to Sign In</span>
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: 12.5, cursor: 'pointer', padding: 6, fontWeight: 600 }}
                      onClick={() => { setForgotSubmitted(false); setForgotError(null); }}
                    >
                      Did not receive link? Try again
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit}>
                  <div className="form-group-item">
                    <label className="form-label-title" style={{ color: '#F8FAFC' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        className="form-input-control"
                        placeholder="name@example.com"
                        value={forgotEmail || email}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          setEmail(e.target.value);
                          if (forgotError) setForgotError(null);
                        }}
                        required
                        disabled={forgotLoading || isPasswordRecoveryDisabled()}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={forgotLoading || isPasswordRecoveryDisabled()}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '12px',
                      fontSize: 14.5,
                      marginTop: 8,
                      opacity: (forgotLoading || isPasswordRecoveryDisabled()) ? 0.65 : 1,
                      cursor: (forgotLoading || isPasswordRecoveryDisabled()) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isPasswordRecoveryDisabled() ? (
                      <span>Password Recovery Unavailable</span>
                    ) : forgotLoading ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                        <span>Sending Recovery Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Recovery Link</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  {/* Professional Bottom Navigation */}
                  <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <button
                        type="button"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(15, 23, 42, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#F8FAFC',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '7px 14px',
                          borderRadius: 6,
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => { setForgotError(null); navigateToMode('login'); }}
                      >
                        <ArrowLeft size={14} />
                        <span>Return to Sign In</span>
                      </button>
                    </div>

                    <div style={{ fontSize: 12.5, color: '#94A3B8' }}>
                      Don't have an account yet?{' '}
                      <a
                        href="#register"
                        style={{ color: '#38BDF8', fontWeight: 600, textDecoration: 'none' }}
                        onClick={(e) => { e.preventDefault(); setForgotError(null); navigateToMode('register'); }}
                      >
                        Create an account
                      </a>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Mode 4: 2-Step Onboarding Wizard */}
          {mode === 'onboarding' && (
            <div className="wizard-step-container">
              {/* Responsive Wizard Header Navigation with Visible Back Button */}
              <div className="wizard-header-nav">
                <button
                  type="button"
                  className="wizard-back-btn"
                  onClick={onboardingStep === 2 ? handleStep2Back : handleStep1Back}
                  aria-label={onboardingStep === 2 ? 'Return to Step 1: Baseline Cash & Safety Buffer' : 'Back to previous screen'}
                  id="wizard-back-button"
                >
                  <ArrowLeft size={16} />
                  <span className="wizard-back-btn-text">
                    {onboardingStep === 2 ? 'Back to Step 1' : 'Back'}
                  </span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="wizard-step-badge" style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', background: 'rgba(56, 189, 248, 0.12)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    Setup Wizard • Step {onboardingStep} of 2
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>Currency: INR (₹)</span>
                </div>
              </div>

              {onboardingStep === 1 ? (
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', marginBottom: 6 }}>
                    Baseline Cash & Safety Buffer
                  </h3>
                  <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 18 }}>
                    Establish your true recorded available balance and minimum comfort reserve.
                  </p>

                  <div className="form-group-item">
                    <label className="form-label-title" style={{ color: '#F8FAFC' }}>Current Recorded Bank Balance (₹ INR) *</label>
                    <input
                      type="number"
                      className="form-input-control"
                      value={obBalance}
                      onChange={(e) => setObBalance(e.target.value)}
                      required
                      id="wizard-balance-input"
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title" style={{ color: '#F8FAFC' }}>Minimum Safety Buffer Target (₹ INR) *</label>
                    <input
                      type="number"
                      className="form-input-control"
                      value={obBuffer}
                      onChange={(e) => setObBuffer(e.target.value)}
                      required
                      id="wizard-buffer-input"
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title" style={{ color: '#F8FAFC' }}>Typical Income Frequency</label>
                    <select
                      className="form-input-control"
                      value={obFrequency}
                      onChange={(e) => setObFrequency(e.target.value)}
                      id="wizard-frequency-select"
                    >
                      <option value="Irregular / Milestone-based">Irregular / Milestone-based</option>
                      <option value="Gig / Weekly Variable">Gig / Weekly Variable</option>
                      <option value="Commission-based">Commission-based</option>
                      <option value="Monthly Retainer with Delays">Monthly Retainer with Delays</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 14 }}
                    onClick={handleStep1Next}
                    id="wizard-next-btn"
                  >
                    <span>Next: Set Alerts & Finish</span>
                    <ArrowRight size={15} />
                  </button>

                  {/* Secondary return option on Step 1 */}
                  <div style={{ marginTop: 14, textAlign: 'center' }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 6,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#38BDF8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
                      onClick={handleStep1Back}
                      aria-label="Return to previous screen"
                      id="wizard-step1-return-btn"
                    >
                      <ArrowLeft size={13} />
                      <span>
                        {navigationTracker.canGoBack() ? 'Return to Previous Screen' : (user?.isAuthenticated ? 'Return to Dashboard' : 'Return to Sign In')}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', marginBottom: 6 }}>
                    Alert Thresholds & Review
                  </h3>
                  <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 18 }}>
                    Configure automated notifications when liquidity drops below safe levels.
                  </p>

                  <div className="form-group-item">
                    <label className="form-label-title" style={{ color: '#F8FAFC' }}>Low Balance Warning Trigger (₹ INR)</label>
                    <input
                      type="number"
                      className="form-input-control"
                      value={obThreshold}
                      onChange={(e) => setObThreshold(e.target.value)}
                      id="wizard-threshold-input"
                    />
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: 16, borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: 20, fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700, color: '#F8FAFC', marginBottom: 6 }}>Ready to calculate Safe-to-Spend!</div>
                    Starting Balance: <strong style={{ color: '#F8FAFC' }}>{formatINR(Number(obBalance))}</strong><br />
                    Protected Safety Buffer: <strong style={{ color: '#38BDF8' }}>{formatINR(Number(obBuffer))}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={handleStep2Back}
                      aria-label="Back to Step 1"
                      id="wizard-step2-back-btn"
                    >
                      <ArrowLeft size={15} />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={loading}
                      style={{ flex: 2, justifyContent: 'center', padding: '12px' }}
                      onClick={handleOnboardingFinish}
                      id="wizard-finish-btn"
                    >
                      <CheckCircle2 size={16} />
                      <span>{loading ? 'Launching...' : 'Launch Planner Workspace'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
