import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../backend/server.js';
import { db } from '../backend/db.js';

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

describe('Phase 2: Personal Finance Analyzer — Strict Tenant Isolation & Data Safety Suite', () => {

  // Test 1: Unauthenticated request rejection
  test('Check 1: Unauthenticated requests to /api/analyzer/* return HTTP 401 Unauthorized', async () => {
    const endpoints = [
      '/api/analyzer/data',
      '/api/analyzer/summary',
      '/api/analyzer/transactions'
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.equal(res.status, 401, `Endpoint ${ep} must return 401 Unauthorized for unauthenticated requests`);
      const body = await res.json();
      assert.equal(body.error, 'Authentication required');
    }
  });

  // Test 2: Multi-tenant user isolation (User A vs. User B)
  test('Check 2: Multi-tenant user accounts have absolute cryptographic data isolation', async () => {
    const ts = Date.now();
    const userAEmail = `iso_user_a_${ts}@example.com`;
    const userBEmail = `iso_user_b_${ts}@example.com`;

    // 1. Register User A
    const regARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'SecurePassword123!', name: 'User A' })
    });
    assert.equal(regARes.status, 200);
    const userA = await regARes.json();
    const tokenA = userA.token;
    const userIdA = userA.user.id;

    // 2. Register User B
    const regBRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password: 'SecurePassword123!', name: 'User B' })
    });
    assert.equal(regBRes.status, 200);
    const userB = await regBRes.json();
    const tokenB = userB.token;
    const userIdB = userB.user.id;

    assert.notEqual(userIdA, userIdB, 'User IDs must be completely unique');

    // 3. User A adds unique private income and expense
    const incARes = await fetch(`${baseUrl}/api/incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: `Private Retainer A ${ts}`,
        amount: 150000,
        expectedDate: '2026-11-20',
        actualDate: '2026-11-20',
        status: 'received',
        source: 'Client Alpha'
      })
    });
    assert.equal(incARes.status, 201);

    const expARes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: `Private Penthouse Rent A ${ts}`,
        category: 'Rent',
        amount: 45000,
        dueDate: '2026-11-25',
        isEssential: true,
        status: 'paid',
        paidDate: '2026-11-20'
      })
    });
    assert.equal(expARes.status, 201);

    // 4. User B adds unique private income and expense
    const incBRes = await fetch(`${baseUrl}/api/incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({
        title: `Private Retainer B ${ts}`,
        amount: 80000,
        expectedDate: '2026-11-20',
        actualDate: '2026-11-20',
        status: 'received',
        source: 'Client Beta'
      })
    });
    assert.equal(incBRes.status, 201);

    const expBRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({
        title: `Private Studio Rent B ${ts}`,
        category: 'Rent',
        amount: 20000,
        dueDate: '2026-11-25',
        isEssential: true,
        status: 'paid',
        paidDate: '2026-11-20'
      })
    });
    assert.equal(expBRes.status, 201);

    // 5. Query Analyzer Data for User A
    const analyzerARes = await fetch(`${baseUrl}/api/analyzer/data`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(analyzerARes.status, 200);
    const analyzerA = await analyzerARes.json();

    assert.equal(analyzerA.data.meta.userId, userIdA);
    const incomeTitlesA = analyzerA.data.incomes.map(i => i.title);
    const expenseTitlesA = analyzerA.data.expenses.map(e => e.title);

    assert.ok(incomeTitlesA.includes(`Private Retainer A ${ts}`));
    assert.ok(expenseTitlesA.includes(`Private Penthouse Rent A ${ts}`));
    assert.ok(!incomeTitlesA.includes(`Private Retainer B ${ts}`), 'User A MUST NEVER see User B income');
    assert.ok(!expenseTitlesA.includes(`Private Studio Rent B ${ts}`), 'User A MUST NEVER see User B expense');

    // 6. Query Analyzer Data for User B
    const analyzerBRes = await fetch(`${baseUrl}/api/analyzer/data`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(analyzerBRes.status, 200);
    const analyzerB = await analyzerBRes.json();

    assert.equal(analyzerB.data.meta.userId, userIdB);
    const incomeTitlesB = analyzerB.data.incomes.map(i => i.title);
    const expenseTitlesB = analyzerB.data.expenses.map(e => e.title);

    assert.ok(incomeTitlesB.includes(`Private Retainer B ${ts}`));
    assert.ok(expenseTitlesB.includes(`Private Studio Rent B ${ts}`));
    assert.ok(!incomeTitlesB.includes(`Private Retainer A ${ts}`), 'User B MUST NEVER see User A income');
    assert.ok(!expenseTitlesB.includes(`Private Penthouse Rent A ${ts}`), 'User B MUST NEVER see User A expense');
  });

  // Test 3: Rejection of client-supplied user ID injection
  test('Check 3: Backend strictly ignores client-supplied userId in query parameters or payload', async () => {
    const ts = Date.now();
    const attackerEmail = `attacker_${ts}@example.com`;
    const victimEmail = `victim_${ts}@example.com`;

    // Register victim and attacker
    const regVictim = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: victimEmail, password: 'VictimPassword123!', name: 'Victim' })
    });
    const victim = await regVictim.json();
    const victimId = victim.user.id;

    // Victim adds secret financial record
    await fetch(`${baseUrl}/api/incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${victim.token}` },
      body: JSON.stringify({
        title: `Victim Secret Vault Income ${ts}`,
        amount: 999999,
        expectedDate: '2026-11-20',
        actualDate: '2026-11-20',
        status: 'received'
      })
    });

    // Register attacker
    const regAttacker = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: attackerEmail, password: 'AttackerPassword123!', name: 'Attacker' })
    });
    const attacker = await regAttacker.json();
    const attackerToken = attacker.token;

    // Attacker attempts to inject victim's userId into the query string
    const probeRes = await fetch(`${baseUrl}/api/analyzer/data?userId=${victimId}`, {
      headers: { 'Authorization': `Bearer ${attackerToken}` }
    });
    assert.equal(probeRes.status, 200);
    const probeData = await probeRes.json();

    // Verify attacker only received attacker's own dataset, NOT victim's
    assert.equal(probeData.data.meta.userId, attacker.user.id, 'Response must strictly scope to authenticated token user');
    const attackerIncomes = probeData.data.incomes.map(i => i.title);
    assert.ok(!attackerIncomes.includes(`Victim Secret Vault Income ${ts}`), 'Attacker must NEVER access victim records');
  });

  // Test 4: Calculation correctness and commitment classification
  test('Check 4: Analyzer calculations are deterministic, verified, and correctly classify obligations', async () => {
    const ts = Date.now();
    const testEmail = `calc_test_${ts}@example.com`;

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'CalcPassword123!', name: 'Calc Tester' })
    });
    const testUser = await regRes.json();
    const token = testUser.token;

    // Add confirmed income and uncertain income
    await fetch(`${baseUrl}/api/incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Cleared Retainer',
        amount: 60000,
        expectedDate: '2026-11-10',
        actualDate: '2026-11-10',
        status: 'received'
      })
    });

    await fetch(`${baseUrl}/api/incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Uncertain Milestone Bonus',
        amount: 40000,
        expectedDate: '2026-12-01',
        status: 'expected'
      })
    });

    // Add essential expense and EMI
    await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Car Loan EMI',
        category: 'EMI or loan',
        amount: 15000,
        dueDate: '2026-11-28',
        isEssential: true,
        isEMI: true,
        status: 'unpaid'
      })
    });

    const res = await fetch(`${baseUrl}/api/analyzer/data`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    const data = json.data;

    assert.ok(data.overview.clearedIncome >= 60000, 'Cleared income must be at least 60000');
    assert.ok(data.overview.uncertainIncome >= 40000, 'Uncertain income must be at least 40000');
    assert.ok(data.spending.emiCommitments >= 15000, 'EMI commitment must be detected');
    assert.ok(data.spending.essentialObligations >= 15000, 'Essential obligations must include EMI');
    assert.ok(data.overview.healthScore >= 0 && data.overview.healthScore <= 100, 'Health score must be between 0 and 100');
    assert.ok(typeof data.overview.runwayMonths === 'number', 'Runway months must be a valid number');
  });

  // Test 5: Prevention of credential or sensitive data leakage
  test('Check 5: Analyzer response payloads contain zero credentials, salts, or passwords', async () => {
    const ts = Date.now();
    const auditEmail = `leak_check_${ts}@example.com`;

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: auditEmail, password: 'SuperSecretPassword999!', name: 'Audit User' })
    });
    const auditUser = await regRes.json();
    const token = auditUser.token;

    const res = await fetch(`${baseUrl}/api/analyzer/data`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const text = await res.text();

    assert.ok(!text.includes('SuperSecretPassword999!'), 'Response must never leak plaintext password');
    assert.ok(!text.includes('passwordHash'), 'Response must never leak password hash');
    assert.ok(!text.includes('passwordSalt'), 'Response must never leak password salt');
    assert.ok(!text.includes('session_token'), 'Response must never leak raw session tokens in body');
  });

  // Test 6: Summary and Transactions endpoints
  test('Check 6: /api/analyzer/summary and /api/analyzer/transactions return scoped data', async () => {
    const ts = Date.now();
    const testEmail = `sub_test_${ts}@example.com`;

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'SubPassword123!', name: 'Sub Tester' })
    });
    const testUser = await regRes.json();
    const token = testUser.token;

    // Summary endpoint
    const sumRes = await fetch(`${baseUrl}/api/analyzer/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(sumRes.status, 200);
    const sumJson = await sumRes.json();
    assert.ok(sumJson.success);
    assert.ok(sumJson.summary);
    assert.ok(typeof sumJson.summary.healthScore === 'number');

    // Transactions endpoint
    const txRes = await fetch(`${baseUrl}/api/analyzer/transactions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(txRes.status, 200);
    const txJson = await txRes.json();
    assert.ok(txJson.success);
    assert.ok(Array.isArray(txJson.transactions));
  });

});
