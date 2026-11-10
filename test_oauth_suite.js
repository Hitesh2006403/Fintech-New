import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import http from 'http';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

let serverProc = null;

function waitForServer(maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      http.get(`${BASE_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve();
        }
      }).on('error', () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Server did not start in time'));
        }
      });
    }, 250);
  });
}

describe('Google OAuth & Role-Based Authorization Integration Suite', () => {
  before(async () => {
    serverProc = spawn('node', ['backend/server.js'], {
      env: {
        ...process.env,
        PORT: '3001',
        ADMIN_EMAIL: 'hiteshav2006@gmail.com',
        ADMIN_EMAILS: 'hiteshav2006@gmail.com,admin@finsight.internal',
        APP_ORIGIN: 'http://localhost:5173'
      },
      stdio: 'inherit'
    });
    await waitForServer();
  });

  after(() => {
    if (serverProc) {
      serverProc.kill();
    }
  });

  // 1. Health & OAuth Diagnostic Checks
  it('1. /api/health exposes accurate origin and Google Client ID status', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'healthy');
    assert.strictEqual(data.appOrigin, 'http://localhost:5173');
    assert.strictEqual(data.googleClientIdConfigured, true);
    assert.ok(data.googleClientIdSnippet.startsWith('261321779368-'));
  });

  // 2. User Google Auth Endpoint Validation
  it('2. /api/auth/google rejects missing credential token with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Missing Google credential token/i);
  });

  it('3. /api/auth/google rejects fraudulent / invalid Google token with 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'invalid.bogus.jwt.token' })
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /Google authentication failed/i);
  });

  // 3. Admin Google Auth Endpoint Validation
  it('4. /api/admin/google rejects missing credential token with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Missing Google credential token/i);
  });

  it('5. /api/admin/google rejects unverified / forged token with 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'invalid.bogus.admin.token' })
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /Admin Google authentication failed/i);
  });

  // 4. Role-based Admin Security & Access Control
  it('6. Normal user cannot access protected admin routes (/api/admin/stats) - 403 Forbidden', async () => {
    // Register normal user
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `regular_user_${Date.now()}@example.com`,
        name: 'Regular Customer',
        password: 'Password123#Secure'
      })
    });
    const regData = await regRes.json();
    assert.ok(regData.token, 'Should have issued normal user session token');

    // Attempt to access admin stats endpoint with regular user token
    const adminRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${regData.token}` }
    });
    assert.strictEqual(adminRes.status, 403, 'Normal user must be forbidden from admin routes');
    const errData = await adminRes.json();
    assert.match(errData.error, /Administrator privileges required/i);
  });

  it('7. Unauthenticated request to /api/admin/stats is rejected with 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(res.status, 401);
  });

  it('8. Valid admin session is granted access to /api/admin/stats and /api/admin/me', async () => {
    // Authenticate admin
    const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hiteshav2006@gmail.com',
        password: 'Admin@FinSight2026!Master'
      })
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    assert.strictEqual(loginData.user.isAdmin, true);

    // Verify /api/admin/me
    const meRes = await fetch(`${BASE_URL}/api/admin/me`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.strictEqual(meData.authenticated, true);
    assert.strictEqual(meData.user.email, 'hiteshav2006@gmail.com');

    // Verify /api/admin/stats
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    assert.strictEqual(statsRes.status, 200);
  });
});
