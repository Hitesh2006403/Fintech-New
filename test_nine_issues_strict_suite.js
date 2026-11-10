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
  calculateLeanWeekSavings,
  rankBills,
  formatINR
} from './src/services/financialEngine.js';
import {
  getCurrentLocalDate,
  toISODate,
  addDays,
  diffInDays,
  isPastDue,
  isDueToday,
  isUpcoming,
  getOverdueDays,
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

describe('FinSight Nine-Issue Strict Independent Verification Suite', () => {

  // ==========================================
  // ISSUE 1: Modal Background Opacity
  // ==========================================
  test('Issue 1: Modal backgrounds are solid and opaque across CSS and pages', () => {
    const cssContent = fs.readFileSync(path.resolve('src/App.css'), 'utf8');

    // 1. Verify modal-backdrop is high-opacity
    assert.match(cssContent, /\.modal-backdrop\s*\{[^}]*background:\s*rgba\(3,\s*7,\s*18,\s*0\.88\)/);

    // 2. Verify modal-content-card uses solid opaque background
    assert.match(cssContent, /\.modal-content-card\s*\{[^}]*background:\s*#0F172A/);

    // 3. Verify modal header and footer are solid #0B1220
    assert.match(cssContent, /\.modal-header-bar\s*\{[^}]*background:\s*#0B1220/);
    assert.match(cssContent, /\.modal-footer-bar\s*\{[^}]*background:\s*#0B1220/);

    // 4. Verify z-index is set high to prevent underneath text bleed
    assert.match(cssContent, /\.modal-backdrop\s*\{[^}]*z-index:\s*9999/);
    assert.match(cssContent, /\.modal-content-card\s*\{[^}]*z-index:\s*10000/);
  });

  // ==========================================
  // ISSUE 2: Currency Formatting (No Duplicate ₹)
  // ==========================================
  test('Issue 2: formatINR cleanly formats numbers, strings, and never duplicates ₹', () => {
    // Basic numbers
    assert.equal(formatINR(1500), '₹1,500');
    assert.equal(formatINR(124500), '₹1,24,500');
    assert.equal(formatINR(0), '₹0');

    // Strings with existing symbols
    assert.equal(formatINR('₹1500'), '₹1,500');
    assert.equal(formatINR('₹₹1,500'), '₹1,500');
    assert.equal(formatINR('₹₹₹1500'), '₹1,500');
    assert.equal(formatINR('-₹1,200'), '-₹1,200');

    // Edge cases
    assert.equal(formatINR(null), '₹0');
    assert.equal(formatINR(undefined), '₹0');
    assert.equal(formatINR('invalid'), '₹0');
  });

  // ==========================================
  // ISSUE 3: Cash-Flow Chart Rendering
  // ==========================================
  test('Issue 3: Cash-Flow Chart metrics map closing balances and render safety buffer', () => {
    const chartSource = fs.readFileSync(path.resolve('src/components/charts/CashFlowChart.jsx'), 'utf8');

    // Verify closingBalance fallback accessor is present
    assert.ok(chartSource.includes('closingBalance'));
    assert.ok(chartSource.includes('balance'));

    // Verify buffer line rendering with proper stroke
    assert.ok(chartSource.includes('yBuffer'));
    assert.ok(chartSource.includes('Safety Buffer'));

    // Verify drop-shadow filter replaces fragile SVG filter
    assert.ok(chartSource.includes('drop-shadow'));
    assert.ok(!chartSource.includes('url(#glow)'));
  });

  // ==========================================
  // ISSUE 4: Safe-to-Spend with Essential Overdue Liabilities
  // ==========================================
  test('Issue 4: Safe-to-Spend includes all unpaid essential overdue liabilities on actual benchmark records', () => {
    const fin = db.getUserFinancials('usr_demo_01');

    // 1. Verify available cash = ₹1,24,500
    const balance = calculateCurrentBalance(
      fin.preferences.startingBalance,
      fin.incomes,
      fin.expenses,
      fin.savingsGoals?.currentDesignatedReserve ?? 14000
    );
    assert.equal(balance.availableCash, 124500, 'Available cash must be exactly ₹1,24,500');

    // 2. Calculate Safe-to-Spend on current date
    const today = '2026-11-10';
    const sts = calculateSafeToSpend({
      availableCash: balance.availableCash,
      incomes: fin.incomes,
      expenses: fin.expenses,
      safetyBuffer: fin.preferences.safetyBuffer, // 25,000
      horizonDays: 30,
      currentDateStr: today
    });

    // Verify breakdown
    assert.equal(sts.availableCash, 124500);
    assert.equal(sts.safetyBuffer, 25000);
    assert.equal(sts.essentialOverdue, 43200, 'Essential overdue liabilities must be ₹43,200');
    assert.equal(sts.upcomingEssential, 0, 'No upcoming essential bills in next 7 days');
    assert.equal(sts.totalEssentialCommitments, 43200);

    // Formula: Safe-to-Spend = Available Cash (124,500) - Safety Buffer (25,000) - Total Essential Commitments (43,200) = 56,300
    assert.equal(sts.safeToSpendToday, 56300, 'Safe-to-Spend must equal ₹56,300');

    // Non-essential overdue (Adobe ₹3,200) is NOT counted as an essential liability
    assert.equal(sts.otherCommittedInHorizon, 0);
  });

  // ==========================================
  // ISSUE 5: Weekly Savings Deficit
  // ==========================================
  test('Issue 5: Weekly savings calculates Remaining Amount / Remaining Weeks correctly', () => {
    // Current benchmark data: Target 28,000, Funded 14,000, Weeks 4
    const goalData = {
      weeks: 4,
      expectedLowIncomePerWeek: 5000,
      essentialWeeklyExpenses: 12000,
      currentDesignatedReserve: 14000,
      weeklyContribution: 3500
    };

    const calc = calculateLeanWeekSavings(goalData);

    assert.equal(calc.weeklyDeficit, 7000, 'Weekly deficit = 12000 - 5000 = 7000');
    assert.equal(calc.targetReserve, 28000, 'Target reserve = 7000 * 4 = 28000');
    assert.equal(calc.currentDesignatedReserve, 14000, 'Funded = 14000');
    assert.equal(calc.remainingGoal, 14000, 'Remaining = 28000 - 14000 = 14000');
    assert.equal(calc.numWeeks, 4, 'Remaining weeks = 4');

    // Expected weekly savings: 14,000 / 4 = 3,500/week (NEVER 28,000 / 4 = 7,000/week)
    assert.equal(calc.weeklySavingsRequired, 3500, 'Weekly savings required must be exactly ₹3,500/week');

    // Edge Case A: Goal fully funded
    const fundedGoal = calculateLeanWeekSavings({
      weeks: 4,
      expectedLowIncomePerWeek: 5000,
      essentialWeeklyExpenses: 12000,
      currentDesignatedReserve: 30000
    });
    assert.equal(fundedGoal.isFullyFunded, true);
    assert.equal(fundedGoal.remainingGoal, 0);
    assert.equal(fundedGoal.weeklySavingsRequired, 0);

    // Edge Case B: Zero weeks remaining
    const zeroWeeks = calculateLeanWeekSavings({
      weeks: 0,
      expectedLowIncomePerWeek: 5000,
      essentialWeeklyExpenses: 12000,
      currentDesignatedReserve: 10000
    });
    assert.equal(zeroWeeks.weeklySavingsRequired, zeroWeeks.remainingGoal);
  });

  // ==========================================
  // ISSUE 6: Cash-Flow Forecast Daily Breakdown
  // ==========================================
  test('Issue 6: Forecast includes daily inflows, outflows, and correct chronological closing balances', () => {
    const fin = db.getUserFinancials('usr_demo_01');
    const availableCash = 124500;
    const startDate = '2026-11-10';

    const result = generateCashFlowForecast({
      availableCash,
      incomes: fin.incomes,
      expenses: fin.expenses,
      safetyBuffer: 25000,
      days: 15,
      startDateStr: startDate,
      scenario: 'optimistic' // Includes inc_105 on 2026-11-12
    });

    const days = result.forecast;
    assert.ok(days.length >= 15);

    // Day 0: 2026-11-10
    const day0 = days[0];
    assert.equal(day0.date, '2026-11-10');
    assert.equal(day0.openingBalance, 124500);
    assert.equal(day0.closingBalance, 124500);

    // Scheduled income on 2026-11-12: ₹35,000 (inc_105)
    const dayNov12 = days.find(d => d.date === '2026-11-12');
    assert.ok(dayNov12, 'Day 2026-11-12 must exist in forecast');
    assert.equal(dayNov12.incomes.length, 1);
    assert.equal(dayNov12.incomes[0].amount, 35000);
    assert.equal(dayNov12.openingBalance, 124500);
    assert.equal(dayNov12.closingBalance, 159500, 'Closing balance after scheduled income must be ₹1,59,500');

    // Day after income (2026-11-13) opening balance must equal previous day closing balance (159,500)
    const dayNov13 = days.find(d => d.date === '2026-11-13');
    assert.ok(dayNov13);
    assert.equal(dayNov13.openingBalance, 159500);
  });

  // ==========================================
  // ISSUE 7: Overdue Bills Excluded From Upcoming Bills
  // ==========================================
  test('Issue 7: Overdue bills never appear in upcoming bills widget or KPI', () => {
    const fin = db.getUserFinancials('usr_demo_01');
    const today = '2026-11-10';

    const overdueBills = fin.expenses.filter(e => classifyBillStatus(e, today) === 'overdue');
    const upcomingBills = fin.expenses.filter(e => {
      const status = classifyBillStatus(e, today);
      const isDueSoon = e.dueDate >= today && e.dueDate <= addDays(today, 7);
      return (status === 'upcoming' || status === 'due_today') && isDueSoon;
    });

    // 6 overdue bills exist in October 2026
    assert.equal(overdueBills.length, 6, 'There should be 6 overdue bills');
    const totalOverdue = overdueBills.reduce((s, e) => s + e.amount, 0);
    assert.equal(totalOverdue, 46400, 'Total overdue must equal ₹46,400');

    // Upcoming bills for next 7 days must be 0 (none of the overdue bills appear here)
    assert.equal(upcomingBills.length, 0, 'No overdue bills should leak into upcoming bills');
    const upcomingOverdueOverlap = upcomingBills.filter(u => overdueBills.some(o => o.id === u.id));
    assert.equal(upcomingOverdueOverlap.length, 0, 'Overdue and upcoming sets must be completely disjoint');
  });

  // ==========================================
  // ISSUE 8: Past-Due Income Classified as Overdue
  // ==========================================
  test('Issue 8: Unreceived past-due income is dynamically classified as overdue', () => {
    const fin = db.getUserFinancials('usr_demo_01');
    const today = '2026-11-10';

    // Milestone 2 Backend Deliverable (55,000 on 2026-10-25)
    const inc103 = fin.incomes.find(i => i.id === 'inc_103');
    assert.equal(inc103.expectedDate, '2026-10-25');
    assert.equal(classifyIncomeStatus(inc103, today), 'overdue', 'Milestone 2 due Oct 25 must be classified as overdue');

    // Bi-Weekly Architecture Advisory (18,000 on 2026-11-04)
    const inc104 = fin.incomes.find(i => i.id === 'inc_104');
    assert.equal(inc104.expectedDate, '2026-11-04');
    assert.equal(classifyIncomeStatus(inc104, today), 'overdue', 'Architecture Advisory due Nov 4 must be classified as overdue');

    // Received income remains received
    const inc101 = fin.incomes.find(i => i.id === 'inc_101');
    assert.equal(classifyIncomeStatus(inc101, today), 'received');

    // Future scheduled income (2026-11-12) remains uncertain or confirmed
    const inc105 = fin.incomes.find(i => i.id === 'inc_105');
    assert.equal(classifyIncomeStatus(inc105, today), 'uncertain');
  });

  // ==========================================
  // ISSUE 9: Dynamic Notification Timestamps
  // ==========================================
  test('Issue 9: Notifications dynamically calculate overdue durations and suppress paid bills', () => {
    const fin = db.getUserFinancials('usr_demo_01');
    const today = '2026-11-10';

    const emiBill = fin.expenses.find(e => e.id === 'exp_202'); // Due 2026-10-20
    assert.ok(emiBill);

    const rawNotif = {
      id: 'notif_emi',
      title: 'Workstation Loan EMI: EMI Due in 3 Days',
      message: '₹8,500 is due on October 20, 2026.',
      type: 'warning',
      referenceId: 'exp_202',
      category: 'bill'
    };

    const resolved = resolveDynamicNotification(rawNotif, fin.expenses, fin.incomes, today);

    // Due on Oct 20 vs today Nov 10 = 21 days overdue
    assert.ok(resolved.title.includes('Overdue by 21 Days'), `Title should show overdue by 21 days, got: ${resolved.title}`);
    assert.equal(resolved.isOverdue, true);

    // Paid bill must produce resolved status indicating settled
    const paidExp = fin.expenses.find(e => e.id === 'exp_207');
    const paidNotif = {
      id: 'notif_paid',
      title: 'Server Backup Due in 2 Days',
      referenceId: 'exp_207',
      category: 'bill'
    };
    const resolvedPaid = resolveDynamicNotification(paidNotif, fin.expenses, fin.incomes, today);
    assert.equal(resolvedPaid.isPaid, true);
    assert.ok(resolvedPaid.title.includes('Paid'));
  });

  // ==========================================
  // SECTION 4: Comprehensive Date & Timezone Verification
  // ==========================================
  test('Section 4: Date handling handles month-end, year-end, and Asia/Kolkata boundary conditions', () => {
    // 1. Timezone format validation
    const kolkataDate = getCurrentLocalDate('Asia/Kolkata');
    assert.match(kolkataDate, /^\d{4}-\d{2}-\d{2}$/, 'Kolkata local date must be YYYY-MM-DD');

    // 2. Month-end transitions
    assert.equal(addDays('2026-10-31', 1), '2026-11-01');
    assert.equal(addDays('2026-02-28', 1), '2026-03-01', '2026 is non-leap year');
    assert.equal(addDays('2024-02-28', 1), '2024-02-29', '2024 is leap year');

    // 3. Year-end transition
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-12-31', 10), '2027-01-10');

    // 4. Multi-month day differences
    assert.equal(diffInDays('2026-10-25', '2026-11-05'), 11);
    assert.equal(diffInDays('2026-12-25', '2027-01-05'), 11);

    // 5. Overdue and upcoming classifications on boundary dates
    const anchor = '2026-11-10';
    assert.equal(isPastDue('2026-11-09', anchor), true);
    assert.equal(isPastDue('2026-11-10', anchor), false);
    assert.equal(isDueToday('2026-11-10', anchor), true);
    assert.equal(isDueToday('2026-11-11', anchor), false);

    assert.equal(isUpcoming('2026-11-11', anchor, 7), true);
    assert.equal(isUpcoming('2026-11-17', anchor, 7), true);
    assert.equal(isUpcoming('2026-11-18', anchor, 7), false, 'Beyond 7-day window');
  });

  // ==========================================
  // SECTION 5: Backend API & Data Isolation Verification
  // ==========================================
  test('Section 5: API endpoints enforce authentication, isolation, and central calculation contracts', async () => {
    // 1. Unauthenticated requests rejected
    const unauthRes = await fetch(`${baseUrl}/api/financials`);
    assert.equal(unauthRes.status, 401);

    const unauthCalc = await fetch(`${baseUrl}/api/financials/calculations`);
    assert.equal(unauthCalc.status, 401);

    const unauthForecast = await fetch(`${baseUrl}/api/forecast`);
    assert.equal(unauthForecast.status, 401);

    const unauthSTS = await fetch(`${baseUrl}/api/safe-to-spend`);
    assert.equal(unauthSTS.status, 401);

    // 2. Register User A and User B
    const userAEmail = `audit_user_a_${Date.now()}@example.com`;
    const userBEmail = `audit_user_b_${Date.now()}@example.com`;

    const regA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'SecurePassword123!', name: 'User A' })
    });
    assert.ok(regA.status === 200 || regA.status === 201);
    const userAData = await regA.json();
    const tokenA = userAData.token;

    const regB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password: 'SecurePassword123!', name: 'User B' })
    });
    assert.ok(regB.status === 200 || regB.status === 201);
    const userBData = await regB.json();
    const tokenB = userBData.token;

    // 3. User A adds a private expense
    const addExpRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'User A Confidential Retainer Expense',
        amount: 32000,
        dueDate: '2026-11-20',
        category: 'Services',
        isEssential: true
      })
    });
    assert.equal(addExpRes.status, 201);
    const expData = await addExpRes.json();
    const expenseIdA = expData.expense.id;

    // 4. Verify User B does NOT see User A's expense
    const finBRes = await fetch(`${baseUrl}/api/financials`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(finBRes.status, 200);
    const finB = await finBRes.json();
    const bExpenses = finB.data.expenses || [];
    assert.ok(!bExpenses.some(e => e.id === expenseIdA), "User B must NOT see User A's confidential expense");

    // 5. Test Centralized Calculation API Endpoint for User A
    const calcRes = await fetch(`${baseUrl}/api/financials/calculations`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(calcRes.status, 200);
    const calcBody = await calcRes.json();
    assert.equal(calcBody.success, true);
    assert.ok(calcBody.data.balanceDetails !== undefined);
    assert.ok(calcBody.data.safeToSpend !== undefined);
    assert.ok(calcBody.data.forecast !== undefined);
    assert.ok(calcBody.data.billRanking !== undefined);
    assert.ok(calcBody.data.leanWeekCalculations !== undefined);

    // 6. Test Dedicated Forecast API Endpoint
    const fcRes = await fetch(`${baseUrl}/api/forecast?days=14&scenario=expected`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(fcRes.status, 200);
    const fcBody = await fcRes.json();
    assert.equal(fcBody.success, true);
    assert.equal(fcBody.forecast.length, 15, '14 days horizon + Day 0 = 15 points');

    // 7. Test Dedicated Safe-to-Spend API Endpoint
    const stsRes = await fetch(`${baseUrl}/api/safe-to-spend`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(stsRes.status, 200);
    const stsBody = await stsRes.json();
    assert.equal(stsBody.success, true);
    assert.ok(stsBody.safeToSpendToday !== undefined);
    assert.ok(stsBody.totalEssentialCommitments !== undefined);
  });

});
