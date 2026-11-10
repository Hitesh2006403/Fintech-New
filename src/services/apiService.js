/**
 * UNCERTAIN INCOME PLANNER — CLIENT API SERVICE
 * Connects the frontend to user-isolated backend endpoints (/api/financials, etc.)
 * with automatic fallback to user-scoped local storage when offline.
 */

import { getAuthHeaders } from './authService.js';
import {
  INITIAL_PREFERENCES,
  INITIAL_INCOMES,
  INITIAL_EXPENSES,
  INITIAL_LEAN_SAVINGS,
  INITIAL_NOTIFICATIONS
} from './storageService.js';

function resolveApiBase() {
  let root = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
  root = root.replace(/\/:path\*?/g, '').replace(/:path\*?/g, '').replace(/\/\*+$/, '').trim().replace(/\/+$/, '');
  if (root.endsWith('/api')) {
    root = root.slice(0, -4);
  }
  return root ? `${root}/api` : `/api`;
}

const API_BASE = resolveApiBase();

function getUserStorageKey(userId, key) {
  return `uip_${userId || 'guest'}_${key}`;
}

function getLocalPartition(userId) {
  try {
    const raw = localStorage.getItem(`uip_partition_${userId || 'guest'}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    preferences: { ...INITIAL_PREFERENCES },
    incomes: [...INITIAL_INCOMES],
    expenses: [...INITIAL_EXPENSES],
    savingsGoals: { ...INITIAL_LEAN_SAVINGS },
    notifications: [...INITIAL_NOTIFICATIONS],
    scenarios: []
  };
}

function saveLocalPartition(userId, data) {
  try {
    localStorage.setItem(`uip_partition_${userId || 'guest'}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Local partition save error:', e);
  }
}

export const apiService = {
  /**
   * Fetches the complete, user-isolated financial dataset
   */
  async getFinancials(userId) {
    try {
      const res = await fetch(`${API_BASE}/financials`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          saveLocalPartition(userId, json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn('API /financials network error, using local partition:', err);
    }
    return getLocalPartition(userId);
  },

  /**
   * Updates user preferences (starting balance, safety buffer, default horizon)
   */
  async updatePreferences(userId, prefs) {
    try {
      const res = await fetch(`${API_BASE}/preferences`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(prefs)
      });
      if (res.ok) {
        const json = await res.json();
        return json.preferences;
      }
    } catch (err) {
      console.warn('Update preferences network error:', err);
    }
    const part = getLocalPartition(userId);
    part.preferences = { ...part.preferences, ...prefs };
    saveLocalPartition(userId, part);
    return part.preferences;
  },

  /**
   * Records a new income item
   */
  async addIncome(userId, incomeData) {
    try {
      const res = await fetch(`${API_BASE}/incomes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(incomeData)
      });
      if (res.ok) {
        const json = await res.json();
        return json.income;
      }
    } catch (err) {
      console.warn('Add income network error:', err);
    }
    const part = getLocalPartition(userId);
    const newInc = {
      ...incomeData,
      id: `inc_${Date.now()}`,
      amount: Number(incomeData.amount || 0)
    };
    part.incomes.unshift(newInc);
    saveLocalPartition(userId, part);
    return newInc;
  },

  /**
   * Updates an existing income item
   */
  async updateIncome(userId, id, updates) {
    try {
      const res = await fetch(`${API_BASE}/incomes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const json = await res.json();
        return json.income;
      }
    } catch (err) {
      console.warn('Update income network error:', err);
    }
    const part = getLocalPartition(userId);
    part.incomes = part.incomes.map(i => i.id === id ? { ...i, ...updates } : i);
    saveLocalPartition(userId, part);
    return part.incomes.find(i => i.id === id);
  },

  /**
   * Deletes an income item
   */
  async deleteIncome(userId, id) {
    try {
      await fetch(`${API_BASE}/incomes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Delete income network error:', err);
    }
    const part = getLocalPartition(userId);
    part.incomes = part.incomes.filter(i => i.id !== id);
    saveLocalPartition(userId, part);
    return true;
  },

  /**
   * Records a new expense or bill
   */
  async addExpense(userId, expenseData) {
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(expenseData)
      });
      if (res.ok) {
        const json = await res.json();
        return json.expense;
      }
    } catch (err) {
      console.warn('Add expense network error:', err);
    }
    const part = getLocalPartition(userId);
    const newExp = {
      ...expenseData,
      id: `exp_${Date.now()}`,
      amount: Number(expenseData.amount || 0),
      status: expenseData.status || 'unpaid'
    };
    part.expenses.unshift(newExp);
    saveLocalPartition(userId, part);
    return newExp;
  },

  /**
   * Updates an existing expense or bill
   */
  async updateExpense(userId, id, updates) {
    try {
      const res = await fetch(`${API_BASE}/expenses/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const json = await res.json();
        return json.expense;
      }
    } catch (err) {
      console.warn('Update expense network error:', err);
    }
    const part = getLocalPartition(userId);
    part.expenses = part.expenses.map(e => e.id === id ? { ...e, ...updates } : e);
    saveLocalPartition(userId, part);
    return part.expenses.find(e => e.id === id);
  },

  /**
   * Deletes an expense or bill
   */
  async deleteExpense(userId, id) {
    try {
      await fetch(`${API_BASE}/expenses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Delete expense network error:', err);
    }
    const part = getLocalPartition(userId);
    part.expenses = part.expenses.filter(e => e.id !== id);
    saveLocalPartition(userId, part);
    return true;
  },

  /**
   * Updates lean-week savings targets
   */
  async updateSavings(userId, updates) {
    try {
      const res = await fetch(`${API_BASE}/savings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const json = await res.json();
        return json.savingsGoals;
      }
    } catch (err) {
      console.warn('Update savings network error:', err);
    }
    const part = getLocalPartition(userId);
    part.savingsGoals = { ...part.savingsGoals, ...updates };
    saveLocalPartition(userId, part);
    return part.savingsGoals;
  },

  /**
   * Deposits into designated savings reserve
   */
  async contributeSavings(userId, amount) {
    try {
      const res = await fetch(`${API_BASE}/savings/deposit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        const json = await res.json();
        return json.savingsGoals;
      }
    } catch (err) {
      console.warn('Contribute savings network error:', err);
    }
    const part = getLocalPartition(userId);
    part.savingsGoals.currentDesignatedReserve = (part.savingsGoals.currentDesignatedReserve || 0) + Number(amount || 0);
    saveLocalPartition(userId, part);
    return part.savingsGoals;
  },

  /**
   * Marks a notification as read
   */
  async markNotificationRead(userId, id) {
    try {
      await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
    } catch {}
    const part = getLocalPartition(userId);
    part.notifications = part.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    saveLocalPartition(userId, part);
  },

  /**
   * Marks all notifications as read
   */
  async markAllNotificationsRead(userId) {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
    } catch {}
    const part = getLocalPartition(userId);
    part.notifications = part.notifications.map(n => ({ ...n, isRead: true }));
    saveLocalPartition(userId, part);
  },

  /**
   * Clears all notifications
   */
  async clearNotifications(userId) {
    try {
      await fetch(`${API_BASE}/notifications`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
    } catch {}
    const part = getLocalPartition(userId);
    part.notifications = [];
    saveLocalPartition(userId, part);
  },

  /**
   * Resets current user state to demo data
   */
  async resetToDemo(userId) {
    try {
      const res = await fetch(`${API_BASE}/demo/reset`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        return json.financials;
      }
    } catch (err) {
      console.warn('Demo reset network error:', err);
    }
    const demoData = {
      preferences: { ...INITIAL_PREFERENCES },
      incomes: [...INITIAL_INCOMES],
      expenses: [...INITIAL_EXPENSES],
      savingsGoals: { ...INITIAL_LEAN_SAVINGS },
      notifications: [...INITIAL_NOTIFICATIONS],
      scenarios: []
    };
    saveLocalPartition(userId, demoData);
    return demoData;
  },

  /**
   * Clears user financial data for a fresh start
   */
  async clearUserData(userId) {
    try {
      const res = await fetch(`${API_BASE}/demo/clear`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        return json.financials;
      }
    } catch (err) {
      console.warn('Clear user data network error:', err);
    }
    const emptyData = {
      preferences: { ...INITIAL_PREFERENCES, startingBalance: 0 },
      incomes: [],
      expenses: [],
      savingsGoals: { ...INITIAL_LEAN_SAVINGS, currentDesignatedReserve: 0 },
      notifications: [],
      scenarios: []
    };
    saveLocalPartition(userId, emptyData);
    return emptyData;
  },

  /**
   * Checks database connectivity & status
   */
  async getDatabaseStatus() {
    try {
      const res = await fetch(`${API_BASE}/database/status`);
      if (res.ok) return await res.json();
    } catch {}
    return {
      status: 'offline',
      activeDatabase: 'Browser Local Storage',
      supabaseConfigured: false
    };
  }
};
