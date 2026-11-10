/**
 * UNCERTAIN INCOME PLANNER — SHARED FINANCIAL CALCULATION ENGINE
 * 
 * Authoritative financial math service for irregular income planning.
 * Guarantees mathematical correctness, avoids double-counting, clamps safe-to-spend,
 * and powers date-aware cash flow projections.
 */

// Formats number to Indian Currency (e.g. ₹1,25,000)
export function formatINR(amount, includeDecimals = false) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  }).format(absVal);

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

// Parses ISO date string (YYYY-MM-DD) safely
export function parseDate(dateStr) {
  if (!dateStr) return new Date();
  if (typeof dateStr !== 'string') {
    return dateStr instanceof Date ? new Date(dateStr.getTime()) : new Date(dateStr);
  }
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

// Formats date to YYYY-MM-DD
export function toISODate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Adds days to a date string YYYY-MM-DD
export function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + Number(days));
  return toISODate(d);
}

// Calculates difference in days between two date strings (b - a)
export function diffInDays(dateStrA, dateStrB) {
  const a = parseDate(dateStrA);
  const b = parseDate(dateStrB);
  const diffTime = b.getTime() - a.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 1. Calculate Actual Cash Balance
 * Balance = Starting Balance + all 'received' income - all 'paid' expenses - designated savings reserve
 */
export function calculateCurrentBalance(startingBalance, incomes = [], expenses = [], designatedSavings = 0) {
  const totalReceived = incomes
    .filter(inc => inc.status === 'received')
    .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

  const totalPaid = expenses
    .filter(exp => exp.status === 'paid')
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
 * 2. Calculate Safe-to-Spend Today
 * 
 * Conservative Baseline:
 * Available Cash
 * - Essential unpaid obligations before next reliable confirmed income (or within horizon)
 * - Other committed expenses in the planning horizon
 * - Minimum safety buffer
 * = Remaining spendable amount (clamped to 0).
 */
export function calculateSafeToSpend({
  availableCash = 0,
  incomes = [],
  expenses = [],
  safetyBuffer = 25000,
  horizonDays = 30,
  currentDateStr = toISODate(new Date()),
  scenario = 'conservative',
  includeDiscretionary = true
}) {
  const horizonEndDate = addDays(currentDateStr, horizonDays);

  // Find next reliable confirmed income date within horizon
  const upcomingConfirmed = incomes
    .filter(inc => inc.status === 'confirmed' && inc.expectedDate >= currentDateStr)
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));

  const nextIncome = upcomingConfirmed[0];
  const nextIncomeDate = nextIncome ? nextIncome.expectedDate : horizonEndDate;

  // Obligations due before next reliable income (or horizon if no income)
  const unpaidExpenses = expenses.filter(exp => exp.status !== 'paid');

  // Essential obligations before next reliable income
  const essentialBeforeIncome = unpaidExpenses
    .filter(exp => exp.isEssential && exp.dueDate <= nextIncomeDate && exp.dueDate >= currentDateStr)
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  // Other committed obligations within planning horizon
  const otherCommittedInHorizon = unpaidExpenses
    .filter(exp => {
      const inHorizon = exp.dueDate <= horizonEndDate && exp.dueDate >= currentDateStr;
      if (!inHorizon) return false;
      if (exp.isEssential && exp.dueDate <= nextIncomeDate) return false; // already counted above
      if (!includeDiscretionary && !exp.isEssential) return false;
      return true;
    })
    .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  const totalObligationsProtected = essentialBeforeIncome + otherCommittedInHorizon;

  // Eligible future income in horizon (if expected scenario selected)
  let eligibleFutureIncome = 0;
  if (scenario === 'expected') {
    eligibleFutureIncome = upcomingConfirmed
      .filter(inc => inc.expectedDate <= horizonEndDate)
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
  } else if (scenario === 'optimistic') {
    const upcomingUncertain = incomes
      .filter(inc => inc.status === 'uncertain' && inc.expectedDate >= currentDateStr && inc.expectedDate <= horizonEndDate)
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    eligibleFutureIncome = upcomingConfirmed
      .filter(inc => inc.expectedDate <= horizonEndDate)
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0) + upcomingUncertain;
  }

  // Pure conservative safe-to-spend: Available cash - obligations - buffer
  const rawSpendable = (availableCash + (scenario === 'conservative' ? 0 : eligibleFutureIncome * 0.5)) 
    - totalObligationsProtected 
    - Number(safetyBuffer || 0);

  const safeToSpendToday = Math.max(0, rawSpendable);
  const projectedShortfall = rawSpendable < 0 ? Math.abs(rawSpendable) : 0;

  return {
    safeToSpendToday,
    rawSpendable,
    projectedShortfall,
    availableCash,
    essentialBeforeIncome,
    otherCommittedInHorizon,
    totalObligationsProtected,
    safetyBuffer: Number(safetyBuffer || 0),
    eligibleFutureIncome,
    nextIncomeDate: nextIncome ? nextIncome.expectedDate : null,
    nextIncomeAmount: nextIncome ? Number(nextIncome.amount) : 0,
    nextIncomeTitle: nextIncome ? nextIncome.title : 'None scheduled',
    horizonDays,
    scenario
  };
}

/**
 * 3. Daily Cash-Flow Forecast Engine
 * Generates day-by-day projected balance for N days (7, 14, 30, 60, 90).
 * Supports Conservative, Expected, and Optimistic scenarios, plus simulated delay overrides.
 */
export function generateCashFlowForecast({
  availableCash = 0,
  incomes = [],
  expenses = [],
  safetyBuffer = 25000,
  days = 30,
  startDateStr = toISODate(new Date()),
  scenario = 'expected',
  delayConfig = null // { incomeId, delayDays, unexpectedExpense, incomeReductionPct }
}) {
  const forecast = [];
  let runningBalance = Number(availableCash || 0);
  let minimumBalance = runningBalance;
  let firstLowBufferDate = null;
  let firstNegativeDate = null;
  let maxShortfall = 0;
  let daysBelowBuffer = 0;
  let daysNegative = 0;

  // Process income copy with potential delay simulation
  const processedIncomes = incomes.map(inc => {
    let expectedDate = inc.expectedDate;
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

  // Check for unexpected simulated expense on Day 1
  const simUnexpectedExpense = (delayConfig && delayConfig.unexpectedExpense) ? Number(delayConfig.unexpectedExpense) : 0;

  for (let i = 0; i <= days; i++) {
    const currentDate = addDays(startDateStr, i);
    const dayIncomes = [];
    const dayExpenses = [];

    // On day 1 of simulation, add unexpected expense if present
    if (i === 1 && simUnexpectedExpense > 0) {
      dayExpenses.push({
        id: 'sim_unexpected',
        title: 'Unexpected Expense (Simulated)',
        amount: simUnexpectedExpense,
        isEssential: true,
        category: 'Emergency'
      });
      runningBalance -= simUnexpectedExpense;
    }

    // Filter incomes arriving on this date
    processedIncomes.forEach(inc => {
      // If already received in past, it's already in starting availableCash
      if (inc.status === 'received') return;

      if (inc.expectedDate === currentDate) {
        if (inc.status === 'confirmed') {
          // Included in expected & optimistic scenarios; excluded in conservative
          if (scenario === 'expected' || scenario === 'optimistic') {
            dayIncomes.push(inc);
            runningBalance += inc.effectiveAmount;
          }
        } else if (inc.status === 'uncertain') {
          // Included ONLY in optimistic scenario
          if (scenario === 'optimistic') {
            dayIncomes.push(inc);
            runningBalance += inc.effectiveAmount;
          }
        }
      }
    });

    // Filter unpaid expenses due on this date
    expenses.forEach(exp => {
      if (exp.status !== 'paid' && exp.dueDate === currentDate) {
        dayExpenses.push(exp);
        runningBalance -= Number(exp.amount || 0);
      }
    });

    // Check thresholds
    const isBelowBuffer = runningBalance < safetyBuffer;
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
      closingBalance: runningBalance,
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
  scenario = 'expected'
}) {
  // Baseline (without delay)
  const baseline = generateCashFlowForecast({
    availableCash,
    incomes,
    expenses,
    safetyBuffer,
    days: 45,
    scenario
  });

  // Simulated (with delay config)
  const simulated = generateCashFlowForecast({
    availableCash,
    incomes,
    expenses,
    safetyBuffer,
    days: 45,
    scenario,
    delayConfig
  });

  // Find contributing bills during the shortage window
  const contributingBills = [];
  if (simulated.firstLowBufferDate || simulated.firstNegativeDate) {
    const shortageStartDate = simulated.firstNegativeDate || simulated.firstLowBufferDate;
    expenses.forEach(exp => {
      if (exp.status !== 'paid' && exp.dueDate >= shortageStartDate && exp.dueDate <= addDays(shortageStartDate, 14)) {
        contributingBills.push(exp);
      }
    });
  }

  // Actionable recommendations
  const recommendations = [];
  if (simulated.maxShortfall > 0) {
    recommendations.push({
      id: 'rec_shortfall',
      type: 'critical',
      title: `Cover ₹${formatINR(simulated.maxShortfall)} peak deficit`,
      detail: `Your balance goes negative on ${simulated.firstNegativeDate}. Defer non-critical expenses or negotiate payment dates.`
    });
  }

  if (simulated.daysBelowBuffer > 0) {
    recommendations.push({
      id: 'rec_buffer',
      type: 'warning',
      title: `Safety buffer compromised for ${simulated.daysBelowBuffer} days`,
      detail: `Balance drops below ₹${formatINR(safetyBuffer)} safety cushion starting ${simulated.firstLowBufferDate}.`
    });
  }

  // Look for discretionary bills that can be postponed
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
 * 5. Smart Bill Prioritization Engine
 * Ranks unpaid bills by urgency, penalties, essential status, and shortage impact.
 */
export function rankBills(expenses = [], availableCash = 0, currentDateStr = toISODate(new Date())) {
  const unpaid = expenses.filter(exp => exp.status !== 'paid');

  const scoredBills = unpaid.map(bill => {
    let score = 0;
    const reasons = [];
    const daysUntilDue = diffInDays(currentDateStr, bill.dueDate);
    const isOverdue = daysUntilDue < 0;

    // Factor 1: Overdue status & due date proximity
    if (isOverdue) {
      score += 100 + Math.abs(daysUntilDue) * 5;
      reasons.push(`Overdue by ${Math.abs(daysUntilDue)} days`);
    } else if (daysUntilDue <= 3) {
      score += 70;
      reasons.push(`Due in ${daysUntilDue === 0 ? 'today' : daysUntilDue + ' days'}`);
    } else if (daysUntilDue <= 7) {
      score += 40;
      reasons.push(`Due in ${daysUntilDue} days`);
    } else {
      score += 10;
      reasons.push(`Due on ${bill.dueDate}`);
    }

    // Factor 2: Loan / EMI obligations (credit score impact)
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

    // Factor 4: Late payment penalties
    const lateFee = Number(bill.lateFee || 0);
    if (lateFee > 0) {
      score += 25;
      reasons.push(`Late penalty of ₹${formatINR(lateFee)} applies if missed`);
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

    // Projected effect on balance
    const postPaymentBalance = availableCash - Number(bill.amount || 0);

    // Suggested next action
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

  // Sort descending by priority score
  scoredBills.sort((a, b) => b.score - a.score);

  // Top 3 actionable recommendations
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
 * 6. Lean-Week Savings Buffer Planner
 * Inputs:
 * - Number of weeks to prepare for (e.g. 4 weeks)
 * - Expected low-income amount per week (e.g. ₹5,000)
 * - Essential weekly expenses (e.g. ₹12,000)
 * - Current designated reserve (e.g. ₹14,000)
 */
export function calculateLeanWeekSavings({
  weeks = 4,
  expectedLowIncomePerWeek = 5000,
  essentialWeeklyExpenses = 12000,
  currentDesignatedReserve = 14000,
  weeklyContribution = 3000
}) {
  const numWeeks = Number(weeks || 1);
  const lowIncome = Number(expectedLowIncomePerWeek || 0);
  const weeklyExpenses = Number(essentialWeeklyExpenses || 0);
  const currentReserve = Number(currentDesignatedReserve || 0);
  const contribution = Number(weeklyContribution || 0);

  // Weekly deficit = max(0, essential weekly expenses - expected low income)
  const weeklyDeficit = Math.max(0, weeklyExpenses - lowIncome);

  // Target reserve = weekly deficit * selected weeks
  const targetReserve = weeklyDeficit * numWeeks;

  // Remaining goal = max(0, target reserve - existing designated reserve)
  const remainingGoal = Math.max(0, targetReserve - currentReserve);

  // Progress percentage (capped at 100%)
  const progressPct = targetReserve > 0 ? Math.min(100, Math.round((currentReserve / targetReserve) * 100)) : 100;

  // Estimated weeks to reach goal
  const weeksToGoal = (contribution > 0 && remainingGoal > 0) ? Math.ceil(remainingGoal / contribution) : 0;

  return {
    numWeeks,
    expectedLowIncomePerWeek: lowIncome,
    essentialWeeklyExpenses: weeklyExpenses,
    weeklyDeficit,
    targetReserve,
    currentDesignatedReserve: currentReserve,
    remainingGoal,
    weeklyContribution: contribution,
    progressPct,
    weeksToGoal,
    isFullyFunded: remainingGoal === 0
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
  const currentDateStr = toISODate(new Date());
  const unpaidExpenses = expenses.filter(exp => exp.status !== 'paid');
  const overdueBills = unpaidExpenses.filter(exp => exp.dueDate < currentDateStr);
  const billsIn7Days = unpaidExpenses.filter(exp => exp.dueDate >= currentDateStr && exp.dueDate <= addDays(currentDateStr, 7));
  const confirmedIncomes = incomes.filter(inc => inc.status === 'confirmed');

  // Prominent single financial insight
  let primaryInsight = {
    title: 'Cash Flow Stable',
    message: 'Your current balance comfortably covers all planned essential expenses over the next 14 days.',
    type: 'positive'
  };

  const detectedDeficitDate = firstNegativeDate || (forecast || []).find(f => f.balance < 0)?.date;
  const detectedLowBufferDate = firstLowBufferDate || (forecast || []).find(f => f.balance < safetyBuffer)?.date;

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
    primaryInsight = {
      title: `${overdueBills.length} Bill${overdueBills.length > 1 ? 's' : ''} Overdue`,
      message: `You have overdue commitments totaling ${formatINR(overdueBills.reduce((s, b) => s + Number(b.amount || 0), 0))}. Settle immediately to avoid penalties.`,
      type: 'danger'
    };
  } else if (confirmedIncomes.length > 0) {
    const nextInc = confirmedIncomes.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))[0];
    primaryInsight = {
      title: 'Next Confirmed Payout',
      message: `${formatINR(nextInc.amount)} from ${nextInc.title} expected on ${nextInc.expectedDate}.`,
      type: 'positive'
    };
  }

  // Exactly up to 3 high-priority alerts
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

  // Fallback alert if everything is calm
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
