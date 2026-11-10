import { OAuth2Client } from 'google-auth-library';
import { db, verifyPassword } from './db.js';

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  '261321779368-ruajq5gea9jtv1lkrqqa2cupa6jsim9a.apps.googleusercontent.com';
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Validates Google ID token using Google's official library
 * Validates:
 * 1. Cryptographic signature with Google public certs
 * 2. Audience matches configured client ID
 * 3. Issuer is accounts.google.com or https://accounts.google.com
 * 4. Expiration timestamp
 * 5. Email verified flag
 */
export async function verifyGoogleIdToken(token) {
  if (!token) {
    throw new Error('Missing Google ID credential token');
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Empty payload returned from Google verification');
  }

  // Validate issuer
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    throw new Error(`Invalid Google token issuer: ${payload.iss}`);
  }

  // Validate audience
  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error(`Token audience mismatch. Expected ${GOOGLE_CLIENT_ID}, received ${payload.aud}`);
  }

  // Validate expiration
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowInSeconds) {
    throw new Error('Google ID token has expired');
  }

  // Ensure email is verified
  if (!payload.email_verified) {
    throw new Error('Google account email has not been verified');
  }

  return {
    googleSub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || 'Google User',
    picture: payload.picture || null
  };
}

/**
 * Authenticates or resolves Google user in the database
 * Prevents silent account merging per Requirement 8
 */
export async function processGoogleAuth({ token }) {
  const googleData = await verifyGoogleIdToken(token);

  // Check if verified email matches administrator configuration
  const isAdmin = db.isAuthorizedAdminEmail(googleData.email);

  // 1. Check if user already exists by verified Google Sub
  let user = db.getUserByGoogleSub(googleData.googleSub);
  if (user) {
    if (isAdmin && user.role !== 'Super Administrator') {
      user = db.updateUser(user.id, {
        role: 'Super Administrator',
        onboardingCompleted: true,
        picture: googleData.picture || user.picture
      });
    }
    return { status: 'authenticated', user, isAdmin };
  }

  // 2. Check if user exists by email
  const existingByEmail = db.getUserByEmail(googleData.email);
  if (existingByEmail) {
    // If user has local password account with a password set and without Google sub linked
    if (!existingByEmail.googleSub && existingByEmail.passwordHash && existingByEmail.authProvider === 'local') {
      return {
        status: 'account_conflict',
        conflictType: 'EXISTING_LOCAL_ACCOUNT',
        email: googleData.email,
        googleSub: googleData.googleSub,
        message: 'An account with this email already exists using password. Please enter your account password to securely link your Google account.'
      };
    }
    // Link Google credentials and ensure role elevation if admin
    user = db.updateUser(existingByEmail.id, {
      googleSub: googleData.googleSub,
      picture: googleData.picture || existingByEmail.picture,
      name: existingByEmail.name || googleData.name,
      ...(isAdmin ? { role: 'Super Administrator', onboardingCompleted: true } : {})
    });
    return { status: 'authenticated', user, isAdmin };
  }

  // 3. New user registration via Google
  user = db.createUser({
    email: googleData.email,
    name: googleData.name,
    picture: googleData.picture,
    authProvider: 'google',
    googleSub: googleData.googleSub,
    role: isAdmin ? 'Super Administrator' : 'Freelance Planner',
    onboardingCompleted: true
  });

  return { status: 'authenticated', user, isNewUser: true, isAdmin };
}

/**
 * Securely links an existing local account with Google credentials
 */
export async function linkGoogleAccount({ email, password, token }) {
  const googleData = await verifyGoogleIdToken(token);

  if (email.toLowerCase() !== googleData.email) {
    throw new Error('Email address in Google token does not match account email');
  }

  const existingUser = db.getUserByEmail(email);
  if (!existingUser) {
    throw new Error('Account not found');
  }

  // Verify password before linking
  const isMatch = verifyPassword(password, existingUser.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid account password. Could not verify account ownership for linking.');
  }

  // Update user with googleSub and link provider
  const updatedUser = db.updateUser(existingUser.id, {
    googleSub: googleData.googleSub,
    authProvider: 'linked',
    picture: existingUser.picture || googleData.picture
  });

  return updatedUser;
}

/**
 * Strips sensitive fields before sending user object to client
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Sets secure 30-day HttpOnly cookie session
 */
export function setSessionCookie(res, sessionId) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('session_token', sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/'
  });
}
