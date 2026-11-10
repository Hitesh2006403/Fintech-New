import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  storageService,
  INITIAL_USER,
  INITIAL_PREFERENCES,
  INITIAL_INCOMES,
  INITIAL_EXPENSES,
  INITIAL_LEAN_SAVINGS,
  INITIAL_NOTIFICATIONS
} from '../services/storageService.js';
import {
  calculateCurrentBalance,
  calculateSafeToSpend,
  generateCashFlowForecast,
  rankBills,
  calculateLeanWeekSavings,
  generateDashboardInsights,
  toISODate,
  addDays
} from '../services/financialEngine.js';
import { authService } from '../services/authService.js';
import { adminService } from '../services/adminService.js';
import { apiService } from '../services/apiService.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // 1. Core State with LocalStorage & Session Check
  const [user, setUser] = useState(() => 
    storageService.get(storageService.KEYS.USER_PROFILE, INITIAL_USER)
  );

  const [authLoading, setAuthLoading] = useState(true);

  const [preferences, setPreferencesState] = useState(() => 
    storageService.get(storageService.KEYS.PREFERENCES, INITIAL_PREFERENCES)
  );

  const [incomes, setIncomes] = useState(() => 
    storageService.get(storageService.KEYS.INCOMES, INITIAL_INCOMES)
  );

  const [expenses, setExpenses] = useState(() => 
    storageService.get(storageService.KEYS.EXPENSES, INITIAL_EXPENSES)
  );

  const [leanSavings, setLeanSavings] = useState(() => 
    storageService.get(storageService.KEYS.SAVINGS_GOALS, INITIAL_LEAN_SAVINGS)
  );

  const [notifications, setNotifications] = useState(() => 
    storageService.get(storageService.KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  );

  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => {
    try {
      const raw = localStorage.getItem(`uip_dismissed_alerts_${user?.id || 'default'}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Dynamically derive activeRoute from browser pathname
  const activeRoute = useMemo(() => {
    const raw = location.pathname.replace(/^\//, '');
    if (!raw || raw === '/') return 'dashboard';
    return raw;
  }, [location.pathname]);

  const setActiveRoute = useCallback((route) => {
    if (!route) return;
    const dest = route.startsWith('/') ? route : `/${route}`;
    navigate(dest);
  }, [navigate]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check HttpOnly session on initial load from backend with timeout guard
  useEffect(() => {
    let isCancelled = false;

    // Safety timeout: Never leave authLoading true indefinitely
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        setAuthLoading(false);
      }
    }, 5000);

    async function checkSession() {
      try {
        const sessionUser = await authService.getCurrentUser();
        if (isCancelled) return;
        if (sessionUser) {
          const authUser = {
            ...sessionUser,
            isAuthenticated: true
          };
          setUser(prev => ({
            ...prev,
            ...authUser
          }));
          try {
            storageService.set(storageService.KEYS.USER_PROFILE, authUser);
          } catch {}
        }
      } catch (err) {
        console.warn('Session verification check notice:', err);
      } finally {
        if (!isCancelled) {
          setAuthLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    }
    checkSession();

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
    };
  }, []);

  // Load user-specific dataset from backend / user-scoped storage when user.id changes
  useEffect(() => {
    let isCancelled = false;
    async function loadFinancialData() {
      if (!user?.id) return;
      try {
        const data = await apiService.getFinancials(user.id);
        if (isCancelled || !data) return;
        if (data.preferences) setPreferencesState(prev => ({ ...prev, ...data.preferences }));
        if (Array.isArray(data.incomes)) setIncomes(data.incomes);
        if (Array.isArray(data.expenses)) setExpenses(data.expenses);
        if (data.savingsGoals) setLeanSavings(prev => ({ ...prev, ...data.savingsGoals }));
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      } catch (err) {
        console.warn('Financial data load error:', err);
      }
    }
    loadFinancialData();
    return () => { isCancelled = true; };
  }, [user?.id]);

  // Sync to localStorage
  useEffect(() => {
    storageService.set(storageService.KEYS.USER_PROFILE, user);
  }, [user]);

  useEffect(() => {
    storageService.set(storageService.KEYS.PREFERENCES, preferences);
  }, [preferences]);

  useEffect(() => {
    storageService.set(storageService.KEYS.INCOMES, incomes);
  }, [incomes]);

  useEffect(() => {
    storageService.set(storageService.KEYS.EXPENSES, expenses);
  }, [expenses]);

  useEffect(() => {
    storageService.set(storageService.KEYS.SAVINGS_GOALS, leanSavings);
  }, [leanSavings]);

  useEffect(() => {
    storageService.set(storageService.KEYS.NOTIFICATIONS, notifications);
  }, [notifications]);

  // 2. Authoritative Financial Engine Calculations (Memoized for peak performance)
  const safeIncomes = useMemo(() => Array.isArray(incomes) ? incomes : [], [incomes]);
  const safeExpenses = useMemo(() => Array.isArray(expenses) ? expenses : [], [expenses]);
  const safePrefs = preferences || INITIAL_PREFERENCES;
  const safeSavings = leanSavings || INITIAL_LEAN_SAVINGS;

  const balanceDetails = useMemo(() => {
    return calculateCurrentBalance(
      safePrefs.startingBalance ?? 45000,
      safeIncomes,
      safeExpenses,
      safeSavings.currentDesignatedReserve ?? 0
    );
  }, [safePrefs.startingBalance, safeIncomes, safeExpenses, safeSavings.currentDesignatedReserve]);

  const safeToSpend = useMemo(() => {
    return calculateSafeToSpend({
      availableCash: balanceDetails?.availableCash ?? 0,
      incomes: safeIncomes,
      expenses: safeExpenses,
      safetyBuffer: safePrefs.safetyBuffer ?? 25000,
      horizonDays: safePrefs.defaultHorizonDays ?? 30,
      scenario: safePrefs.defaultScenario ?? 'expected'
    });
  }, [balanceDetails?.availableCash, safeIncomes, safeExpenses, safePrefs.safetyBuffer, safePrefs.defaultHorizonDays, safePrefs.defaultScenario]);

  const standardForecast = useMemo(() => {
    return generateCashFlowForecast({
      availableCash: balanceDetails?.availableCash ?? 0,
      incomes: safeIncomes,
      expenses: safeExpenses,
      safetyBuffer: safePrefs.safetyBuffer ?? 25000,
      days: 30,
      scenario: 'expected'
    });
  }, [balanceDetails?.availableCash, safeIncomes, safeExpenses, safePrefs.safetyBuffer]);

  const rawDashboardInsights = useMemo(() => {
    return generateDashboardInsights({
      availableCash: balanceDetails?.availableCash ?? 0,
      safetyBuffer: safePrefs.safetyBuffer ?? 25000,
      incomes: safeIncomes,
      expenses: safeExpenses,
      forecast: standardForecast?.forecast || [],
      firstLowBufferDate: standardForecast?.firstLowBufferDate,
      firstNegativeDate: standardForecast?.firstNegativeDate
    });
  }, [balanceDetails?.availableCash, safePrefs.safetyBuffer, safeIncomes, safeExpenses, standardForecast]);

  const dashboardInsights = useMemo(() => {
    const rawAlerts = rawDashboardInsights?.alerts || [];
    return {
      ...rawDashboardInsights,
      alerts: rawAlerts.filter(a => !dismissedAlertIds.includes(a.id))
    };
  }, [rawDashboardInsights, dismissedAlertIds]);

  const billRanking = useMemo(() => {
    return rankBills(safeExpenses, balanceDetails?.availableCash ?? 0);
  }, [safeExpenses, balanceDetails?.availableCash]);

  const leanWeekCalculations = useMemo(() => {
    return calculateLeanWeekSavings(safeSavings);
  }, [safeSavings]);

  // Derived metrics for UI
  const confirmedUpcomingIncome = useMemo(() => {
    const today = toISODate(new Date());
    return safeIncomes
      .filter(inc => inc.status === 'confirmed' && inc.expectedDate >= today)
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
  }, [safeIncomes]);

  const upcomingBillsNext7Days = useMemo(() => {
    const today = toISODate(new Date());
    const sevenDaysLater = addDays(today, 7);
    return safeExpenses
      .filter(exp => exp.status !== 'paid' && exp.dueDate >= today && exp.dueDate <= sevenDaysLater)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  }, [safeExpenses]);

  const unreadNotificationCount = useMemo(() => {
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    return safeNotifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // 3. Mutating Actions (Wrapped in useCallback to maintain reference equality)
  const userId = user?.id;

  // Income Actions
  const addIncome = useCallback((incomeData) => {
    const newIncome = {
      ...incomeData,
      id: `inc_${Date.now()}`,
      amount: Number(incomeData.amount || 0)
    };
    setIncomes(prev => [newIncome, ...prev]);
    apiService.addIncome(userId, newIncome).catch(e => console.warn('Sync addIncome error:', e));
  }, [userId]);

  const editIncome = useCallback((id, updatedData) => {
    setIncomes(prev => prev.map(inc => inc.id === id ? { ...inc, ...updatedData, amount: Number(updatedData.amount || 0) } : inc));
    apiService.updateIncome(userId, id, updatedData).catch(e => console.warn('Sync editIncome error:', e));
  }, [userId]);

  const deleteIncome = useCallback((id) => {
    setIncomes(prev => prev.filter(inc => inc.id !== id));
    apiService.deleteIncome(userId, id).catch(e => console.warn('Sync deleteIncome error:', e));
  }, [userId]);

  const markIncomeReceived = useCallback((id, actualDate = toISODate(new Date())) => {
    setIncomes(prev => prev.map(inc => {
      if (inc.id === id && inc.status !== 'received') {
        return {
          ...inc,
          status: 'received',
          actualDate
        };
      }
      return inc;
    }));
    apiService.updateIncome(userId, id, { status: 'received', actualDate }).catch(e => console.warn('Sync markIncomeReceived error:', e));
  }, [userId]);

  // Expense Actions
  const addExpense = useCallback((expenseData) => {
    const newExpense = {
      ...expenseData,
      id: `exp_${Date.now()}`,
      amount: Number(expenseData.amount || 0),
      status: expenseData.status || 'unpaid'
    };
    setExpenses(prev => [newExpense, ...prev]);
    apiService.addExpense(userId, newExpense).catch(e => console.warn('Sync addExpense error:', e));
  }, [userId]);

  const editExpense = useCallback((id, updatedData) => {
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, ...updatedData, amount: Number(updatedData.amount || 0) } : exp));
    apiService.updateExpense(userId, id, updatedData).catch(e => console.warn('Sync editExpense error:', e));
  }, [userId]);

  const deleteExpense = useCallback((id) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
    apiService.deleteExpense(userId, id).catch(e => console.warn('Sync deleteExpense error:', e));
  }, [userId]);

  const markExpensePaid = useCallback((id, paidDate = toISODate(new Date())) => {
    setExpenses(prev => prev.map(exp => {
      if (exp.id === id && exp.status !== 'paid') {
        return {
          ...exp,
          status: 'paid',
          paidDate
        };
      }
      return exp;
    }));
    apiService.updateExpense(userId, id, { status: 'paid', paidDate }).catch(e => console.warn('Sync markExpensePaid error:', e));
  }, [userId]);

  // Preferences Actions
  const setPreferences = useCallback((updater) => {
    setPreferencesState(prev => {
      const nextVal = typeof updater === 'function' ? updater(prev) : updater;
      apiService.updatePreferences(userId, nextVal).catch(e => console.warn('Sync updatePreferences error:', e));
      return nextVal;
    });
  }, [userId]);

  // Lean-Week Savings Actions
  const updateLeanSavings = useCallback((newData) => {
    setLeanSavings(prev => {
      const updated = { ...prev, ...newData };
      apiService.updateSavings(userId, updated).catch(e => console.warn('Sync updateSavings error:', e));
      return updated;
    });
  }, [userId]);

  const contributeToSavings = useCallback((amount) => {
    const addAmt = Number(amount || 0);
    if (addAmt <= 0) return;
    setLeanSavings(prev => {
      const updated = {
        ...prev,
        currentDesignatedReserve: prev.currentDesignatedReserve + addAmt
      };
      apiService.contributeSavings(userId, addAmt).catch(e => console.warn('Sync contributeSavings error:', e));
      return updated;
    });
  }, [userId]);

  // Notification Actions
  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    apiService.markNotificationRead(userId, id).catch(e => console.warn('Sync markNotificationRead error:', e));
  }, [userId]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    apiService.markAllNotificationsRead(userId).catch(e => console.warn('Sync markAllNotificationsRead error:', e));
  }, [userId]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    apiService.clearNotifications(userId).catch(e => console.warn('Sync clearNotifications error:', e));
  }, [userId]);

  // Dismiss alert helper
  const dismissAlert = useCallback((alertId) => {
    setDismissedAlertIds(prev => {
      const next = [...new Set([...prev, alertId])];
      try {
        localStorage.setItem(`uip_dismissed_alerts_${userId || 'default'}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [userId]);

  // Live Cloud Synchronization: Directly pulls user financial dataset from backend REST API
  const refreshData = useCallback(async () => {
    if (!userId) return;
    setIsSyncing(true);
    try {
      const data = await apiService.getFinancials(userId);
      if (data) {
        if (data.preferences) setPreferencesState(data.preferences);
        if (data.incomes) setIncomes(data.incomes);
        if (data.expenses) setExpenses(data.expenses);
        if (data.savingsGoals) setLeanSavings(data.savingsGoals);
        if (data.notifications) setNotifications(data.notifications);
      }
      return data;
    } catch (err) {
      console.warn('Live backend sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  // Backwards compatibility alias for reset/sync
  const resetToDemoData = useCallback(async () => {
    await refreshData();
    setDismissedAlertIds([]);
    try {
      localStorage.removeItem(`uip_dismissed_alerts_${userId || 'default'}`);
    } catch {}
    setActiveRoute('dashboard');
  }, [refreshData, setActiveRoute, userId]);

  const clearUserData = useCallback(async () => {
    try {
      const cleared = await apiService.clearUserData(userId);
      if (cleared) {
        if (cleared.preferences) setPreferencesState(cleared.preferences);
        setIncomes(cleared.incomes || []);
        setExpenses(cleared.expenses || []);
        if (cleared.savingsGoals) setLeanSavings(cleared.savingsGoals);
        setNotifications(cleared.notifications || []);
      }
    } catch {
      setPreferencesState({ ...INITIAL_PREFERENCES, startingBalance: 0 });
      setIncomes([]);
      setExpenses([]);
      setLeanSavings({ ...INITIAL_LEAN_SAVINGS, currentDesignatedReserve: 0 });
      setNotifications([]);
    }
    setDismissedAlertIds([]);
    try {
      localStorage.removeItem(`uip_dismissed_alerts_${userId || 'default'}`);
    } catch {}
    setActiveRoute('dashboard');
  }, [setActiveRoute, userId]);

  // Real backend authentication methods with synchronous storage persistence
  const loginWithGoogle = useCallback(async (credential) => {
    const data = await authService.verifyGoogleCredential(credential);
    const authUser = {
      ...INITIAL_USER,
      ...data.user,
      isAuthenticated: true
    };
    try {
      storageService.set(storageService.KEYS.USER_PROFILE, authUser);
    } catch {}
    setUser(authUser);
    return data;
  }, []);

  const linkGoogleAccount = useCallback(async ({ email, password, credential }) => {
    const data = await authService.linkGoogleAccount({ email, password, credential });
    const authUser = {
      ...INITIAL_USER,
      ...data.user,
      isAuthenticated: true
    };
    try {
      storageService.set(storageService.KEYS.USER_PROFILE, authUser);
    } catch {}
    setUser(authUser);
    return data;
  }, []);

  const loginWithEmail = useCallback(async (email, password) => {
    const data = await authService.loginWithEmail(email, password);
    const authUser = {
      ...INITIAL_USER,
      ...data.user,
      isAuthenticated: true
    };
    try {
      storageService.set(storageService.KEYS.USER_PROFILE, authUser);
    } catch {}
    setUser(authUser);
    return data;
  }, []);

  const registerWithEmail = useCallback(async (email, name, password) => {
    const data = await authService.registerWithEmail(email, name, password);
    const authUser = {
      ...INITIAL_USER,
      ...data.user,
      isAuthenticated: true
    };
    try {
      storageService.set(storageService.KEYS.USER_PROFILE, authUser);
    } catch {}
    setUser(authUser);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {}
    try {
      await adminService.logout();
    } catch {}
    try {
      storageService.set(storageService.KEYS.USER_PROFILE, INITIAL_USER);
      localStorage.removeItem('uip_auth_token');
      localStorage.removeItem('uip_fallback_user');
      localStorage.removeItem('uip_guest_session');
      localStorage.removeItem('finsight_admin_token');
      localStorage.removeItem('finsight_admin_user');
      localStorage.removeItem('uip_user_profile');
      sessionStorage.clear();
    } catch {}
    setUser(INITIAL_USER);
    setPreferencesState(INITIAL_PREFERENCES);
    setIncomes(INITIAL_INCOMES);
    setExpenses(INITIAL_EXPENSES);
    setLeanSavings(INITIAL_LEAN_SAVINGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setDismissedAlertIds([]);
    navigate('/login', { replace: true });
  }, [navigate]);

  const loginAsGuest = useCallback(() => {
    const data = authService.loginAsGuest();
    const authUser = {
      ...INITIAL_USER,
      ...data.user,
      isAuthenticated: true
    };
    try {
      storageService.set(storageService.KEYS.USER_PROFILE, authUser);
    } catch {}
    setUser(authUser);
    setPreferencesState(INITIAL_PREFERENCES);
    setIncomes(INITIAL_INCOMES);
    setExpenses(INITIAL_EXPENSES);
    setLeanSavings(INITIAL_LEAN_SAVINGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    navigate('/dashboard', { replace: true });
    return data;
  }, [navigate]);

  const completeOnboarding = useCallback(async () => {
    try {
      await authService.completeOnboarding();
    } catch (e) {
      console.warn('Backend onboarding sync error:', e);
    }
    setUser(prev => ({
      ...prev,
      onboardingCompleted: true
    }));
  }, []);

  // Memoize the context value to eliminate cascading child component re-renders
  const contextValue = useMemo(() => ({
    // State
    user,
    setUser,
    authLoading,
    preferences,
    setPreferences,
    incomes,
    expenses,
    leanSavings,
    notifications,
    dismissedAlertIds,
    activeRoute,
    setActiveRoute,
    mobileMenuOpen,
    setMobileMenuOpen,
    quickAddModalOpen,
    setQuickAddModalOpen,

    // Calculated values
    balanceDetails,
    safeToSpend,
    standardForecast,
    dashboardInsights,
    billRanking,
    leanWeekCalculations,
    confirmedUpcomingIncome,
    upcomingBillsNext7Days,
    unreadNotificationCount,

    // Action methods
    addIncome,
    editIncome,
    deleteIncome,
    markIncomeReceived,

    addExpense,
    editExpense,
    deleteExpense,
    markExpensePaid,

    updateLeanSavings,
    contributeToSavings,

    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    dismissAlert,

    resetToDemoData,
    refreshData,
    isSyncing,
    clearUserData,
    loginWithGoogle,
    linkGoogleAccount,
    loginWithEmail,
    registerWithEmail,
    loginAsGuest,
    completeOnboarding,
    logout
  }), [
    user,
    authLoading,
    preferences,
    setPreferences,
    incomes,
    expenses,
    leanSavings,
    notifications,
    dismissedAlertIds,
    activeRoute,
    setActiveRoute,
    mobileMenuOpen,
    quickAddModalOpen,
    balanceDetails,
    safeToSpend,
    standardForecast,
    dashboardInsights,
    billRanking,
    leanWeekCalculations,
    confirmedUpcomingIncome,
    upcomingBillsNext7Days,
    unreadNotificationCount,
    addIncome,
    editIncome,
    deleteIncome,
    markIncomeReceived,
    addExpense,
    editExpense,
    deleteExpense,
    markExpensePaid,
    updateLeanSavings,
    contributeToSavings,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    dismissAlert,
    resetToDemoData,
    refreshData,
    isSyncing,
    clearUserData,
    loginWithGoogle,
    linkGoogleAccount,
    loginWithEmail,
    registerWithEmail,
    loginAsGuest,
    completeOnboarding,
    logout
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
