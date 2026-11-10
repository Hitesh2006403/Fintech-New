import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatINR,
  calculateCurrentBalance,
  calculateSafeToSpend,
  generateCashFlowForecast,
  simulatePaymentDelay,
  rankBills,
  calculateLeanWeekSavings
} from './financialEngine.js';

test('formatINR formats currency in Indian numbering style', () => {
  assert.strictEqual(formatINR(125000), '₹1,25,000');
  assert.strictEqual(formatINR(0), '₹0');
  assert.strictEqual(formatINR(-5000), '-₹5,000');
});

test('calculateCurrentBalance counts only received income and paid expenses', () => {
  const startingBalance = 50000;
  const incomes = [
    { id: '1', amount: 30000, status: 'received' },
    { id: '2', amount: 45000, status: 'confirmed' }, // MUST NOT affect current cash
    { id: '3', amount: 20000, status: 'uncertain' }  // MUST NOT affect current cash
  ];
  const expenses = [
    { id: 'e1', amount: 15000, status: 'paid' },
    { id: 'e2', amount: 25000, status: 'unpaid' }    // MUST NOT affect current cash
  ];
  const designatedSavings = 10000;

  const result = calculateCurrentBalance(startingBalance, incomes, expenses, designatedSavings);

  // Gross cash = 50,000 + 30,000 - 15,000 = 65,000
  assert.strictEqual(result.grossCash, 65000);
  // Available cash = 65,000 - 10,000 (designated reserve) = 55,000
  assert.strictEqual(result.availableCash, 55000);
  assert.strictEqual(result.totalReceived, 30000);
  assert.strictEqual(result.totalPaid, 15000);
});

test('calculateSafeToSpend protects essential obligations, safety buffer, and clamps to zero', () => {
  const availableCash = 50000;
  const safetyBuffer = 20000;
  const currentDateStr = '2026-10-17';

  // Scenario A: Cash is sufficient
  const incomes = [
    { id: '1', amount: 40000, expectedDate: '2026-10-25', status: 'confirmed', title: 'Client Retainer' }
  ];
  const expenses = [
    { id: 'e1', amount: 12000, dueDate: '2026-10-20', isEssential: true, status: 'unpaid' },
    { id: 'e2', amount: 3000, dueDate: '2026-10-22', isEssential: false, status: 'unpaid' }
  ];

  const resA = calculateSafeToSpend({
    availableCash,
    incomes,
    expenses,
    safetyBuffer,
    horizonDays: 30,
    currentDateStr,
    scenario: 'conservative'
  });

  // Safe to spend = 50,000 - 12,000 (essential) - 3,000 (discretionary) - 20,000 (buffer) = 15,000
  assert.strictEqual(resA.safeToSpendToday, 15000);
  assert.strictEqual(resA.projectedShortfall, 0);

  // Scenario B: Obligations exceed cash, clamps to 0 and shows shortfall
  const tightExpenses = [
    { id: 'e1', amount: 45000, dueDate: '2026-10-20', isEssential: true, status: 'unpaid' }
  ];
  const resB = calculateSafeToSpend({
    availableCash: 30000,
    incomes: [],
    expenses: tightExpenses,
    safetyBuffer: 20000,
    horizonDays: 30,
    currentDateStr,
    scenario: 'conservative'
  });

  // Raw = 30,000 - 45,000 - 20,000 = -35,000. Clamped to 0. Shortfall = 35,000.
  assert.strictEqual(resB.safeToSpendToday, 0);
  assert.strictEqual(resB.projectedShortfall, 35000);
});

test('Cash flow forecast respects dates and scenario flags', () => {
  const availableCash = 20000;
  const safetyBuffer = 10000;
  const startDateStr = '2026-10-17';

  const incomes = [
    { id: 'inc1', amount: 15000, expectedDate: '2026-10-20', status: 'confirmed' },
    { id: 'inc2', amount: 25000, expectedDate: '2026-10-25', status: 'uncertain' }
  ];
  const expenses = [
    { id: 'exp1', amount: 25000, dueDate: '2026-10-22', isEssential: true, status: 'unpaid' }
  ];

  // Conservative: excludes uncertain income
  const consForecast = generateCashFlowForecast({
    availableCash,
    incomes,
    expenses,
    safetyBuffer,
    days: 10,
    startDateStr,
    scenario: 'conservative'
  });

  // On Oct 17: 20,000
  // On Oct 20: 20,000 (confirmed is NOT counted in conservative) -> 20,000
  // On Oct 22: 20,000 - 25,000 = -5,000 deficit!
  assert.strictEqual(consForecast.firstNegativeDate, '2026-10-22');
  assert.ok(consForecast.maxShortfall > 0);
});

test('simulatePaymentDelay does not mutate real records and updates simulated dates', () => {
  const incomes = [
    { id: 'inc1', amount: 40000, expectedDate: '2026-10-20', status: 'confirmed', title: 'Invoice' }
  ];
  const expenses = [
    { id: 'exp1', amount: 30000, dueDate: '2026-10-24', isEssential: true, status: 'unpaid', title: 'Rent' }
  ];

  const simResult = simulatePaymentDelay({
    availableCash: 10000,
    incomes,
    expenses,
    safetyBuffer: 15000,
    delayConfig: { incomeId: 'inc1', delayDays: 10, unexpectedExpense: 0, incomeReductionPct: 0 }
  });

  // Original income object must not be mutated
  assert.strictEqual(incomes[0].expectedDate, '2026-10-20');

  // In simulated run, invoice is delayed to Oct 30, so rent on Oct 24 creates deficit
  assert.strictEqual(simResult.simulated.firstNegativeDate, '2026-10-24');
  assert.ok(simResult.recommendations.length > 0);
});

test('calculateLeanWeekSavings calculates weekly deficit and target reserve correctly', () => {
  const result = calculateLeanWeekSavings({
    weeks: 4,
    expectedLowIncomePerWeek: 4000,
    essentialWeeklyExpenses: 10000,
    currentDesignatedReserve: 12000,
    weeklyContribution: 3000
  });

  // Weekly deficit = 10,000 - 4,000 = 6,000
  assert.strictEqual(result.weeklyDeficit, 6000);
  // Target reserve = 6,000 * 4 = 24,000
  assert.strictEqual(result.targetReserve, 24000);
  // Remaining goal = 24,000 - 12,000 = 12,000
  assert.strictEqual(result.remainingGoal, 12000);
  // Progress = 12,000 / 24,000 = 50%
  assert.strictEqual(result.progressPct, 50);
  // Weeks to goal = 12,000 / 3,000 = 4 weeks
  assert.strictEqual(result.weeksToGoal, 4);
});

test('rankBills prioritizes overdue and high penalty EMI bills over discretionary items', () => {
  const bills = [
    { id: '1', title: 'Netflix', amount: 800, dueDate: '2026-10-25', isEssential: false, category: 'Subscriptions' },
    { id: '2', title: 'Equipment EMI', amount: 12000, dueDate: '2026-10-18', isEssential: true, category: 'EMI or loan', lateFee: 1500 },
    { id: '3', title: 'Past Studio Power', amount: 3500, dueDate: '2026-10-10', isEssential: true, category: 'Utilities', lateFee: 500 }
  ];

  const ranking = rankBills(bills, 20000, '2026-10-17');
  
  // Past power bill is overdue -> critical
  assert.strictEqual(ranking.rankedBills[0].id, '3');
  assert.strictEqual(ranking.rankedBills[0].priority, 'critical');

  // EMI due tomorrow with high late fee -> high/critical
  assert.strictEqual(ranking.rankedBills[1].id, '2');

  // Netflix subscription -> low priority
  assert.strictEqual(ranking.rankedBills[2].id, '1');
  assert.strictEqual(ranking.rankedBills[2].priority, 'low');
});
