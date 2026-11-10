/**
 * FinSight Navigation Tracker & Setup Wizard Draft Service
 * Manages responsive in-app history tracking, backward/forward navigation,
 * and secure form state persistence across refreshes.
 */

const NAV_STACK_KEY = 'uip_nav_history_stack';
const SETUP_DRAFT_KEY = 'uip_setup_wizard_draft';

export const navigationTracker = {
  /**
   * Retrieve the current session navigation stack.
   */
  getStack() {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return [];
      const data = sessionStorage.getItem(NAV_STACK_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Record a new location in the session history stack.
   * Prevents consecutive duplicate entries.
   */
  record(path) {
    if (!path) return;
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      const stack = this.getStack();
      const currentTop = stack.length > 0 ? stack[stack.length - 1] : null;

      if (currentTop !== path) {
        stack.push(path);
        // Keep maximum 25 entries to preserve memory
        if (stack.length > 25) {
          stack.shift();
        }
        sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack));
      }
    } catch {
      // Graceful fallback for storage quota or privacy restrictions
    }
  },

  /**
   * Determine if the user has navigated within the app during this session.
   */
  canGoBack() {
    return this.getStack().length > 1;
  },

  /**
   * Return the immediate previous in-app route, or null if none exists.
   */
  getPreviousRoute() {
    const stack = this.getStack();
    return stack.length > 1 ? stack[stack.length - 2] : null;
  },

  /**
   * Clear recorded history entries (e.g., upon logout).
   */
  clear() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(NAV_STACK_KEY);
      }
    } catch {
      // Ignored
    }
  },

  /**
   * Unified safe backward navigation helper:
   * If genuine in-app history exists, uses history back;
   * otherwise, navigates to the specified in-app fallback.
   */
  goBack(navigate, fallback = '/dashboard') {
    if (!navigate) return;
    if (this.canGoBack()) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  },

  /**
   * Load setup wizard draft values from sessionStorage.
   */
  loadSetupDraft(fallbackPreferences) {
    const defaults = {
      balance: String(fallbackPreferences?.startingBalance ?? 45000),
      buffer: String(fallbackPreferences?.safetyBuffer ?? 25000),
      frequency: fallbackPreferences?.incomeFrequency || 'Irregular / Milestone-based',
      threshold: String(fallbackPreferences?.lowBalanceAlertThreshold ?? 20000)
    };

    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return defaults;
      const raw = sessionStorage.getItem(SETUP_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          balance: parsed.balance !== undefined && parsed.balance !== '' ? String(parsed.balance) : defaults.balance,
          buffer: parsed.buffer !== undefined && parsed.buffer !== '' ? String(parsed.buffer) : defaults.buffer,
          frequency: parsed.frequency || defaults.frequency,
          threshold: parsed.threshold !== undefined && parsed.threshold !== '' ? String(parsed.threshold) : defaults.threshold
        };
      }
    } catch {
      // Ignore parse errors and use defaults
    }
    return defaults;
  },

  /**
   * Persist current wizard field progress.
   */
  saveSetupDraft(draft) {
    if (!draft) return;
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      sessionStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Clean up wizard draft after successful completion.
   */
  clearSetupDraft() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(SETUP_DRAFT_KEY);
      }
    } catch {
      // Ignored
    }
  }
};
