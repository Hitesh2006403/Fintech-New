/**
 * UNCERTAIN INCOME PLANNER — CENTRALIZED DATE & STATUS SERVICE
 * 
 * Authoritative calendar and transaction status service.
 * Enforces Asia/Kolkata project timezone, eliminates UTC date shifting,
 * handles ISO date conversions, and classifies bill & income statuses dynamically.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current calendar date string in YYYY-MM-DD in the specified timezone (default Asia/Kolkata).
 */
export function getCurrentLocalDate(timeZone = DEFAULT_TIMEZONE) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Safely parses a YYYY-MM-DD string into a local Date without UTC offset shift.
 */
export function parseDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return new Date(dateStr.getTime());
  if (typeof dateStr !== 'string') return new Date(dateStr);
  
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length >= 3) {
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

/**
 * Converts a Date to YYYY-MM-DD string.
 */
export function toISODate(date) {
  if (!date) return getCurrentLocalDate();
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = date instanceof Date ? date : parseDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds N calendar days to a YYYY-MM-DD string.
 */
export function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + Number(days));
  return toISODate(d);
}

/**
 * Calculates calendar day difference between dateStrA and dateStrB (B - A).
 */
export function diffInDays(dateStrA, dateStrB) {
  const a = parseDate(dateStrA);
  const b = parseDate(dateStrB);
  const diffTime = b.getTime() - a.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a date string is earlier than the reference date.
 */
export function isPastDue(dateStr, currentDateStr = getCurrentLocalDate()) {
  if (!dateStr) return false;
  return toISODate(dateStr) < currentDateStr;
}

/**
 * Checks if a date string is equal to the reference date.
 */
export function isDueToday(dateStr, currentDateStr = getCurrentLocalDate()) {
  if (!dateStr) return false;
  return toISODate(dateStr) === currentDateStr;
}

/**
 * Checks if a date string is strictly after the reference date and within maxDays.
 */
export function isUpcoming(dateStr, currentDateStr = getCurrentLocalDate(), maxDays = 30) {
  if (!dateStr) return false;
  const iso = toISODate(dateStr);
  const maxDate = addDays(currentDateStr, maxDays);
  return iso > currentDateStr && iso <= maxDate;
}

/**
 * Calculates overdue duration in days (0 if not overdue).
 */
export function getOverdueDays(dateStr, currentDateStr = getCurrentLocalDate()) {
  if (!isPastDue(dateStr, currentDateStr)) return 0;
  return Math.abs(diffInDays(toISODate(dateStr), currentDateStr));
}

/**
 * Classifies the operational status of an expense/bill:
 * 'paid' | 'overdue' | 'due_today' | 'upcoming'
 */
export function classifyBillStatus(bill, currentDateStr = getCurrentLocalDate()) {
  if (!bill) return 'upcoming';
  if (bill.status === 'paid' || bill.paidDate) return 'paid';
  const dueDate = toISODate(bill.dueDate);
  if (dueDate < currentDateStr) return 'overdue';
  if (dueDate === currentDateStr) return 'due_today';
  return 'upcoming';
}

/**
 * Classifies the operational certainty status of an income milestone:
 * 'received' | 'overdue' | 'confirmed' | 'uncertain'
 */
export function classifyIncomeStatus(income, currentDateStr = getCurrentLocalDate()) {
  if (!income) return 'uncertain';
  if (income.status === 'received' || income.actualDate) return 'received';
  
  const expectedDate = toISODate(income.expectedDate);
  if (expectedDate < currentDateStr) {
    // Expected date has passed and payment has not been received
    return 'overdue';
  }
  
  if (income.status === 'confirmed') return 'confirmed';
  if (income.status === 'uncertain') return 'uncertain';
  return income.status || 'confirmed';
}

/**
 * Dynamically resolves real-time notification titles and descriptions
 * from actual bill/income records and the current local date.
 */
export function resolveDynamicNotification(notif, expenses = [], incomes = [], leanSavings = {}, today = getCurrentLocalDate()) {
  if (!notif) return notif;

  // Bill / EMI notification
  if (notif.relatedRecord && String(notif.relatedRecord).startsWith('exp_')) {
    const bill = expenses.find(e => e.id === notif.relatedRecord);
    if (bill) {
      if (bill.status === 'paid' || bill.paidDate) {
        return {
          ...notif,
          title: 'Payment Completed',
          description: `${bill.title} payment of ₹${bill.amount} was completed.`,
          severity: 'info'
        };
      }
      const dueDate = toISODate(bill.dueDate);
      const daysDiff = diffInDays(today, dueDate); // positive = future, negative = past
      const isEMI = bill.category === 'EMI or loan';
      const label = isEMI ? 'EMI' : 'Bill';

      if (daysDiff < 0) {
        const days = Math.abs(daysDiff);
        return {
          ...notif,
          title: `${label} Overdue by ${days} Day${days > 1 ? 's' : ''}`,
          description: `${bill.title} of ₹${bill.amount} was due on ${bill.dueDate}. Settle immediately to avoid penalty.`,
          severity: 'critical'
        };
      } else if (daysDiff === 0) {
        return {
          ...notif,
          title: `${label} Due Today`,
          description: `${bill.title} of ₹${bill.amount} is due today.`,
          severity: 'critical'
        };
      } else if (daysDiff <= 3) {
        return {
          ...notif,
          title: `${label} Due in ${daysDiff} Day${daysDiff > 1 ? 's' : ''}`,
          description: `${bill.title} of ₹${bill.amount} is due on ${bill.dueDate}. Auto-debit will trigger.`,
          severity: 'warning'
        };
      } else {
        return {
          ...notif,
          title: `${label} Due in ${daysDiff} Days`,
          description: `${bill.title} of ₹${bill.amount} is due on ${bill.dueDate}.`,
          severity: 'info'
        };
      }
    }
  }

  // Income notification
  if (notif.relatedRecord && String(notif.relatedRecord).startsWith('inc_')) {
    const inc = incomes.find(i => i.id === notif.relatedRecord);
    if (inc) {
      if (inc.status === 'received' || inc.actualDate) {
        return {
          ...notif,
          title: 'Income Received',
          description: `${inc.title} of ₹${inc.amount} received on ${inc.actualDate || inc.expectedDate}.`,
          severity: 'info'
        };
      }
      const expDate = toISODate(inc.expectedDate);
      const daysDiff = diffInDays(today, expDate);
      if (daysDiff < 0) {
        const days = Math.abs(daysDiff);
        return {
          ...notif,
          title: `Income Overdue by ${days} Day${days > 1 ? 's' : ''}`,
          description: `${inc.title} (₹${inc.amount}) was expected on ${inc.expectedDate}. Follow up with client.`,
          severity: 'warning'
        };
      } else if (daysDiff === 0) {
        return {
          ...notif,
          title: 'Payout Expected Today',
          description: `${inc.title} (₹${inc.amount}) is expected today.`,
          severity: 'info'
        };
      } else {
        return {
          ...notif,
          title: 'Confirmed Invoice Approaching',
          description: `${inc.title} (₹${inc.amount}) expected on ${inc.expectedDate}. Track in Delay Simulator.`,
          severity: 'info'
        };
      }
    }
  }

  // Lean-Week savings notification
  if (notif.relatedRecord === 'lean_savings' && leanSavings) {
    const weeks = leanSavings.weeks || 4;
    const weeklyDeficit = Math.max(0, (leanSavings.essentialWeeklyExpenses || 12000) - (leanSavings.expectedLowIncomePerWeek || 5000));
    const target = weeklyDeficit * weeks;
    const funded = leanSavings.currentDesignatedReserve || 0;
    const pct = target > 0 ? Math.min(100, Math.round((funded / target) * 100)) : 100;
    return {
      ...notif,
      title: 'Lean-Week Savings Update',
      description: `Your designated reserve is ₹${funded} (${pct}% of your ${weeks}-week target of ₹${target}).`,
      severity: 'info'
    };
  }

  return notif;
}
