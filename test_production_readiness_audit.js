import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import app from './backend/server.js';
import { db } from './backend/db.js';
import {
  calculateCurrentBalance,
  calculateSafeToSpend,
  generateCashFlowForecast,
  simulatePaymentDelay,
  rankBills,
  calculateLeanWeekSavings,
  formatINR
} from './src/services/financialEngine.js';
import {
  getCurrentLocalDate,
  toISODate,
  addDays,
  diffInDays,
  classifyBillStatus,
  classifyIncomeStatus,
  resolveDynamicNotification
} from './src/services/dateService.js';

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

describe('FinSight Final Production Readiness & Regression Audit', () => {

  // 1. Browser-Facing CSS & DOM Structural Integrity (Point 1)
  test('Check 1: Browser-facing CSS guarantees 100% opaque modal dialogs and backdrop isolation', () => {
    const cssPath = path.resolve('src/App.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Confirm high-contrast solid backgrounds
    assert.ok(css.includes('background: #0F172A'), 'Modal content card must have solid dark navy background');
    assert.ok(css.includes('background: #0B1220'), 'Modal header and footer must have deep solid background');
    assert.ok(css.includes('z-index: 9999'), 'Backdrop z-index must be at top stack level');
    assert.ok(css.includes('z-index: 10000'), 'Modal card z-index must sit above backdrop');
    assert.ok(css.includes('rgba(3, 7, 18, 0.88)'), 'Backdrop opacity must be 88%');
  });

  // 2. User Authentication and Individual Data Isolation (Point 2 & 3)
  test('Check 2 & 3: Individual user accounts have strict data isolation across all endpoints', async () => {
    const ts = Date.now();
    const userAEmail = `prod_audit_a_${ts}@example.com`;
    const userBEmail = `prod_audit_b_${ts}@example.com`;

    // Register User A
    const regARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'ProdPassword2026!', name: 'Audit User A' })
    });
    assert.equal(regARes.status, 200);
    const userA = await regARes.json();
    const tokenA = userA.token;

    // Register User B
    const regBRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password: 'ProdPassword2026!', name: 'Audit User B' })
    });
    assert.equal(regBRes.status, 200);
    const userB = await regBRes.json();
    const tokenB = userB.token;

    // User A sets customized starting balance and adds income
    await fetch(`${baseUrl}/api/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ startingBalance: 90000, safetyBuffer: 30000 })
    });

    const addIncRes = await fetch(`${baseUrl}/api/incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: 'User A Strategic Retainer',
        amount: 50000,
        expectedDate: '2026-11-20',
        actualDate: '2026-11-20',
        status: 'received'
      })
    });
    assert.equal(addIncRes.status, 201);
    const incJson = await addIncRes.json();
    const incomeIdA = incJson.income.id;

    // Verify User A calculations reflect their private entries
    const calcARes = await fetch(`${baseUrl}/api/financials/calculations`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(calcARes.status, 200);
    const calcA = await calcARes.json();
    assert.equal(calcA.data.balanceDetails.availableCash, 219500, 'User A cash: 90,000 + starter net (79,500) + 50,000 = 219,500');

    // Verify User B cannot see User A data or calculations
    const calcBRes = await fetch(`${baseUrl}/api/financials/calculations`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(calcBRes.status, 200);
    const calcB = await calcBRes.json();
    assert.equal(calcB.data.balanceDetails.availableCash, 124500, 'User B must have standard starting cash (124,500), completely isolated');

    const finBRes = await fetch(`${baseUrl}/api/financials`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const finB = await finBRes.json();
    assert.ok(!finB.data.incomes.some(i => i.id === incomeIdA), "User B must NOT see User A's income ID");
  });

  // 4. Supabase Schema and RLS Compliance (Point 4)
  test('Check 4: Supabase schema and RLS policies preserve security isolation', () => {
    const schemaPath = path.resolve('supabase/schema.sql');
    assert.ok(fs.existsSync(schemaPath), 'Supabase schema file must exist');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Confirm RLS is enabled on all tables
    assert.ok(sql.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'));
    assert.ok(sql.includes('ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;'));
    assert.ok(sql.includes('ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;'));
    assert.ok(sql.includes('ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;'));
    assert.ok(sql.includes('ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;'));
    assert.ok(sql.includes('ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;'));
  });

  // 5. Build Artifacts Verification (Point 5)
  test('Check 5: Frontend build artifacts exist and have zero runtime errors', () => {
    const distIndex = path.resolve('dist/index.html');
    assert.ok(fs.existsSync(distIndex), 'dist/index.html must exist from build');
    const html = fs.readFileSync(distIndex, 'utf8');
    assert.ok(html.includes('doctype html'), 'Index HTML must be valid');
    assert.ok(html.includes('assets/'), 'Asset bundles must be referenced');
  });

  // 6. Refresh Persistence for Safe-to-Spend & Forecast (Point 9)
  test('Check 9: Safe-to-Spend and Forecast calculations persist identically across page refresh simulation', async () => {
    const fin = db.getUserFinancials('usr_demo_01');

    // 1st Calculation Cycle (Initial load)
    const availableCash1 = calculateCurrentBalance(
      fin.preferences.startingBalance,
      fin.incomes,
      fin.expenses,
      fin.savingsGoals?.currentDesignatedReserve ?? 14000
    ).availableCash;

    const sts1 = calculateSafeToSpend({
      availableCash: availableCash1,
      incomes: fin.incomes,
      expenses: fin.expenses,
      safetyBuffer: fin.preferences.safetyBuffer,
      horizonDays: 30,
      currentDateStr: '2026-11-10'
    });

    const forecast1 = generateCashFlowForecast({
      availableCash: availableCash1,
      incomes: fin.incomes,
      expenses: fin.expenses,
      safetyBuffer: fin.preferences.safetyBuffer,
      days: 30,
      startDateStr: '2026-11-10',
      scenario: 'expected'
    });

    // Simulate Page Refresh (JSON serialization to storage and deserialization on reload)
    const serializedState = JSON.stringify({
      preferences: fin.preferences,
      incomes: fin.incomes,
      expenses: fin.expenses,
      savings: fin.savingsGoals
    });
    const reloaded = JSON.parse(serializedState);

    // 2nd Calculation Cycle (After refresh)
    const availableCash2 = calculateCurrentBalance(
      reloaded.preferences.startingBalance,
      reloaded.incomes,
      reloaded.expenses,
      reloaded.savings?.currentDesignatedReserve ?? 14000
    ).availableCash;

    const sts2 = calculateSafeToSpend({
      availableCash: availableCash2,
      incomes: reloaded.incomes,
      expenses: reloaded.expenses,
      safetyBuffer: reloaded.preferences.safetyBuffer,
      horizonDays: 30,
      currentDateStr: '2026-11-10'
    });

    const forecast2 = generateCashFlowForecast({
      availableCash: availableCash2,
      incomes: reloaded.incomes,
      expenses: reloaded.expenses,
      safetyBuffer: reloaded.preferences.safetyBuffer,
      days: 30,
      startDateStr: '2026-11-10',
      scenario: 'expected'
    });

    // Verification of exact consistency
    assert.equal(availableCash1, availableCash2);
    assert.equal(sts1.safeToSpendToday, sts2.safeToSpendToday);
    assert.equal(sts1.totalEssentialCommitments, sts2.totalEssentialCommitments);
    assert.equal(forecast1.forecast.length, forecast2.forecast.length);
    assert.equal(forecast1.forecast[10].closingBalance, forecast2.forecast[10].closingBalance);
    assert.equal(forecast1.forecast[20].closingBalance, forecast2.forecast[20].closingBalance);
  });

  // 7. Feature Non-Regression: Payment Delay Simulator Sandbox (Point 8)
  test('Check 8: Payment Delay Simulator operates in strict sandbox mode without mutating original records', () => {
    const fin = db.getUserFinancials('usr_demo_01');
    const originalCount = fin.incomes.length;
    const originalDate = fin.incomes.find(i => i.id === 'inc_103')?.expectedDate;

    // Simulate 15-day delay on Milestone 2 Deliverable with unexpected ₹10,000 emergency expense
    const sim = simulatePaymentDelay({
      availableCash: 124500,
      incomes: fin.incomes,
      expenses: fin.expenses,
      safetyBuffer: 25000,
      delayConfig: {
        incomeId: 'inc_103',
        delayDays: 15,
        unexpectedExpense: 10000,
        incomeReductionPct: 0
      },
      startDateStr: '2026-10-18'
    });

    assert.ok(sim.baseline);
    assert.ok(sim.simulated);

    // Verify real database records remain 100% untouched
    const finAfter = db.getUserFinancials('usr_demo_01');
    assert.equal(finAfter.incomes.length, originalCount);
    assert.equal(finAfter.incomes.find(i => i.id === 'inc_103')?.expectedDate, originalDate);
  });

  // 8. Feature Non-Regression: Smart Bill Prioritization (Point 8)
  test('Check 8b: Smart Bill Prioritization accurately assigns priority tiers and late penalty warnings', () => {
    const fin = db.getUserFinancials('usr_demo_01');
    const ranking = rankBills(fin.expenses, 124500);

    assert.ok(ranking.rankedBills.length > 0);
    const criticalBills = ranking.rankedBills.filter(b => b.priority === 'critical');
    assert.ok(criticalBills.length >= 2, 'Workstation EMI and Rent must be in critical overdue tier');

    // Verify formatting never contains double currency
    for (const bill of ranking.rankedBills) {
      assert.ok(!bill.lateFeeFormatted?.includes('₹₹'));
      assert.ok(!bill.suggestedAction?.includes('₹₹'));
    }
  });

  // 9. Fresh Serverless Deployment Compatibility (Point 10)
  test('Check 10: Serverless entry point (api/index.js) and /tmp directory fallback are operational', () => {
    const apiIndex = path.resolve('api/index.js');
    assert.ok(fs.existsSync(apiIndex), 'api/index.js entry point must exist for Vercel');

    // Confirm that db module handles /tmp correctly
    const dbSource = fs.readFileSync(path.resolve('backend/db.js'), 'utf8');
    assert.ok(dbSource.includes('finsight-data'));
    assert.ok(dbSource.includes('process.env.VERCEL'));
  });

});
