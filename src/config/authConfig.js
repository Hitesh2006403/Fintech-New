/**
 * UNCERTAIN INCOME PLANNER / FINSIGHT - AUTH CONFIGURATION
 * Centralized OAuth and Origin configuration shared across User & Admin portals
 */

// Google Cloud OAuth 2.0 Web Client ID
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '261321779368-ruajq5gea9jtv1lkrqqa2cupa6jsim9a.apps.googleusercontent.com';

// Standard local development origins to register in Google Cloud Console
export const RECOMMENDED_LOCAL_ORIGINS = [
  'https://fin-tech-vert-alpha.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
];

/**
 * Diagnostics helper to verify whether current window origin is aligned with OAuth requirements
 */
export function getOAuthOriginDiagnostics() {
  if (typeof window === 'undefined') {
    return {
      currentOrigin: '',
      isStandardPort: true,
      protocol: '',
      needsRegistration: false
    };
  }

  const currentOrigin = window.location.origin;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isStandardPort = window.location.port === '5173';

  return {
    currentOrigin,
    isLocalhost,
    isStandardPort,
    hostname: window.location.hostname,
    port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
    protocol: window.location.protocol,
    googleClientId: GOOGLE_CLIENT_ID,
    recommendedOrigins: RECOMMENDED_LOCAL_ORIGINS
  };
}
