import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './backend/server.js';
import { db } from './backend/db.js';
import { isPasswordRecoveryEnabled } from './backend/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_FILE = path.join(__dirname, 'backend', 'data', 'sessions.json');
const USERS_FILE = path.join(__dirname, 'backend', 'data', 'users.json');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('FinSight Resend Password Recovery Integration Suite', () => {
  const testEmail = `resend_tester_${Date.now()}@example.com`;
  const initialPassword = 'OriginalPassword123#';
  const updatedPassword = 'NewSecurePassword456$';

  let testUser = null;

  before(() => {
    testUser = db.createUser({
      name: 'Resend Tester',
      email: testEmail,
      password: initialPassword
    });
  });

  test('1. isPasswordRecoveryEnabled reports active status when configured', () => {
    assert.equal(isPasswordRecoveryEnabled(), true, 'Password recovery must report active');
  });

  test('2. GET /api/auth/password-recovery-status returns enabled: true', async () => {
    const res = await fetch(`${baseUrl}/api/auth/password-recovery-status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.enabled, true);
    assert.match(body.message, /Password recovery service is active/i);
  });

  test('3. POST /api/auth/forgot-password rejects invalid email format with 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-a-valid-email' })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /valid email address/i);
  });

  test('4. POST /api/auth/forgot-password with non-existent email returns generic success (Zero Enumeration)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost_nonexistent_user@example.com' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.match(body.message, /If an account exists/i);
  });

  test('5. Cryptographic Token Generation: Stores only SHA-256 hash with 15-minute expiration', () => {
    const recovery = db.createPasswordRecoveryToken(testEmail);
    assert.ok(recovery?.token, 'Must return a raw token');
    assert.equal(typeof recovery.token, 'string');
    assert.equal(recovery.token.length, 64, 'Raw token must be 64-character hex');

    // Verify 15-minute expiration (900,000 ms)
    const timeRemaining = recovery.expiresAt - Date.now();
    assert.ok(timeRemaining > 880000 && timeRemaining <= 900000, 'Expiration must be 15 minutes');

    // Verify disk storage uses SHA-256 hash
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    assert.equal(sessions[`recovery_${recovery.token}`], undefined, 'Raw token must NEVER be stored as a key');

    // Verify record exists with hashed key
    const foundRecord = Object.values(sessions).find(s => s.email === testEmail && s.type === 'recovery' && !s.used);
    assert.ok(foundRecord, 'A recovery record must be stored');
    assert.ok(foundRecord.tokenHash, 'Must have tokenHash property');
    assert.notEqual(foundRecord.tokenHash, recovery.token, 'Stored tokenHash must NOT match raw token');
  });

  test('6. Invalidation of previous tokens: Generating a new token invalidates outstanding ones', () => {
    const firstRecovery = db.createPasswordRecoveryToken(testEmail);
    const secondRecovery = db.createPasswordRecoveryToken(testEmail);

    // First token must now fail verification
    const firstCheck = db.verifyPasswordRecoveryToken(firstRecovery.token, testEmail);
    assert.equal(firstCheck.valid, false, 'First token must be invalidated when a second token is issued');

    // Second token must be valid
    const secondCheck = db.verifyPasswordRecoveryToken(secondRecovery.token, testEmail);
    assert.equal(secondCheck.valid, true, 'Second token must remain valid');
  });

  test('7. POST /api/auth/update-password rejects weak passwords (< 8 chars) with 400', async () => {
    const recovery = db.createPasswordRecoveryToken(testEmail);
    const res = await fetch(`${baseUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: recovery.token,
        email: testEmail,
        newPassword: 'short'
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /at least 8 characters/i);
  });

  test('8. POST /api/auth/update-password rejects invalid/forged tokens with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'forged_fake_token_1234567890abcdef',
        email: testEmail,
        newPassword: 'ValidSecurePassword123#'
      })
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Invalid or expired recovery session/i);
  });

  test('9. Full Flow: Valid token updates password, consumes token, and allows login with new password', async () => {
    const recovery = db.createPasswordRecoveryToken(testEmail);

    const updateRes = await fetch(`${baseUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: recovery.token,
        email: testEmail,
        newPassword: updatedPassword
      })
    });
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.success, true);

    // Single-use: Reusing the same token must fail with 401
    const reuseRes = await fetch(`${baseUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: recovery.token,
        email: testEmail,
        newPassword: 'AnotherPassword999#'
      })
    });
    assert.equal(reuseRes.status, 401);

    // Old password must now fail
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword })
    });
    assert.equal(oldLoginRes.status, 401);

    // New password must succeed
    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: updatedPassword })
    });
    assert.equal(newLoginRes.status, 200);
    const newLoginBody = await newLoginRes.json();
    assert.equal(newLoginBody.success, true);
    assert.equal(newLoginBody.user.email, testEmail);
  });
});
