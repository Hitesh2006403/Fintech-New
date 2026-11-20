import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './backend/server.js';
import {
  getUserAnalyzerData,
  detectUnusualExpenses,
  detectRecurringExpenses,
  detectDuplicateTransactions,
  calculateMonthOverMonthComparison,
  calculateBudgetUtilization,
  generateRecommendations,
  safeDate,
  getMonthKey
} from './backend/analyzerService.js';

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

describe('Phase 3: Financial Analysis Engine — Deterministic Backend Calculations', () => {

  // Test 1: Exact Mathematical Formulas (Savings Rate, Net Savings, Expense-to-Income)
  test('Check 1: Core arithmetic formulas strictly obey deterministic specifications', () => {
    const fixtureUser = 'usr_demo_01';
    const report = getUserAnalyzerData(fixtureUser);

    // Verify Actual realized values
    const actual = report.actual;
    assert.equal(actual.netSavings, actual.clearedIncome - actual.paidExpenses, 'Net Savings = Cleared Inflows - Paid Outflows');

    if (actual.clearedIncome > 0) {
      const expectedSavingsRate = Math.round(((actual.clearedIncome - actual.paidExpenses) / actual.clearedIncome) * 100);
      assert.equal(actual.savingsRate, expectedSavingsRate, 'Savings Rate = (Net Savings / Inflows) * 100');

      const expectedExpenseRatio = Math.round((actual.paidExpenses / actual.clearedIncome) * 100);
      assert.equal(actual.expenseToIncomeRatio, expectedExpenseRatio, 'Expense-to-Income = (Outflows / Inflows) * 100');
    }

    // Verify Forecast projected values
    const forecast = report.forecast;
    assert.equal(forecast.projectedNet, forecast.totalGrossIncome - forecast.totalCommittedExpenses, 'Projected Net = Gross Inflow - Committed Outflows');

    // Distinct separation
    assert.ok(report.actual !== undefined, 'Report must contain distinct actual section');
    assert.ok(report.forecast !== undefined, 'Report must contain distinct forecast section');
    assert.ok(report.estimates !== undefined, 'Report must contain distinct estimates section');
    assert.ok(Array.isArray(report.recommendations), 'Report must contain distinct recommendations array');
  });

  // Test 2: Category Spending Percentages sum correctly
  test('Check 2: Category percentages accurately represent total committed spending', () => {
    const report = getUserAnalyzerData('usr_demo_01');
    const categories = report.spending.expensesByCategory;

    assert.ok(Array.isArray(categories));
    assert.ok(categories.length > 0);

    const sumTotals = categories.reduce((sum, c) => sum + c.total, 0);
    assert.equal(sumTotals, report.overview.totalCommittedExpenses, 'Sum of category expenses must equal total committed expenses');

    // Each percentage must be in [0, 100]
    categories.forEach(c => {
      assert.ok(c.percentage >= 0 && c.percentage <= 100);
      const expectedPct = Math.round((c.total / report.overview.totalCommittedExpenses) * 100);
      assert.equal(c.percentage, expectedPct);
    });
  });

  // Test 3: Essential vs. Discretionary Breakdown
  test('Check 3: Accurately classifies essential obligations and discretionary spending', () => {
    const report = getUserAnalyzerData('usr_demo_01');
    const spending = report.spending;

    assert.equal(
      spending.essentialObligations + spending.discretionarySpending,
      report.overview.totalCommittedExpenses,
      'Essential + Discretionary must equal total committed expenses'
    );
    assert.equal(spending.essentialRatio + spending.discretionaryRatio, 100, 'Ratios must sum to 100%');
    assert.ok(spending.essentialObligations > 0, 'Should detect essential obligations');
  });

  // Test 4: Statistical Unusual Expense (Anomaly) Detection
  test('Check 4: detectUnusualExpenses flags statistical outliers and category spikes', () => {
    const normalExpenses = [
      { id: 'e1', title: 'Coffee', amount: 300, category: 'Food', paidDate: '2026-11-01' },
      { id: 'e2', title: 'Lunch', amount: 450, category: 'Food', paidDate: '2026-11-02' },
      { id: 'e3', title: 'Groceries', amount: 1200, category: 'Food', paidDate: '2026-11-03' },
      { id: 'e4', title: 'Taxi', amount: 350, category: 'Transport', paidDate: '2026-11-04' },
      { id: 'e5', title: 'Subway', amount: 200, category: 'Transport', paidDate: '2026-11-05' },
      // Extreme outlier (> mean + 2*sigma)
      { id: 'e6', title: 'Luxury Tech Gadget Splurge', amount: 65000, category: 'Shopping', paidDate: '2026-11-06' }
    ];

    const flagged = detectUnusualExpenses(normalExpenses);
    assert.ok(flagged.length > 0, 'Should detect the ₹65,000 statistical outlier');
    const outlier = flagged.find(f => f.id === 'e6');
    assert.ok(outlier, 'Outlier e6 must be detected');
    assert.equal(outlier.amount, 65000);
    assert.equal(outlier.severity, 'high');
    assert.ok(outlier.reason.includes('Statistical outlier'));
  });

  // Test 5: Automated Recurring Expense Detection
  test('Check 5: detectRecurringExpenses identifies recurring commitments and annualizes them', () => {
    const sampleExpenses = [
      { id: 'r1', title: 'Office Space Rent', amount: 25000, category: 'Rent', recurring: 'monthly', isEssential: true },
      { id: 'r2', title: 'Car Loan EMI', amount: 14000, category: 'EMI or loan', isEMI: true, isEssential: true },
      { id: 'r3', title: 'Coffee Break', amount: 250, category: 'Discretionary' }
    ];

    const recurring = detectRecurringExpenses(sampleExpenses);
    assert.equal(recurring.length, 2, 'Must detect 2 recurring obligations');

    const rent = recurring.find(r => r.id === 'r1');
    assert.ok(rent);
    assert.equal(rent.annualizedCost, 25000 * 12);
    assert.equal(rent.frequency, 'monthly');

    const emi = recurring.find(r => r.id === 'r2');
    assert.ok(emi);
    assert.equal(emi.annualizedCost, 14000 * 12);
    assert.ok(emi.isEMI);
  });

  // Test 6: Duplicate Transaction Detection
  test('Check 6: detectDuplicateTransactions catches duplicate charges within tolerance', () => {
    const txs = [
      { id: 't1', type: 'expense', title: 'Amazon AWS Cloud Hosting', amount: 7500, date: '2026-11-10' },
      { id: 't2', type: 'expense', title: 'Amazon AWS Cloud Hosting', amount: 7500, date: '2026-11-11' },
      { id: 't3', type: 'expense', title: 'Unique Dinner', amount: 1200, date: '2026-11-12' }
    ];

    const dupes = detectDuplicateTransactions(txs);
    assert.equal(dupes.length, 1, 'Must detect exactly 1 duplicate pair');
    assert.equal(dupes[0].primaryId, 't1');
    assert.equal(dupes[0].duplicateId, 't2');
    assert.equal(dupes[0].daysGap, 1);
  });

  // Test 7: Month-over-Month Comparison
  test('Check 7: calculateMonthOverMonthComparison correctly computes chronological spend trends', () => {
    const sampleIncomes = [
      { id: 'i1', amount: 100000, actualDate: '2026-09-15', status: 'received' },
      { id: 'i2', amount: 120000, actualDate: '2026-10-15', status: 'received' }
    ];

    const sampleExpenses = [
      { id: 'e1', amount: 40000, paidDate: '2026-09-20', status: 'paid' },
      { id: 'e2', amount: 60000, paidDate: '2026-10-20', status: 'paid' }
    ];

    const mom = calculateMonthOverMonthComparison(sampleIncomes, sampleExpenses);
    assert.equal(mom.length, 2, 'Should have 2 monthly records');

    const sep = mom[0];
    const oct = mom[1];

    assert.equal(sep.month, '2026-09');
    assert.equal(sep.inflow, 100000);
    assert.equal(sep.outflow, 40000);
    assert.equal(sep.netSavings, 60000);
    assert.equal(sep.savingsRate, 60);

    assert.equal(oct.month, '2026-10');
    assert.equal(oct.inflow, 120000);
    assert.equal(oct.outflow, 60000);
    assert.equal(oct.netSavings, 60000);
    assert.equal(oct.savingsRate, 50);

    // Spend changed from 40k to 60k (+50%)
    assert.equal(oct.momSpendChangePercent, 50);
    assert.equal(oct.spendTrend, 'increasing');
  });

  // Test 8: Category Budget Utilization
  test('Check 8: calculateBudgetUtilization tracks budgets and flags over-budget status', () => {
    const expenses = [
      { id: 'e1', category: 'Rent', amount: 28000 },
      { id: 'e2', category: 'Utilities', amount: 3000 }
    ];

    const budgets = {
      'Rent': 25000,
      'Utilities': 5000
    };

    const utilization = calculateBudgetUtilization(expenses, budgets);
    const rentBudget = utilization.find(u => u.category === 'Rent');
    assert.ok(rentBudget);
    assert.equal(rentBudget.spent, 28000);
    assert.equal(rentBudget.budget, 25000);
    assert.equal(rentBudget.utilizationPercent, 112);
    assert.equal(rentBudget.isOverBudget, true);
    assert.equal(rentBudget.status, 'exceeded');

    const utilBudget = utilization.find(u => u.category === 'Utilities');
    assert.ok(utilBudget);
    assert.equal(utilBudget.spent, 3000);
    assert.equal(utilBudget.budget, 5000);
    assert.equal(utilBudget.utilizationPercent, 60);
    assert.equal(utilBudget.isOverBudget, false);
    assert.equal(utilBudget.status, 'healthy');
  });

  // Test 9: Edge Cases (Zero income, zero expenses, refunds/negative transactions, missing categories)
  test('Check 9: Edge cases (zero income, zero expenses, refunds, missing categories) execute without error', () => {
    // A. Empty transactions
    const emptyIncomes = [];
    const emptyExpenses = [];
    const emptyMom = calculateMonthOverMonthComparison(emptyIncomes, emptyExpenses);
    assert.deepEqual(emptyMom, []);

    // B. Refunds / Negative expenses
    const refundExpenses = [
      { id: 'r1', category: 'General', amount: 10000, paidDate: '2026-11-01' },
      { id: 'r2', category: 'General', amount: -3000, paidDate: '2026-11-05' } // refund
    ];
    const budget = calculateBudgetUtilization(refundExpenses, { General: 15000 });
    assert.equal(budget[0].spent, 7000, 'Refund must reduce spent amount');

    // C. Missing date safety
    assert.equal(safeDate(null), safeDate(''));
    assert.equal(safeDate('invalid-date'), safeDate(''));
    assert.equal(safeDate('2026-11-20T14:30:00Z'), '2026-11-20');

    // D. Missing category defaults to General
    const noCatExp = [{ id: 'nc1', amount: 500 }];
    const noCatBudget = calculateBudgetUtilization(noCatExp);
    assert.equal(noCatBudget[0].category, 'General');
  });

  // Test 10: Live API Integration /api/analyzer/data returns Phase 3 schema
  test('Check 10: Authenticated /api/analyzer/data exposes all Phase 3 calculations over HTTP', async () => {
    const ts = Date.now();
    const testEmail = `engine_test_${ts}@example.com`;

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'EnginePassword123!', name: 'Engine Tester' })
    });
    assert.equal(regRes.status, 200);
    const authData = await regRes.json();
    const token = authData.token;

    const res = await fetch(`${baseUrl}/api/analyzer/data`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.success);
    const data = body.data;

    // Check Phase 3 structural contract
    assert.ok(data.actual);
    assert.ok(data.forecast);
    assert.ok(data.estimates);
    assert.ok(Array.isArray(data.recommendations));
    assert.ok(Array.isArray(data.spending.unusualExpenses));
    assert.ok(Array.isArray(data.spending.recurringExpenses));
    assert.ok(Array.isArray(data.spending.budgetUtilization));
    assert.ok(Array.isArray(data.trends.monthOverMonth));
    assert.equal(data.meta.engineVersion, '3.0.0-deterministic');
  });

});
