import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

let serverProc = null;
let serverStartedByTest = false;

function isServerListening() {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

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

describe('FinSight Admin & User Strict Session Separation Suite', () => {
  before(async () => {
    const alreadyUp = await isServerListening();
    if (!alreadyUp) {
      serverStartedByTest = true;
      serverProc = spawn('node', ['backend/server.js'], {
        env: {
          ...process.env,
          PORT: '3001',
          ADMIN_EMAIL: 'hiteshav2006@gmail.com',
          ADMIN_EMAILS: 'hiteshav2006@gmail.com,dishankbs04@gmail.com'
        },
        stdio: 'ignore'
      });
      await waitForServer();
    }
  });

  after(() => {
    if (serverStartedByTest && serverProc) {
      serverProc.kill();
    }
  });
  it('1. App.jsx eliminates separate admin login page and redirects /admin/login to /login', () => {
    const appPath = path.join(__dirname, 'src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');

    assert.ok(
      appContent.includes('<Route path="/admin/login" element={<Navigate to="/login" replace />} />'),
      '/admin/login must redirect directly to /login'
    );
    assert.ok(
      !appContent.includes('<AdminLoginPage'),
      'AdminLoginPage must not be rendered anywhere in App.jsx'
    );
  });

  it('2. AdminPortal.jsx eliminates AdminLoginPage and navigates unauthenticated users to /login', () => {
    const portalPath = path.join(__dirname, 'src/pages/admin/AdminPortal.jsx');
    const portalContent = fs.readFileSync(portalPath, 'utf8');

    assert.ok(
      !portalContent.includes('AdminLoginPage'),
      'AdminLoginPage must be completely removed from AdminPortal.jsx'
    );
    assert.ok(
      portalContent.includes('return <Navigate to="/login" replace />;'),
      'Unauthenticated requests to AdminPortal must redirect directly to /login'
    );
  });

  it('3. AuthPage.jsx has clean UI with no separate admin pills or extra badges', () => {
    const authPagePath = path.join(__dirname, 'src/pages/AuthPage.jsx');
    const authPageContent = fs.readFileSync(authPagePath, 'utf8');

    assert.ok(
      !authPageContent.includes('Authorized Administrator — signing in navigates directly'),
      'AuthPage must not display intrusive administrator badges on the login card'
    );
    assert.ok(
      !authPageContent.includes('<span>Admin</span>'),
      'AuthPage must not show separate admin auto-fill pills'
    );
  });

  it('4. Admin login via /api/auth/login does NOT set session_token cookie for User Portal', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hiteshav2006@gmail.com',
        password: 'Admin@FinSight2026!Master'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.role, 'admin');
    assert.strictEqual(data.redirectTo, '/admin');

    // Verify set-cookie does NOT contain an active session_token (it clears it)
    const setCookie = res.headers.get('set-cookie') || '';
    assert.ok(
      setCookie.includes('session_token=;') || setCookie.includes('Max-Age=0') || !setCookie.includes('session_token='),
      'Admin login must not set active session_token cookie'
    );
  });

  it('5. Regular user login via /api/auth/login sets session_token and redirects to /dashboard', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex@example.com',
        password: 'FinSight2026!Secured'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.role, 'user');
    assert.strictEqual(data.redirectTo, '/dashboard');
    assert.strictEqual(data.user.isAdmin, false);
  });

  it('6. AdminContext decouples from AppContext.user and checks exclusively finsight_admin_user and finsight_admin_token', () => {
    const adminContextPath = path.join(__dirname, 'src/context/AdminContext.jsx');
    const adminContextContent = fs.readFileSync(adminContextPath, 'utf8');

    assert.ok(
      !adminContextContent.includes('effectiveAdmin = contextUser'),
      'AdminContext must not fall back to contextUser'
    );
    assert.ok(
      adminContextContent.includes("localStorage.getItem('finsight_admin_user')"),
      'AdminContext must read finsight_admin_user'
    );
    assert.ok(
      adminContextContent.includes("localStorage.getItem('finsight_admin_token')"),
      'AdminContext must read finsight_admin_token'
    );
  });

  it('7. AppContext initializes user to INITIAL_USER when only finsight_admin_token is present', () => {
    const appContextPath = path.join(__dirname, 'src/context/AppContext.jsx');
    const appContextContent = fs.readFileSync(appContextPath, 'utf8');

    assert.ok(
      appContextContent.includes('profile?.isAdmin || profile?.role === \'Super Administrator\''),
      'AppContext must isolate admin profiles and reset to INITIAL_USER'
    );
    assert.ok(
      appContextContent.includes('!token || profile?.isAdmin'),
      'AppContext must require uip_auth_token for user portal authentication'
    );
  });
});
