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
