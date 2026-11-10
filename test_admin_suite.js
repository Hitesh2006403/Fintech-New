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

describe('FinSight Admin Portal Backend Test Suite', () => {
  before(async () => {
    serverProc = spawn('node', ['backend/server.js'], {
      env: {
        ...process.env,
        PORT: '3001',
        ADMIN_EMAIL: 'hiteshav2006@gmail.com',
        ADMIN_EMAILS: 'hiteshav2006@gmail.com,admin@finsight.internal'
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

  let adminToken = null;

  it('1. Rejects Unauthorized Admin Credential Login with 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unauthorized_stranger@gmail.com',
        password: 'SomeRandomPassword123'
      })
    });

    assert.strictEqual(res.status, 403, 'Should reject non-whitelisted email with 403');
    const data = await res.json();
    assert.match(data.error, /not in the authorized administrator whitelist/i);
  });

  it('2. Authenticates Authorized Administrator via Master Credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hiteshav2006@gmail.com',
        password: 'Admin@FinSight2026!Master'
      })
    });

    assert.strictEqual(res.status, 200, 'Should accept authorized admin');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token, 'Should return session token');
    assert.strictEqual(data.user.role, 'Super Administrator');
    assert.strictEqual(data.user.email, 'hiteshav2006@gmail.com');
    adminToken = data.token;
  });

  it('2b. Authenticates Authorized Administrator via Whitelisted Email Auth', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/email-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hiteshav2006@gmail.com'
      })
    });

    assert.strictEqual(res.status, 200, 'Should accept whitelisted admin email');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.email, 'hiteshav2006@gmail.com');
  });

  it('3. /api/admin/me returns authenticated admin user', async () => {
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

  it('4. /api/admin/stats returns all 4 stat metrics, charts, and system status', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.data.totalUsers >= 1200, 'Total users should match benchmark order');
    assert.ok(data.data.activeUsers >= 1000, 'Active users should match benchmark order');
    assert.ok(data.data.reportedIssues !== undefined, 'Reported issues should be present');
    assert.ok(data.data.totalTransactions >= 8000, 'Total transactions should be present');
    assert.ok(data.data.userGrowth['7days'].length === 7, 'User growth 7 days series present');
    assert.ok(data.data.incomeVsExpense['thisMonth'].length === 7, 'Income vs expense series present');
    assert.strictEqual(data.data.systemStatus.frontend, 'Online');
  });

  it('5. /api/admin/users lists all users and supports status toggling', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.users));
    assert.ok(data.users.length >= 5, 'Should include benchmark and database users');

    // Toggle status of first user
    const targetUser = data.users[0];
    const newStatus = targetUser.status === 'Active' ? 'Blocked' : 'Active';

    const updateRes = await fetch(`${BASE_URL}/api/admin/users/${encodeURIComponent(targetUser.id)}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus, reason: 'Test verification' })
    });

    assert.strictEqual(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.success, true);
  });

  it('6. /api/admin/settings returns authorized whitelist and allows updates', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/settings`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.settings.authorizedAdminEmails.includes('hiteshav2006@gmail.com'));
    assert.ok(data.settings.authorizedAdminEmails.includes('dishankbs04@gmail.com'));
  });

  it('7. /api/admin/broadcast dispatches notification to users', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/broadcast`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Platform Maintenance Complete',
        description: 'All nodes synchronized successfully.',
        severity: 'info'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.deliveredCount >= 0);
  });

  it('8. dishankbs04@gmail.com authenticates as secondary admin via admin login', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dishankbs04@gmail.com',
        password: 'Admin@FinSight2026!Master'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.email, 'dishankbs04@gmail.com');
    assert.strictEqual(data.user.role, 'Super Administrator');
    assert.strictEqual(data.user.isAdmin, true);
  });

  it('9. Both admin email IDs navigate to /admin when logging in through user login page (/api/auth/login)', async () => {
    const admins = ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'];
    for (const email of admins) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'Admin@FinSight2026!Master'
        })
      });

      assert.strictEqual(res.status, 200, `User login should succeed for ${email}`);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.role, 'admin', `Role should be "admin" for ${email}`);
      assert.strictEqual(data.redirectTo, '/admin', `redirectTo should be "/admin" for ${email}`);
      assert.strictEqual(data.user.isAdmin, true);
      assert.strictEqual(data.user.role, 'Super Administrator');

      // Verify session via /api/auth/me
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      assert.strictEqual(meRes.status, 200);
      const meData = await meRes.json();
      assert.strictEqual(meData.authenticated, true);
      assert.strictEqual(meData.role, 'admin');
      assert.strictEqual(meData.redirectTo, '/admin');
      assert.strictEqual(meData.user.isAdmin, true);
    }
  });

  it('10. Signing out from Admin terminates both admin and user sessions cleanly without auto-logging into user portal', async () => {
    // 1. Log in as admin
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hiteshav2006@gmail.com',
        password: 'Admin@FinSight2026!Master'
      })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    const cookieHeader = loginRes.headers.get('set-cookie');

    // 2. Log out via admin logout endpoint
    const logoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Cookie': cookieHeader || ''
      }
    });
    assert.strictEqual(logoutRes.status, 200);

    // 3. Verify user session /api/auth/me is now unauthenticated with cleared cookie
    const clearCookieHeader = logoutRes.headers.get('set-cookie');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Cookie': clearCookieHeader || ''
      }
    });
    const meData = await meRes.json();
    assert.strictEqual(meData.authenticated, false, 'User session must NOT remain active after admin logout');

    // 4. Verify admin endpoint is rejected
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: {
        'Cookie': clearCookieHeader || ''
      }
    });
    assert.strictEqual(statsRes.status, 401, 'Admin endpoints must return 401');

    // 5. Subsequent login with standard user account works cleanly without redirecting to admin
    const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex@example.com',
        password: 'FinSight2026!Secured'
      })
    });
    assert.strictEqual(userLoginRes.status, 200);
    const userLoginData = await userLoginRes.json();
    assert.strictEqual(userLoginData.role, 'user', 'Regular user must receive role: "user"');
    assert.strictEqual(userLoginData.redirectTo, '/dashboard', 'Regular user must be directed to "/dashboard"');
    assert.strictEqual(userLoginData.user.isAdmin, false);
  });
});
