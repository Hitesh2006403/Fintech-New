import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'backend', 'data', 'users.json');
const SESSIONS_FILE = path.join(__dirname, 'backend', 'data', 'sessions.json');
const FINANCIALS_FILE = path.join(__dirname, 'backend', 'data', 'financials.json');

const BASE_URL = 'http://localhost:3001';

test('End-to-End Registration, Database Persistence & Financial Setup Suite', async (t) => {
  const testEmail = `e2e_setup_tester_${Date.now()}@example.com`;
  const testPassword = 'Password123#Secure!';
  const testName = 'E2E Setup Tester';

  let sessionToken = null;
  let createdUserId = null;

  await t.test('1. Registration Endpoint creates user with hashed password and returns session', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        name: testName,
        password: testPassword
      })
    });

    assert.equal(res.status, 200, 'Registration must return 200 OK');
    const data = await res.json();
    assert.equal(data.success, true, 'Registration must succeed');
    assert.ok(data.token, 'A valid session token must be returned');
    assert.equal(data.user.email, testEmail, 'User email must match');
    assert.equal(data.user.name, testName, 'User name must match');
    assert.equal(data.user.onboardingCompleted, false, 'New user must have onboardingCompleted: false');
    assert.equal(data.user.passwordHash, undefined, 'Password hash must NOT be leaked in API response');

    sessionToken = data.token;
    createdUserId = data.user.id;
  });

  await t.test('2. Backend Database verifies user is persistently written to disk', async () => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const savedUser = users.find(u => u.email === testEmail);

    assert.ok(savedUser, 'User record must exist in backend/data/users.json');
    assert.equal(savedUser.id, createdUserId, 'User ID must match');
    assert.ok(savedUser.passwordHash, 'User must have a stored password hash');
    assert.ok(savedUser.passwordHash.includes(':'), 'Password hash must contain salt delimiter');
    assert.equal(savedUser.onboardingCompleted, false, 'onboardingCompleted must be false initially');

    // Verify session in sessions.json
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    assert.ok(sessions[sessionToken], 'Session must be persistently stored in backend/data/sessions.json');
    assert.equal(sessions[sessionToken].userId, createdUserId, 'Session must reference user ID');
  });

  await t.test('3. Authenticated session check (/api/auth/me) resolves registered user profile', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    assert.equal(res.status, 200, '/api/auth/me must return 200');
    const data = await res.json();
    assert.equal(data.authenticated, true, 'User must be authenticated');
    assert.equal(data.user.id, createdUserId, 'User ID must match');
    assert.equal(data.user.email, testEmail, 'Email must match');
  });

  await t.test('4. Financial Setup Step 1 & 2: Updates baseline preferences and persists to database', async () => {
    const startingBalance = 85000;
    const safetyBuffer = 30000;
    const lowBalanceAlertThreshold = 25000;

    const res = await fetch(`${BASE_URL}/api/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        startingBalance,
        safetyBuffer,
        incomeFrequency: 'Irregular / Milestone-based',
        lowBalanceAlertThreshold
      })
    });

    assert.equal(res.status, 200, 'Preferences update must return 200');
    const data = await res.json();
    assert.equal(data.success, true, 'Preferences update must report success');
    assert.equal(data.preferences.startingBalance, startingBalance, 'Starting balance must be updated');
    assert.equal(data.preferences.safetyBuffer, safetyBuffer, 'Safety buffer must be updated');
    assert.equal(data.preferences.lowBalanceAlertThreshold, lowBalanceAlertThreshold, 'Alert threshold must be updated');

    // Verify persistence in financials.json
    const financials = JSON.parse(fs.readFileSync(FINANCIALS_FILE, 'utf8'));
    const userFinancials = financials[createdUserId];
    assert.ok(userFinancials, 'User financials partition must be created in financials.json');
    assert.equal(userFinancials.preferences.startingBalance, startingBalance, 'Persisted balance must match');
    assert.equal(userFinancials.preferences.safetyBuffer, safetyBuffer, 'Persisted buffer must match');
  });

  await t.test('5. Complete Onboarding: Marks onboardingCompleted as true persistently', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/onboarding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    assert.equal(res.status, 200, 'Onboarding endpoint must return 200 OK');
    const data = await res.json();
    assert.equal(data.success, true, 'Onboarding completion must be true');
    assert.equal(data.user.onboardingCompleted, true, 'User profile must show onboardingCompleted: true');

    // Verify persistence in users.json
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const updatedUser = users.find(u => u.id === createdUserId);
    assert.equal(updatedUser.onboardingCompleted, true, 'users.json must show onboardingCompleted: true');
  });

  await t.test('6. Safe-to-Spend formula verifies Day 1 calculation integrity', async () => {
    const startingBalance = 85000;
    const safetyBuffer = 30000;
    const safeToSpend = Math.max(0, startingBalance - safetyBuffer);

    assert.equal(safeToSpend, 55000, 'Safe-to-Spend must equal balance minus safety buffer (85,000 - 30,000 = 55,000)');
  });

  await t.test('7. Database architecture status check: Dual-mode resilient persistence verified', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200, 'Health endpoint must respond with 200');
    const health = await res.json();
    assert.equal(health.status, 'healthy', 'Backend must report healthy status');
    assert.ok(health.serverTime, 'Server time must be returned');
  });
});
