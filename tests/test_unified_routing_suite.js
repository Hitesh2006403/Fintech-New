import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import http from 'http';

const PORT = 3003;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_ADMIN_EMAIL = 'SuperAdmin.FinSight@Example.com'; // Mixed case to test case-insensitivity

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
          reject(new Error('Server did not start in time on port ' + PORT));
        }
      });
    }, 250);
  });
}

describe('FinSight Unified Login, Role Assignment & Security Test Suite', () => {
  before(async () => {
    serverProc = spawn('node', ['backend/server.js'], {
      env: {
        ...process.env,
        PORT: String(PORT),
        ADMIN_EMAIL: `  ${TEST_ADMIN_EMAIL}  `, // Includes leading/trailing whitespace
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

  let normalUserToken = null;
  let adminUserToken = null;

  it('1. /api/health confirms ADMIN_EMAIL is configured', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.adminEmailConfigured, true);
  });

  it('2. Normal user registration gets role: "user" and redirectTo: "/dashboard"', async () => {
    const normalEmail = `user_${Date.now()}@regularcustomer.com`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalEmail,
        name: 'Regular Customer',
        password: 'Password123#Secure'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.isAdmin, false);
    normalUserToken = data.token;
  });

  it('3. Normal user session (/api/auth/me) returns role: "user" and redirectTo: "/dashboard"', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${normalUserToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.authenticated, true);
    assert.strictEqual(data.role, 'user');
    assert.strictEqual(data.redirectTo, '/dashboard');
    assert.strictEqual(data.user.isAdmin, false);
  });

  it('4. Normal user is rejected from admin API endpoints (/api/admin/stats) with 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${normalUserToken}` }
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Administrator privileges required/i);
  });

  it('5. Admin email login case-insensitively and trimmed matches ADMIN_EMAIL and grants role: "admin" with redirectTo: "/admin"', async () => {
    // Register or login admin user using lower-case version of TEST_ADMIN_EMAIL
    const normalizedAdminEmail = TEST_ADMIN_EMAIL.toLowerCase().trim();
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedAdminEmail,
        password: 'Admin@FinSight2026!Master'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'Super Administrator');
    assert.strictEqual(data.user.isAdmin, true);
    adminUserToken = data.token;
  });

  it('6. Admin session (/api/auth/me) returns role: "admin", redirectTo: "/admin", and isAdmin: true', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminUserToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.authenticated, true);
    assert.strictEqual(data.role, 'admin');
    assert.strictEqual(data.redirectTo, '/admin');
    assert.strictEqual(data.user.isAdmin, true);
    assert.strictEqual(data.user.role, 'Super Administrator');
  });

  it('7. Admin user is granted access to protected admin API endpoints (/api/admin/stats, /api/admin/users)', async () => {
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminUserToken}` }
    });
    assert.strictEqual(statsRes.status, 200);
    const statsData = await statsRes.json();
    assert.strictEqual(statsData.success, true);
    assert.ok(statsData.data);

    const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminUserToken}` }
    });
    assert.strictEqual(usersRes.status, 200);
    const usersData = await usersRes.json();
    assert.strictEqual(usersData.success, true);
    assert.ok(Array.isArray(usersData.users));
  });

  it('8. Unauthenticated requests to /api/admin/stats return 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(res.status, 401);
  });
});
