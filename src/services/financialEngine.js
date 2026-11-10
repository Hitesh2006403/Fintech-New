/**
 * UNCERTAIN INCOME PLANNER — SHARED FINANCIAL CALCULATION ENGINE
 * 
 * Authoritative financial math service for irregular income planning.
 * Guarantees mathematical correctness, avoids double-counting, clamps safe-to-spend,
 * powers date-aware cash flow projections, and strictly eliminates duplicate rupee symbols.
 */

import {
  getCurrentLocalDate,
  parseDate,
  toISODate,
  addDays,
  diffInDays,
  isPastDue
} from './dateService.js';

export { getCurrentLocalDate, parseDate, toISODate, addDays, diffInDays, isPastDue };

/**
 * Formats a number or existing formatted string into Indian Currency (e.g. ₹1,25,000).
 * Strictly avoids duplicate rupee symbols (e.g. never outputs ₹₹1,500).
 */
export function formatINR(amount, includeDecimals = false) {
  if (amount === undefined || amount === null) return '₹0';
  
  if (typeof amount === 'string') {
    const trimmed = amount.trim();
    const isNeg = trimmed.startsWith('-') || trimmed.includes('-$') || trimmed.includes('-₹');
    const cleanStr = trimmed.replace(/[^0-9.]/g, '');
    const cleanNum = Number(cleanStr);
    if (!isNaN(cleanNum)) {
      amount = isNeg ? -cleanNum : cleanNum;
    } else {
      return '₹0';
    }
  }

  if (isNaN(amount)) return '₹0';

  const isNegative = Number(amount) < 0;
  const absVal = Math.abs(Number(amount));
  
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  }).format(absVal);

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * 1. Calculate Actual Cash Balance
 * Gross Balance = Starting Balance + all 'received' income - all 'paid' expenses
 * Available Cash = max(0, Gross Cash - designated savings reserve)
 */
export function calculateCurrentBalance(startingBalance, incomes = [], expenses = [], designatedSavings = 0) {
  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const totalReceived = safeIncomes
    .filter(inc => inc && (inc.status === 'received' || inc.actualDate))
    .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

  const totalPaid = safeExpenses
    .filter(exp => exp && (exp.status === 'paid' || exp.paidDate))
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  // Available cash in bank (excluding earmarked designated savings reserve)
  const grossCash = Number(startingBalance || 0) + totalReceived - totalPaid;
  const availableCash = Math.max(0, grossCash - Number(designatedSavings || 0));

  return {
    grossCash,
    availableCash,
    totalReceived,
    totalPaid,
    designatedSavings: Number(designatedSavings || 0)
  };
}

/**
 * 2. Calculate Safe-to-Spend Today (ISSUE 4 FIX)
 * 
 * Consistent Financial Rule:
 * Safe-to-Spend = Available Cash - Safety Buffer - Outstanding Essential Commitments
 * 
 * Crucial: Outstanding Essential Commitments MUST include unpaid overdue essential bills
 * (dueDate < today) as well as upcoming essential obligations before next reliable payout.
 * 
 * Returns transparent breakdown:
 * - availableCash
 * - safetyBuffer
 * - essentialOverdue
 * - upcomingEssential
 * - totalEssentialCommitments
 * - otherCommittedInHorizon
 * - totalObligationsProtected
 * - final safeToSpendToday (clamped to 0)
 */
export function calculateSafeToSpend({
  availableCash = 0,
  incomes = [],
  expenses = [],
  safetyBuffer = 25000,
  earmarkedSavings = 0,
  horizonDays = 30,
  currentDateStr = getCurrentLocalDate(),
  scenario = 'conservative',
  includeDiscretionary = true
}) {
  const today = currentDateStr || getCurrentLocalDate();
  const horizonEndDate = addDays(today, horizonDays);

  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const numEarmarked = Number(earmarkedSavings || 0);

  // Find next reliable confirmed income date within planning horizon
  const upcomingConfirmed = safeIncomes
    .filter(inc => inc && (inc.status === 'confirmed' || inc.status === 'scheduled') && inc.expectedDate >= today)
    .sort((a, b) => (a.expectedDate || '').localeCompare(b.expectedDate || ''));

  const nextIncome = upcomingConfirmed[0];
  const nextIncomeDate = nextIncome ? nextIncome.expectedDate : horizonEndDate;

  // Unpaid bills only (exclude already marked paid)
  const unpaidExpenses = safeExpenses.filter(exp => exp && exp.status !== 'paid' && !exp.paidDate);

  // A. Essential Overdue Commitments (dueDate < today)
  const essentialOverdue = unpaidExpenses
    .filter(exp => exp.isEssential && exp.dueDate < today)
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  // B. Upcoming Essential Commitments before next reliable payout (or horizon)
  const upcomingEssential = unpaidExpenses
    .filter(exp => exp.isEssential && exp.dueDate >= today && exp.dueDate <= nextIncomeDate)
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  // C. Total Outstanding Essential Commitments
  const totalEssentialCommitments = essentialOverdue + upcomingEssential;

  // D. Other Committed Obligations within planning horizon
  const otherCommittedInHorizon = unpaidExpenses
    .filter(exp => {
      const inHorizon = exp.dueDate <= horizonEndDate;
      if (!inHorizon) return false;
      // Already counted in essential commitments above
      if (exp.isEssential && (exp.dueDate < today || exp.dueDate <= nextIncomeDate)) return false;
      // If essential between nextIncomeDate and horizonEndDate
      if (exp.isEssential && exp.dueDate > nextIncomeDate && exp.dueDate <= horizonEndDate) return true;
      // Discretionary expenses (only upcoming within horizon; overdue non-essential bills are excluded from automatic essential deduction)
      if (!exp.isEssential) {
        if (!includeDiscretionary) return false;
        return exp.dueDate >= today;
      }
      return false;
    })
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  const totalObligationsProtected = totalEssentialCommitments + otherCommittedInHorizon;

  // Eligible future income credit
  let eligibleFutureIncome = 0;
  if (scenario === 'expected') {
    eligibleFutureIncome = upcomingConfirmed
      .filter(inc => inc.expectedDate <= horizonEndDate)
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
  } else if (scenario === 'optimistic') {
    const upcomingUncertain = safeIncomes
      .filter(inc => inc.status === 'uncertain' && inc.expectedDate >= today && inc.expectedDate <= horizonEndDate)
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    eligibleFutureIncome = upcomingConfirmed
      .filter(inc => inc.expectedDate <= horizonEndDate)
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0) + upcomingUncertain;
  }

  // Pure conservative calculation
  const rawSpendable = (Number(availableCash || 0) + (scenario === 'conservative' ? 0 : eligibleFutureIncome * 0.5))
    - totalObligationsProtected
    - Number(safetyBuffer || 0)
    - numEarmarked;

  const safeToSpendToday = Math.max(0, rawSpendable);
  const projectedShortfall = rawSpendable < 0 ? Math.abs(rawSpendable) : 0;

  return {
    safeToSpendToday,
    rawSpendable,
    projectedShortfall,
    availableCash: Number(availableCash || 0),
    safetyBuffer: Number(safetyBuffer || 0),
    earmarkedSavings: numEarmarked,
    essentialOverdue,
    upcomingEssential,
    totalEssentialCommitments,
    otherCommittedInHorizon,
    totalObligationsProtected,
    eligibleFutureIncome,
    nextIncomeDate: nextIncome ? nextIncome.expectedDate : null,
    nextIncomeAmount: nextIncome ? Number(nextIncome.amount) : 0,
    nextIncomeTitle: nextIncome ? nextIncome.title : 'None scheduled',
    horizonDays,
    scenario,
    includeDiscretionary
  };
}

/**
 * 3. Daily Cash-Flow Forecast Engine (ISSUE 6 & 3 FIX)
 * Generates day-by-day projected balance from Day 0 (today) to Day N.
 * 
 * Daily Calculation:
 * Opening Balance (Day 1) = Current Available Balance
 * Daily Inflows = sum of eligible scheduled income arriving on that day
 * Daily Outflows = sum of unpaid expenses due on that day
 * Daily Closing Balance = Opening Balance + Daily Inflows - Daily Outflows
 * Next Day Opening Balance = Previous Day Closing Balance
 */
export function generateCashFlowForecast({
  availableCash = 0,
  incomes = [],
  expenses = [],
  safetyBuffer = 25000,
  days = 30,
  startDateStr,
  currentDateStr,
  scenario = 'expected',
  delayConfig = null // { incomeId, delayDays, unexpectedExpense, incomeReductionPct }
}) {
  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const today = currentDateStr || startDateStr || getCurrentLocalDate();

  const forecast = [];
  let runningBalance = Number(availableCash || 0);
  let minimumBalance = runningBalance;
  let firstLowBufferDate = null;
  let firstNegativeDate = null;
  let maxShortfall = 0;
  let daysBelowBuffer = 0;
  let daysNegative = 0;

  // Process income copy with potential simulated delay overrides
  const processedIncomes = safeIncomes.map(inc => {
    let expectedDate = toISODate(inc.expectedDate);
    let amount = Number(inc.amount || 0);

    if (delayConfig && delayConfig.incomeId && inc.id === delayConfig.incomeId) {
      if (delayConfig.delayDays) {
        expectedDate = addDays(expectedDate, delayConfig.delayDays);
      }
      if (delayConfig.incomeReductionPct) {
        amount = amount * (1 - delayConfig.incomeReductionPct / 100);
      }
    }

    return { ...inc, expectedDate, effectiveAmount: amount };
  });

  const simUnexpectedExpense = (delayConfig && delayConfig.unexpectedExpense) ? Number(delayConfig.unexpectedExpense) : 0;

  for (let i = 0; i <= days; i++) {
    const currentDate = addDays(today, i);
    const dayOpeningBalance = runningBalance;
    const dayIncomes = [];
    const dayExpenses = [];

    // On day 1 of delay simulation, inject unexpected expense if present
    if (i === 1 && simUnexpectedExpense > 0) {
      const simExp = {
        id: 'sim_unexpected',
        title: 'Unexpected Expense (Simulated)',
        amount: simUnexpectedExpense,
        isEssential: true,
        category: 'Emergency'
      };
      dayExpenses.push(simExp);
      runningBalance -= simUnexpectedExpense;
    }

    // Filter incomes arriving on this calendar date
    processedIncomes.forEach(inc => {
      // Already received in bank: already counted in starting availableCash
      if (inc.status === 'received' || inc.actualDate) return;

      if (toISODate(inc.expectedDate) === currentDate) {
        if (inc.status === 'confirmed') {
          // Included in expected & optimistic scenarios
          if (scenario === 'expected' || scenario === 'optimistic') {
            dayIncomes.push(inc);
            runningBalance += inc.effectiveAmount;
          }
        } else if (inc.status === 'uncertain') {
          // Excluded from expected and conservative, included in optimistic scenario
          if (scenario === 'optimistic') {
            dayIncomes.push(inc);
            runningBalance += inc.effectiveAmount;
          }
        } else if (scenario === 'optimistic') {
          // Default unreceived speculative income included only in optimistic
          dayIncomes.push(inc);
          runningBalance += inc.effectiveAmount;
        }
      }
    });

    // Filter unpaid expenses due on this calendar date
    safeExpenses.forEach(exp => {
      if (exp.status !== 'paid' && !exp.paidDate && toISODate(exp.dueDate) === currentDate) {
        dayExpenses.push(exp);
        runningBalance -= Number(exp.amount || 0);
      }
    });

    const dayInflowTotal = dayIncomes.reduce((sum, inc) => sum + (inc.effectiveAmount || inc.amount || 0), 0);
    const dayOutflowTotal = dayExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    // Check thresholds
    const isBelowBuffer = runningBalance < Number(safetyBuffer || 0);
    const isNegative = runningBalance < 0;

    if (isBelowBuffer) {
      daysBelowBuffer++;
      if (!firstLowBufferDate) firstLowBufferDate = currentDate;
    }

    if (isNegative) {
      daysNegative++;
      if (!firstNegativeDate) firstNegativeDate = currentDate;
      const shortfall = Math.abs(runningBalance);
      if (shortfall > maxShortfall) maxShortfall = shortfall;
    }

    if (runningBalance < minimumBalance) {
      minimumBalance = runningBalance;
    }

    let status = 'safe';
    if (isNegative) status = 'deficit';
    else if (isBelowBuffer) status = 'low_buffer';

    forecast.push({
      dayIndex: i,
      date: currentDate,
      openingBalance: dayOpeningBalance,
      inflow: dayInflowTotal,
      outflow: dayOutflowTotal,
      closingBalance: runningBalance,
      balance: runningBalance, // Dual key to guarantee chart and report compatibility
      incomes: dayIncomes,
      expenses: dayExpenses,
      isBelowBuffer,
      isNegative,
      status
    });
  }

  return {
    forecast,
    minimumBalance,
    firstLowBufferDate,
    firstNegativeDate,
    maxShortfall,
    daysBelowBuffer,
    daysNegative,
    safetyBuffer: Number(safetyBuffer || 0),
    startingBalance: Number(availableCash || 0),
    daysCount: days,
    scenario
  };
}

/**
 * 4. Payment Delay Simulator
 * Compares baseline forecast vs delayed income scenario.
 */
export function simulatePaymentDelay({
  availableCash = 0,
  incomes = [],
  expenses = [],
  safetyBuffer = 25000,
  delayConfig = { incomeId: '', delayDays: 10, unexpectedExpense: 0, incomeReductionPct: 0 },
  scenario = 'expected',
  startDateStr = null
}) {
  // Determine baseline date: use provided startDateStr or earliest transaction date if before today
  let baseDate = startDateStr;
  if (!baseDate) {
    const today = getCurrentLocalDate();
    const dates = [
      ...incomes.map(i => toISODate(i.expectedDate)),
      ...expenses.map(e => toISODate(e.dueDate))
    ].filter(Boolean);
    if (dates.length > 0) {
      dates.sort();
      baseDate = dates[0] < today ? dates[0] : today;
    } else {
      baseDate = today;
    }
  }

  // Baseline (without delay)
  const baseline = generateCashFlowForecast({
    availableCash,
    incomes,
    expenses,
    safetyBuffer,
    days: 45,
    scenario,
    startDateStr: baseDate
  });

  // Simulated (with delay config)
  const simulated = generateCashFlowForecast({
    availableCash,
    incomes,
    expenses,
    safetyBuffer,
    days: 45,
    scenario,
    delayConfig,
    startDateStr: baseDate
  });

  // Find contributing bills during shortage window
  const contributingBills = [];
  if (simulated.firstLowBufferDate || simulated.firstNegativeDate) {
    const shortageStartDate = simulated.firstNegativeDate || simulated.firstLowBufferDate;
    expenses.forEach(exp => {
      if (exp.status !== 'paid' && !exp.paidDate) {
        const d = toISODate(exp.dueDate);
        if (d >= shortageStartDate && d <= addDays(shortageStartDate, 14)) {
          contributingBills.push(exp);
        }
      }
    });
  }

  // Actionable recommendations
  const recommendations = [];
  if (simulated.maxShortfall > 0) {
    recommendations.push({
      id: 'rec_shortfall',
      type: 'critical',
      title: `Cover ${formatINR(simulated.maxShortfall)} peak deficit`,
      detail: `Your balance goes negative on ${simulated.firstNegativeDate}. Defer non-critical expenses or negotiate payment dates.`
    });
  }

  if (simulated.daysBelowBuffer > 0) {
    recommendations.push({
      id: 'rec_buffer',
      type: 'warning',
      title: `Safety buffer compromised for ${simulated.daysBelowBuffer} days`,
      detail: `Balance drops below ${formatINR(safetyBuffer)} safety cushion starting ${simulated.firstLowBufferDate}.`
    });
  }

  const deferrableBills = contributingBills.filter(b => !b.isEssential);
  if (deferrableBills.length > 0) {
    const totalDeferrable = deferrableBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    recommendations.push({
      id: 'rec_defer',
      type: 'action',
      title: `Postpone discretionary expenses (${formatINR(totalDeferrable)})`,
      detail: `Deferring ${deferrableBills.map(b => b.title).join(', ')} would save ${formatINR(totalDeferrable)} of liquidity.`
    });
  } else {
    recommendations.push({
      id: 'rec_lean_reserve',
      type: 'action',
      title: 'Tap Lean-Week Designated Reserve',
      detail: 'Utilize your pre-saved low-income buffer to avoid late penalties on essential commitments.'
    });
  }

  return {
    baseline,
    simulated,
    contributingBills,
    recommendations,
    delayedIncomeId: delayConfig.incomeId,
    delayDays: delayConfig.delayDays,
    unexpectedExpense: delayConfig.unexpectedExpense
  };
}

/**
 * 5. Smart Bill Prioritization Engine (ISSUE 2 FIX)
 * Ranks unpaid bills by urgency, penalties, essential status, and shortage impact.
 */
export function rankBills(expenses = [], availableCash = 0, currentDateStr = getCurrentLocalDate()) {
  const today = currentDateStr || getCurrentLocalDate();
  const unpaid = (Array.isArray(expenses) ? expenses : []).filter(exp => exp && exp.status !== 'paid' && !exp.paidDate);

  const scoredBills = unpaid.map(bill => {
    let score = 0;
    const reasons = [];
    const dueDate = toISODate(bill.dueDate);
    const daysUntilDue = diffInDays(today, dueDate);
    const isOverdue = daysUntilDue < 0;

    // Factor 1: Overdue status & due date proximity
    if (isOverdue) {
      score += 100 + Math.abs(daysUntilDue) * 5;
      reasons.push(`Overdue by ${Math.abs(daysUntilDue)} days`);
    } else if (daysUntilDue === 0) {
      score += 85;
      reasons.push('Due today');
    } else if (daysUntilDue <= 3) {
      score += 70;
      reasons.push(`Due in ${daysUntilDue} days`);
    } else if (daysUntilDue <= 7) {
      score += 40;
      reasons.push(`Due in ${daysUntilDue} days`);
    } else {
      score += 10;
      reasons.push(`Due on ${dueDate}`);
    }

    // Factor 2: Loan / EMI obligations
    if (bill.category === 'EMI or loan' || bill.category === 'Rent') {
      score += 50;
      reasons.push('High-risk debt/housing obligation with severe credit impact');
    }

    // Factor 3: Essential vs Discretionary
    if (bill.isEssential) {
      score += 30;
      reasons.push('Essential living obligation');
    } else {
      reasons.push('Discretionary expense');
    }

    // Factor 4: Late payment penalties (Format without duplicate ₹)
    const lateFee = Number(bill.lateFee || 0);
    if (lateFee > 0) {
      score += 25;
      reasons.push(`Late penalty of ${formatINR(lateFee)} applies if missed`);
    }

    // Factor 5: Grace period awareness
    const gracePeriod = Number(bill.gracePeriod || 0);
    if (gracePeriod > 0) {
      score -= 10;
      reasons.push(`${gracePeriod}-day grace period available`);
    }

    // Priority Tier
    let priority = 'low';
    if (score >= 120 || isOverdue) priority = 'critical';
    else if (score >= 80) priority = 'high';
    else if (score >= 40) priority = 'medium';

    const postPaymentBalance = Number(availableCash || 0) - Number(bill.amount || 0);

    let suggestedAction = 'Schedule payment';
    if (priority === 'critical') suggestedAction = 'Pay immediately today';
    else if (priority === 'high') suggestedAction = 'Pay before due date to prevent penalty';
    else if (gracePeriod > 0 && daysUntilDue <= 0) suggestedAction = `Utilize ${gracePeriod}-day grace window safely`;
    else if (priority === 'low') suggestedAction = 'Defer if cash buffer is strained';

    return {
      ...bill,
      score,
      priority,
      reasons,
      daysUntilDue,
      isOverdue,
      postPaymentBalance,
      suggestedAction
    };
  });

  scoredBills.sort((a, b) => b.score - a.score);

  const topRecommendations = [];
  const criticalBills = scoredBills.filter(b => b.priority === 'critical');
  const highBills = scoredBills.filter(b => b.priority === 'high');

  if (criticalBills.length > 0) {
    topRecommendations.push({
      title: `Settle ${criticalBills.length} Critical Bill${criticalBills.length > 1 ? 's' : ''}`,
      detail: `Prioritize ${criticalBills.map(b => b.title).join(', ')} to avoid late fees and protect credit standing.`,
      type: 'critical'
    });
  }

  if (highBills.length > 0) {
    topRecommendations.push({
      title: `Plan for ${highBills.length} Upcoming Essential Bill${highBills.length > 1 ? 's' : ''}`,
      detail: `${highBills[0].title} (${formatINR(highBills[0].amount)}) is due shortly.`,
      type: 'warning'
    });
  }

  const deferrable = scoredBills.filter(b => b.priority === 'low');
  if (deferrable.length > 0) {
    topRecommendations.push({
      title: `Defer ${deferrable.length} Discretionary Commitment${deferrable.length > 1 ? 's' : ''}`,
      detail: `Postponing ${deferrable[0].title} saves ${formatINR(deferrable[0].amount)} until your next confirmed invoice arrives.`,
      type: 'info'
    });
  }

  return {
    rankedBills: scoredBills,
    topRecommendations
  };
}

/**
 * 6. Lean-Week Savings Buffer Planner (ISSUE 5 FIX)
 * 
 * Required Formula:
 * Remaining Amount = Target Amount - Funded Amount
 * Weekly Savings Required = Remaining Amount / Remaining Weeks
 * 
 * Edge Cases Handled:
 * - Goal fully funded (remaining <= 0) -> weeklySavingsRequired = 0
 * - No weeks remaining (weeks <= 0) -> weeklySavingsRequired = remainingAmount
 * - Negative remaining amount -> clamped to 0
 * - Missing or invalid goal data -> defaulted safely
 */
export function calculateLeanWeekSavings({
  weeks = 4,
  expectedLowIncomePerWeek = 5000,
  essentialWeeklyExpenses = 12000,
  currentDesignatedReserve = 14000,
  weeklyContribution = 3500
}) {
  const numWeeks = Math.max(0, Number(weeks || 0));
  const lowIncome = Math.max(0, Number(expectedLowIncomePerWeek || 0));
  const weeklyExpenses = Math.max(0, Number(essentialWeeklyExpenses || 0));
  const currentReserve = Math.max(0, Number(currentDesignatedReserve || 0));
  const contribution = Math.max(0, Number(weeklyContribution || 0));

  // Weekly deficit during a dry spell
  const weeklyDeficit = Math.max(0, weeklyExpenses - lowIncome);

  // Target Reserve = Weekly Deficit * Number of Weeks
  const targetReserve = weeklyDeficit * numWeeks;

  // Remaining Amount = Target Amount - Funded Amount
  const remainingGoal = Math.max(0, targetReserve - currentReserve);
  const isFullyFunded = targetReserve > 0 ? currentReserve >= targetReserve : true;

  // Weekly Savings Required = Remaining Amount / Remaining Weeks
  const weeklySavingsRequired = (isFullyFunded || remainingGoal <= 0)
    ? 0
    : (numWeeks > 0 ? Math.ceil(remainingGoal / numWeeks) : remainingGoal);

  // Progress percentage (capped at 100%)
  const progressPct = targetReserve > 0
    ? Math.min(100, Math.round((currentReserve / targetReserve) * 100))
    : 100;

  // Estimated weeks to reach goal at contribution rate
  const effectiveContrib = contribution > 0 ? contribution : weeklySavingsRequired;
  const weeksToGoal = (effectiveContrib > 0 && remainingGoal > 0)
    ? Math.ceil(remainingGoal / effectiveContrib)
    : 0;

  return {
    numWeeks,
    expectedLowIncomePerWeek: lowIncome,
    essentialWeeklyExpenses: weeklyExpenses,
    weeklyDeficit,
    targetReserve,
    currentDesignatedReserve: currentReserve,
    currentReserve,
    fundedAmount: currentReserve,
    remainingGoal,
    remainingAmount: remainingGoal,
    weeklyContribution: contribution,
    weeklySavingsRequired,
    progressPct,
    weeksToGoal,
    isFullyFunded
  };
}

/**
 * 7. Dynamic Financial Insights & Alerts Generator
 * Generates at most 1 prominent financial insight and 3 alerts for the dashboard.
 */
export function generateDashboardInsights({
  availableCash = 0,
  safetyBuffer = 25000,
  incomes = [],
  expenses = [],
  forecast = [],
  firstLowBufferDate = null,
  firstNegativeDate = null
}) {
  const currentDateStr = getCurrentLocalDate();
  const unpaidExpenses = (Array.isArray(expenses) ? expenses : []).filter(exp => exp && exp.status !== 'paid' && !exp.paidDate);
  const overdueBills = unpaidExpenses.filter(exp => toISODate(exp.dueDate) < currentDateStr);
  const billsIn7Days = unpaidExpenses.filter(exp => {
    const d = toISODate(exp.dueDate);
    return d >= currentDateStr && d <= addDays(currentDateStr, 7);
  });
  const confirmedIncomes = (Array.isArray(incomes) ? incomes : []).filter(inc => inc && inc.status === 'confirmed');

  let primaryInsight = {
    title: 'Cash Flow Stable',
    message: 'Your current balance comfortably covers all planned essential expenses over the next 14 days.',
    type: 'positive'
  };

  const detectedDeficitDate = firstNegativeDate || (forecast || []).find(f => (f.closingBalance ?? f.balance ?? 0) < 0)?.date;
  const detectedLowBufferDate = firstLowBufferDate || (forecast || []).find(f => (f.closingBalance ?? f.balance ?? 0) < Number(safetyBuffer || 0))?.date;

  if (availableCash < 0) {
    primaryInsight = {
      title: 'Current Balance Overdrawn',
      message: `Your available balance is currently ${formatINR(availableCash)}. Deposit funds to cover upcoming obligations.`,
      type: 'danger'
    };
  } else if (detectedDeficitDate) {
    primaryInsight = {
      title: 'Projected Cash Shortage',
      message: `Your balance is projected to fall into deficit on ${detectedDeficitDate}. Delay non-essential bills or expedite client invoices.`,
      type: 'danger'
    };
  } else if (detectedLowBufferDate) {
    primaryInsight = {
      title: 'Buffer Warning',
      message: `Your balance may fall below your ${formatINR(safetyBuffer)} safety buffer on ${detectedLowBufferDate}.`,
      type: 'warning'
    };
  } else if (overdueBills.length > 0) {
    const overdueTotal = overdueBills.reduce((s, b) => s + Number(b.amount || 0), 0);
    primaryInsight = {
      title: `${overdueBills.length} Bill${overdueBills.length > 1 ? 's' : ''} Overdue`,
      message: `You have overdue commitments totaling ${formatINR(overdueTotal)}. Settle immediately to avoid penalties.`,
      type: 'danger'
    };
  } else if (confirmedIncomes.length > 0) {
    const nextInc = [...confirmedIncomes].sort((a, b) => (a.expectedDate || '').localeCompare(b.expectedDate || ''))[0];
    primaryInsight = {
      title: 'Next Confirmed Payout',
      message: `${formatINR(nextInc.amount)} from ${nextInc.title} expected on ${nextInc.expectedDate}.`,
      type: 'positive'
    };
  }

  const alerts = [];

  if (availableCash < 0) {
    alerts.push({
      id: 'alert_overdrawn',
      severity: 'critical',
      title: 'Account Overdrawn',
      description: `Immediate shortfall of ${formatINR(Math.abs(availableCash))}. Review expenses immediately.`,
      actionPage: 'income'
    });
  }

  if (overdueBills.length > 0 && alerts.length < 3) {
    alerts.push({
      id: 'alert_overdue',
      severity: 'critical',
      title: 'Overdue Payment Required',
      description: `${overdueBills[0].title} (${formatINR(overdueBills[0].amount)}) was due on ${overdueBills[0].dueDate}.`,
      actionPage: 'expenses'
    });
  }

  if (firstNegativeDate && alerts.length < 3) {
    alerts.push({
      id: 'alert_shortage',
      severity: 'critical',
      title: 'Projected Cash Deficit',
      description: `Deficit projected on ${firstNegativeDate}. Simulate payment delays to test survival.`,
      actionPage: 'simulator'
    });
  }

  if (billsIn7Days.length > 0 && alerts.length < 3) {
    const total7 = billsIn7Days.reduce((s, b) => s + Number(b.amount || 0), 0);
    alerts.push({
      id: 'alert_due_7days',
      severity: 'warning',
      title: `${billsIn7Days.length} Bills Due in 7 Days`,
      description: `Total ${formatINR(total7)} due. Check Safe-to-Spend before making discretionary purchases.`,
      actionPage: 'safe-to-spend'
    });
  }

  if (firstLowBufferDate && alerts.length < 3) {
    alerts.push({
      id: 'alert_buffer',
      severity: 'warning',
      title: 'Safety Buffer Depletion',
      description: `Reserves dip below ${formatINR(safetyBuffer)} safety threshold on ${firstLowBufferDate}.`,
      actionPage: 'forecast'
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'alert_lean_week',
      severity: 'info',
      title: 'Lean-Week Savings on Track',
      description: 'Your reserves are healthy. Consider allocating extra surplus into your emergency buffer.',
      actionPage: 'savings'
    });
  }

  return {
    primaryInsight,
    alerts: alerts.slice(0, 3)
  };
}
