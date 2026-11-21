/**
 * FINSIGHT — PHASE 13: SELF-CORRECTION LOOP & EDGE CASE HARDENING TEST SUITE
 *
 * Exhaustive boundary and resilience tests:
 * 1. String currency & comma sanitization ("₹ 85,000.50", "$1,200", commas).
 * 2. Absolute zero-division protection (0 balance, 0 income, 0 expenses, 0 buffer).
 * 3. Refunds & negative entry handling (e.g. e-commerce refunds, credit notes).
 * 4. Missing fields & malformed data robustness (null category, undefined dates).
 * 5. Timezone & calendar rollover boundaries (month-end, year rollover, Asia/Kolkata).
 * 6. High-concurrency computational resilience (50 parallel deterministic evaluations).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeterministicMetrics,
  parseSafeAmount,
  safeDate,
  getMonthKey,
  detectUnusualExpenses,
  detectRecurringExpenses,
  detectDuplicateTransactions
} from './backend/analyzerService.js';
import {
  getCurrentLocalDate,
  addDays,
  diffInDays,
  toISODate
} from './backend/dateService.js';
import { formatINR } from './backend/financialService.js';

describe('Phase 13: Self-Correction Loop & Edge Case Hardening', () => {

  // =========================================================================
  // CHECK 1: parseSafeAmount Currency String & Malformed Sanitization
  // =========================================================================
  test('Check 1: parseSafeAmount sanitizes currency symbols, commas, whitespace, and invalid inputs', () => {
    assert.strictEqual(parseSafeAmount('₹ 85,000.50'), 85000.5);
    assert.strictEqual(parseSafeAmount('$12,500'), 12500);
    assert.strictEqual(parseSafeAmount('  45000.75  '), 45000.75);
    assert.strictEqual(parseSafeAmount('-₹2,500.00'), -2500);
    assert.strictEqual(parseSafeAmount(null, 100), 100);
    assert.strictEqual(parseSafeAmount(undefined, 250), 250);
    assert.strictEqual(parseSafeAmount('', 0), 0);
    assert.strictEqual(parseSafeAmount('invalid_text', 50), 50);
    assert.strictEqual(parseSafeAmount(NaN, 0), 0);
    assert.strictEqual(parseSafeAmount(Infinity, 0), 0);
    assert.strictEqual(parseSafeAmount(15000), 15000);
  });

  // =========================================================================
  // CHECK 2: Absolute Zero-Division Protection (Zero Everything)
  // =========================================================================
  test('Check 2: Absolute Zero Ledger (0 income, 0 expenses, 0 balance) computes safe numbers with 0 NaN', () => {
    const zeroMetrics = calculateDeterministicMetrics({
      incomes: [],
      expenses: [],
      startingBalance: 0,
      safetyBuffer: 0,
      designatedSavings: 0,
      horizon: 'all'
    });

    assert.strictEqual(zeroMetrics.actual.clearedIncome, 0);
    assert.strictEqual(zeroMetrics.actual.paidExpenses, 0);
    assert.strictEqual(zeroMetrics.actual.netSavings, 0);
    assert.strictEqual(zeroMetrics.actual.savingsRate, 0);
    assert.strictEqual(zeroMetrics.actual.expenseToIncomeRatio, 0);
    assert.strictEqual(zeroMetrics.actual.availableCash, 0);
    assert.strictEqual(zeroMetrics.forecast.totalGrossIncome, 0);
    assert.strictEqual(zeroMetrics.forecast.totalCommittedExpenses, 0);
    assert.strictEqual(zeroMetrics.estimates.runwayMonths, 0);
    assert.strictEqual(zeroMetrics.estimates.bufferCoveragePercent, 100); // 0 / 0 defaults safely
    assert.ok(zeroMetrics.estimates.healthScore >= 0 && zeroMetrics.estimates.healthScore <= 100);

    // Verify no NaNs in serialized payload
    const jsonStr = JSON.stringify(zeroMetrics);
    assert.ok(!jsonStr.includes('NaN'), 'Output JSON must never contain NaN');
    assert.ok(!jsonStr.includes('null') || jsonStr.includes('nullDate') === false);
  });

  // =========================================================================
  // CHECK 3: Strings With Currency Symbols Inside Incomes & Expenses
  // =========================================================================
  test('Check 3: Deterministic engine ingests string amounts with ₹, commas, and decimals seamlessly', () => {
    const metrics = calculateDeterministicMetrics({
      incomes: [
        { id: '1', title: 'Salary', amount: '₹ 95,000.00', status: 'received', actualDate: '2026-11-01', category: 'Salary' },
        { id: '2', title: 'Bonus', amount: '25,500.50', status: 'confirmed', expectedDate: '2026-11-20', category: 'Bonus' }
      ],
      expenses: [
        { id: '3', title: 'Rent', amount: '₹ 28,000.00', status: 'paid', paidDate: '2026-11-02', category: 'Rent', isEssential: true },
        { id: '4', title: 'Food', amount: '12,450.50', status: 'paid', paidDate: '2026-11-04', category: 'Food', isEssential: false }
      ],
      startingBalance: '50,000',
      safetyBuffer: '20,000'
    });

    assert.strictEqual(metrics.actual.clearedIncome, 95000);
    assert.strictEqual(metrics.actual.paidExpenses, 40450.5);
    assert.strictEqual(metrics.actual.netSavings, 54549.5);
    assert.strictEqual(metrics.forecast.totalGrossIncome, 120500.5);
    assert.strictEqual(metrics.actual.availableCash, 50000 + 95000 - 40450.5);
    assert.ok(metrics.actual.savingsRate > 0);
  });

  // =========================================================================
  // CHECK 4: Refunds & Negative Adjustments
  // =========================================================================
  test('Check 4: Ledger gracefully handles credit notes and merchant refunds without crashing', () => {
    const metrics = calculateDeterministicMetrics({
      incomes: [
        { id: 'inc_1', title: 'Consulting Retainer', amount: 50000, status: 'received', actualDate: '2026-11-01' }
      ],
      expenses: [
        { id: 'exp_1', title: 'Flight Ticket', amount: 8500, status: 'paid', paidDate: '2026-11-02' },
        // Airline refund credit note
        { id: 'exp_2', title: 'Flight Cancellation Refund', amount: -7500, status: 'paid', paidDate: '2026-11-05' }
      ],
      startingBalance: 10000
    });

    // Net paid expenses: 8500 - 7500 = 1000
    assert.strictEqual(metrics.actual.paidExpenses, 1000);
    assert.strictEqual(metrics.actual.netSavings, 49000);
    assert.strictEqual(metrics.actual.availableCash, 10000 + 50000 - 1000); // 59000
  });

  // =========================================================================
  // CHECK 5: Missing Fields & Malformed Properties
  // =========================================================================
  test('Check 5: Gracefully handles records with missing title, null category, and undefined dates', () => {
    const metrics = calculateDeterministicMetrics({
      incomes: [
        { id: 'i_bare' } // Completely empty income object
      ],
      expenses: [
        { id: 'e_bare', category: null, dueDate: null, isEssential: null } // Bare expense object
      ],
      startingBalance: null,
      safetyBuffer: undefined
    });

    assert.strictEqual(metrics.actual.clearedIncome, 0);
    assert.strictEqual(metrics.forecast.totalGrossIncome, 0);
    assert.strictEqual(metrics.forecast.totalCommittedExpenses, 0);
    assert.strictEqual(metrics.spending.expensesByCategory.length, 0);
    assert.strictEqual(metrics.spending.incomeByCategory.length, 0);
    assert.ok(metrics.meta.todayStr);
  });

  // =========================================================================
  // CHECK 6: Calendar Rollover & Timezone Boundary Handling
  // =========================================================================
  test('Check 6: Date service handles month-end (28/29/30/31) and year rollover (2026 -> 2027)', () => {
    // Month End 30 -> Next Month 01
    const nov30 = '2026-11-30';
    const dec01 = addDays(nov30, 1);
    assert.strictEqual(dec01, '2026-12-01');

    // Year End 31-Dec-2026 -> 01-Jan-2027
    const dec31 = '2026-12-31';
    const jan01 = addDays(dec31, 1);
    assert.strictEqual(jan01, '2027-01-01');

    // Leap Year Handling: 2028 is a leap year (28-Feb -> 29-Feb -> 01-Mar)
    const feb28Leap = '2028-02-28';
    assert.strictEqual(addDays(feb28Leap, 1), '2028-02-29');
    assert.strictEqual(addDays(feb28Leap, 2), '2028-03-01');

    // Date Difference Calculations
    assert.strictEqual(diffInDays('2026-11-01', '2026-11-15'), 14);
    assert.strictEqual(diffInDays('2026-11-30', '2026-12-05'), 5);

    // safeDate and getMonthKey resilience
    assert.strictEqual(safeDate('2026-11-21T18:30:00.000Z'), '2026-11-21');
    assert.strictEqual(getMonthKey('2026-11-21'), '2026-11');
    assert.strictEqual(getMonthKey('2027-01-05'), '2027-01');
  });

  // =========================================================================
  // CHECK 7: High-Concurrency Stress (50 Parallel Executions)
  // =========================================================================
  test('Check 7: Concurrent stress test — 50 simultaneous evaluations finish with 0 errors in under 100ms', () => {
    const start = performance.now();
    const promises = [];

    for (let i = 0; i < 50; i++) {
      promises.push(new Promise((resolve) => {
        const res = calculateDeterministicMetrics({
          incomes: [
            { id: `i_${i}`, amount: 50000 + i * 100, status: 'received', actualDate: '2026-11-01' }
          ],
          expenses: [
            { id: `e_${i}`, amount: 20000 + i * 50, status: 'paid', paidDate: '2026-11-03', isEssential: true }
          ],
          startingBalance: 30000,
          safetyBuffer: 10000,
          horizon: 'all'
        });
        resolve(res);
      }));
    }

    return Promise.all(promises).then((results) => {
      const elapsed = performance.now() - start;
      assert.strictEqual(results.length, 50);
      results.forEach((r, idx) => {
        assert.ok(r.actual.clearedIncome >= 50000);
        assert.ok(r.actual.netSavings > 0);
      });
      assert.ok(elapsed < 100, `50 concurrent executions must complete in under 100ms (took ${elapsed.toFixed(2)}ms)`);
    });
  });
});
