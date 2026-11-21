/**
 * FINSIGHT ADMIN SERVICE
 * Handles communication with admin authentication & management endpoints
 */

import { decodeGoogleJwt } from './authService.js';

function resolveAdminApiBase() {
  let root = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
  root = root.replace(/\/:path\*?/g, '').replace(/:path\*?/g, '').replace(/\/\*+$/, '').trim().replace(/\/+$/, '');
  if (root.endsWith('/api/admin')) {
    root = root.slice(0, -('/api/admin'.length));
  } else if (root.endsWith('/api')) {
    root = root.slice(0, -4);
  } else if (root.endsWith('/admin')) {
    root = root.slice(0, -('/admin'.length));
  }
  return root ? `${root}/api/admin` : `/api/admin`;
}

const ADMIN_API_BASE = resolveAdminApiBase();

function getAdminAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('finsight_admin_token') || localStorage.getItem('uip_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // LocalStorage unavailable
  }
  return headers;
}

async function safeJsonParse(res) {
  let text = '';
  try {
    text = await res.text();
  } catch (err) {
    const error = new Error('Network error reading response body');
    error.status = res.status;
    throw error;
  }

  if (!text || !text.trim()) {
    if (!res.ok) {
      const isGatewayError = res.status === 502 || res.status === 503 || res.status === 504;
      const isNotFound = res.status === 404;
      const error = new Error(
        isGatewayError
          ? 'Backend admin server is starting or unreachable (502). Please verify server is running.'
          : isNotFound
          ? 'Admin API endpoint not found (HTTP 404). Backend routing is normalizing.'
          : `Server returned HTTP ${res.status}`
      );
      error.status = res.status;
      error.isServerDown = isGatewayError;
      error.isNotFound = isNotFound;
      throw error;
    }
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    if (!res.ok) {
      const isGatewayError = res.status >= 502 && res.status <= 504;
      const isNotFound = res.status === 404;
      const error = new Error(
        isNotFound
          ? 'Admin API endpoint not found (HTTP 404). Backend routing is normalizing.'
          : isGatewayError
          ? 'Admin server is starting or temporarily unavailable (502/504). Please retry.'
          : `Server returned error (${res.status})`
      );
      error.status = res.status;
      error.isServerDown = isGatewayError;
      error.isNotFound = isNotFound;
      throw error;
    }
    throw new Error('Received unexpected non-JSON response from server.');
  }
}

export const DEMO_FALLBACK_USERS = [
  {
    id: '#1001',
    rawId: 'demo_usr_01',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@demo.finsight.app',
    status: 'Active',
    joinedOn: '18 Oct 2026',
    role: 'Senior UX Designer',
    avatarInitials: 'RM',
    picture: null,
    authProvider: 'local'
  },
  {
    id: '#1002',
    rawId: 'demo_usr_02',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@demo.finsight.app',
    status: 'Active',
    joinedOn: '19 Oct 2026',
    role: 'Freelance Cloud Architect',
    avatarInitials: 'AS',
    picture: null,
    authProvider: 'local'
  },
  {
    id: '#1003',
    rawId: 'demo_usr_03',
    name: 'Neha Verma',
    email: 'neha.verma@demo.finsight.app',
    status: 'Active',
    joinedOn: '20 Oct 2026',
    role: 'Financial Consultant',
    avatarInitials: 'NV',
    picture: null,
    authProvider: 'local'
  }
];

export const DEMO_FALLBACK_TRANSACTIONS = [
  { id: 'tx_demo_01', type: 'income', title: 'Client UX Retainer', category: 'Client Retainer', amount: 65000, date: '2026-11-15', status: 'Completed', userName: 'Rohan Mehta', email: 'rohan.mehta@demo.finsight.app' },
  { id: 'tx_demo_02', type: 'expense', title: 'Studio Workspace Lease', category: 'Workspace & Rent', amount: 15000, date: '2026-11-14', status: 'Completed', userName: 'Rohan Mehta', email: 'rohan.mehta@demo.finsight.app' },
  { id: 'tx_demo_03', type: 'income', title: 'Backend Architecture Retainer', category: 'Client Retainer', amount: 75000, date: '2026-11-12', status: 'Completed', userName: 'Aarav Sharma', email: 'aarav.sharma@demo.finsight.app' },
  { id: 'tx_demo_04', type: 'expense', title: 'AWS Staging & Production Nodes', category: 'Cloud & Tech', amount: 8500, date: '2026-11-11', status: 'Completed', userName: 'Aarav Sharma', email: 'aarav.sharma@demo.finsight.app' },
  { id: 'tx_demo_05', type: 'income', title: 'Advisory Consultation Retainer', category: 'Consulting', amount: 50000, date: '2026-11-10', status: 'Completed', userName: 'Neha Verma', email: 'neha.verma@demo.finsight.app' },
  { id: 'tx_demo_06', type: 'expense', title: 'Coworking Dedicated Desk', category: 'Workspace & Rent', amount: 12000, date: '2026-11-09', status: 'Completed', userName: 'Neha Verma', email: 'neha.verma@demo.finsight.app' }
];

export const DEMO_FALLBACK_STATS = {
  totalUsers: 3,
  activeUsers: 3,
  blockedUsers: 0,
  reportedIssues: 0,
  openIssues: 0,
  totalTransactions: 6,
  actualTransactionCount: 6,
  totalVolumeINR: 225500,
  userGrowthTrends: { percentageChange: 15, isPositive: true },
  activeUserTrends: { percentageChange: 12, isPositive: true },
  reportedIssuesTrends: { percentageChange: 0, isPositive: true },
  transactionsTrends: { percentageChange: 18, isPositive: true },
  userGrowth: {
    '7days': [
      { date: 'Day 1', count: 1 },
      { date: 'Day 2', count: 1 },
      { date: 'Day 3', count: 2 },
      { date: 'Day 4', count: 2 },
      { date: 'Day 5', count: 3 },
      { date: 'Day 6', count: 3 },
      { date: 'Today', count: 3 }
    ]
  },
  incomeVsExpense: {
    'thisMonth': [
      { date: 'Day 1', income: 0, expenses: 0 },
      { date: 'Day 2', income: 50000, expenses: 12000 },
      { date: 'Day 3', income: 0, expenses: 0 },
      { date: 'Day 4', income: 75000, expenses: 8500 },
      { date: 'Day 5', income: 0, expenses: 0 },
      { date: 'Day 6', income: 65000, expenses: 15000 },
      { date: 'Today', income: 0, expenses: 0 }
    ]
  },
  recentActivity: [
    { id: 'act_demo_1', type: 'user_register', title: 'New user registered', meta: 'rohan.mehta@demo.finsight.app', time: '10 mins ago', color: '#10B981' },
    { id: 'act_demo_2', type: 'transaction', title: 'Client Retainer Received', meta: '₹65,000 - Rohan Mehta', time: '1 hour ago', color: '#38BDF8' },
    { id: 'act_demo_3', type: 'user_register', title: 'New user registered', meta: 'aarav.sharma@demo.finsight.app', time: '2 hours ago', color: '#10B981' },
    { id: 'act_demo_4', type: 'transaction', title: 'Architecture Retainer Received', meta: '₹75,000 - Aarav Sharma', time: '3 hours ago', color: '#38BDF8' },
    { id: 'act_demo_5', type: 'user_register', title: 'New user registered', meta: 'neha.verma@demo.finsight.app', time: '5 hours ago', color: '#10B981' }
  ],
  systemStatus: {
    frontend: 'Online',
    backendApi: 'Degraded / Local Fallback',
    database: 'Fallback Cache',
    authentication: 'Online'
  }
};

export const adminService = {
  /**
   * Authenticate admin using Google Identity Services credential
   * Enforces authorized admin email whitelist check
   */
  async loginWithGoogle(credential) {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/google`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ credential })
      });

      const data = await safeJsonParse(res);
      if (!res.ok) {
        const error = new Error(data.error || data.message || 'Google Administrator login failed');
        error.status = res.status;
        throw error;
      }

      if (data.token) {
        try {
          localStorage.setItem('finsight_admin_token', data.token);
          localStorage.setItem('finsight_admin_user', JSON.stringify(data.user));
        } catch {}
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Authenticate admin with credentials (email & password)
   */
  async loginWithCredentials(email, password) {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/login`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await safeJsonParse(res);
      if (!res.ok) {
        const error = new Error(data.error || 'Invalid administrator credentials');
        error.status = res.status;
        throw error;
      }

      if (data.token) {
        try {
          localStorage.setItem('finsight_admin_token', data.token);
          localStorage.setItem('finsight_admin_user', JSON.stringify(data.user));
        } catch {}
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Authenticate authorized admin directly via email
   */
  async loginWithAdminEmail(email) {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/email-auth`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const data = await safeJsonParse(res);
      if (!res.ok) {
        const error = new Error(data.error || 'Access Denied: Email not in authorized administrator whitelist.');
        error.status = res.status;
        throw error;
      }

      if (data.token) {
        try {
          localStorage.setItem('finsight_admin_token', data.token);
          localStorage.setItem('finsight_admin_user', JSON.stringify(data.user));
        } catch {}
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Check current active admin session
   */
  async getCurrentAdmin() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/me`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });

      if (!res.ok) {
        return null;
      }

      const data = await safeJsonParse(res);
      return data.authenticated ? data.user : null;
    } catch {
      return null;
    }
  },

  /**
   * Sign out admin
   */
  async logout() {
    try {
      if (typeof window !== 'undefined') {
        await fetch(`${ADMIN_API_BASE}/logout`, {
          method: 'POST',
          headers: getAdminAuthHeaders(),
          credentials: 'include'
        });
      }
    } catch (e) {
      console.warn('Admin logout network error:', e);
    } finally {
      try {
        localStorage.removeItem('finsight_admin_token');
        localStorage.removeItem('finsight_admin_user');
        localStorage.removeItem('uip_auth_token');
        localStorage.removeItem('uip_fallback_user');
        localStorage.removeItem('uip_guest_session');
        localStorage.removeItem('uip_user_profile');
        sessionStorage.clear();
      } catch {}
    }
  },

  /**
   * Fetch aggregate admin dashboard stats
   */
  async getStats() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/stats`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await safeJsonParse(res);
      return data.data;
    } catch (err) {
      console.warn('Real-time admin stats fetch failed, activating 3-user demo fallback:', err?.message || err);
      return DEMO_FALLBACK_STATS;
    }
  },

  /**
   * Fetch user list
   */
  async getUsers() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/users`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await safeJsonParse(res);
      return data.users || [];
    } catch (err) {
      console.warn('Real-time admin users fetch failed, activating 3-user demo fallback:', err?.message || err);
      return DEMO_FALLBACK_USERS;
    }
  },

  /**
   * Update user status (Active vs Blocked)
   */
  async updateUserStatus(userId, status, reason = '') {
    const res = await fetch(`${ADMIN_API_BASE}/users/${encodeURIComponent(userId)}/status`, {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ status, reason })
    });
    return await safeJsonParse(res);
  },

  /**
   * Delete user account
   */
  async deleteUser(userId) {
    const res = await fetch(`${ADMIN_API_BASE}/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    return await safeJsonParse(res);
  },

  /**
   * Fetch all transactions across platform
   */
  async getTransactions() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/transactions`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await safeJsonParse(res);
      return data.transactions || [];
    } catch (err) {
      console.warn('Real-time admin transactions fetch failed, activating 3-user demo fallback:', err?.message || err);
      return DEMO_FALLBACK_TRANSACTIONS;
    }
  },

  /**
   * Fetch reported issues & feedback
   */
  async getIssues() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/issues`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      const data = await safeJsonParse(res);
      return data.issues || [];
    } catch {
      return [];
    }
  },

  /**
   * Update issue status or resolution notes
   */
  async updateIssue(issueId, updates) {
    const res = await fetch(`${ADMIN_API_BASE}/issues/${encodeURIComponent(issueId)}`, {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updates)
    });
    return await safeJsonParse(res);
  },

  /**
   * Fetch security audit logs
   */
  async getSecurityLogs() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/security-logs`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      const data = await safeJsonParse(res);
      return data.logs || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch platform settings
   */
  async getSettings() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/settings`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      const data = await safeJsonParse(res);
      return data.settings;
    } catch {
      return {
        platformName: 'FinSight Treasury Platform',
        maintenanceMode: false,
        allowRegistrations: true,
        authorizedAdminEmails: [],
        defaultCurrency: 'INR (₹)',
        sessionTimeoutHours: 72,
        systemAlert: 'All backend clusters operating nominally.'
      };
    }
  },

  /**
   * Update platform settings (e.g. whitelist new admin email)
   */
  async updateSettings(settings) {
    const res = await fetch(`${ADMIN_API_BASE}/settings`, {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(settings)
    });
    return await safeJsonParse(res);
  },

  /**
   * Broadcast announcement notification to all users
   */
  async broadcastNotification(notification) {
    const res = await fetch(`${ADMIN_API_BASE}/broadcast`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(notification)
    });
    return await safeJsonParse(res);
  },

  /**
   * Fetch all broadcast announcements history
   */
  async getBroadcasts() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/broadcasts`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      const data = await safeJsonParse(res);
      return data.broadcasts || [];
    } catch {
      return [];
    }
  },

  /**
   * Delete broadcast announcement
   */
  async deleteBroadcast(broadcastId) {
    const res = await fetch(`${ADMIN_API_BASE}/broadcasts/${encodeURIComponent(broadcastId)}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    return await safeJsonParse(res);
  },

  /**
   * Fetch system notifications for administrator
   */
  async getAdminNotifications() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/notifications`, {
        method: 'GET',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      const data = await safeJsonParse(res);
      return data.notifications || [];
    } catch {
      return [];
    }
  },

  /**
   * Mark all admin notifications as read
   */
  async markAllNotificationsRead() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/notifications/mark-read`, {
        method: 'PUT',
        headers: getAdminAuthHeaders(),
        credentials: 'include'
      });
      return await safeJsonParse(res);
    } catch {
      return { success: false };
    }
  }
};
