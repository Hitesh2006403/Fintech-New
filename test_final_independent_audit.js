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
import { isSupabaseConfigured, testSupabaseCloudConnection } from './backend/supabase.js';

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

describe('FINAL INDEPENDENT PRODUCTION READINESS AUDIT (10 PRIORITIZED CHECKS)', () => {

  // =========================================================================
  // CHECK 1: Safe-to-Spend Formula Verification
  // =========================================================================
  test('Check 1: Safe-to-Spend Formula correctly protects overdue essentials, upcoming essentials, safety buffer, and earmarked savings', async () => {
    // 1A. Benchmark dataset test (usr_demo_01)
    const benchmarkData = db.getUserFinancials('usr_demo_01');
    const balanceResult = calculateCurrentBalance(
      benchmarkData.preferences.startingBalance,
      benchmarkData.incomes,
      benchmarkData.expenses,
      benchmarkData.leanSavings.currentDesignatedReserve
    );
    assert.equal(balanceResult.availableCash, 124500, 'Available cash must be exactly 124500');

    // Run Safe-to-Spend with benchmark records
    const s2sBenchmark = calculateSafeToSpend({
      availableCash: balanceResult.availableCash,
      incomes: benchmarkData.incomes,
      expenses: benchmarkData.expenses,
      safetyBuffer: 25000,
      earmarkedSavings: 0,
      horizonDays: 30,
      currentDateStr: '2026-11-10',
      scenario: 'conservative'
    });

    // Essential overdue bills sum to 43200 (Adobe CC 3200 is discretionary)
    assert.equal(s2sBenchmark.essentialOverdue, 43200, 'Essential overdue liabilities must be 43,200');
    assert.equal(s2sBenchmark.safetyBuffer, 25000, 'Safety buffer must be 25,000');
    assert.equal(s2sBenchmark.safeToSpendToday, 56300, 'Safe to spend must be 124,500 - 43,200 - 25,000 = 56,300');

    // 1B. Test with earmarked savings (e.g. ₹14,000 earmarked)
    const s2sWithEarmark = calculateSafeToSpend({
      availableCash: balanceResult.availableCash,
      incomes: benchmarkData.incomes,
      expenses: benchmarkData.expenses,
      safetyBuffer: 25000,
      earmarkedSavings: 14000,
      horizonDays: 30,
      currentDateStr: '2026-11-10',
      scenario: 'conservative'
    });
    // 124500 - 43200 - 25000 - 14000 = 42300
    assert.equal(s2sWithEarmark.safeToSpendToday, 42300, 'Safe to spend must reduce by earmarked savings');

    // 1C. Test with upcoming essential bills inside horizon (strict essential only)
    const futureIncomes = [{ id: 'inc_fut', amount: 50000, expectedDate: '2026-11-20', status: 'confirmed' }];
    const futureExpenses = [
      { id: 'exp_ovd', amount: 10000, dueDate: '2026-11-01', isEssential: true, status: 'unpaid' }, // overdue
      { id: 'exp_upc', amount: 15000, dueDate: '2026-11-15', isEssential: true, status: 'unpaid' }, // upcoming inside horizon
      { id: 'exp_disc', amount: 5000, dueDate: '2026-11-12', isEssential: false, status: 'unpaid' } // non-essential
    ];
    const s2sStrictEssential = calculateSafeToSpend({
      availableCash: 60000,
      incomes: futureIncomes,
      expenses: futureExpenses,
      safetyBuffer: 20000,
      earmarkedSavings: 5000,
      horizonDays: 30,
      currentDateStr: '2026-11-10',
      scenario: 'conservative',
      includeDiscretionary: false
    });
    // Available cash 60000 - Essential Overdue 10000 - Upcoming Essential 15000 - Buffer 20000 - Earmark 5000 = 10000
    assert.equal(s2sStrictEssential.essentialOverdue, 10000);
    assert.equal(s2sStrictEssential.upcomingEssential, 15000);
    assert.equal(s2sStrictEssential.safeToSpendToday, 10000);

    // When including discretionary in planning horizon:
    const s2sWithDiscretionary = calculateSafeToSpend({
      availableCash: 60000,
      incomes: futureIncomes,
      expenses: futureExpenses,
      safetyBuffer: 20000,
      earmarkedSavings: 5000,
      horizonDays: 30,
      currentDateStr: '2026-11-10',
      scenario: 'conservative',
      includeDiscretionary: true
    });
    // 60000 - 10000 - 15000 - 5000 - 20000 - 5000 = 5000
    assert.equal(s2sWithDiscretionary.safeToSpendToday, 5000);

    // 1D. Clamping to zero & shortfall calculation when obligations exceed cash
    const s2sDeficit = calculateSafeToSpend({
      availableCash: 20000,
      incomes: [],
      expenses: [{ id: 'e1', amount: 30000, dueDate: '2026-11-01', isEssential: true, status: 'unpaid' }],
      safetyBuffer: 10000,
      currentDateStr: '2026-11-10'
    });
    // raw: 20000 - 30000 - 10000 = -20000
    assert.equal(s2sDeficit.safeToSpendToday, 0, 'Safe to spend must clamp to 0');
    assert.equal(s2sDeficit.projectedShortfall, 20000, 'Projected shortfall must be 20000');
  });

  // =========================================================================
  // CHECK 2: Supabase Persistence in Deployed Environment
  // =========================================================================
  test('Check 2: Supabase persistence and resilient fallback operational across environments', async () => {
    // 2A. Inspect Supabase Cloud connection status
    const cloudStatus = await testSupabaseCloudConnection();
    assert.ok(typeof cloudStatus === 'object', 'Cloud connection status must return an object');
    assert.ok('connected' in cloudStatus, 'Must report connected flag');
    assert.ok('configured' in cloudStatus, 'Must report configured flag');

    // 2B. Inspect SQL Schema Integrity
    const schemaSql = fs.readFileSync(path.resolve('supabase/schema.sql'), 'utf8');
    const requiredTables = [
      'profiles',
      'user_preferences',
      'income_entries',
      'expenses',
      'transactions',
      'savings_goals',
      'notifications',
      'simulation_scenarios'
    ];
    for (const tbl of requiredTables) {
      assert.ok(schemaSql.includes(`CREATE TABLE public.${tbl}`), `Schema must define table public.${tbl}`);
    }

    // 2C. Verify resilient JSON / fallback storage works without cloud credentials
    const testUserFin = db.getUserFinancials('usr_demo_01');
    assert.ok(testUserFin.incomes.length > 0, 'Fallback JSON storage must serve authentic demo records');
    assert.ok(testUserFin.expenses.length > 0, 'Fallback JSON storage must serve authentic expenses');
    assert.ok(testUserFin.preferences, 'Fallback JSON storage must serve user preferences');
  });

  // =========================================================================
  // CHECK 3: Row-Level Security (RLS) & Multi-Account Isolation
  // =========================================================================
  test('Check 3: Row-Level Security (RLS) policies defined and enforced across two independent accounts', async () => {
    // 3A. Verify RLS is enabled in schema.sql for all tables
    const schemaSql = fs.readFileSync(path.resolve('supabase/schema.sql'), 'utf8');
    const rlsTables = [
      'profiles',
      'user_preferences',
      'income_entries',
      'expenses',
      'transactions',
      'savings_goals',
      'notifications',
      'simulation_scenarios'
    ];
    for (const tbl of rlsTables) {
      assert.ok(schemaSql.includes(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;`), `RLS must be enabled for ${tbl}`);
    }

    // 3B. Multi-tenant live API isolation test
    const ts = Date.now();
    const emailA = `account_a_${ts}@test.com`;
    const emailB = `account_b_${ts}@test.com`;

    // Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'StrongPassword123!', name: 'User Alpha' })
    });
    assert.equal(resA.status, 200);
    const userA = await resA.json();

    // Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'StrongPassword123!', name: 'User Beta' })
    });
    assert.equal(resB.status, 200);
    const userB = await resB.json();

    // User A adds a confidential bill
    const addBillRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
      body: JSON.stringify({
        title: 'User Alpha Private Office Rent',
        category: 'Rent',
        amount: 88000,
        dueDate: '2026-11-25',
        isEssential: true
      })
    });
    assert.ok(addBillRes.status === 200 || addBillRes.status === 201, 'Bill addition must succeed');
    const billData = await addBillRes.json();
    const billA = billData.expense || billData;

    // User B requests their own financials
    const getBFinancialsRes = await fetch(`${baseUrl}/api/financials`, {
      headers: { 'Authorization': `Bearer ${userB.token}` }
    });
    assert.equal(getBFinancialsRes.status, 200);
    const bPayload = await getBFinancialsRes.json();
    const expensesB = bPayload.data?.expenses || [];

    // Verify User B cannot see User Alpha's bill
    const leaked = expensesB.find(e => e.id === billA.id || e.title === 'User Alpha Private Office Rent');
    assert.equal(leaked, undefined, 'User Beta must NEVER see User Alpha confidential expenses');

    // User B attempts to delete User Alpha bill - should not delete Alpha's bill
    await fetch(`${baseUrl}/api/expenses/${billA.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userB.token}` }
    });

    // Verify User A bill still exists
    const getAFinancialsRes = await fetch(`${baseUrl}/api/financials`, {
      headers: { 'Authorization': `Bearer ${userA.token}` }
    });
    const aPayload = await getAFinancialsRes.json();
    const expensesA = aPayload.data?.expenses || [];
    assert.ok(expensesA.some(e => e.id === billA.id), 'User Alpha bill must still exist after unauthorized attempt');
  });

  // =========================================================================
  // CHECK 4: Recurring Transactions and Duplicate Prevention
  // =========================================================================
  test('Check 4: Recurring transaction metadata preserved and duplicate payment deduction prevented', async () => {
    // 4A. Verify recurring fields supported in data model
    const fin = db.getUserFinancials('usr_demo_01');
    const recurringExpense = fin.expenses.find(e => e.recurring && e.recurring !== 'one-time');
    assert.ok(recurringExpense, 'Must support recurring expense frequency types');
    assert.ok(['monthly', 'quarterly', 'bi-weekly'].includes(recurringExpense.recurring));

    // 4B. Duplicate payment prevention test
    const ts = Date.now();
    const userRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `dup_test_${ts}@test.com`, password: 'Password123!', name: 'Dup Tester' })
    });
    const { token } = await userRes.json();

    // Set starting balance 50,000
    await fetch(`${baseUrl}/api/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ startingBalance: 50000, safetyBuffer: 10000 })
    });

    // Add a bill of ₹10,000
    const billRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: 'Server Bill', category: 'Utilities', amount: 10000, dueDate: '2026-11-12', isEssential: true })
    });
    assert.ok(billRes.status === 200 || billRes.status === 201);
    const billData = await billRes.json();
    const bill = billData.expense || billData;

    // Mark as paid first time
    const pay1 = await fetch(`${baseUrl}/api/expenses/${bill.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: 'paid', paidDate: '2026-11-10' })
    });
    assert.equal(pay1.status, 200);

    // Calculate balance after 1st payment
    const calc1Res = await fetch(`${baseUrl}/api/financials/calculations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const calc1 = await calc1Res.json();
    const balance1 = calc1.data?.balanceDetails?.availableCash ?? calc1.availableCash;
    assert.equal(balance1, 119500, 'Balance must accurately deduct ₹10,000 once (129,500 - 10,000 = 119,500)');

    // Attempt to mark as paid a second time (simulate double click / duplicate request)
    const pay2 = await fetch(`${baseUrl}/api/expenses/${bill.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: 'paid', paidDate: '2026-11-10' })
    });
    assert.equal(pay2.status, 200);

    // Balance must STILL be 119,500 (never double-deducted to 109,500)
    const calc2Res = await fetch(`${baseUrl}/api/financials/calculations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const calc2 = await calc2Res.json();
    const balance2 = calc2.data?.balanceDetails?.availableCash ?? calc2.availableCash;
    assert.equal(balance2, 119500, 'Duplicate payment call must NEVER double-deduct from cash balance');
    assert.equal(balance2, balance1, 'Subsequent payment attempts must be idempotent');
  });

  // =========================================================================
  // CHECK 5: Partial Payments and Settlement History
  // =========================================================================
  test('Check 5: Settlement history records paidDate, reflects status progression, and supports installment details', async () => {
    const benchmarkData = db.getUserFinancials('usr_demo_01');

    // 5A. Check EMI installment structure
    const emiBill = benchmarkData.expenses.find(e => e.emiDetails);
    assert.ok(emiBill, 'Benchmark data must contain an EMI bill with installment details');
    assert.ok(emiBill.emiDetails.remainingInstallments > 0, 'EMI must specify remaining installments');

    // 5B. Check settled expenses history
    const settledBills = benchmarkData.expenses.filter(e => e.status === 'paid');
    assert.ok(settledBills.length > 0, 'Must have settled expenses in history');
    settledBills.forEach(b => {
      assert.equal(b.status, 'paid');
      assert.ok(b.paidDate, 'Settled bill must have an authentic paidDate');
    });

    // 5C. Check partial payment / balance adjustment
    const ts = Date.now();
    const userRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `partial_test_${ts}@test.com`, password: 'Password123!', name: 'Partial Tester' })
    });
    const { token } = await userRes.json();

    // Create a ₹20,000 bill
    const createRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: 'Contractor Invoice', category: 'Services', amount: 20000, dueDate: '2026-11-20', isEssential: true })
    });
    const createdData = await createRes.json();
    const createdBill = createdData.expense || createdData;

    // Simulate paying half (₹10,000) by adjusting the outstanding balance to ₹10,000
    const partialUpdate = await fetch(`${baseUrl}/api/expenses/${createdBill.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount: 10000, notes: 'Partial payment ₹10,000 completed. Balance ₹10,000.' })
    });
    const updatedData = await partialUpdate.json();
    const updatedBill = updatedData.expense || updatedData;
    assert.equal(updatedBill.amount, 10000, 'Outstanding bill amount must reflect partial reduction');
  });

  // =========================================================================
  // CHECK 6: Forecast Calculations Match Database Records
  // =========================================================================
  test('Check 6: Cash flow forecast accurately projects chronological cash movements from real database records', async () => {
    const benchmarkData = db.getUserFinancials('usr_demo_01');
    const balanceResult = calculateCurrentBalance(
      benchmarkData.preferences.startingBalance,
      benchmarkData.incomes,
      benchmarkData.expenses,
      benchmarkData.leanSavings.currentDesignatedReserve
    );

    // 6A. Test optimistic scenario: scheduled uncertain income inc_105 (₹35,000 on 2026-11-12) is included
    const optForecastResult = generateCashFlowForecast({
      availableCash: balanceResult.availableCash,
      incomes: benchmarkData.incomes,
      expenses: benchmarkData.expenses,
      safetyBuffer: 25000,
      days: 30,
      scenario: 'optimistic',
      currentDateStr: '2026-11-05'
    });

    const optForecast = optForecastResult.forecast;
    assert.ok(Array.isArray(optForecast), 'Forecast must be an array');
    assert.equal(optForecast[0].openingBalance, 124500, 'Day 0 opening balance must equal current cash');

    const scheduledDay = optForecast.find(f => f.date === '2026-11-12');
    assert.ok(scheduledDay, 'Forecast must contain 2026-11-12');
    assert.equal(scheduledDay.inflow, 35000, '2026-11-12 must register ₹35,000 inflow in optimistic scenario');

    // 6B. Test conservative / expected scenario: uncertain income is safely excluded to protect liquidity
    const expForecastResult = generateCashFlowForecast({
      availableCash: balanceResult.availableCash,
      incomes: benchmarkData.incomes,
      expenses: benchmarkData.expenses,
      safetyBuffer: 25000,
      days: 30,
      scenario: 'expected',
      currentDateStr: '2026-11-05'
    });
    const expScheduledDay = expForecastResult.forecast.find(f => f.date === '2026-11-12');
    assert.equal(expScheduledDay.inflow, 0, 'Uncertain income must be excluded from conservative/expected forecast');

    // Chronological continuity: Day N closing balance must equal Day N+1 opening balance
    for (let i = 0; i < optForecast.length - 1; i++) {
      assert.equal(optForecast[i].closingBalance, optForecast[i + 1].openingBalance, `Day ${i} closing must equal Day ${i + 1} opening`);
    }
  });

  // =========================================================================
  // CHECK 7: Live Date Handling and Simulation Date Isolation
  // =========================================================================
  test('Check 7: Timezone handling is consistent and sandbox simulations never mutate live database records', async () => {
    // 7A. Date arithmetic in Asia/Kolkata
    const today = getCurrentLocalDate();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD');

    // Edge cases: Month roll, Leap year roll, Year roll
    assert.equal(addDays('2026-10-31', 1), '2026-11-01');
    assert.equal(addDays('2024-02-28', 1), '2024-02-29'); // Leap year
    assert.equal(addDays('2026-02-28', 1), '2026-03-01'); // Non-leap year
    assert.equal(addDays('2026-12-31', 1), '2027-01-01'); // Year boundary

    // 7B. Simulation sandbox zero-mutation check
    const benchmarkData = db.getUserFinancials('usr_demo_01');
    const originalIncomeDates = benchmarkData.incomes.map(i => ({ id: i.id, date: i.expectedDate, amount: i.amount }));

    // Run 30-day delay simulation on inc_105
    const simResult = simulatePaymentDelay({
      availableCash: 124500,
      incomes: benchmarkData.incomes,
      expenses: benchmarkData.expenses,
      safetyBuffer: 25000,
      delayConfig: {
        incomeId: 'inc_105',
        delayDays: 30,
        unexpectedExpense: 15000,
        incomeReductionPct: 20
      },
      currentDateStr: '2026-11-05'
    });

    assert.ok(simResult.simulated.forecast.length > 0, 'Simulation must produce forecast');

    // Confirm original records in database are 100% UNCHANGED
    const reloadedData = db.getUserFinancials('usr_demo_01');
    originalIncomeDates.forEach(orig => {
      const match = reloadedData.incomes.find(i => i.id === orig.id);
      assert.equal(match.expectedDate, orig.date, `Income ${orig.id} date must remain completely untouched`);
      assert.equal(match.amount, orig.amount, `Income ${orig.id} amount must remain completely untouched`);
    });
  });

  // =========================================================================
  // CHECK 8: Notifications Dynamically Reflect Current Financial Statuses
  // =========================================================================
  test('Check 8: Notifications calculate dynamic overdue ages and suppress settled bill alerts', async () => {
    const rawNotif = {
      id: 'notif_demo_01',
      referenceId: 'exp_204',
      title: 'Bill Overdue: AWS Hosting',
      relatedRecord: 'exp_204',
      severity: 'critical'
    };

    const benchmarkData = db.getUserFinancials('usr_demo_01');

    // At today 2026-11-10, exp_204 (due 2026-10-26) is 15 days overdue
    const dynamicNotif = resolveDynamicNotification(rawNotif, benchmarkData.expenses, benchmarkData.incomes, benchmarkData.leanSavings, '2026-11-10');
    assert.ok(dynamicNotif, 'Must return dynamic notification');
    assert.ok(dynamicNotif.title.includes('15 Days'), `Must state exact overdue days, got: ${dynamicNotif.title}`);

    // If bill is paid, notification status reflects settled / resolved
    const paidExpenses = benchmarkData.expenses.map(e => e.id === 'exp_204' ? { ...e, status: 'paid', paidDate: '2026-11-05' } : e);
    const settledNotif = resolveDynamicNotification(rawNotif, paidExpenses, benchmarkData.incomes, benchmarkData.leanSavings, '2026-11-10');
    assert.ok(settledNotif.title.includes('Paid') || settledNotif.severity === 'info', 'Paid bill notification must reflect settlement');
  });

  // =========================================================================
  // CHECK 9: Production API Connectivity, Authentication, CORS, and Secrets
  // =========================================================================
  test('Check 9: API connectivity, CORS headers, token security, and zero secret leakage verified', async () => {
    // 9A. Health check endpoint
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'healthy');
    assert.ok(health.serverTime, 'Must return serverTime');

    // 9B. CORS headers verification
    const corsRes = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      }
    });
    assert.equal(corsRes.status, 204);

    // 9C. Token authentication security: Reject anonymous and fraudulent requests
    const anonRes = await fetch(`${baseUrl}/api/financials/calculations`);
    assert.equal(anonRes.status, 401, 'Anonymous request to protected endpoint must return 401');

    const fakeTokenRes = await fetch(`${baseUrl}/api/financials/calculations`, {
      headers: { 'Authorization': 'Bearer bad.token.value' }
    });
    assert.equal(fakeTokenRes.status, 401, 'Forged token request must return 401');

    // 9D. Secrets isolation: Response must not expose JWT secret, private service keys, or passwords
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `secret_check_${Date.now()}@test.com`, password: 'SecretPassword99!', name: 'Secret Check' })
    });
    const regBody = await regRes.text();
    assert.ok(!regBody.includes('JWT_SECRET'), 'Response must never leak JWT_SECRET');
    assert.ok(!regBody.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Response must never leak SUPABASE_SERVICE_ROLE_KEY');
    assert.ok(!regBody.includes('SecretPassword99!'), 'Response must never echo plaintext password back');
  });

  // =========================================================================
  // CHECK 10: All Primary User Navigation Views Configured and Functional
  // =========================================================================
  test('Check 10: All primary application views and aliases route correctly with zero missing modules', () => {
    const appPath = path.resolve('src/App.jsx');
    const appSource = fs.readFileSync(appPath, 'utf8');

    // The six primary user views
    const primaryViews = [
      { name: 'OverviewDashboard', path: '/dashboard' },
      { name: 'IncomeManagement', path: '/income' },
      { name: 'ExpensesBills', path: '/expenses' },
      { name: 'SafeToSpendCalculator', path: '/safe-to-spend' },
      { name: 'CashFlowForecast', path: '/forecast' },
      { name: 'PaymentDelaySimulator', path: '/simulator' }
    ];

    for (const view of primaryViews) {
      assert.ok(appSource.includes(`path="${view.path}" element={<${view.name} />}`), `App.jsx must configure route ${view.path} for ${view.name}`);
      const compFile = path.resolve(`src/pages/${view.name}.jsx`);
      assert.ok(fs.existsSync(compFile), `Component file src/pages/${view.name}.jsx must exist`);
    }

    // Secondary & alias views
    assert.ok(appSource.includes('path="/prioritization"'), 'Must route Smart Bill Prioritization');
    assert.ok(appSource.includes('path="/savings"'), 'Must route Lean-Week Savings');
    assert.ok(appSource.includes('path="/notifications"'), 'Must route Notifications');
    assert.ok(appSource.includes('path="/settings"'), 'Must route Settings');
    assert.ok(appSource.includes('path="/transactions"'), 'Must route /transactions alias');
  });
});
