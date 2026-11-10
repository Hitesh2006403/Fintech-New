import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './backend/server.js';
import db from './backend/db.js';
import { sendPasswordRecoveryEmail, isPasswordRecoveryEnabled } from './backend/emailService.js';

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

describe('FinSight Password Recovery Flow & Security Suite', () => {
  test('1. POST /api/auth/forgot-password is blocked by feature flag and returns 503 maintenance notice without sending emails', async () => {
    const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' })
    });
    const body = await res.json();
    assert.equal(res.status, 503);
    assert.equal(body.success, false);
    assert.equal(body.disabled, true);
    assert.equal(body.error, 'Password recovery is temporarily unavailable. Please try again later.');
    assert.equal(body.message, 'Password recovery is temporarily unavailable. Please try again later.');
  });

  test('2. GET /api/auth/password-recovery-status returns disabled status', async () => {
    const res = await fetch(`${baseUrl}/api/auth/password-recovery-status`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.enabled, false);
    assert.match(body.message, /Password recovery is temporarily unavailable. Please try again later./i);
  });

  test('3. sendPasswordRecoveryEmail helper suppresses email delivery when disabled without invoking nodemailer', async () => {
    const result = await sendPasswordRecoveryEmail({
      toEmail: 'user@example.com',
      recoveryLink: 'http://localhost/test'
    });
    assert.equal(result.success, false);
    assert.equal(result.disabled, true);
    assert.match(result.reason, /Password recovery is temporarily unavailable. Please try again later./i);
  });

  test('4. POST /api/auth/update-password rejects weak passwords (< 8 chars) with 400', async () => {
    const res = await fetch(`${baseUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newPassword: 'short',
        email: 'testuser@example.com'
      })
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.error, /at least 8 characters/i);
  });

  test('5. POST /api/auth/update-password rejects unauthenticated request without valid token/session with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newPassword: 'BrandNewSecurePassword2026!',
        email: 'testuser@example.com',
        recoveryToken: 'invalid.or.forged.token'
      })
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.match(body.error, /Invalid or expired recovery session/i);
  });

  test('6. updateUserPasswordByEmail updates password hash and permits login with new password', async () => {
    const testEmail = `pwtest_${Date.now()}@example.com`;
    const initialPassword = 'InitialSecretPass123!';
    const updatedPassword = 'BrandNewSecretPass456!';

    // Register test user
    const createdUser = db.createUser({
      name: 'Recovery Test User',
      email: testEmail,
      password: initialPassword
    });
    assert.ok(createdUser.id);

    // Initial login succeeds
    const loginResInitial = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword })
    });
    const loginBodyInitial = await loginResInitial.json();
    assert.equal(loginResInitial.status, 200);
    assert.equal(loginBodyInitial.success, true);

    // Update password via recovery database helper
    const updateResult = db.updateUserPasswordByEmail(testEmail, updatedPassword);
    assert.ok(updateResult);

    // Old password must now fail with 401
    const loginResOld = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: initialPassword })
    });
    assert.equal(loginResOld.status, 401);

    // New password must succeed with 200
    const loginResNew = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: updatedPassword })
    });
    const loginBodyNew = await loginResNew.json();
    assert.equal(loginResNew.status, 200);
    assert.equal(loginBodyNew.success, true);
    assert.equal(loginBodyNew.user.email, testEmail);
  });

  test('7. POST /api/auth/update-password with valid recovery token resets password and prevents token reuse', async () => {
    const testEmail = `tokenflow_${Date.now()}@example.com`;
    const initialPass = 'OriginalPass123!';
    const resetPass = 'SuperResetPass456!';

    // Create user
    db.createUser({ name: 'Token Flow User', email: testEmail, password: initialPass });

    // Generate recovery token
    const recovery = db.createPasswordRecoveryToken(testEmail);
    assert.ok(recovery?.token);

    // Call update-password with this token
    const updateRes = await fetch(`${baseUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: recovery.token,
        newPassword: resetPass,
        email: testEmail
      })
    });
    const updateBody = await updateRes.json();
    assert.equal(updateRes.status, 200);
    assert.equal(updateBody.success, true);

    // Token must now be consumed (single-use protection)
    const reuseRes = await fetch(`${baseUrl}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: recovery.token,
        newPassword: 'AnotherPassword789!',
        email: testEmail
      })
    });
    assert.equal(reuseRes.status, 401);

    // Login with new password must succeed
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: resetPass })
    });
    assert.equal(loginRes.status, 200);
  });
});
