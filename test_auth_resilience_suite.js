import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from './src/services/authService.js';
import app from './backend/server.js';
import http from 'http';

// Polyfill localStorage for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

describe('FinSight Manual Auth Resilience & 404 Routing Normalization Suite', () => {
  let server = null;
  let serverPort = 3099;
  let originalFetch = globalThis.fetch;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(serverPort, () => resolve());
    });
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Backend URL normalizer handles /auth/login without /api/ prefix', async () => {
    const res = await fetch(`http://localhost:${serverPort}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@example.com', password: 'FinSight2026!Secured' })
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.user.email, 'alex@example.com');
  });

  it('2. Backend URL normalizer collapses duplicate /api/api/auth/login', async () => {
    const res = await fetch(`http://localhost:${serverPort}/api/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@example.com', password: 'FinSight2026!Secured' })
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.user.email, 'alex@example.com');
  });

  it('3. Backend returns JSON 404 (not HTML) for unmatched API routes', async () => {
    const res = await fetch(`http://localhost:${serverPort}/api/unmatched/test/endpoint`, {
      method: 'GET'
    });
    assert.equal(res.status, 404);
    assert.ok(res.headers.get('content-type')?.includes('application/json'));
    const body = await res.json();
    assert.equal(body.code, 'ENDPOINT_NOT_FOUND');
    assert.equal(body.status, 404);
  });

  it('4. loginWithEmail handles 404 with HTML body seamlessly (Alex Vance fallback)', async () => {
    localStorage.clear();
    // Simulate 404 HTML response from proxy/serverless normalizing
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 404,
        text: async () => '<!DOCTYPE html><html><body>404 Not Found</body></html>',
        json: async () => { throw new Error('Unexpected token < in JSON at position 0'); }
      };
    };

    const loginRes = await authService.loginWithEmail('alex@example.com', 'FinSight2026!Secured');
    assert.equal(loginRes.success, true);
    assert.equal(loginRes.user.email, 'alex@example.com');
    assert.equal(loginRes.user.name, 'Alex Vance');
    assert.equal(loginRes.role, 'user');
    assert.equal(loginRes.redirectTo, '/dashboard');
    assert.ok(localStorage.getItem('uip_auth_token'));
    assert.ok(localStorage.getItem('uip_fallback_user'));
  });

  it('5. registerWithEmail handles 404 with HTML body seamlessly (Client Registration Fallback)', async () => {
    localStorage.clear();
    // Simulate 404 HTML response during registration
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 404,
        text: async () => '<!DOCTYPE html><html><body>404 Not Found</body></html>',
        json: async () => { throw new Error('Unexpected token < in JSON at position 0'); }
      };
    };

    const newEmail = 'sarah.connor@cyberdyne.io';
    const regRes = await authService.registerWithEmail(newEmail, 'Sarah Connor', 'SafePassword123!');
    assert.equal(regRes.success, true);
    assert.equal(regRes.user.email, newEmail);
    assert.equal(regRes.user.name, 'Sarah Connor');
    assert.equal(regRes.role, 'user');
    assert.equal(regRes.redirectTo, '/setup?step=1');

    // Verify persisted into localStorage for subsequent offline login
    const localUsers = JSON.parse(localStorage.getItem('uip_local_users') || '{}');
    assert.ok(localUsers[newEmail]);
    assert.equal(localUsers[newEmail].email, newEmail);
  });

  it('6. Subsequent login with locally registered user succeeds in offline 404 mode', async () => {
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 404,
        text: async () => '<!DOCTYPE html><html><body>404 Not Found</body></html>',
        json: async () => { throw new Error('Unexpected token < in JSON at position 0'); }
      };
    };

    const email = 'sarah.connor@cyberdyne.io';
    const loginRes = await authService.loginWithEmail(email, 'SafePassword123!');
    assert.equal(loginRes.success, true);
    assert.equal(loginRes.user.email, email);
    assert.equal(loginRes.user.name, 'Sarah Connor');
  });

  it('7. Whitelisted Super Admin login succeeds in offline 404 mode with admin role', async () => {
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 404,
        text: async () => '<!DOCTYPE html><html><body>404 Not Found</body></html>',
        json: async () => { throw new Error('Unexpected token < in JSON at position 0'); }
      };
    };

    const adminRes = await authService.loginWithEmail('hiteshav2006@gmail.com', 'AdminPass123!');
    assert.equal(adminRes.success, true);
    assert.equal(adminRes.user.email, 'hiteshav2006@gmail.com');
    assert.equal(adminRes.user.isAdmin, true);
    assert.equal(adminRes.role, 'admin');
    assert.equal(adminRes.redirectTo, '/admin');
  });

  it('8. Backend URL normalizer strips accidental /:path* from incoming requests', async () => {
    globalThis.fetch = originalFetch;
    const res = await originalFetch(`http://localhost:${serverPort}/api/:path*/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@example.com', password: 'FinSight2026!Secured' })
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.user.email, 'alex@example.com');
  });

  it('9. verifyGoogleCredential succeeds when backend returns JSON 404 (:path* error body)', async () => {
    localStorage.clear();
    // Simulate backend returning JSON 404 with exact message from screenshot
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 404,
        text: async () => JSON.stringify({
          error: 'API endpoint not found: POST /api/:path*/api/auth/google',
          code: 'ENDPOINT_NOT_FOUND',
          status: 404
        }),
        json: async () => ({
          error: 'API endpoint not found: POST /api/:path*/api/auth/google',
          code: 'ENDPOINT_NOT_FOUND',
          status: 404
        })
      };
    };

    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      email: 'alex.google@example.com',
      name: 'Alex Google User',
      sub: '9876543210'
    })).toString('base64url');
    const dummyJwt = `${header}.${payload}.sig123`;

    const res = await authService.verifyGoogleCredential(dummyJwt);
    assert.equal(res.success, true);
    assert.equal(res.user.email, 'alex.google@example.com');
    assert.equal(res.user.name, 'Alex Google User');
    assert.equal(res.role, 'user');
    assert.equal(res.redirectTo, '/dashboard');
    assert.ok(localStorage.getItem('uip_auth_token'));
  });
});
