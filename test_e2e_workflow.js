import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCurrentBalance,
  calculateSafeToSpend,
  generateCashFlowForecast,
  simulatePaymentDelay,
  rankBills,
  calculateLeanWeekSavings,
  addDays
} from './src/services/financialEngine.js';

const BASE_URL = 'http://localhost:3001';

test('FinTech E2E Integration & Financial Rules Suite', async (t) => {

  let userAToken = '';
  let userAId = '';
  let receivedIncomeId = '';
  let confirmedIncomeId = '';
  let emiBillId = '';
  let rentBillId = '';

  const testUserAEmail = `e2e_test_a_${Date.now()}@example.com`;
  const testUserBEmail = `e2e_test_b_${Date.now()}@example.com`;

  // 1. Health & Database Status
  await t.test('1. API Health & Operational Database Status Check', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200);
    const health = await res.json();
    assert.equal(health.status, 'healthy');

    const dbRes = await fetch(`${BASE_URL}/api/database/status`);
    assert.equal(dbRes.status, 200);
    const dbStatus = await dbRes.json();
    assert.equal(dbStatus.status, 'operational');
  });

  // 2. User A Registration & Token Issuance
  await t.test('2. User Registration and Isolated Session Issuance', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserAEmail,
        name: 'Alex Lynx Planner',
        password: 'Password123#Secure'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(data.token);
    assert.ok(data.user.id);
    userAToken = data.token;
    userAId = data.user.id;
  });

  // 3. User A Initial Financials & Preferences
  await t.test('3. User A Fresh Starting Financials and Preferences Update', async () => {
    const getRes = await fetch(`${BASE_URL}/api/financials`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert.equal(getRes.status, 200);
    const getJson = await getRes.json();
    assert.ok(getJson.success);

    // Update preferences: Starting balance = ₹50,000, safety buffer = ₹20,000
    const prefRes = await fetch(`${BASE_URL}/api/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        startingBalance: 50000,
        safetyBuffer: 20000,
        defaultHorizonDays: 30,
        defaultScenario: 'expected'
      })
    });
    assert.equal(prefRes.status, 200);
    const prefData = await prefRes.json();
    assert.equal(prefData.preferences.startingBalance, 50000);
    assert.equal(prefData.preferences.safetyBuffer, 20000);
  });

  // 4. Add Received Income (Must Increase Available Balance Exactly Once)
  await t.test('4. Add Received Income - Balance Increases Exactly Once', async () => {
    const res = await fetch(`${BASE_URL}/api/incomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Advance Retainer Deposit',
        source: 'Fintech Studio',
        amount: 30000,
        expectedDate: '2026-10-10',
        actualDate: '2026-10-10',
        status: 'received',
        notes: 'Direct IMPS bank transfer'
      })
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.income.amount, 30000);
    assert.equal(json.income.status, 'received');
    receivedIncomeId = json.income.id;

    // Verify balance calculation
    const balance = calculateCurrentBalance(50000, [json.income], [], 0);
    // 50,000 starting + 30,000 received = 80,000
    assert.equal(balance.availableCash, 80000);
    assert.equal(balance.totalReceived, 30000);
  });

  // 5. Add Confirmed Future Income (Must NOT increase current cash before date)
  await t.test('5. Add Confirmed Future Income - Excluded from Current Cash', async () => {
    const res = await fetch(`${BASE_URL}/api/incomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Milestone 2 Delivery',
        source: 'NextGen Corp',
        amount: 45000,
        expectedDate: '2026-10-25',
        actualDate: null,
        status: 'confirmed',
        notes: 'Invoice issued with verified PO'
      })
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    confirmedIncomeId = json.income.id;

    // Balance check: Current cash MUST STILL BE 80,000 (not 125,000)
    const incomes = [
      { id: receivedIncomeId, amount: 30000, status: 'received' },
      json.income
    ];
    const balance = calculateCurrentBalance(50000, incomes, [], 0);
    assert.equal(balance.availableCash, 80000, 'Confirmed future income must NOT increase current available cash');
  });

  // 6. Add Uncertain Income (Must be excluded from conservative forecast)
  await t.test('6. Add Uncertain Income - Excluded from Conservative Forecast', async () => {
    const res = await fetch(`${BASE_URL}/api/incomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Pitch Opportunity Payout',
        source: 'Venture Lab',
        amount: 25000,
        expectedDate: '2026-10-28',
        actualDate: null,
        status: 'uncertain',
        notes: 'Awaiting board review'
      })
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.income.status, 'uncertain');

    const incomes = [
      { id: receivedIncomeId, amount: 30000, status: 'received', expectedDate: '2026-10-10' },
      { id: confirmedIncomeId, amount: 45000, status: 'confirmed', expectedDate: '2026-10-25' },
      json.income
    ];

    // Expected forecast includes confirmed on its date, but excludes uncertain income
    const forecast = generateCashFlowForecast({
      availableCash: 80000,
      incomes,
      expenses: [],
      safetyBuffer: 20000,
      days: 30,
      scenario: 'expected',
      currentDateStr: '2026-10-18'
    });

    const day29 = forecast.forecast.find(d => d.date === '2026-10-29');
    // 80,000 initial + 45,000 confirmed = 125,000 (uncertain 25,000 is excluded!)
    assert.equal(day29.closingBalance, 125000, 'Expected scenario must include confirmed income and completely exclude uncertain income');
  });

  // 7. Add Essential Bills & EMI with Penalties
  await t.test('7. Add Essential Bills & EMI with Due Dates and Late Penalties', async () => {
    // Add Workstation EMI
    const emiRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Hardware Loan EMI',
        category: 'EMI or loan',
        amount: 15000,
        dueDate: '2026-10-21',
        isEssential: true,
        priority: 'critical',
        lateFee: 1200,
        gracePeriod: 0,
        status: 'unpaid'
      })
    });
    assert.equal(emiRes.status, 201);
    const emiJson = await emiRes.json();
    emiBillId = emiJson.expense.id;

    // Add Office Rent
    const rentRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Studio Workspace Rent',
        category: 'Rent',
        amount: 25000,
        dueDate: '2026-10-24',
        isEssential: true,
        priority: 'critical',
        lateFee: 2000,
        gracePeriod: 3,
        status: 'unpaid'
      })
    });
    assert.equal(rentRes.status, 201);
    const rentJson = await rentRes.json();
    rentBillId = rentJson.expense.id;

    // Bill Ranking verification: Overdue and EMI bills must score highest
    const ranking = rankBills([emiJson.expense, rentJson.expense], 80000, '2026-10-18');
    assert.ok(ranking.rankedBills.length === 2);
    // EMI due in 3 days with loan category and high late fee ranks #1
    assert.equal(ranking.rankedBills[0].id, emiBillId);
  });

  // 8. Add Manual Cash Expense (Already Paid)
  await t.test('8. Add Manual Cash Expense - Deducts from Balance Immediately', async () => {
    const res = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Office Pantry & Stationery Supplies',
        category: 'Groceries',
        amount: 5000,
        dueDate: '2026-10-18',
        paidDate: '2026-10-18',
        isEssential: true,
        status: 'paid',
        notes: 'Cash payment with receipt'
      })
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.expense.status, 'paid');

    // Balance check: 80,000 - 5,000 paid = 75,000
    const balance = calculateCurrentBalance(
      50000,
      [{ id: receivedIncomeId, amount: 30000, status: 'received' }],
      [json.expense],
      0
    );
    assert.equal(balance.availableCash, 75000);
    assert.equal(balance.totalPaid, 5000);
  });

  // 9. Safe-to-Spend Calculation Engine
  await t.test('9. Safe-to-Spend Accurately Reserves Buffer and Essential Commitments', async () => {
    const incomes = [
      { id: 'inc_rec', amount: 30000, status: 'received' },
      { id: 'inc_conf', amount: 45000, status: 'confirmed', expectedDate: '2026-10-25' }
    ];
    const expenses = [
      { id: emiBillId, amount: 15000, dueDate: '2026-10-21', isEssential: true, status: 'unpaid' },
      { id: rentBillId, amount: 25000, dueDate: '2026-10-24', isEssential: true, status: 'unpaid' }
    ];

    // availableCash = 75,000; safetyBuffer = 20,000; essential commitments = 15,000 + 25,000 = 40,000
    // Total commitments + buffer = 60,000
    // Safe-to-Spend Today = 75,000 - 60,000 = 15,000
    const sts = calculateSafeToSpend({
      availableCash: 75000,
      incomes,
      expenses,
      safetyBuffer: 20000,
      horizonDays: 14,
      scenario: 'conservative',
      currentDateStr: '2026-10-18'
    });

    assert.equal(sts.safeToSpendToday, 15000);
    assert.equal(sts.totalObligationsProtected, 40000);
  });

  // 10. Payment Delay Simulator (Hypothetical Sandbox Without Mutating Real Data)
  await t.test('10. Payment Delay Simulator Sandbox - Zero Mutation on Real Records', async () => {
    const incomes = [
      { id: confirmedIncomeId, title: 'Milestone 2 Delivery', amount: 45000, status: 'confirmed', expectedDate: '2026-10-25' }
    ];
    const expenses = [
      { id: emiBillId, title: 'Hardware Loan EMI', amount: 15000, dueDate: '2026-10-21', isEssential: true, status: 'unpaid' },
      { id: rentBillId, title: 'Studio Workspace Rent', amount: 25000, dueDate: '2026-10-24', isEssential: true, status: 'unpaid' },
      { id: 'exp_extra', title: 'AWS Cloud Infrastructure', amount: 40000, dueDate: '2026-10-26', isEssential: true, status: 'unpaid' }
    ];

    // Simulate delaying 45,000 confirmed income from 25 Oct by 14 days (to 8 Nov)
    const sim = simulatePaymentDelay({
      availableCash: 75000,
      incomes,
      expenses,
      safetyBuffer: 20000,
      delayConfig: {
        incomeId: confirmedIncomeId,
        delayDays: 14,
        unexpectedExpense: 0,
        incomeReductionPct: 0
      },
      currentDateStr: '2026-10-18'
    });

    const targetIncome = incomes.find(i => i.id === confirmedIncomeId);
    const simulatedDate = addDays(targetIncome.expectedDate, 14);

    // Real record must NOT have been mutated
    assert.equal(targetIncome.expectedDate, '2026-10-25', 'Original income expectedDate must remain untouched');
    assert.equal(simulatedDate, '2026-11-08', 'Simulated date must reflect 14-day delay');
    assert.ok(sim.simulated.minimumBalance !== undefined);
    assert.ok(sim.recommendations.length > 0);
  });

  // 11. Mark Bill as Paid (Strict No-Double-Deduction)
  await t.test('11. Mark Bill as Paid - Deducts Once Without Duplication', async () => {
    const payRes = await fetch(`${BASE_URL}/api/expenses/${emiBillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        status: 'paid',
        paidDate: '2026-10-18'
      })
    });
    assert.equal(payRes.status, 200);
    const payJson = await payRes.json();
    assert.equal(payJson.expense.status, 'paid');
    assert.equal(payJson.expense.paidDate, '2026-10-18');

    // Balance calculation with the paid bill:
    const expenses = [
      { id: 'exp_cash', amount: 5000, status: 'paid' },
      payJson.expense,
      { id: rentBillId, amount: 25000, status: 'unpaid' }
    ];
    // 50,000 starting + 30,000 received - 5,000 cash - 15,000 EMI paid = 60,000
    const balance = calculateCurrentBalance(
      50000,
      [{ id: receivedIncomeId, amount: 30000, status: 'received' }],
      expenses,
      0
    );
    assert.equal(balance.availableCash, 60000);
    assert.equal(balance.totalPaid, 20000);
  });

  // 12. Lean-Week Reserve Target Calculations
  await t.test('12. Lean-Week Savings Target Calculation', () => {
    const lean = calculateLeanWeekSavings({
      weeks: 4,
      expectedLowIncomePerWeek: 5000,
      essentialWeeklyExpenses: 12000,
      currentDesignatedReserve: 14000,
      weeklyContribution: 3500
    });

    // weeklyDeficit = 12000 - 5000 = 7000
    assert.equal(lean.weeklyDeficit, 7000);
    // targetReserve = 7000 * 4 = 28000
    assert.equal(lean.targetReserve, 28000);
    // remainingGoal = 28000 - 14000 = 14000
    assert.equal(lean.remainingGoal, 14000);
    // progress = 50%
    assert.equal(lean.progressPct, 50);
    // weeksToGoal = 14000 / 3500 = 4 weeks
    assert.equal(lean.weeksToGoal, 4);
  });

  // 13. Multi-User Isolation Verification (User B Cannot Access User A Records)
  await t.test('13. Multi-User Isolation - Strict Isolation Between Distinct Accounts', async () => {
    // Register User B
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserBEmail,
        name: 'User B Freelancer',
        password: 'PasswordB456!Secure'
      })
    });
    assert.equal(regRes.status, 200);
    const regData = await regRes.json();
    const userBToken = regData.token;

    // Fetch User B financials
    const bFinancialsRes = await fetch(`${BASE_URL}/api/financials`, {
      headers: { 'Authorization': `Bearer ${userBToken}` }
    });
    assert.equal(bFinancialsRes.status, 200);
    const bJson = await bFinancialsRes.json();

    // Verify User B's dataset DOES NOT contain User A's incomes or expenses
    const bIncomeIds = (bJson.data.incomes || []).map(i => i.id);
    const bExpenseIds = (bJson.data.expenses || []).map(e => e.id);

    assert.ok(!bIncomeIds.includes(receivedIncomeId), "User B must NOT see User A's received income");
    assert.ok(!bIncomeIds.includes(confirmedIncomeId), "User B must NOT see User A's confirmed income");
    assert.ok(!bExpenseIds.includes(emiBillId), "User B must NOT see User A's EMI obligation");
    assert.ok(!bExpenseIds.includes(rentBillId), "User B must NOT see User A's rent obligation");
  });

  // 14. Unauthorized Access & Security Verification
  await t.test('14. Security: Anonymous Requests to Financial Endpoints Rejected with 401', async () => {
    const unauthRes = await fetch(`${BASE_URL}/api/financials`);
    assert.equal(unauthRes.status, 401, 'Anonymous request must return 401 Unauthorized');
  });

});
