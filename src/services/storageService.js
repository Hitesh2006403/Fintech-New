/**
 * UNCERTAIN INCOME PLANNER — LOCAL PERSISTENCE & INITIAL MOCK DATA
 */

const STORAGE_KEYS = {
  USER_PROFILE: 'uip_user_profile',
  PREFERENCES: 'uip_preferences',
  INCOMES: 'uip_incomes',
  EXPENSES: 'uip_expenses',
  SAVINGS_GOALS: 'uip_savings_goals',
  NOTIFICATIONS: 'uip_notifications',
  SAVED_SIMULATIONS: 'uip_saved_simulations'
};

export const INITIAL_USER = {
  id: '',
  name: '',
  email: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata (IST)',
  avatarInitials: '',
  role: 'Freelance Professional',
  isAuthenticated: false,
  onboardingCompleted: false
};

export const INITIAL_PREFERENCES = {
  startingBalance: 45000,
  safetyBuffer: 25000,
  defaultHorizonDays: 30,
  defaultScenario: 'expected',
  incomeFrequency: 'Irregular / Milestone-based',
  essentialExpenseAssumptions: 'Strict essential only',
  lowBalanceAlertThreshold: 20000,
  billReminderLeadDays: 3,
  notificationsEnabled: true
};

export const INITIAL_INCOMES = [
  {
    id: 'inc_101',
    title: 'Client Design Retainer (Acme Fintech)',
    source: 'Acme Corp',
    amount: 65000,
    expectedDate: '2026-10-05',
    actualDate: '2026-10-05',
    status: 'received',
    recurring: 'monthly',
    notes: 'Q4 core banking UX sprint, wire transferred.'
  },
  {
    id: 'inc_102',
    title: 'Mobile App Consulting Payout',
    source: 'Venture Studio',
    amount: 42000,
    expectedDate: '2026-10-12',
    actualDate: '2026-10-12',
    status: 'received',
    recurring: 'one-time',
    notes: 'Design audit payout received into HDFC account.'
  },
  {
    id: 'inc_103',
    title: 'Milestone 2 Backend Deliverable',
    source: 'Stripe Global Partner',
    amount: 55000,
    expectedDate: '2026-10-25',
    actualDate: null,
    status: 'confirmed',
    recurring: 'milestone',
    notes: 'Contract signed. Invoice verified by finance department.'
  },
  {
    id: 'inc_104',
    title: 'Bi-Weekly Architecture Advisory',
    source: 'SaaS Labs',
    amount: 18000,
    expectedDate: '2026-11-04',
    actualDate: null,
    status: 'confirmed',
    recurring: 'bi-weekly',
    notes: 'Ongoing architecture sprint retainer.'
  },
  {
    id: 'inc_105',
    title: 'Brand Identity Pitch (Stealth Co)',
    source: 'Stealth AI Startup',
    amount: 35000,
    expectedDate: '2026-11-12',
    actualDate: null,
    status: 'uncertain',
    recurring: 'one-time',
    notes: 'Shortlisted among 3 finalists. Awaiting board decision.'
  }
];

export const INITIAL_EXPENSES = [
  {
    id: 'exp_201',
    title: 'Studio Workspace & Office Rent',
    category: 'Rent',
    amount: 22000,
    dueDate: '2026-10-22',
    isEssential: true,
    priority: 'critical',
    recurring: 'monthly',
    lateFee: 1500,
    gracePeriod: 3,
    status: 'unpaid',
    notes: 'Landlord requires bank transfer before 25th.'
  },
  {
    id: 'exp_202',
    title: 'Workstation & Hardware Loan EMI',
    category: 'EMI or loan',
    amount: 8500,
    dueDate: '2026-10-20',
    isEssential: true,
    priority: 'critical',
    recurring: 'monthly',
    lateFee: 1200,
    gracePeriod: 0,
    status: 'unpaid',
    emiDetails: { remainingInstallments: 6, totalTenure: 12 },
    notes: 'Auto-debit from primary account. CIBIL impact if missed.'
  },
  {
    id: 'exp_203',
    title: 'Commercial Fiber Internet',
    category: 'Utilities',
    amount: 2400,
    dueDate: '2026-10-24',
    isEssential: true,
    priority: 'high',
    recurring: 'monthly',
    lateFee: 200,
    gracePeriod: 5,
    status: 'unpaid',
    notes: 'Broadband connection for remote client meetings.'
  },
  {
    id: 'exp_204',
    title: 'AWS Cloud Compute & Vercel Hosting',
    category: 'Subscriptions',
    amount: 4800,
    dueDate: '2026-10-26',
    isEssential: true,
    priority: 'high',
    recurring: 'monthly',
    lateFee: 0,
    gracePeriod: 7,
    status: 'unpaid',
    notes: 'Client staging demo environment infrastructure.'
  },
  {
    id: 'exp_205',
    title: 'Health & Critical Medical Insurance',
    category: 'Insurance',
    amount: 5500,
    dueDate: '2026-10-28',
    isEssential: true,
    priority: 'high',
    recurring: 'quarterly',
    lateFee: 500,
    gracePeriod: 10,
    status: 'unpaid',
    notes: 'Family health coverage quarterly premium.'
  },
  {
    id: 'exp_206',
    title: 'Adobe Creative Cloud & Figma Pro',
    category: 'Subscriptions',
    amount: 3200,
    dueDate: '2026-10-29',
    isEssential: false,
    priority: 'low',
    recurring: 'monthly',
    lateFee: 0,
    gracePeriod: 5,
    status: 'unpaid',
    notes: 'Can be downgraded or deferred if cash flow is constrained.'
  },
  {
    id: 'exp_207',
    title: 'Staging Server Backup (Paid)',
    category: 'Subscriptions',
    amount: 1500,
    dueDate: '2026-10-08',
    paidDate: '2026-10-08',
    isEssential: true,
    status: 'paid',
    notes: 'Cleared at beginning of month.'
  },
  {
    id: 'exp_208',
    title: 'Household & Pantry Staples (Paid)',
    category: 'Groceries',
    amount: 12000,
    dueDate: '2026-10-10',
    paidDate: '2026-10-10',
    isEssential: true,
    status: 'paid',
    notes: 'Monthly essential food supplies cleared.'
  }
];

export const INITIAL_LEAN_SAVINGS = {
  weeks: 4,
  expectedLowIncomePerWeek: 5000,
  essentialWeeklyExpenses: 12000,
  currentDesignatedReserve: 14000,
  weeklyContribution: 3500
};

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_01',
    title: 'EMI Due in 3 Days',
    description: 'Workstation Loan EMI of ₹8,500 is due on 20 October. Auto-debit will trigger.',
    relatedRecord: 'exp_202',
    date: '2026-10-17',
    severity: 'critical',
    isRead: false,
    actionPage: 'expenses'
  },
  {
    id: 'notif_02',
    title: 'Confirmed Invoice Approaching',
    description: 'Milestone 2 Deliverable (₹55,000) expected on 25 October. Track in Delay Simulator.',
    relatedRecord: 'inc_103',
    date: '2026-10-16',
    severity: 'info',
    isRead: false,
    actionPage: 'simulator'
  },
  {
    id: 'notif_03',
    title: 'Lean-Week Savings Update',
    description: 'Your designated reserve is ₹14,000 (50% of your 4-week target of ₹28,000).',
    relatedRecord: 'lean_savings',
    date: '2026-10-15',
    severity: 'info',
    isRead: true,
    actionPage: 'savings'
  }
];

export const storageService = {
  get(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return fallback;
      const parsed = JSON.parse(data);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage set failed:', e);
    }
  },
  resetAll() {
    this.set(STORAGE_KEYS.USER_PROFILE, INITIAL_USER);
    this.set(STORAGE_KEYS.PREFERENCES, INITIAL_PREFERENCES);
    this.set(STORAGE_KEYS.INCOMES, INITIAL_INCOMES);
    this.set(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    this.set(STORAGE_KEYS.SAVINGS_GOALS, INITIAL_LEAN_SAVINGS);
    this.set(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    this.set(STORAGE_KEYS.SAVED_SIMULATIONS, []);
  },
  KEYS: STORAGE_KEYS
};
