import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { adminService } from '../services/adminService.js';
import { useApp } from './AppContext.jsx';

const AdminContext = createContext(null);

const AUTHORIZED_ADMIN_EMAILS = ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'];

export function AdminProvider({ children }) {
  const appContext = useApp ? useApp() : null;
  const contextUser = appContext?.user;

  const isUserAdmin = Boolean(
    contextUser && (
      contextUser.isAdmin ||
      contextUser.role === 'Super Administrator' ||
      contextUser.role === 'admin' ||
      (contextUser.email && AUTHORIZED_ADMIN_EMAILS.includes(contextUser.email.toLowerCase().trim()))
    )
  );

  const [adminUser, setAdminUser] = useState(() => isUserAdmin ? contextUser : null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => isUserAdmin);
  const [adminLoading, setAdminLoading] = useState(() => !isUserAdmin);
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
  
  // Dashboard & Management Data State
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [issues, setIssues] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notificationCount, setNotificationCount] = useState(3);

  // Check existing admin session on mount
  useEffect(() => {
    let isCancelled = false;

    async function initAdminAuth() {
      try {
        const currentUser = await adminService.getCurrentAdmin();
        if (isCancelled) return;
        if (currentUser && (currentUser.isAdmin || currentUser.role === 'Super Administrator')) {
          setAdminUser(currentUser);
          setIsAdminAuthenticated(true);
        } else if (isUserAdmin) {
          // If server call fails temporarily (cold start) but client holds verified admin session
          setAdminUser(contextUser);
          setIsAdminAuthenticated(true);
        }
      } catch (err) {
        console.warn('Admin session check notice:', err);
        if (isUserAdmin && !isCancelled) {
          setAdminUser(contextUser);
          setIsAdminAuthenticated(true);
        }
      } finally {
        if (!isCancelled) {
          setAdminLoading(false);
        }
      }
    }
    initAdminAuth();

    return () => { isCancelled = true; };
  }, [contextUser, isUserAdmin]);

  // Fetch admin datasets when authenticated
  const loadAdminData = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    setIsRefreshing(true);
    try {
      const [statsData, usersData, txData, issuesData, logsData, settingsData] = await Promise.allSettled([
        adminService.getStats(),
        adminService.getUsers(),
        adminService.getTransactions(),
        adminService.getIssues(),
        adminService.getSecurityLogs(),
        adminService.getSettings()
      ]);

      if (statsData.status === 'fulfilled' && statsData.value) setStats(statsData.value);
      if (usersData.status === 'fulfilled' && Array.isArray(usersData.value)) setUsersList(usersData.value);
      if (txData.status === 'fulfilled' && Array.isArray(txData.value)) setTransactions(txData.value);
      if (issuesData.status === 'fulfilled' && Array.isArray(issuesData.value)) setIssues(issuesData.value);
      if (logsData.status === 'fulfilled' && Array.isArray(logsData.value)) setSecurityLogs(logsData.value);
      if (settingsData.status === 'fulfilled' && settingsData.value) setSettings(settingsData.value);
    } catch (err) {
      console.warn('Error fetching admin datasets:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAdminData();
    }
  }, [isAdminAuthenticated, loadAdminData]);

  // Google Login Handler
  const loginWithGoogle = async (credential) => {
    const result = await adminService.loginWithGoogle(credential);
    if (result?.user) {
      setAdminUser(result.user);
      setIsAdminAuthenticated(true);
      return result.user;
    }
    throw new Error('Google admin authentication did not return a valid administrator profile.');
  };

  // Credential Login Handler
  const loginWithCredentials = async (email, password) => {
    const result = await adminService.loginWithCredentials(email, password);
    if (result?.user) {
      setAdminUser(result.user);
      setIsAdminAuthenticated(true);
      return result.user;
    }
    throw new Error('Admin login failed');
  };

  // Direct Authorized Email Login Handler
  const loginWithAdminEmail = async (email) => {
    const result = await adminService.loginWithAdminEmail(email);
    if (result?.user) {
      setAdminUser(result.user);
      setIsAdminAuthenticated(true);
      return result.user;
    }
    throw new Error('Admin email authorization failed');
  };

  // Unified Admin Logout Handler
  const logoutAdmin = async () => {
    try {
      await adminService.logout();
    } catch (e) {
      console.warn('Admin logout notice:', e);
    }
    setAdminUser(null);
    setIsAdminAuthenticated(false);
    setAdminActiveTab('dashboard');

    if (appContext && typeof appContext.logout === 'function') {
      await appContext.logout();
    } else {
      try {
        localStorage.removeItem('finsight_admin_token');
        localStorage.removeItem('finsight_admin_user');
        localStorage.removeItem('uip_auth_token');
        localStorage.removeItem('uip_fallback_user');
        localStorage.removeItem('uip_guest_session');
        localStorage.removeItem('uip_user_profile');
        sessionStorage.clear();
      } catch {}
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  };

  // Block / Unblock User Action
  const toggleUserStatus = async (userRecord, reason = '') => {
    const isCurrentlyBlocked = userRecord.status === 'Blocked' || userRecord.status === 'blocked';
    const newStatus = isCurrentlyBlocked ? 'Active' : 'Blocked';

    // Optimistic local update
    setUsersList(prev => prev.map(u => {
      if (u.id === userRecord.id || u.email === userRecord.email) {
        return { ...u, status: newStatus };
      }
      return u;
    }));

    try {
      await adminService.updateUserStatus(userRecord.rawId || userRecord.id, newStatus, reason);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to update user status:', err);
      // Revert if error
      await loadAdminData();
      throw err;
    }
  };

  // Delete User Action
  const deleteUser = async (userIdOrEmail) => {
    setUsersList(prev => prev.filter(u => u.id !== userIdOrEmail && u.email !== userIdOrEmail));
    try {
      await adminService.deleteUser(userIdOrEmail);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      await loadAdminData();
      throw err;
    }
  };

  // Update Issue Status Action
  const updateIssueStatus = async (issueId, newStatus) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus } : i));
    try {
      await adminService.updateIssue(issueId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update issue status:', err);
    }
  };

  // Update Settings Action
  const updateSettings = async (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    try {
      const res = await adminService.updateSettings(newSettings);
      if (res?.settings) setSettings(res.settings);
      return res;
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  };

  // Broadcast Announcement
  const broadcastAnnouncement = async (notification) => {
    try {
      const res = await adminService.broadcastNotification(notification);
      await loadAdminData();
      return res;
    } catch (err) {
      console.error('Failed to broadcast announcement:', err);
      throw err;
    }
  };

  // Global Search Filter Results
  const searchResults = useMemo(() => {
    if (!globalSearch || !globalSearch.trim()) return null;
    const q = globalSearch.toLowerCase().trim();

    const safeUsers = Array.isArray(usersList) ? usersList : [];
    const safeTx = Array.isArray(transactions) ? transactions : [];
    const safeIssues = Array.isArray(issues) ? issues : [];

    const matchedUsers = safeUsers.filter(u =>
      u?.name?.toLowerCase().includes(q) ||
      u?.email?.toLowerCase().includes(q) ||
      u?.id?.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedTx = safeTx.filter(t =>
      t?.title?.toLowerCase().includes(q) ||
      t?.category?.toLowerCase().includes(q) ||
      t?.userName?.toLowerCase().includes(q) ||
      t?.email?.toLowerCase().includes(q) ||
      t?.id?.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedIssues = safeIssues.filter(i =>
      i?.title?.toLowerCase().includes(q) ||
      i?.category?.toLowerCase().includes(q) ||
      i?.userName?.toLowerCase().includes(q) ||
      i?.reportedBy?.toLowerCase().includes(q)
    ).slice(0, 4);

    return {
      users: matchedUsers,
      transactions: matchedTx,
      issues: matchedIssues,
      totalCount: matchedUsers.length + matchedTx.length + matchedIssues.length
    };
  }, [globalSearch, usersList, transactions, issues]);

  const value = {
    adminUser,
    isAdminAuthenticated,
    adminLoading,
    adminActiveTab,
    setAdminActiveTab,
    stats,
    usersList,
    transactions,
    issues,
    securityLogs,
    settings,
    isRefreshing,
    refreshAdminData: loadAdminData,
    globalSearch,
    setGlobalSearch,
    searchResults,
    notificationCount,
    setNotificationCount,
    loginWithGoogle,
    loginWithCredentials,
    loginWithAdminEmail,
    logoutAdmin,
    toggleUserStatus,
    deleteUser,
    updateIssueStatus,
    updateSettings,
    broadcastAnnouncement
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
