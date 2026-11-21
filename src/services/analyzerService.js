/**
 * FINSIGHT — PERSONAL FINANCE ANALYZER FRONTEND CLIENT SERVICE
 *
 * Interacts with the backend Personal Finance Analyzer API (/api/analyzer/*).
 * Enforces strict user privacy:
 * - Never transmits client-specified user IDs.
 * - Identity is derived solely from the server's validated session cookie & Bearer token.
 * - Automatic synchronization on financial record changes.
 */

import { getAuthHeaders } from './authService.js';

function resolveApiBase() {
  let root = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
  root = root.replace(/\/:path\*?/g, '').replace(/:path\*?/g, '').replace(/\/\*+$/, '').trim().replace(/\/+$/, '');
  if (root.endsWith('/api')) {
    root = root.slice(0, -4);
  }
  return root ? `${root}/api` : `/api`;
}

const API_BASE = resolveApiBase();

export const analyzerService = {
  /**
   * Fetches complete, tenant-isolated Analyzer metrics for the currently authenticated user.
   *
   * @param {object} options
   * @param {string} options.horizon - '30' | '90' | '365' | 'all'
   * @returns {Promise<object>} Authoritative analyzer dataset
   */
  async getAnalyzerData({ horizon = 'all' } = {}) {
    try {
      const url = new URL(`${API_BASE}/analyzer/data`, window.location.origin);
      if (horizon && horizon !== 'all') {
        url.searchParams.set('horizon', horizon);
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required to view analyzer intelligence');
        }
        throw new Error(`Analyzer API responded with HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
      throw new Error(json.error || 'Invalid analyzer response payload');
    } catch (err) {
      console.warn('[AnalyzerService] Error fetching live backend metrics:', err.message);
      throw err;
    }
  },

  /**
   * Fetches fast overview KPI summary for cards
   */
  async getAnalyzerSummary({ horizon = 'all' } = {}) {
    try {
      const url = new URL(`${API_BASE}/analyzer/summary`, window.location.origin);
      if (horizon && horizon !== 'all') {
        url.searchParams.set('horizon', horizon);
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.summary || null;
    } catch (err) {
      console.warn('[AnalyzerService] Error fetching summary:', err.message);
      return null;
    }
  },

  /**
   * Fetches combined normalized transactions ledger
   */
  async getAnalyzerTransactions({ horizon = 'all' } = {}) {
    try {
      const url = new URL(`${API_BASE}/analyzer/transactions`, window.location.origin);
      if (horizon && horizon !== 'all') {
        url.searchParams.set('horizon', horizon);
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.transactions || [];
    } catch (err) {
      console.warn('[AnalyzerService] Error fetching transactions:', err.message);
      return [];
    }
  },

  /**
   * Invokes the server-side AI Financial Intelligence Engine (Single-agent or Multi-agent)
   *
   * @param {object} params
   * @param {'single' | 'multi'} params.mode
   * @param {string} params.horizon - '30' | '90' | '365' | 'all'
   * @returns {Promise<object>}
   */
  async runAiAnalysis({ mode = 'single', horizon = 'all' } = {}) {
    try {
      const res = await fetch(`${API_BASE}/analyzer/ai/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ mode, horizon })
      });

      if (!res.ok) {
        throw new Error(`AI analysis request failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.analysis) {
        return json.analysis;
      }
      throw new Error(json.error || 'Failed to generate AI financial analysis');
    } catch (err) {
      console.warn('[AnalyzerService] Error running AI analysis:', err.message);
      throw err;
    }
  },

  /**
   * Checks server-side AI configuration status
   */
  async getAiStatus() {
    try {
      const res = await fetch(`${API_BASE}/analyzer/ai/status`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json;
    } catch {
      return { success: false, provider: 'offline', singleAgentAvailable: true, multiAgentAvailable: true };
    }
  },

  /**
   * Sends a conversational query to the AI Financial Chat ("Ask Your Finances")
   *
   * @param {object} params
   * @param {string} params.message
   * @param {Array} params.history
   * @param {string} params.horizon
   * @returns {Promise<object>}
   */
  async sendChatMessage({ message, history = [], horizon = 'all' } = {}) {
    try {
      const res = await fetch(`${API_BASE}/analyzer/ai/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ message, history, horizon })
      });

      if (!res.ok) {
        throw new Error(`AI Chat request failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.reply) {
        return json;
      }
      throw new Error(json.error || 'Failed to generate financial answer');
    } catch (err) {
      console.warn('[AnalyzerService] Error in AI Chat:', err.message);
      throw err;
    }
  },

  /**
   * Parses a bank or card statement file (CSV or PDF) and reconciles duplicates
   *
   * @param {object} params
   * @param {string} params.filename
   * @param {string} params.content - raw text or base64 string
   * @param {'csv' | 'pdf'} [params.fileType]
   * @returns {Promise<object>} { filename, summary, rows }
   */
  async parseStatement({ filename, content, fileType } = {}) {
    try {
      const res = await fetch(`${API_BASE}/analyzer/statements/parse`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ filename, content, fileType })
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Statement parsing failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        return json;
      }
      throw new Error(json.error || 'Failed to parse statement');
    } catch (err) {
      console.warn('[AnalyzerService] Error parsing statement:', err.message);
      throw err;
    }
  },

  /**
   * Imports user-confirmed transactions into FinSight ledger
   *
   * @param {Array<object>} transactions
   * @returns {Promise<object>} { success, message, importedIncomes, importedExpenses, totalImported }
   */
  async importStatementTransactions(transactions = []) {
    try {
      const res = await fetch(`${API_BASE}/analyzer/statements/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ transactions })
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Statement import failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        return json;
      }
      throw new Error(json.error || 'Failed to import transactions');
    } catch (err) {
      console.warn('[AnalyzerService] Error importing statement transactions:', err.message);
      throw err;
    }
  },

  /**
   * Fetches saved financial analysis reports history
   */
  async getAnalyzerReports() {
    try {
      const res = await fetch(`${API_BASE}/analyzer/reports`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.reports || [];
    } catch (err) {
      console.warn('[AnalyzerService] Error fetching reports history:', err.message);
      return [];
    }
  },

  /**
   * Fetches conversation chat history
   */
  async getChatHistory() {
    try {
      const res = await fetch(`${API_BASE}/analyzer/chat/history`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.messages || [];
    } catch (err) {
      console.warn('[AnalyzerService] Error fetching chat history:', err.message);
      return [];
    }
  },

  /**
   * Fetches statement imports audit history
   */
  async getStatementImportHistory() {
    try {
      const res = await fetch(`${API_BASE}/analyzer/statements/history`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.history || [];
    } catch (err) {
      console.warn('[AnalyzerService] Error fetching statement import history:', err.message);
      return [];
    }
  }
};

export default analyzerService;
