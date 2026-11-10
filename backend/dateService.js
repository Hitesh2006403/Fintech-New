/**
 * UNCERTAIN INCOME PLANNER — BACKEND DATE & STATUS SERVICE
 * Mirrors src/services/dateService.js for backend standalone runtime.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

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

export function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + Number(days));
  return toISODate(d);
}

export function diffInDays(dateStrA, dateStrB) {
  const a = parseDate(dateStrA);
  const b = parseDate(dateStrB);
  const diffTime = b.getTime() - a.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function isPastDue(dateStr, currentDateStr = getCurrentLocalDate()) {
  if (!dateStr) return false;
  return toISODate(dateStr) < currentDateStr;
}

export function isDueToday(dateStr, currentDateStr = getCurrentLocalDate()) {
  if (!dateStr) return false;
  return toISODate(dateStr) === currentDateStr;
}

export function isUpcoming(dateStr, currentDateStr = getCurrentLocalDate(), maxDays = 30) {
  if (!dateStr) return false;
  const iso = toISODate(dateStr);
  const maxDate = addDays(currentDateStr, maxDays);
  return iso > currentDateStr && iso <= maxDate;
}

export function getOverdueDays(dateStr, currentDateStr = getCurrentLocalDate()) {
  if (!isPastDue(dateStr, currentDateStr)) return 0;
  return Math.abs(diffInDays(toISODate(dateStr), currentDateStr));
}

export function classifyBillStatus(bill, currentDateStr = getCurrentLocalDate()) {
  if (!bill) return 'upcoming';
  if (bill.status === 'paid' || bill.paidDate) return 'paid';
  const dueDate = toISODate(bill.dueDate);
  if (dueDate < currentDateStr) return 'overdue';
  if (dueDate === currentDateStr) return 'due_today';
  return 'upcoming';
}

export function classifyIncomeStatus(income, currentDateStr = getCurrentLocalDate()) {
  if (!income) return 'uncertain';
  if (income.status === 'received' || income.actualDate) return 'received';
  
  const expectedDate = toISODate(income.expectedDate);
  if (expectedDate < currentDateStr) {
    return 'overdue';
  }
  
  if (income.status === 'confirmed') return 'confirmed';
  if (income.status === 'uncertain') return 'uncertain';
  return income.status || 'confirmed';
}

export function resolveDynamicNotification(notif, expenses = [], incomes = [], leanSavings = {}, today = getCurrentLocalDate()) {
  if (!notif) return notif;

  // Flexible argument handling: allow 4th argument to be currentDateStr
  if (typeof leanSavings === 'string') {
    today = leanSavings;
    leanSavings = {};
  }

  const recId = notif.relatedRecord || notif.referenceId || notif.recordId;

  // Bill / EMI notification
  const bill = (recId && expenses.find(e => e.id === recId)) ||
    expenses.find(e => notif.title?.includes(e.title) || notif.description?.includes(e.title));

  if (bill) {
    const isEMI = bill.category === 'EMI or loan';
    const label = isEMI ? 'EMI' : 'Bill';

    if (bill.status === 'paid' || bill.paidDate) {
      return {
        ...notif,
        title: `${label} Paid & Completed`,
        description: `${bill.title} payment of ₹${bill.amount} was completed.`,
        severity: 'info',
        isPaid: true,
        isOverdue: false
      };
    }
    const dueDate = toISODate(bill.dueDate);
    const daysDiff = diffInDays(today, dueDate); // positive = future, negative = past

    if (daysDiff < 0) {
      const days = Math.abs(daysDiff);
      return {
        ...notif,
        title: `${label} Overdue by ${days} Day${days > 1 ? 's' : ''}`,
        description: `${bill.title} of ₹${bill.amount} was due on ${bill.dueDate}. Settle immediately to avoid penalty.`,
        severity: 'critical',
        isOverdue: true,
        overdueDays: days
      };
    } else if (daysDiff === 0) {
      return {
        ...notif,
        title: `${label} Due Today`,
        description: `${bill.title} of ₹${bill.amount} is due today.`,
        severity: 'critical',
        isDueToday: true,
        isOverdue: false
      };
    } else if (daysDiff <= 3) {
      return {
        ...notif,
        title: `${label} Due in ${daysDiff} Day${daysDiff > 1 ? 's' : ''}`,
        description: `${bill.title} of ₹${bill.amount} is due on ${bill.dueDate}. Auto-debit will trigger.`,
        severity: 'warning',
        isOverdue: false
      };
    } else {
      return {
        ...notif,
        title: `${label} Due in ${daysDiff} Days`,
        description: `${bill.title} of ₹${bill.amount} is due on ${bill.dueDate}.`,
        severity: 'info',
        isOverdue: false
      };
    }
  }

  // Income notification
  const inc = (recId && incomes.find(i => i.id === recId)) ||
    incomes.find(i => notif.title?.includes(i.title) || notif.description?.includes(i.title));

  if (inc) {
    if (inc.status === 'received' || inc.actualDate) {
      return {
        ...notif,
        title: 'Income Received',
        description: `${inc.title} of ₹${inc.amount} received on ${inc.actualDate || inc.expectedDate}.`,
        severity: 'info',
        isReceived: true,
        isOverdue: false
      };
    }
    const expectedDate = toISODate(inc.expectedDate);
    const daysDiff = diffInDays(today, expectedDate);

    if (daysDiff < 0) {
      const days = Math.abs(daysDiff);
      return {
        ...notif,
        title: `Income Overdue by ${days} Day${days > 1 ? 's' : ''}`,
        description: `${inc.title} of ₹${inc.amount} was expected on ${inc.expectedDate}. Check status with client.`,
        severity: 'warning',
        isOverdue: true,
        overdueDays: days
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
