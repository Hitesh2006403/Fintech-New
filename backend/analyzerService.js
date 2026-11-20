/**
 * FINSIGHT — PERSONAL FINANCE ANALYZER SERVICE & FINANCIAL ANALYSIS ENGINE
 * Authoritative backend financial intelligence service with deterministic calculations.
 *
 * PHASE 3 — FINANCIAL ANALYSIS ENGINE SPECIFICATION:
 * - Arithmetic calculated deterministically on server (never delegated to LLM).
 * - Full Cash Flow Summary with distinct Actual vs. Forecast vs. Estimates vs. Recommendations.
 * - Expense-to-Income ratio, Savings Rate, Net Savings, Daily & Monthly Averages.
 * - Category spending distribution & percentages.
 * - Month-over-Month historical spending comparison & trend analysis.
 * - Essential vs. Discretionary expense breakdown.
 * - Automated recurring expense detection.
 * - Category budget utilization tracking & over-budget alerts.
 * - Statistical unusual expense (outlier) detection (mean + 2*sigma and category spike analysis).
 * - Duplicate transaction detection.
 * - Edge case handling: zero income, zero expenses, refunds/negative amounts, missing categories, incomplete dates.
 * - Asia/Kolkata timezone and INR currency conventions.
 * - 100% strict tenant isolation (session-derived user ID, zero parameter tampering).
 */

import { db } from './db.js';
import {
  calculateCurrentBalance,
  calculateSafeToSpend,
  generateCashFlowForecast,
  rankBills,
  calculateLeanWeekSavings,
  formatINR,
  getCurrentLocalDate,
  toISODate,
  addDays,
  diffInDays,
  classifyBillStatus,
  classifyIncomeStatus
} from './financialService.js';

/**
 * Normalizes an ISO date string safely using Asia/Kolkata default
 */
export function safeDate(val, fallback = getCurrentLocalDate()) {
  if (!val || typeof val !== 'string') return fallback;
  const match = val.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : fallback;
}

/**
 * Extracts the calendar month string (YYYY-MM) from an ISO date string
 */
export function getMonthKey(dateStr) {
  const safe = safeDate(dateStr);
  return safe.slice(0, 7);
}

/**
 * Detects statistical unusual expenses (anomalies) using sample standard deviation and category spikes.
 *
 * @param {Array} expenses - List of expense objects
 * @returns {Array} List of flagged unusual expense items with reason and score
 */
export function detectUnusualExpenses(expenses = []) {
  if (!Array.isArray(expenses) || expenses.length < 2) return [];

  // Filter positive amounts for statistical analysis
  const positiveExpenses = expenses.filter(e => Number(e.amount) > 0);
  if (positiveExpenses.length < 2) return [];

  const amounts = positiveExpenses.map(e => Number(e.amount));
  const count = amounts.length;
  const sum = amounts.reduce((acc, a) => acc + a, 0);
  const mean = sum / count;

  // Calculate sample standard deviation
  const variance = amounts.reduce((acc, a) => acc + Math.pow(a - mean, 2), 0) / (count - 1);
  const stdDev = Math.sqrt(variance);
  const sigmaThreshold = mean + 2.0 * stdDev;

  // Calculate category averages
  const catSums = {};
  const catCounts = {};
  positiveExpenses.forEach(e => {
    const cat = e.category || 'General';
    catSums[cat] = (catSums[cat] || 0) + Number(e.amount);
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const catAverages = {};
  Object.keys(catSums).forEach(cat => {
    catAverages[cat] = catSums[cat] / catCounts[cat];
  });

  const flagged = [];

  positiveExpenses.forEach(exp => {
    const amt = Number(exp.amount);
    const cat = exp.category || 'General';
    const catAvg = catAverages[cat] || mean;
    const catCount = catCounts[cat] || 1;

    let isAnomaly = false;
    let reason = '';
    let severity = 'medium';

    // Condition A: Statistical outlier exceeding mean + 2*sigma and above ₹5,000
    if (stdDev > 0 && amt > sigmaThreshold && amt >= 5000) {
      isAnomaly = true;
      const deviationRatio = ((amt - mean) / stdDev).toFixed(1);
      reason = `Statistical outlier: ${deviationRatio}σ above your overall average expense of ${formatINR(Math.round(mean))}`;
      severity = 'high';
    }
    // Condition B: Category spike: ≥ 2.5x category average with at least 2 entries in category and above ₹3,000
    else if (catCount >= 2 && amt >= 2.5 * catAvg && amt >= 3000) {
      isAnomaly = true;
      const multiplier = (amt / catAvg).toFixed(1);
      reason = `Category spike: ${multiplier}x higher than your average ${cat} spending of ${formatINR(Math.round(catAvg))}`;
      severity = 'medium';
    }

    if (isAnomaly) {
      flagged.push({
        id: exp.id,
        title: exp.title,
        amount: amt,
        category: cat,
        date: safeDate(exp.paidDate || exp.dueDate),
        reason,
        severity,
        multiplier: Number((amt / (catAvg || mean)).toFixed(1))
      });
    }
  });

  return flagged.sort((a, b) => b.amount - a.amount);
}

/**
 * Detects recurring expense commitments explicitly or algorithmically.
 *
 * @param {Array} expenses - List of expense objects
 * @returns {Array} List of detected recurring obligations with annualized impact
 */
export function detectRecurringExpenses(expenses = []) {
  if (!Array.isArray(expenses)) return [];

  const recurringList = [];
  const seenIds = new Set();

  expenses.forEach(exp => {
    const amt = Number(exp.amount || 0);
    if (amt <= 0) return;

    const isExplicitRecurring = Boolean(exp.recurring && exp.recurring !== 'none') || exp.isRecurring === true;
    const isEmi = exp.isEMI === true || /emi|loan|mortgage/i.test(exp.title || '') || /emi|loan/i.test(exp.category || '');

    if ((isExplicitRecurring || isEmi) && !seenIds.has(exp.id)) {
      seenIds.add(exp.id);
      const frequency = exp.recurring === 'weekly' ? 'weekly' : 'monthly';
      const annualMultiplier = frequency === 'weekly' ? 52 : 12;

      recurringList.push({
        id: exp.id,
        title: exp.title,
        category: exp.category || 'General',
        amount: amt,
        frequency,
        annualizedCost: amt * annualMultiplier,
        isEMI: isEmi,
        isEssential: Boolean(exp.isEssential || isEmi),
        detectionMethod: 'explicit_contract'
      });
    }
  });

  return recurringList.sort((a, b) => b.annualizedCost - a.annualizedCost);
}

/**
 * Detects duplicate or near-duplicate transactions.
 *
 * @param {Array} transactions - List of transactions
 * @returns {Array} List of flagged duplicate items
 */
export function detectDuplicateTransactions(transactions = []) {
  if (!Array.isArray(transactions) || transactions.length < 2) return [];

  const duplicates = [];
  const checked = new Set();

  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const a = transactions[i];
      const b = transactions[j];

      if (checked.has(a.id) || checked.has(b.id)) continue;
      if (a.type !== b.type) continue;

      const amtA = Number(a.amount || 0);
      const amtB = Number(b.amount || 0);

      // Match criteria: identical amount, same type, similar title, within 2 days
      if (amtA === amtB && amtA > 0) {
        const titleA = (a.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const titleB = (b.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        if (titleA === titleB || (titleA.length > 5 && (titleA.includes(titleB) || titleB.includes(titleA)))) {
          const dateA = safeDate(a.date || a.actualDate || a.dueDate || a.expectedDate);
          const dateB = safeDate(b.date || b.actualDate || b.dueDate || b.expectedDate);
          const daysGap = Math.abs(diffInDays(dateA, dateB));

          if (daysGap <= 2) {
            duplicates.push({
              primaryId: a.id,
              duplicateId: b.id,
              title: a.title,
              amount: amtA,
              dateA,
              dateB,
              daysGap,
              reason: `Identical ${a.type} of ${formatINR(amtA)} found on ${dateA} and ${dateB} (${daysGap} day difference)`
            });
            checked.add(b.id);
          }
        }
      }
    }
  }

  return duplicates;
}

/**
 * Computes Month-over-Month historical spending and income comparison.
 *
 * @param {Array} incomes - All user incomes
 * @param {Array} expenses - All user expenses
 * @returns {Array} Chronological list of monthly metrics and trend calculations
 */
export function calculateMonthOverMonthComparison(incomes = [], expenses = []) {
  const monthsMap = {};

  const ensureMonth = (mKey) => {
    if (!monthsMap[mKey]) {
      monthsMap[mKey] = {
        month: mKey,
        inflow: 0,
        outflow: 0,
        netSavings: 0,
        savingsRate: 0,
        expenseToIncomeRatio: 0,
        incomeCount: 0,
        expenseCount: 0
      };
    }
  };

  // Aggregate incomes by month
  (Array.isArray(incomes) ? incomes : []).forEach(inc => {
    const d = inc.actualDate || inc.expectedDate;
    if (!d) return;
    const mKey = getMonthKey(d);
    ensureMonth(mKey);
    const amt = Number(inc.amount || 0);
    monthsMap[mKey].inflow += amt;
    monthsMap[mKey].incomeCount++;
  });

  // Aggregate expenses by month
  (Array.isArray(expenses) ? expenses : []).forEach(exp => {
    const d = exp.paidDate || exp.dueDate;
    if (!d) return;
    const mKey = getMonthKey(d);
    ensureMonth(mKey);
    const amt = Number(exp.amount || 0);
    monthsMap[mKey].outflow += amt;
    monthsMap[mKey].expenseCount++;
  });

  const sortedMonths = Object.keys(monthsMap).sort();
  const result = [];

  for (let i = 0; i < sortedMonths.length; i++) {
    const mKey = sortedMonths[i];
    const data = monthsMap[mKey];

    data.netSavings = data.inflow - data.outflow;
    data.savingsRate = data.inflow > 0
      ? Math.round((data.netSavings / data.inflow) * 100)
      : (data.netSavings < 0 ? -100 : 0);

    data.expenseToIncomeRatio = data.inflow > 0
      ? Math.round((data.outflow / data.inflow) * 100)
      : (data.outflow > 0 ? 100 : 0);

    // Calculate month-over-month percentage changes
    if (i > 0) {
      const prevKey = sortedMonths[i - 1];
      const prev = monthsMap[prevKey];

      const spendChange = prev.outflow > 0
        ? Math.round(((data.outflow - prev.outflow) / prev.outflow) * 100)
        : (data.outflow > 0 ? 100 : 0);

      const incomeChange = prev.inflow > 0
        ? Math.round(((data.inflow - prev.inflow) / prev.inflow) * 100)
        : (data.inflow > 0 ? 100 : 0);

      data.momSpendChangePercent = spendChange;
      data.momIncomeChangePercent = incomeChange;
      data.spendTrend = spendChange > 5 ? 'increasing' : spendChange < -5 ? 'decreasing' : 'stable';
    } else {
      data.momSpendChangePercent = 0;
      data.momIncomeChangePercent = 0;
      data.spendTrend = 'baseline';
    }

    result.push(data);
  }

  return result;
}

/**
 * Calculates category budget utilization against targets.
 *
 * @param {Array} expenses - Filtered user expenses
 * @param {object} budgets - Category budgets object (e.g. { Rent: 25000, Utilities: 5000 })
 * @returns {Array} List of category budget utilization statuses
 */
export function calculateBudgetUtilization(expenses = [], budgets = {}) {
  const DEFAULT_BENCHMARK_BUDGETS = {
    'Rent': 25000,
    'Rent / Housing': 25000,
    'Utilities': 6000,
    'SaaS & Software': 10000,
    'SaaS': 10000,
    'Groceries & Food': 15000,
    'EMI or loan': 20000,
    'Health Insurance': 6000,
    'Marketing': 12000,
    'General': 10000
  };

  const activeBudgets = { ...DEFAULT_BENCHMARK_BUDGETS, ...(budgets || {}) };

  // Calculate actual spending per category
  const spendMap = {};
  (Array.isArray(expenses) ? expenses : []).forEach(e => {
    const cat = e.category || 'General';
    spendMap[cat] = (spendMap[cat] || 0) + Number(e.amount || 0);
  });

  const categories = Object.keys(spendMap);
  const utilizationList = categories.map(cat => {
    const spent = spendMap[cat];
    const budget = activeBudgets[cat] || Math.max(spent, 10000);
    const utilizationPercent = budget > 0 ? Math.round((spent / budget) * 100) : 100;
    const remaining = budget - spent;
    const isOverBudget = spent > budget;

    let status = 'healthy';
    if (isOverBudget) status = 'exceeded';
    else if (utilizationPercent >= 80) status = 'warning';

    return {
      category: cat,
      spent,
      budget,
      remaining,
      utilizationPercent,
      isOverBudget,
      status
    };
  }).sort((a, b) => b.spent - a.spent);

  return utilizationList;
}

/**
 * Generates deterministic, rule-based financial recommendations anchored strictly on verified metrics.
 *
 * @param {object} metrics - Authoritative financial metrics
 * @returns {Array} List of actionable recommendation items
 */
export function generateRecommendations(metrics) {
  const recommendations = [];

  const {
    savingsRate = 0,
    expenseToIncomeRatio = 0,
    runwayMonths = 0,
    essentialRatio = 0,
    certaintyRatio = 0,
    overdueCount = 0,
    unusualExpenses = []
  } = metrics;

  // 1. Overdue bills rule
  if (overdueCount > 0) {
    recommendations.push({
      id: 'rec_overdue',
      type: 'critical',
      title: 'Clear Overdue Obligations Immediately',
      description: `You have ${overdueCount} overdue bill(s). Settle overdue balances first to prevent late fees and interest penalties.`,
      actionLabel: 'View Prioritization'
    });
  }

  // 2. High Expense-to-Income ratio rule
  if (expenseToIncomeRatio >= 85) {
    recommendations.push({
      id: 'rec_expense_ratio',
      type: 'warning',
      title: 'High Outflow Ratio (> 85%)',
      description: `Your committed outflows consume ${expenseToIncomeRatio}% of your income. Audit discretionary expenses to create buffer for irregular cycles.`,
      actionLabel: 'Audit Expenses'
    });
  }

  // 3. Short Runway rule
  if (runwayMonths < 3.0 && runwayMonths > 0) {
    recommendations.push({
      id: 'rec_runway',
      type: 'warning',
      title: 'Liquid Cash Runway Below 90 Days',
      description: `Current liquid reserves cover ${runwayMonths} months of essential burn. Defer non-critical equipment or discretionary expenses until milestone receivables arrive.`,
      actionLabel: 'Simulate Cash Flow'
    });
  }

  // 4. Low Certainty ratio rule
  if (certaintyRatio < 50) {
    recommendations.push({
      id: 'rec_certainty',
      type: 'caution',
      title: 'High Uncertainty in Income Pipeline',
      description: `Only ${certaintyRatio}% of your projected earnings are cleared or contractually confirmed. Avoid new recurring debt commitments.`,
      actionLabel: 'Review Incomes'
    });
  }

  // 5. High Essential Obligations burden rule
  if (essentialRatio > 70) {
    recommendations.push({
      id: 'rec_essential',
      type: 'caution',
      title: 'Fixed Costs Exceed 70% of Budget',
      description: `Fixed non-negotiable commitments account for ${essentialRatio}% of expenses. Aim to negotiate contracts to bring fixed overhead closer to 60%.`,
      actionLabel: 'Optimize Bills'
    });
  }

  // 6. Unusual expenses alert
  if (unusualExpenses.length > 0) {
    recommendations.push({
      id: 'rec_unusual',
      type: 'opportunity',
      title: `${unusualExpenses.length} Unusual Expense Spike(s) Detected`,
      description: `Unusual transaction spikes were identified in your ledger. Verify these charges against vendor statements.`,
      actionLabel: 'Review Outliers'
    });
  }

  // 7. Strong Savings Velocity rule
  if (savingsRate >= 25 && recommendations.length < 3) {
    recommendations.push({
      id: 'rec_savings',
      type: 'positive',
      title: 'Strong Capital Accumulation Pace',
      description: `You are successfully saving ${savingsRate}% of cleared income. Transferring a portion of this surplus to your Lean-Week reserve strengthens emergency resilience.`,
      actionLabel: 'Fund Lean Reserve'
    });
  }

  return recommendations;
}

/**
 * Retrieves the complete, tenant-isolated Analyzer dataset for an authenticated user
 * with authoritative Phase 3 deterministic financial calculations.
 *
 * @param {string} userId - Authenticated user ID (strictly from session)
 * @param {object} options - Optional filters (horizon: '30' | '90' | '365' | 'all')
 * @returns {object} Authoritative financial analyzer metrics
 */
export function getUserAnalyzerData(userId, options = {}) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Unauthorized: Valid session-derived user ID is required');
  }

  // 1. Fetch user's isolated financial records
  const userFinancials = db.getUserFinancials(userId);
  if (!userFinancials) {
    throw new Error('User financial partition not found');
  }

  const preferences = userFinancials.preferences || {};
  const startingBalance = Number(preferences.startingBalance ?? 45000);
  const safetyBuffer = Number(preferences.safetyBuffer ?? 25000);
  const rawIncomes = Array.isArray(userFinancials.incomes) ? userFinancials.incomes : [];
  const rawExpenses = Array.isArray(userFinancials.expenses) ? userFinancials.expenses : [];
  const leanSavings = userFinancials.leanSavings || {};
  const designatedSavings = Number(leanSavings.currentDesignatedReserve ?? 0);

  const todayStr = getCurrentLocalDate();
  const horizon = options.horizon || 'all';
  const horizonDays = horizon === '30' ? 30 : horizon === '90' ? 90 : horizon === '365' ? 365 : null;

  // 2. Filter records by date horizon if specified
  const isWithinHorizon = (dateStr) => {
    if (!horizonDays) return true;
    if (!dateStr) return false;
    const diff = diffInDays(todayStr, safeDate(dateStr));
    return Math.abs(diff) <= horizonDays;
  };

  const incomes = rawIncomes.filter(inc => isWithinHorizon(inc.actualDate || inc.expectedDate));
  const expenses = rawExpenses.filter(exp => isWithinHorizon(exp.paidDate || exp.dueDate));

  // 3. Central Balance & Cash Flow
  const balanceDetails = calculateCurrentBalance(
    startingBalance,
    rawIncomes,
    rawExpenses,
    designatedSavings
  );

  const availableCash = balanceDetails.availableCash;
  const grossCash = balanceDetails.grossCash;

  // 4. Income Intelligence & Breakdown
  let totalGrossIncome = 0;
  let clearedIncome = 0;
  let confirmedIncome = 0;
  let uncertainIncome = 0;

  const incomeCategoriesMap = {};
  const incomeSourcesMap = {};

  const sanitizedIncomes = incomes.map(inc => {
    const amt = Number(inc.amount || 0);
    totalGrossIncome += amt;

    const isCleared = inc.status === 'received' || Boolean(inc.actualDate);
    const isConfirmed = !isCleared && (inc.status === 'confirmed' || inc.status === 'scheduled');
    const isUncertain = !isCleared && !isConfirmed;

    if (isCleared) clearedIncome += amt;
    else if (isConfirmed) confirmedIncome += amt;
    else uncertainIncome += amt;

    const cat = inc.category || inc.source || 'General';
    incomeCategoriesMap[cat] = (incomeCategoriesMap[cat] || 0) + amt;

    const src = inc.source || 'Direct';
    incomeSourcesMap[src] = (incomeSourcesMap[src] || 0) + amt;

    return {
      id: inc.id,
      title: inc.title || 'Income Entry',
      source: inc.source || 'Direct',
      category: cat,
      amount: amt,
      expectedDate: safeDate(inc.expectedDate),
      actualDate: inc.actualDate ? safeDate(inc.actualDate) : null,
      status: inc.status || 'expected',
      recurring: inc.recurring || 'none',
      isCleared,
      isConfirmed,
      isUncertain,
      notes: inc.notes || ''
    };
  });

  const incomeByCategory = Object.entries(incomeCategoriesMap).map(([category, total]) => ({
    category,
    total,
    percentage: totalGrossIncome > 0 ? Math.round((total / totalGrossIncome) * 100) : 0
  })).sort((a, b) => b.total - a.total);

  const certaintyRatio = totalGrossIncome > 0
    ? Math.round(((clearedIncome + confirmedIncome) / totalGrossIncome) * 100)
    : 0;

  // 5. Expense Intelligence & Breakdown
  let totalCommittedExpenses = 0;
  let paidExpenses = 0;
  let unpaidExpenses = 0;
  let overdueExpenses = 0;
  let essentialObligations = 0;
  let discretionarySpending = 0;
  let recurringCommitments = 0;
  let emiCommitments = 0;
  let overdueCount = 0;

  const expenseCategoriesMap = {};

  const sanitizedExpenses = expenses.map(exp => {
    const amt = Number(exp.amount || 0);
    totalCommittedExpenses += amt;

    const isPaid = exp.status === 'paid' || Boolean(exp.paidDate);
    const dueDateStr = safeDate(exp.dueDate);
    const isOverdue = !isPaid && dueDateStr < todayStr;

    if (isPaid) paidExpenses += amt;
    else {
      unpaidExpenses += amt;
      if (isOverdue) {
        overdueExpenses += amt;
        overdueCount++;
      }
    }

    const isEssential = exp.isEssential === true || exp.priority === 'critical' ||
      /rent|utilities|grocery|groceries|health|insurance|medical|emi|loan/i.test(exp.category || '') ||
      /rent|utilities|insurance|emi|loan/i.test(exp.title || '');

    if (isEssential) essentialObligations += amt;
    else discretionarySpending += amt;

    const isRecurring = Boolean(exp.recurring && exp.recurring !== 'none') || exp.isRecurring === true;
    if (isRecurring) recurringCommitments += amt;

    const isEMI = exp.isEMI === true ||
      /emi|loan|mortgage|car loan|home loan/i.test(exp.title || '') ||
      /emi|loan|mortgage/i.test(exp.category || '');
    if (isEMI) emiCommitments += amt;

    const cat = exp.category || 'General';
    expenseCategoriesMap[cat] = (expenseCategoriesMap[cat] || 0) + amt;

    return {
      id: exp.id,
      title: exp.title || 'Expense Entry',
      category: cat,
      amount: amt,
      dueDate: dueDateStr,
      paidDate: exp.paidDate ? safeDate(exp.paidDate) : null,
      status: isPaid ? 'paid' : (isOverdue ? 'overdue' : (exp.status || 'unpaid')),
      isPaid,
      isOverdue,
      isEssential,
      isRecurring,
      isEMI,
      priority: exp.priority || (isEssential ? 'high' : 'medium'),
      lateFee: Number(exp.lateFee || 0),
      gracePeriod: Number(exp.gracePeriod || 0),
      notes: exp.notes || ''
    };
  });

  const expensesByCategory = Object.entries(expenseCategoriesMap).map(([category, total]) => ({
    category,
    total,
    percentage: totalCommittedExpenses > 0 ? Math.round((total / totalCommittedExpenses) * 100) : 0
  })).sort((a, b) => b.total - a.total);

  const essentialRatio = totalCommittedExpenses > 0
    ? Math.round((essentialObligations / totalCommittedExpenses) * 100)
    : 0;
  const discretionaryRatio = 100 - essentialRatio;

  // 6. Net Savings, Savings Rate & Expense-to-Income
  const netSavings = clearedIncome - paidExpenses;
  const projectedNet = totalGrossIncome - totalCommittedExpenses;

  // Actual realized savings rate
  const savingsRate = clearedIncome > 0
    ? Math.round((netSavings / clearedIncome) * 100)
    : (clearedIncome === 0 && paidExpenses > 0 ? -100 : 0);

  // Projected savings rate
  const projectedSavingsRate = totalGrossIncome > 0
    ? Math.round((projectedNet / totalGrossIncome) * 100)
    : (totalGrossIncome === 0 && totalCommittedExpenses > 0 ? -100 : 0);

  // Expense-to-income ratio (realized & projected)
  const expenseToIncomeRatio = clearedIncome > 0
    ? Math.round((paidExpenses / clearedIncome) * 100)
    : (paidExpenses > 0 ? 100 : 0);

  const projectedExpenseToIncomeRatio = totalGrossIncome > 0
    ? Math.round((totalCommittedExpenses / totalGrossIncome) * 100)
    : (totalCommittedExpenses > 0 ? 100 : 0);

  // 7. Daily & Monthly Averages
  const effectiveDays = horizonDays || 90;
  const dailyAverageExpenses = Math.round(totalCommittedExpenses / effectiveDays);
  const monthlyAverageExpenses = Math.round((totalCommittedExpenses / effectiveDays) * 30);
  const dailyAverageIncome = Math.round(totalGrossIncome / effectiveDays);
  const monthlyAverageIncome = Math.round((totalGrossIncome / effectiveDays) * 30);

  // Monthly Essential Outflow / Burn Rate
  const monthlyEssentialBurn = Math.max(
    1000,
    essentialObligations > 0 ? essentialObligations : Math.round(totalCommittedExpenses * 0.7)
  );

  const runwayMonths = monthlyEssentialBurn > 0
    ? Number((availableCash / monthlyEssentialBurn).toFixed(1))
    : (availableCash > 0 ? 12.0 : 0);

  // Safety buffer coverage
  const bufferCoverageRatio = safetyBuffer > 0 ? availableCash / safetyBuffer : 1;
  const bufferCoveragePercent = Math.min(200, Math.round(bufferCoverageRatio * 100));
  const bufferStatus = bufferCoverageRatio >= 1.0 ? 'healthy' : bufferCoverageRatio >= 0.5 ? 'warning' : 'critical';

  // 8. Deterministic Financial Health Score (0 - 100)
  let healthScore = 0;
  if (savingsRate >= 30) healthScore += 30;
  else if (savingsRate > 0) healthScore += Math.round((savingsRate / 30) * 30);

  if (runwayMonths >= 6) healthScore += 30;
  else if (runwayMonths >= 3) healthScore += 20 + Math.round(((runwayMonths - 3) / 3) * 10);
  else if (runwayMonths > 0) healthScore += Math.round((runwayMonths / 3) * 20);

  if (bufferCoverageRatio >= 1.0) healthScore += 20;
  else healthScore += Math.round(bufferCoverageRatio * 20);

  const overduePenalty = overdueCount * 10;
  healthScore += Math.max(0, 20 - overduePenalty);
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  // 9. PHASE 3 ADVANCED ENGINES:
  // A. Unusual Expense Detection (Anomalies)
  const unusualExpenses = detectUnusualExpenses(sanitizedExpenses);

  // B. Recurring Expense Detection
  const recurringExpenses = detectRecurringExpenses(sanitizedExpenses);

  // C. Month-over-Month Historical Analysis
  const monthOverMonth = calculateMonthOverMonthComparison(rawIncomes, rawExpenses);

  // D. Category Budget Utilization
  const budgetUtilization = calculateBudgetUtilization(sanitizedExpenses, preferences.expenseBudgets);

  // E. Duplicate Transaction Detection
  const allTxForDuplicates = [
    ...sanitizedIncomes.map(i => ({ ...i, type: 'income', date: i.actualDate || i.expectedDate })),
    ...sanitizedExpenses.map(e => ({ ...e, type: 'expense', date: e.paidDate || e.dueDate }))
  ];
  const duplicateWarnings = detectDuplicateTransactions(allTxForDuplicates);

  // F. Deterministic Actionable Recommendations
  const recommendations = generateRecommendations({
    savingsRate,
    expenseToIncomeRatio,
    runwayMonths,
    essentialRatio,
    certaintyRatio,
    overdueCount,
    unusualExpenses
  });

  // 10. Unified Chronological Transaction Ledger
  const transactions = allTxForDuplicates.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const upcomingBills = sanitizedExpenses
    .filter(e => !e.isPaid && e.dueDate >= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const overdueBills = sanitizedExpenses
    .filter(e => e.isOverdue)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // 11. Return Complete Authoritative Report with Distinct Actual vs Forecast vs Estimates
  return {
    meta: {
      userId,
      generatedAt: new Date().toISOString(),
      horizon,
      todayStr,
      engineVersion: '3.0.0-deterministic'
    },
    // Distinct Category: Actual Realized Values
    actual: {
      clearedIncome,
      paidExpenses,
      netSavings,
      savingsRate,
      expenseToIncomeRatio,
      availableCash,
      grossCash,
      designatedSavings
    },
    // Distinct Category: Forecast / Projected Values
    forecast: {
      totalGrossIncome,
      confirmedIncome,
      uncertainIncome,
      certaintyRatio,
      totalCommittedExpenses,
      unpaidExpenses,
      overdueExpenses,
      overdueCount,
      projectedNet,
      projectedSavingsRate,
      projectedExpenseToIncomeRatio
    },
    // Distinct Category: Estimates & Benchmarks
    estimates: {
      dailyAverageExpenses,
      monthlyAverageExpenses,
      dailyAverageIncome,
      monthlyAverageIncome,
      monthlyEssentialBurn,
      runwayMonths,
      safetyBuffer,
      bufferCoveragePercent,
      bufferStatus,
      healthScore
    },
    // Distinct Category: Actionable Recommendations
    recommendations,
    // Deep Analytical Subsystems
    spending: {
      essentialObligations,
      discretionarySpending,
      essentialRatio,
      discretionaryRatio,
      recurringCommitments,
      emiCommitments,
      expensesByCategory,
      incomeByCategory,
      unusualExpenses,
      recurringExpenses,
      budgetUtilization
    },
    trends: {
      monthOverMonth
    },
    integrity: {
      duplicateWarnings
    },
    obligations: {
      upcomingBills,
      overdueBills
    },
    // Backwards compatibility layer for Phase 2 consumers
    overview: {
      availableCash,
      grossCash,
      designatedSavings,
      safetyBuffer,
      bufferCoveragePercent,
      bufferStatus,
      totalGrossIncome,
      clearedIncome,
      confirmedIncome,
      uncertainIncome,
      certaintyRatio,
      totalCommittedExpenses,
      paidExpenses,
      unpaidExpenses,
      overdueExpenses,
      overdueCount,
      netSavings,
      projectedNet,
      savingsRate,
      expenseToIncomeRatio,
      dailyAverageExpenses,
      monthlyAverageExpenses,
      monthlyEssentialBurn,
      runwayMonths,
      healthScore
    },
    transactions,
    incomes: sanitizedIncomes,
    expenses: sanitizedExpenses
  };
}

export const analyzerService = {
  getUserAnalyzerData,
  detectUnusualExpenses,
  detectRecurringExpenses,
  detectDuplicateTransactions,
  calculateMonthOverMonthComparison,
  calculateBudgetUtilization,
  generateRecommendations
};

export default analyzerService;
