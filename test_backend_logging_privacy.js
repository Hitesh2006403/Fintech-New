import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3009;
const BASE_URL = `http://localhost:${PORT}`;

let serverProc = null;
let serverStdout = '';
let serverStderr = '';

function waitForServer(maxAttempts = 30) {
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
    }, 200);
  });
}

describe('FinSight Backend Email Privacy & Secure Logging Verification Suite', () => {
  before(async () => {
    serverStdout = '';
    serverStderr = '';
    serverProc = spawn('node', ['backend/server.js'], {
      env: {
        ...process.env,
        PORT: String(PORT),
        ADMIN_EMAIL: 'hiteshav2006@gmail.com',
        NODE_ENV: 'test'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProc.stdout.on('data', (d) => {
      serverStdout += d.toString();
    });
    serverProc.stderr.on('data', (d) => {
      serverStderr += d.toString();
    });

    await waitForServer();
  });

  after(() => {
    if (serverProc) {
      serverProc.kill();
    }
  });

  // -------------------------------------------------------------------------
  // 1. TERMINAL LOGGING SECURITY VERIFICATION
  // -------------------------------------------------------------------------
  it('1. Backend startup logs safe admin count without exposing any email addresses', () => {
    // Must contain safe admin count summary
    assert.match(
      serverStdout,
      /\[FinSight\] Authorized admin emails configured: \d+ admin\(s\)/,
      'Startup log must display admin count in safe format'
    );

    // Must NEVER print the actual administrator email addresses
    assert.ok(
      !serverStdout.includes('hiteshav2006@gmail.com'),
      'CRITICAL SECURITY: hiteshav2006@gmail.com must NOT be logged in terminal output'
    );
    assert.ok(
      !serverStdout.includes('dishankbs04@gmail.com'),
      'CRITICAL SECURITY: dishankbs04@gmail.com must NOT be logged in terminal output'
    );

    // Ensure the admin log line does NOT contain any email address
    const adminLogLines = serverStdout
      .split('\n')
      .filter((line) => line.includes('[FinSight] Authorized admin emails configured:'));

    assert.ok(adminLogLines.length > 0, 'Admin configuration log line must exist');
    for (const line of adminLogLines) {
      assert.ok(
        !line.includes('@'),
        `Admin configuration log line must not contain an '@' email symbol: "${line}"`
      );
    }
  });

  it('2. Safe startup telemetry logs are preserved without exposing secrets or keys', () => {
    assert.match(serverStdout, /\[FinSight Auth Server\] Running on http:\/\/localhost:/);
    assert.match(serverStdout, /\[FinSight Auth Server\] Authorized origin:/);
    assert.match(serverStdout, /\[FinSight Auth Server\] Google Client ID loaded: (YES|NO)/);
    assert.match(serverStdout, /\[FinSight Auth Server\] Supabase Cloud configured:/);

    // Secrets must never be printed
    assert.ok(!serverStdout.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Service role key name/value must not be logged');
    assert.ok(!serverStdout.includes('SESSION_SECRET'), 'SESSION_SECRET must not be logged');
    assert.ok(!serverStderr.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Service role key must not be in stderr');
  });

  // -------------------------------------------------------------------------
  // 2. ADMIN AUTHENTICATION INTEGRITY VERIFICATION
  // -------------------------------------------------------------------------
  let adminToken = null;

  it('3. Rejects non-whitelisted admin credential login with 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'attacker@evilcorp.com',
        password: 'Password123!'
      })
    });

    assert.strictEqual(res.status, 403, 'Unauthorized email must receive 403 Forbidden');
    const data = await res.json();
    assert.match(data.error, /whitelist/i);
  });

  it('4. Rejects invalid password for whitelisted administrator with 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hiteshav2006@gmail.com',
        password: 'WrongPassword999!'
      })
    });

    assert.strictEqual(res.status, 401, 'Invalid password must receive 401 Unauthorized');
  });

  it('5. Successfully authenticates primary admin (hiteshav2006@gmail.com) via master credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hiteshav2006@gmail.com',
        password: 'Admin@FinSight2026!Master'
      })
    });

    assert.strictEqual(res.status, 200, 'Primary admin must authenticate successfully');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token, 'Must return session token');
    assert.strictEqual(data.user.role, 'Super Administrator');
    assert.strictEqual(data.user.isAdmin, true);
    assert.strictEqual(data.user.email, 'hiteshav2006@gmail.com');
    adminToken = data.token;
  });

  it('6. Successfully authenticates secondary admin (dishankbs04@gmail.com) via master credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dishankbs04@gmail.com',
        password: 'Admin@FinSight2026!Master'
      })
    });

    assert.strictEqual(res.status, 200, 'Secondary admin must authenticate successfully');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'Super Administrator');
    assert.strictEqual(data.user.isAdmin, true);
  });

  it('7. Admin email-auth endpoint grants access to whitelisted administrators in non-prod', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/email-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dishankbs04@gmail.com'
      })
    });

    assert.strictEqual(res.status, 200, 'Whitelisted admin email auth must succeed');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.isAdmin, true);
  });

  it('8. Verifies /api/admin/me returns authorized administrator details', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/me`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.authenticated, true);
    assert.strictEqual(data.user.isAdmin, true);
  });

  it('9. User portal login automatically routes administrators to /admin', async () => {
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
    assert.strictEqual(data.redirectTo, '/admin', 'Admin logging in through user portal must route to /admin');
    assert.strictEqual(data.role, 'admin');
  });

  // -------------------------------------------------------------------------
  // 3. REGULAR USER AND ACCESS CONTROL VERIFICATION
  // -------------------------------------------------------------------------
  let userToken = null;
  const regularEmail = `privacy_test_user_${Date.now()}@example.com`;

  it('10. Registers and authenticates a regular user, routing them to /dashboard', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Regular Privacy Tester',
        email: regularEmail,
        password: 'TestPassword1234!'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.redirectTo, '/dashboard');
    assert.strictEqual(data.user.isAdmin, false);
    userToken = data.token;
  });

  it('11. Regular user is strictly blocked from protected admin routes (/api/admin/stats) with 403', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    assert.strictEqual(res.status, 403, 'Regular user must receive 403 Forbidden when accessing admin endpoints');
    const data = await res.json();
    assert.match(data.error, /Administrator privileges/i);
  });

  it('12. Anonymous user is strictly blocked from admin routes with 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(res.status, 401, 'Anonymous request to admin endpoints must receive 401');
  });

  // -------------------------------------------------------------------------
  // 4. PASSWORD RECOVERY PRIVACY VERIFICATION
  // -------------------------------------------------------------------------
  it('13. Password recovery request does not leak email address to terminal logs', async () => {
    const targetEmail = `audit_recover_${Date.now()}@example.com`;
    const initialStdoutLen = serverStdout.length;
    const initialStderrLen = serverStderr.length;

    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail })
    });

    assert.ok(res.status === 200 || res.status === 503, 'Endpoint responds safely (200 or 503 disabled)');
    const data = await res.json();
    assert.ok(data.success === true || data.disabled === true, 'Response acknowledges request or reports disabled');

    // Wait a brief moment for any async mailer logging
    await new Promise((r) => setTimeout(r, 200));

    const newStdout = serverStdout.slice(initialStdoutLen);
    const newStderr = serverStderr.slice(initialStderrLen);

    assert.ok(
      !newStdout.includes(targetEmail),
      `Recovery request stdout must NOT leak user email address "${targetEmail}"`
    );
    assert.ok(
      !newStderr.includes(targetEmail),
      `Recovery request stderr must NOT leak user email address "${targetEmail}"`
    );
  });

  // -------------------------------------------------------------------------
  // 5. REPOSITORY ENVIRONMENT & GITIGNORE SECURITY VERIFICATION
  // -------------------------------------------------------------------------
  it('14. Repository .gitignore strictly isolates all .env and secret files', () => {
    const gitignoreContent = fs.readFileSync(path.resolve('.gitignore'), 'utf8');

    assert.ok(gitignoreContent.includes('.env'), '.gitignore must ignore .env');
    assert.ok(gitignoreContent.includes('**/.env'), '.gitignore must ignore **/.env');
    assert.ok(gitignoreContent.includes('*.pem'), '.gitignore must ignore *.pem');
    assert.ok(gitignoreContent.includes('*.key'), '.gitignore must ignore *.key');
  });

  it('15. .env.example files contain safe generic placeholders with zero real secrets', () => {
    const rootEnvExample = fs.readFileSync(path.resolve('.env.example'), 'utf8');
    const backendEnvExample = fs.readFileSync(path.resolve('backend/.env.example'), 'utf8');

    for (const content of [rootEnvExample, backendEnvExample]) {
      assert.ok(!content.includes('hiteshav2006@gmail.com'), 'Must not contain actual admin email');
      assert.ok(!content.includes('dishankbs04@gmail.com'), 'Must not contain actual admin email');
      assert.ok(content.includes('ADMIN_EMAIL=admin@example.com'), 'Must have generic placeholder');
      assert.ok(!content.includes('eyJh'), 'Must not contain real JWT or Supabase key');
    }
  });
});
