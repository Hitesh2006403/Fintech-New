/**
 * FINSIGHT — PHASE 12: EXISTING FINSIGHT FULL REGRESSION AUDIT
 *
 * Comprehensive end-to-end regression audit across all non-analyzer routes,
 * foundational arithmetic logic, Neumorphic Light theme system, admin portal,
 * user authentication, data isolation, and multi-feature coexistence:
 * 1. Complete Application Route & Component Module Integrity.
 * 2. Neumorphic Light Design System & Token Integrity.
 * 3. Safe-to-Spend Mathematical Determinism & Reserve Clamping.
 * 4. Income Management Lifecycle (Create, Read, Update, Delete, Status Toggle).
 * 5. Expenses & Obligations Lifecycle (Settlement, Overdue Age, Paid Status).
 * 6. Lean-Week Reserve & Target Accumulation Engine.
 * 7. Smart Bill Prioritization & Urgency Ranking (4-Tier Logic).
 * 8. Payment Delay Simulator (Strict Non-Mutating Sandbox).
 * 9. Admin Portal, Role Separation & Multi-Tenant Security.
 * 10. Coexistence & Cross-Engine Synchronization (Classic FinSight + Personal Finance Analyzer).
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import app from '../backend/server.js';
import db from '../backend/db.js';
import {
  calculateCurrentBalance,
  calculateSafeToSpend,
  generateCashFlowForecast,
  simulatePaymentDelay,
  rankBills,
  calculateLeanWeekSavings,
  formatINR
} from '../src/services/financialEngine.js';
import {
  getCurrentLocalDate,
  toISODate,
  addDays,
  diffInDays,
  classifyBillStatus,
  classifyIncomeStatus
} from '../src/services/dateService.js';
import { getUserAnalyzerData } from '../backend/analyzerService.js';

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

describe('Phase 12: Existing FinSight Full Regression & System Audit', () => {

  // =========================================================================
  // CHECK 1: Route & Component Module Integrity
  // =========================================================================
  test('Check 1: All application views, aliases, and navigation modules exist and export cleanly', () => {
    const requiredViews = [
      'src/pages/OverviewDashboard.jsx',
      'src/pages/PersonalFinanceAnalyzer.jsx',
      'src/pages/IncomeManagement.jsx',
      'src/pages/ExpensesBills.jsx',
      'src/pages/SafeToSpendCalculator.jsx',
      'src/pages/CashFlowForecast.jsx',
      'src/pages/PaymentDelaySimulator.jsx',
      'src/pages/SmartBillPrioritization.jsx',
      'src/pages/LeanWeekSavings.jsx',
      'src/pages/NotificationsPage.jsx',
      'src/pages/ProfileSettings.jsx',
      'src/pages/admin/AdminPortal.jsx',
      'src/pages/AuthPage.jsx'
    ];

    for (const viewPath of requiredViews) {
      const fullPath = path.resolve(viewPath);
      assert.ok(fs.existsSync(fullPath), `View component must exist on disk: ${viewPath}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(
        content.includes('export default') || content.includes('export function'),
        `View component must have a valid export: ${viewPath}`
      );
    }

    // Verify Sidebar navigation items
    const sidebarPath = path.resolve('src/components/layout/Sidebar.jsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    const expectedPaths = [
      '/dashboard',
      '/analyzer',
      '/income',
      '/expenses',
      '/safe-to-spend',
      '/forecast',
      '/simulator',
      '/prioritization',
      '/savings',
      '/notifications',
      '/settings'
    ];

    for (const p of expectedPaths) {
      assert.ok(sidebarContent.includes(p), `Sidebar must contain navigation path: ${p}`);
    }
  });

  // =========================================================================
  // CHECK 2: Neumorphic Light Design System & Token Integrity
  // =========================================================================
  test('Check 2: Design system strictly defines Neumorphic Light theme variables and contrast tokens', () => {
    const themePath = path.resolve('src/styles/neumorphismTheme.css');
    assert.ok(fs.existsSync(themePath), 'Neumorphism theme stylesheet must exist');
    const css = fs.readFileSync(themePath, 'utf8');

    assert.ok(css.includes('--neu-bg-primary'), 'Must define primary Neumorphic background token');
    assert.ok(css.includes('#E9EEF3') || css.includes('#e0e5ec'), 'Must define primary Neumorphic soft background color');
    assert.ok(css.includes('--neu-shadow-raised-sm') || css.includes('--neu-shadow-raised'), 'Must define raised shadow tokens');
    assert.ok(css.includes('--neu-shadow-inset-sm') || css.includes('--neu-shadow-inset'), 'Must define inset shadow tokens');
    assert.ok(css.includes('.user-neumorphic-root'), 'Must define user Neumorphic root scope class');
  });

  // =========================================================================
  // CHECK 3: Safe-to-Spend Math & Buffer Clamping
  // =========================================================================
  test('Check 3: Safe-to-Spend formula strictly shields essential liabilities, buffer, and clamps to 0', () => {
    const today = getCurrentLocalDate();

    // Normal case: Generous surplus
    const normal = calculateSafeToSpend({
      availableCash: 75000,
      expenses: [
        { id: '1', amount: 15000, isEssential: true, dueDate: addDays(today, -5), status: 'unpaid' }, // overdue essential
        { id: '2', amount: 10000, isEssential: true, dueDate: addDays(today, 5), status: 'unpaid' }   // upcoming essential
      ],
      incomes: [],
      safetyBuffer: 25000,
      currentDateStr: today
    });
    // Safe = 75000 - 15000 (overdue) - 10000 (upcoming) - 25000 (buffer) = 25000
    assert.strictEqual(normal.safeToSpendToday, 25000);
    assert.strictEqual(normal.essentialOverdue, 15000);
    assert.strictEqual(normal.upcomingEssential, 10000);
    assert.strictEqual(normal.safetyBuffer, 25000);

    // Deficit case: Liabilities exceed available cash -> Must clamp to 0 (never negative)
    const deficit = calculateSafeToSpend({
      availableCash: 20000,
      expenses: [
        { id: '1', amount: 25000, isEssential: true, dueDate: addDays(today, -3), status: 'unpaid' },
        { id: '2', amount: 15000, isEssential: true, dueDate: addDays(today, 4), status: 'unpaid' }
      ],
      incomes: [],
      safetyBuffer: 20000,
      currentDateStr: today
    });
    assert.strictEqual(deficit.safeToSpendToday, 0, 'Safe-to-Spend must clamp to 0 on deficit');
    assert.ok(deficit.rawSpendable < 0, 'rawSpendable captures negative deficit');
    assert.strictEqual(deficit.projectedShortfall, Math.abs(deficit.rawSpendable));
  });

  // =========================================================================
  // CHECK 4: Income Management Lifecycle
  // =========================================================================
  test('Check 4: Income lifecycle supports full CRUD, status progression, and balance recalculation', () => {
    const testUserId = `usr_regress_inc_${Date.now()}`;
    db.clearUserData(testUserId);

    // 1. Initial State
    let fin = db.getUserFinancials(testUserId);
    assert.strictEqual(fin.incomes.length, 0);

    // 2. Add Incomes (one received, one expected)
    const inc1 = db.addIncome(testUserId, {
      title: 'Full-time Salary',
      amount: 85000,
      status: 'received',
      actualDate: '2026-11-01',
      category: 'Salary'
    });
    const inc2 = db.addIncome(testUserId, {
      title: 'Freelance Design',
      amount: 25000,
      status: 'confirmed',
      expectedDate: '2026-11-28',
      category: 'Consulting'
    });

    fin = db.getUserFinancials(testUserId);
    assert.strictEqual(fin.incomes.length, 2);

    // Balance reflects only received income
    let bal = calculateCurrentBalance(50000, fin.incomes, fin.expenses, 0);
    assert.strictEqual(bal.totalReceived, 85000);
    assert.strictEqual(bal.availableCash, 50000 + 85000); // 135000

    // 3. Update Income (Mark freelance as received with actualDate)
    db.updateIncome(testUserId, inc2.id, {
      status: 'received',
      actualDate: '2026-11-21',
      amount: 28000 // Bonus added
    });

    fin = db.getUserFinancials(testUserId);
    bal = calculateCurrentBalance(50000, fin.incomes, fin.expenses, 0);
    assert.strictEqual(bal.totalReceived, 85000 + 28000); // 113000
    assert.strictEqual(bal.availableCash, 50000 + 113000); // 163000

    // 4. Delete Income
    db.deleteIncome(testUserId, inc1.id);
    fin = db.getUserFinancials(testUserId);
    assert.strictEqual(fin.incomes.length, 1);
    bal = calculateCurrentBalance(50000, fin.incomes, fin.expenses, 0);
    assert.strictEqual(bal.totalReceived, 28000);
  });

  // =========================================================================
  // CHECK 5: Expenses & Obligations Lifecycle
  // =========================================================================
  test('Check 5: Expense obligations properly track priority, essential status, settlement, and overdue progression', () => {
    const testUserId = `usr_regress_exp_${Date.now()}`;
    db.clearUserData(testUserId);

    const todayStr = getCurrentLocalDate();

    // 1. Add Expenses
    const exp1 = db.addExpense(testUserId, {
      title: 'Apartment Rent',
      amount: 22000,
      dueDate: addDays(todayStr, -5), // 5 days overdue
      status: 'unpaid',
      isEssential: true,
      priority: 'critical'
    });

    const exp2 = db.addExpense(testUserId, {
      title: 'Streaming Bundle',
      amount: 1200,
      dueDate: addDays(todayStr, 3), // upcoming
      status: 'unpaid',
      isEssential: false,
      priority: 'low'
    });

    let fin = db.getUserFinancials(testUserId);
    assert.strictEqual(fin.expenses.length, 2);

    // Initial cash balance (unpaid expenses do not deduct from gross cash)
    let bal = calculateCurrentBalance(40000, fin.incomes, fin.expenses, 0);
    assert.strictEqual(bal.totalPaid, 0);
    assert.strictEqual(bal.availableCash, 40000);

    // Check Safe-to-Spend: shields the 22k overdue essential rent + 1.2k upcoming streaming in 30D horizon
    let sts = calculateSafeToSpend({
      availableCash: bal.availableCash,
      expenses: fin.expenses,
      safetyBuffer: 15000,
      currentDateStr: todayStr
    });
    assert.strictEqual(sts.safeToSpendToday, 1800); // 40k - 22k - 15k - 1.2k = 1.8k

    // 2. Settle the Rent Expense
    db.updateExpense(testUserId, exp1.id, {
      status: 'paid',
      paidDate: todayStr
    });

    fin = db.getUserFinancials(testUserId);
    bal = calculateCurrentBalance(40000, fin.incomes, fin.expenses, 0);
    assert.strictEqual(bal.totalPaid, 22000);
    assert.strictEqual(bal.availableCash, 18000); // 40k - 22k

    // Now overdue rent is paid, Safe-to-Spend does not double-deduct it (18k - 15k buffer - 1.2k streaming = 1.8k)
    sts = calculateSafeToSpend({
      availableCash: bal.availableCash,
      expenses: fin.expenses,
      safetyBuffer: 15000,
      currentDateStr: todayStr
    });
    assert.strictEqual(sts.safeToSpendToday, 1800);
  });

  // =========================================================================
  // CHECK 6: Lean-Week Reserve & Target Accumulation
  // =========================================================================
  test('Check 6: Lean-Week Reserve calculates weekly deficits and updates earmarked designated reserves', () => {
    const leanMetrics = calculateLeanWeekSavings({
      weeks: 4,
      expectedLowIncomePerWeek: 5000,
      essentialWeeklyExpenses: 12000,
      currentDesignatedReserve: 14000,
      weeklyContribution: 3500
    });

    assert.strictEqual(leanMetrics.weeklyDeficit, 7000); // 12000 - 5000 = 7000
    assert.strictEqual(leanMetrics.targetReserve, 28000); // 7000 * 4 = 28000
    assert.strictEqual(leanMetrics.remainingAmount, 14000); // 28000 - 14000 = 14000
    assert.strictEqual(leanMetrics.weeklySavingsRequired, 3500); // 14000 / 4 = 3500
    assert.strictEqual(leanMetrics.progressPct, 50); // 14000 / 28000 = 50%
    assert.strictEqual(leanMetrics.isFullyFunded, false);

    // Test earmarking designated reserve
    const testUserId = `usr_lean_test_${Date.now()}`;
    db.clearUserData(testUserId);
    db.updateUserPreferences(testUserId, { startingBalance: 60000, safetyBuffer: 20000 });
    db.updateSavings(testUserId, { currentDesignatedReserve: 15000 });

    const fin = db.getUserFinancials(testUserId);
    assert.strictEqual(fin.leanSavings.currentDesignatedReserve, 15000);

    const bal = calculateCurrentBalance(60000, [], [], fin.leanSavings.currentDesignatedReserve);
    assert.strictEqual(bal.grossCash, 60000);
    assert.strictEqual(bal.availableCash, 45000); // 60k - 15k locked
  });

  // =========================================================================
  // CHECK 7: Smart Bill Prioritizer (4-Tier Ranking)
  // =========================================================================
  test('Check 7: Bill Prioritizer ranks overdue critical bills with late fees above future discretionary items', () => {
    const todayStr = getCurrentLocalDate();

    const bills = [
      {
        id: 'b1',
        title: 'Gym Membership',
        amount: 2500,
        dueDate: addDays(todayStr, 2),
        priority: 'low',
        isEssential: false,
        status: 'unpaid'
      },
      {
        id: 'b2',
        title: 'Overdue Mortgage EMI',
        amount: 35000,
        dueDate: addDays(todayStr, -4),
        priority: 'critical',
        isEssential: true,
        lateFee: 1500,
        status: 'unpaid'
      },
      {
        id: 'b3',
        title: 'Upcoming Electricity Bill',
        amount: 4200,
        dueDate: addDays(todayStr, 3),
        priority: 'high',
        isEssential: true,
        status: 'unpaid'
      }
    ];

    const result = rankBills(bills, 50000, todayStr);
    assert.ok(result);
    assert.ok(Array.isArray(result.rankedBills));
    assert.strictEqual(result.rankedBills.length, 3);

    // Overdue critical mortgage MUST be ranked #1
    assert.strictEqual(result.rankedBills[0].id, 'b2', 'Overdue critical mortgage must be highest priority');
    assert.strictEqual(result.rankedBills[0].priority, 'critical');
    assert.strictEqual(result.rankedBills[0].isOverdue, true);

    // Upcoming essential electricity bill should rank above discretionary gym
    assert.strictEqual(result.rankedBills[1].id, 'b3', 'Upcoming essential bill belongs ahead of discretionary');

    // Gym membership must rank last
    assert.strictEqual(result.rankedBills[2].id, 'b1', 'Discretionary membership must rank last');
  });

  // =========================================================================
  // CHECK 8: Payment Delay Simulator (Non-Mutating Sandbox)
  // =========================================================================
  test('Check 8: Delay Simulator recalculates cash trajectory in sandbox and NEVER mutates live database records', () => {
    const testUserId = `usr_delay_test_${Date.now()}`;
    db.clearUserData(testUserId);

    const todayStr = getCurrentLocalDate();
    const originalDueDate = addDays(todayStr, 10);
    const originalExpense = db.addExpense(testUserId, {
      title: 'Commercial Vendor Invoice',
      amount: 40000,
      dueDate: originalDueDate,
      status: 'unpaid',
      isEssential: true
    });

    const income = db.addIncome(testUserId, {
      id: 'inc_delay_target',
      title: 'Consulting Retainer',
      amount: 50000,
      expectedDate: addDays(todayStr, 5),
      status: 'confirmed'
    });

    const finBefore = db.getUserFinancials(testUserId);
    assert.strictEqual(finBefore.expenses[0].dueDate, originalDueDate);

    // Run Delay Simulation: Simulate 10 days delay on incoming cash
    const simulationResult = simulatePaymentDelay({
      availableCash: 25000,
      incomes: finBefore.incomes,
      expenses: finBefore.expenses,
      safetyBuffer: 15000,
      delayConfig: {
        incomeId: income.id,
        delayDays: 10,
        unexpectedExpense: 0,
        incomeReductionPct: 0
      }
    });

    assert.ok(simulationResult);
    assert.ok(simulationResult.baseline);
    assert.ok(simulationResult.simulated);
    assert.ok(Array.isArray(simulationResult.baseline.forecast));
    assert.ok(Array.isArray(simulationResult.simulated.forecast));

    // STRICT REGRESSION CHECK: Verify live database record was NEVER mutated
    const finAfter = db.getUserFinancials(testUserId);
    const expAfter = finAfter.expenses.find(e => e.id === originalExpense.id);
    assert.strictEqual(expAfter.dueDate, originalDueDate, 'Database record must remain unchanged after simulation');
    assert.strictEqual(expAfter.amount, 40000);
  });

  // =========================================================================
  // CHECK 9: Admin Portal, Role Separation & Security
  // =========================================================================
  test('Check 9: Admin endpoints strictly enforce authorization, reject non-admins, and preserve session separation', async () => {
    // 1. Unauthenticated request to /api/admin/stats must be rejected
    const unauthRes = await fetch(`${baseUrl}/api/admin/stats`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');

    // 2. Admin Authentication with master credentials
    const adminLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hiteshav2006@gmail.com',
        password: 'Admin@FinSight2026!Master'
      })
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Authorized admin must authenticate successfully');
    const adminData = await adminLoginRes.json();
    assert.strictEqual(adminData.success, true);
    assert.strictEqual(adminData.user.role, 'Super Administrator');

    const adminToken = adminData.token;

    // 3. Admin Access with Token
    const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(statsRes.status, 200);
    const stats = await statsRes.json();
    assert.ok(stats.data !== undefined);
    assert.ok(typeof stats.data.totalUsers === 'number');

    // 4. Admin Whitelist Verification
    const settingsRes = await fetch(`${baseUrl}/api/admin/settings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(settingsRes.status, 200);
    const settings = await settingsRes.json();
    assert.ok(Array.isArray(settings.settings.authorizedAdminEmails));
    assert.ok(settings.settings.authorizedAdminEmails.includes('dishankbs04@gmail.com'));
  });

  // =========================================================================
  // CHECK 10: Dual-Engine Coexistence (FinSight Classic + Personal Finance Analyzer)
  // =========================================================================
  test('Check 10: Classic FinSight and Personal Finance Analyzer operate concurrently with 100% data fidelity', () => {
    const sharedUserId = `usr_dual_engine_${Date.now()}`;
    db.clearUserData(sharedUserId);

    // Seed shared financial ledger
    db.updateUserPreferences(sharedUserId, { startingBalance: 50000, safetyBuffer: 20000 });
    db.addIncome(sharedUserId, { title: 'Enterprise Retainer', amount: 120000, status: 'received', actualDate: '2026-11-01', category: 'Retainer' });
    db.addExpense(sharedUserId, { title: 'Cloud Infrastructure', amount: 15000, status: 'paid', paidDate: '2026-11-04', isEssential: true, category: 'Cloud Infrastructure' });
    db.addExpense(sharedUserId, { title: 'Office Supplies', amount: 5000, status: 'unpaid', dueDate: '2026-11-25', isEssential: false, category: 'Office Supplies' });

    // 1. Classic Financial Engine Calculation
    const fin = db.getUserFinancials(sharedUserId);
    const classicBal = calculateCurrentBalance(
      fin.preferences.startingBalance,
      fin.incomes,
      fin.expenses,
      fin.leanSavings.currentDesignatedReserve
    );

    // 2. Personal Finance Analyzer Calculation
    const analyzerData = getUserAnalyzerData(sharedUserId, { horizon: 'all' });

    // 3. Strict Cross-Engine Equality Verification
    assert.strictEqual(analyzerData.actual.clearedIncome, classicBal.totalReceived, 'Cleared income must match exactly');
    assert.strictEqual(analyzerData.actual.paidExpenses, classicBal.totalPaid, 'Paid expenses must match exactly');
    assert.strictEqual(analyzerData.actual.availableCash, classicBal.availableCash, 'Available cash must match exactly');
    assert.strictEqual(analyzerData.estimates.safetyBuffer, fin.preferences.safetyBuffer, 'Safety buffer must match exactly');

    // 4. Analyzer Deep Insights Verification
    assert.strictEqual(analyzerData.actual.netSavings, 120000 - 15000); // 105000
    assert.strictEqual(analyzerData.actual.savingsRate, 88); // (105k / 120k) * 100 = 87.5% -> 88%
    assert.ok(analyzerData.spending.expensesByCategory.length >= 2);
    assert.ok(analyzerData.estimates.healthScore >= 75);

    // 5. Zero Side-Effect Integrity
    const finAfter = db.getUserFinancials(sharedUserId);
    assert.strictEqual(finAfter.incomes.length, 1);
    assert.strictEqual(finAfter.expenses.length, 2);
  });
});
