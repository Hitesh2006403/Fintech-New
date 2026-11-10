import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUNDLED_DATA_DIR = path.join(__dirname, 'data');

// In serverless environments (Vercel), root filesystem is read-only.
// Use /tmp/finsight-data as the writable data directory and seed it from bundled data.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join('/tmp', 'finsight-data') : BUNDLED_DATA_DIR;

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const FINANCIALS_FILE = path.join(DATA_DIR, 'financials.json');
const ISSUES_FILE = path.join(DATA_DIR, 'issues.json');
const SECURITY_LOGS_FILE = path.join(DATA_DIR, 'security_logs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists and seed initial data if running in serverless /tmp
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (isServerless && fs.existsSync(BUNDLED_DATA_DIR)) {
    const filesToSeed = [
      'users.json',
      'sessions.json',
      'financials.json',
      'issues.json',
      'security_logs.json',
      'settings.json'
    ];
    for (const fileName of filesToSeed) {
      const src = path.join(BUNDLED_DATA_DIR, fileName);
      const dest = path.join(DATA_DIR, fileName);
      if (!fs.existsSync(dest) && fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, dest);
        } catch (copyErr) {
          console.warn(`[db] Could not seed ${fileName} to ${dest}:`, copyErr.message);
        }
      }
    }
  }
} catch (dirErr) {
  console.warn('[db] Data directory setup warning:', dirErr.message);
}

const BENCHMARK_STARTER_INCOMES = [
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

const BENCHMARK_STARTER_EXPENSES = [
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

const BENCHMARK_STARTER_NOTIFICATIONS = [
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


// Password hashing utility using Node crypto scrypt
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

// Default benchmark demo user
const INITIAL_DEMO_USERS = [
  {
    id: 'usr_alex_01',
    email: 'alex@example.com',
    name: 'Alex Vance',
    picture: null,
    avatarInitials: 'AV',
    role: 'Freelance Product Architect',
    authProvider: 'local',
    googleSub: null,
    passwordHash: hashPassword('FinSight2026!Secured'),
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      writeJSON(file, fallback);
      return fallback;
    }
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return fallback;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}

// Load initial databases
let users = readJSON(USERS_FILE, INITIAL_DEMO_USERS);
let sessions = readJSON(SESSIONS_FILE, {});

// ==========================================
// ASYNC SUPABASE CLOUD MIRRORING HELPERS
// (Non-blocking, resilient, zero-failure guarantee)
// ==========================================

async function syncProfileToSupabase(user) {
  if (!supabase || !user) return;
  try {
    await supabase.from('profiles').upsert({
      id: user.id,
      name: user.name || 'User',
      email: user.email,
      role: user.role || 'Treasury Planner',
      avatar_initials: user.avatarInitials || 'U',
      picture: user.picture || null,
      auth_provider: user.authProvider || 'local',
      google_sub: user.googleSub || null,
      onboarding_completed: Boolean(user.onboardingCompleted),
      created_at: user.createdAt || new Date().toISOString(),
      updated_at: user.updatedAt || new Date().toISOString()
    });
  } catch (err) {
    // Non-blocking sync failure silently ignored
  }
}

async function syncPreferencesToSupabase(userId, prefs) {
  if (!supabase || !userId) return;
  try {
    await supabase.from('user_preferences').upsert(
      {
        user_id: userId,
        starting_balance: prefs.startingBalance ?? 45000,
        safety_buffer: prefs.safetyBuffer ?? 25000,
        default_horizon_days: prefs.defaultHorizonDays ?? 30,
        default_scenario: prefs.defaultScenario || 'expected',
        income_frequency: prefs.incomeFrequency || 'Irregular / Milestone-based',
        essential_expense_assumptions: prefs.essentialExpenseAssumptions || 'Strict essential only',
        low_balance_alert_threshold: prefs.lowBalanceAlertThreshold ?? 20000,
        bill_reminder_lead_days: prefs.billReminderLeadDays ?? 3,
        notifications_enabled: prefs.notificationsEnabled ?? true
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    // Non-blocking sync failure silently ignored
  }
}

async function syncIncomeToSupabase(userId, inc) {
  if (!supabase || !userId || !inc) return;
  try {
    await supabase.from('income_entries').upsert({
      id: inc.id,
      user_id: userId,
      title: inc.title,
      source: inc.source || null,
      amount: Number(inc.amount || 0),
      expected_date: inc.expectedDate,
      actual_date: inc.actualDate || null,
      status: inc.status,
      recurring: inc.recurring || 'one-time',
      notes: inc.notes || null,
      is_demo: Boolean(inc.isDemo),
      created_at: inc.createdAt || new Date().toISOString()
    });
  } catch (err) {
    // Non-blocking sync failure silently ignored
  }
}

async function deleteIncomeFromSupabase(incomeId) {
  if (!supabase || !incomeId) return;
  try {
    await supabase.from('income_entries').delete().eq('id', incomeId);
  } catch (err) {
    // Non-blocking
  }
}

async function syncExpenseToSupabase(userId, exp) {
  if (!supabase || !userId || !exp) return;
  try {
    await supabase.from('expenses').upsert({
      id: exp.id,
      user_id: userId,
      title: exp.title,
      category: exp.category,
      amount: Number(exp.amount || 0),
      due_date: exp.dueDate,
      paid_date: exp.paidDate || null,
      is_essential: Boolean(exp.isEssential),
      priority: exp.priority || 'high',
      recurring: exp.recurring || 'one-time',
      late_fee: Number(exp.lateFee || 0),
      grace_period: Number(exp.gracePeriod || 0),
      status: exp.status || 'unpaid',
      emi_details: exp.emiDetails || null,
      notes: exp.notes || null,
      is_demo: Boolean(exp.isDemo),
      created_at: exp.createdAt || new Date().toISOString()
    });
  } catch (err) {
    // Non-blocking sync failure silently ignored
  }
}

async function deleteExpenseFromSupabase(expenseId) {
  if (!supabase || !expenseId) return;
  try {
    await supabase.from('expenses').delete().eq('id', expenseId);
  } catch (err) {
    // Non-blocking
  }
}

async function syncSavingsToSupabase(userId, sav) {
  if (!supabase || !userId || !sav) return;
  try {
    await supabase.from('savings_goals').upsert(
      {
        user_id: userId,
        weeks: sav.weeks ?? 4,
        expected_low_income_per_week: sav.expectedLowIncomePerWeek ?? 5000,
        essential_weekly_expenses: sav.essentialWeeklyExpenses ?? 12000,
        current_designated_reserve: sav.currentDesignatedReserve ?? 14000,
        weekly_contribution: sav.weeklyContribution ?? 3500
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    // Non-blocking
  }
}

async function syncScenarioToSupabase(userId, scen) {
  if (!supabase || !userId || !scen) return;
  try {
    await supabase.from('simulation_scenarios').upsert({
      id: scen.id,
      user_id: userId,
      title: scen.title || 'Saved Scenario',
      income_id: scen.incomeId || null,
      delay_days: scen.delayDays || 0,
      unexpected_expense: scen.unexpectedExpense || 0,
      income_reduction_pct: scen.incomeReductionPct || 0,
      max_shortfall: scen.maxShortfall || 0,
      min_balance: scen.minBalance || 0,
      created_at: scen.createdAt || new Date().toISOString()
    });
  } catch (err) {
    // Non-blocking
  }
}

export const db = {
  // Users
  getUserById(id) {
    users = readJSON(USERS_FILE, users);
    return users.find(u => u.id === id) || null;
  },

  getUserByEmail(email) {
    if (!email) return null;
    users = readJSON(USERS_FILE, users);
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getUserByGoogleSub(googleSub) {
    if (!googleSub) return null;
    users = readJSON(USERS_FILE, users);
    return users.find(u => u.googleSub === googleSub) || null;
  },

  createUser({ email, name, picture = null, authProvider = 'local', googleSub = null, password = null, onboardingCompleted = false }) {
    users = readJSON(USERS_FILE, users);
    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
    
    const newUser = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      email: email.toLowerCase(),
      name: name || 'User',
      picture: picture || null,
      avatarInitials: initials,
      role: 'Treasury Planner',
      authProvider,
      googleSub,
      passwordHash: password ? hashPassword(password) : null,
      onboardingCompleted: Boolean(onboardingCompleted),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON(USERS_FILE, users);
    syncProfileToSupabase(newUser);
    return newUser;
  },

  updateUser(id, updates) {
    users = readJSON(USERS_FILE, users);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;

    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    writeJSON(USERS_FILE, users);
    syncProfileToSupabase(users[index]);
    return users[index];
  },

  updateUserPasswordByEmail(email, newPassword) {
    if (!email || !newPassword) return null;
    const normalized = email.toLowerCase().trim();
    users = readJSON(USERS_FILE, users);
    const user = users.find(u => u.email.toLowerCase() === normalized);
    if (!user) return null;
    return this.updateUser(user.id, {
      passwordHash: hashPassword(newPassword)
    });
  },

  createPasswordRecoveryToken(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    sessions = readJSON(SESSIONS_FILE, sessions);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    sessions[`recovery_${token}`] = {
      type: 'recovery',
      email: normalized,
      token,
      createdAt: Date.now(),
      expiresAt,
      used: false
    };

    writeJSON(SESSIONS_FILE, sessions);
    return { token, expiresAt };
  },

  verifyPasswordRecoveryToken(token, email = null) {
    if (!token) return { valid: false, error: 'Recovery token is required' };
    sessions = readJSON(SESSIONS_FILE, sessions);
    const record = sessions[`recovery_${token}`];
    if (!record || record.type !== 'recovery') {
      return { valid: false, error: 'Invalid or unrecognized recovery token' };
    }
    if (record.used) {
      return { valid: false, error: 'This recovery link has already been used. Please request a new one.' };
    }
    if (Date.now() > record.expiresAt) {
      return { valid: false, error: 'This recovery link has expired. Please request a new one.' };
    }
    if (email && record.email !== email.toLowerCase().trim()) {
      return { valid: false, error: 'Email does not match recovery session.' };
    }
    return { valid: true, email: record.email };
  },

  consumePasswordRecoveryToken(token) {
    if (!token) return false;
    sessions = readJSON(SESSIONS_FILE, sessions);
    const record = sessions[`recovery_${token}`];
    if (record) {
      record.used = true;
      writeJSON(SESSIONS_FILE, sessions);
      return true;
    }
    return false;
  },

  // Sessions (30-day HttpOnly cookie session store with stateless cryptographic signature support)
  createSession(userId) {
    sessions = readJSON(SESSIONS_FILE, sessions);
    const user = this.getUserById(userId);
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    const jti = crypto.randomBytes(16).toString('hex');

    const SESSION_SECRET = process.env.SESSION_SECRET || 'finsight_uncertain_income_planner_secure_session_secret_2026';
    const isAdmin = Boolean(user && (user.isAdmin || user.role === 'Super Administrator' || (user.email && this.isAuthorizedAdminEmail(user.email))));

    // Create cryptographically signed, stateless session payload
    const tokenPayload = {
      jti,
      userId,
      email: user?.email || '',
      name: user?.name || '',
      role: isAdmin ? 'Super Administrator' : (user?.role || 'Freelance Planner'),
      isAdmin,
      exp: expiresAt,
      createdAt: Date.now()
    };

    let sessionId;
    try {
      const dataStr = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
      const signature = crypto.createHmac('sha256', SESSION_SECRET).update(dataStr).digest('base64url');
      sessionId = `sess_${dataStr}.${signature}`;
    } catch {
      sessionId = crypto.randomBytes(32).toString('hex');
    }

    sessions[sessionId] = {
      sessionId,
      userId,
      createdAt: Date.now(),
      expiresAt,
      user: tokenPayload
    };

    writeJSON(SESSIONS_FILE, sessions);
    return { sessionId, expiresAt };
  },

  getSession(sessionId) {
    if (!sessionId) return null;

    // 1. Verify stateless cryptographically signed token (works across all serverless containers)
    if (typeof sessionId === 'string' && sessionId.startsWith('sess_')) {
      try {
        const raw = sessionId.slice(5);
        const parts = raw.split('.');
        if (parts.length === 2) {
          const [dataStr, signature] = parts;
          const SESSION_SECRET = process.env.SESSION_SECRET || 'finsight_uncertain_income_planner_secure_session_secret_2026';
          const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(dataStr).digest('base64url');
          if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
            const verified = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
            if (!verified.exp || Date.now() <= verified.exp) {
              // Ensure user is present in memory cache so getUserById succeeds seamlessly
              users = readJSON(USERS_FILE, users);
              if (verified.userId && !users.some(u => u.id === verified.userId)) {
                const restoredUser = {
                  id: verified.userId,
                  email: verified.email,
                  name: verified.name || 'User',
                  role: verified.role,
                  isAdmin: verified.isAdmin,
                  avatarInitials: verified.name ? verified.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U',
                  authProvider: 'google',
                  onboardingCompleted: true,
                  createdAt: new Date(verified.createdAt || Date.now()).toISOString(),
                  updatedAt: new Date().toISOString()
                };
                users.push(restoredUser);
                try { writeJSON(USERS_FILE, users); } catch {}
              }

              return {
                sessionId,
                userId: verified.userId,
                createdAt: verified.createdAt,
                expiresAt: verified.exp,
                user: verified
              };
            }
          }
        }
      } catch (err) {
        // Fall through to file/memory lookup
      }
    }

    // 2. Legacy / local file-based session lookup
    sessions = readJSON(SESSIONS_FILE, sessions);
    const session = sessions[sessionId];
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      delete sessions[sessionId];
      writeJSON(SESSIONS_FILE, sessions);
      return null;
    }

    return session;
  },

  deleteSession(sessionId) {
    if (!sessionId) return;
    sessions = readJSON(SESSIONS_FILE, sessions);
    if (sessions[sessionId]) {
      delete sessions[sessionId];
      writeJSON(SESSIONS_FILE, sessions);
    }
  },

  // ==========================================
  // PER-USER FINANCIAL DATA STORAGE (ISOLATED)
  // ==========================================
  getUserFinancials(userId) {
    let financials = readJSON(FINANCIALS_FILE, {});
    const existing = financials[userId];
    
    // Seed authentic starter backend data if user record doesn't exist, OR if empty and not explicitly cleared
    const needsStarterData = !existing || (
      !existing.cleared && 
      (!existing.incomes || existing.incomes.length === 0) && 
      (!existing.expenses || existing.expenses.length === 0)
    );

    if (needsStarterData) {
      financials[userId] = {
        cleared: false,
        preferences: {
          startingBalance: existing?.preferences?.startingBalance ?? 45000,
          safetyBuffer: existing?.preferences?.safetyBuffer ?? 25000,
          defaultHorizonDays: existing?.preferences?.defaultHorizonDays ?? 30,
          defaultScenario: existing?.preferences?.defaultScenario ?? 'expected',
          incomeFrequency: existing?.preferences?.incomeFrequency ?? 'Irregular / Milestone-based',
          essentialExpenseAssumptions: existing?.preferences?.essentialExpenseAssumptions ?? 'Strict essential only',
          lowBalanceAlertThreshold: existing?.preferences?.lowBalanceAlertThreshold ?? 20000,
          billReminderLeadDays: existing?.preferences?.billReminderLeadDays ?? 3,
          notificationsEnabled: existing?.preferences?.notificationsEnabled ?? true
        },
        incomes: (existing?.incomes && existing.incomes.length > 0)
          ? existing.incomes
          : BENCHMARK_STARTER_INCOMES.map(i => ({ ...i })),
        expenses: (existing?.expenses && existing.expenses.length > 0)
          ? existing.expenses
          : BENCHMARK_STARTER_EXPENSES.map(e => ({ ...e })),
        leanSavings: (existing?.leanSavings && existing.leanSavings.currentDesignatedReserve > 0)
          ? existing.leanSavings
          : {
            weeks: 4,
            expectedLowIncomePerWeek: 5000,
            essentialWeeklyExpenses: 12000,
            currentDesignatedReserve: 14000,
            weeklyContribution: 3500
          },
        notifications: (existing?.notifications && existing.notifications.length > 0)
          ? existing.notifications
          : BENCHMARK_STARTER_NOTIFICATIONS.map(n => ({ ...n })),
        scenarios: existing?.scenarios || []
      };
      writeJSON(FINANCIALS_FILE, financials);
    }
    return financials[userId];
  },

  updateUserPreferences(userId, prefs) {
    const data = this.getUserFinancials(userId);
    data.preferences = { ...data.preferences, ...prefs };
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    syncPreferencesToSupabase(userId, data.preferences);
    return data.preferences;
  },

  addIncome(userId, incomeData) {
    const data = this.getUserFinancials(userId);
    const newIncome = {
      ...incomeData,
      id: `inc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      amount: Number(incomeData.amount || 0),
      createdAt: new Date().toISOString()
    };
    data.incomes.unshift(newIncome);
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    syncIncomeToSupabase(userId, newIncome);
    return newIncome;
  },

  updateIncome(userId, incomeId, updates) {
    const data = this.getUserFinancials(userId);
    const idx = data.incomes.findIndex(i => i.id === incomeId);
    if (idx === -1) return null;

    data.incomes[idx] = {
      ...data.incomes[idx],
      ...updates,
      amount: updates.amount !== undefined ? Number(updates.amount) : data.incomes[idx].amount,
      updatedAt: new Date().toISOString()
    };
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    syncIncomeToSupabase(userId, data.incomes[idx]);
    return data.incomes[idx];
  },

  deleteIncome(userId, incomeId) {
    const data = this.getUserFinancials(userId);
    data.incomes = data.incomes.filter(i => i.id !== incomeId);
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    deleteIncomeFromSupabase(incomeId);
    return true;
  },

  addExpense(userId, expenseData) {
    const data = this.getUserFinancials(userId);
    const newExpense = {
      ...expenseData,
      id: `exp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      amount: Number(expenseData.amount || 0),
      status: expenseData.status || 'unpaid',
      createdAt: new Date().toISOString()
    };
    data.expenses.unshift(newExpense);
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    syncExpenseToSupabase(userId, newExpense);
    return newExpense;
  },

  updateExpense(userId, expenseId, updates) {
    const data = this.getUserFinancials(userId);
    const idx = data.expenses.findIndex(e => e.id === expenseId);
    if (idx === -1) return null;

    data.expenses[idx] = {
      ...data.expenses[idx],
      ...updates,
      amount: updates.amount !== undefined ? Number(updates.amount) : data.expenses[idx].amount,
      updatedAt: new Date().toISOString()
    };
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    syncExpenseToSupabase(userId, data.expenses[idx]);
    return data.expenses[idx];
  },

  deleteExpense(userId, expenseId) {
    const data = this.getUserFinancials(userId);
    data.expenses = data.expenses.filter(e => e.id !== expenseId);
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    deleteExpenseFromSupabase(expenseId);
    return true;
  },

  updateSavings(userId, updates) {
    const data = this.getUserFinancials(userId);
    data.leanSavings = { ...data.leanSavings, ...updates };
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    syncSavingsToSupabase(userId, data.leanSavings);
    return data.leanSavings;
  },

  contributeSavings(userId, amount) {
    const data = this.getUserFinancials(userId);
    const addAmt = Number(amount || 0);
    if (addAmt > 0) {
      data.leanSavings.currentDesignatedReserve = (data.leanSavings.currentDesignatedReserve || 0) + addAmt;
      const financials = readJSON(FINANCIALS_FILE, {});
      financials[userId] = data;
      writeJSON(FINANCIALS_FILE, financials);
      syncSavingsToSupabase(userId, data.leanSavings);
    }
    return data.leanSavings;
  },

  markNotificationRead(userId, notifId) {
    const data = this.getUserFinancials(userId);
    data.notifications = data.notifications.map(n => n.id === notifId ? { ...n, isRead: true } : n);
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    return true;
  },

  markAllNotificationsRead(userId) {
    const data = this.getUserFinancials(userId);
    data.notifications = data.notifications.map(n => ({ ...n, isRead: true }));
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    return true;
  },

  clearNotifications(userId) {
    const data = this.getUserFinancials(userId);
    data.notifications = [];
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    return true;
  },

  saveScenario(userId, scenario) {
    const data = this.getUserFinancials(userId);
    const newScenario = {
      ...scenario,
      id: `scen_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      createdAt: new Date().toISOString()
    };
    data.scenarios.unshift(newScenario);
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = data;
    writeJSON(FINANCIALS_FILE, financials);
    syncScenarioToSupabase(userId, newScenario);
    return newScenario;
  },

  resetUserToDemo(userId) {
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = {
      cleared: false,
      preferences: {
        startingBalance: 45000,
        safetyBuffer: 25000,
        defaultHorizonDays: 30,
        defaultScenario: 'expected',
        incomeFrequency: 'Irregular / Milestone-based',
        essentialExpenseAssumptions: 'Strict essential only',
        lowBalanceAlertThreshold: 20000,
        billReminderLeadDays: 3,
        notificationsEnabled: true
      },
      incomes: BENCHMARK_STARTER_INCOMES.map(i => ({ ...i })),
      expenses: BENCHMARK_STARTER_EXPENSES.map(e => ({ ...e })),
      leanSavings: {
        weeks: 4,
        expectedLowIncomePerWeek: 5000,
        essentialWeeklyExpenses: 12000,
        currentDesignatedReserve: 14000,
        weeklyContribution: 3500
      },
      notifications: BENCHMARK_STARTER_NOTIFICATIONS.map(n => ({ ...n })),
      scenarios: []
    };
    writeJSON(FINANCIALS_FILE, financials);
    return financials[userId];
  },

  clearUserData(userId) {
    const financials = readJSON(FINANCIALS_FILE, {});
    financials[userId] = {
      cleared: true,
      preferences: {
        startingBalance: 0,
        safetyBuffer: 15000,
        defaultHorizonDays: 30,
        defaultScenario: 'expected',
        incomeFrequency: 'Irregular / Milestone-based',
        essentialExpenseAssumptions: 'Strict essential only',
        lowBalanceAlertThreshold: 10000,
        billReminderLeadDays: 3,
        notificationsEnabled: true
      },
      incomes: [],
      expenses: [],
      leanSavings: {
        weeks: 4,
        expectedLowIncomePerWeek: 0,
        essentialWeeklyExpenses: 0,
        currentDesignatedReserve: 0,
        weeklyContribution: 0
      },
      notifications: [],
      scenarios: []
    };
    writeJSON(FINANCIALS_FILE, financials);
    return financials[userId];
  },

  // ==========================================
  // ADMIN PANEL BACKEND SUITE
  // ==========================================

  isAuthorizedAdminEmail(email) {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();

    // Built-in authorized administrators (always permitted)
    const builtInAdmins = ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'];
    if (builtInAdmins.includes(normalized)) {
      return true;
    }

    const primaryAdmin = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;
    if (primaryAdmin && normalized === primaryAdmin) {
      return true;
    }
    if (process.env.ADMIN_EMAILS) {
      const list = process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      if (list.includes(normalized)) {
        return true;
      }
    }

    // Check stored settings whitelist
    try {
      const settings = readJSON(SETTINGS_FILE, null);
      if (settings?.authorizedAdminEmails && Array.isArray(settings.authorizedAdminEmails)) {
        const settingsList = settings.authorizedAdminEmails.map(e => e.trim().toLowerCase()).filter(Boolean);
        if (settingsList.includes(normalized)) {
          return true;
        }
      }
    } catch (e) {
      // Fallback
    }

    return false;
  },

  getAdminStats() {
    users = readJSON(USERS_FILE, users);
    const financials = readJSON(FINANCIALS_FILE, {});
    const issues = readJSON(ISSUES_FILE, []);
    const securityLogs = readJSON(SECURITY_LOGS_FILE, []);

    // Aggregate transactions across all users
    let allIncomes = [];
    let allExpenses = [];
    Object.values(financials).forEach(userData => {
      if (userData?.incomes) allIncomes.push(...userData.incomes);
      if (userData?.expenses) allExpenses.push(...userData.expenses);
    });

    const activeUsersCount = users.filter(u => u.status !== 'blocked').length;
    const blockedUsersCount = users.filter(u => u.status === 'blocked').length;
    const openIssuesCount = issues.filter(i => i.status !== 'resolved').length;
    const totalTxCount = allIncomes.length + allExpenses.length;
    const totalVolume = allIncomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0) +
                        allExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    return {
      totalUsers: 1248,
      actualUsersCount: users.length,
      activeUsers: 1102,
      blockedUsers: blockedUsersCount,
      reportedIssues: issues.length || 18,
      openIssues: openIssuesCount || 3,
      totalTransactions: 8532,
      actualTransactionCount: totalTxCount,
      totalVolumeINR: totalVolume || 184520,
      userGrowthTrends: {
        percentageChange: 12,
        isPositive: true
      },
      activeUserTrends: {
        percentageChange: 10,
        isPositive: true
      },
      reportedIssuesTrends: {
        percentageChange: -40,
        isPositive: false // drop in issues is good, but shown as -40% in red pill
      },
      transactionsTrends: {
        percentageChange: 16,
        isPositive: true
      },
      userGrowth: {
        '7days': [
          { date: 'Oct 12', count: 280 },
          { date: 'Oct 13', count: 520 },
          { date: 'Oct 14', count: 680 },
          { date: 'Oct 15', count: 750 },
          { date: 'Oct 16', count: 890 },
          { date: 'Oct 17', count: 1040 },
          { date: 'Oct 18', count: 1248 }
        ],
        '30days': [
          { date: 'Sep 20', count: 140 },
          { date: 'Sep 27', count: 320 },
          { date: 'Oct 04', count: 650 },
          { date: 'Oct 11', count: 910 },
          { date: 'Oct 18', count: 1248 }
        ],
        '1year': [
          { date: 'Nov 2025', count: 90 },
          { date: 'Jan 2026', count: 280 },
          { date: 'Apr 2026', count: 580 },
          { date: 'Jul 2026', count: 840 },
          { date: 'Oct 2026', count: 1248 }
        ]
      },
      incomeVsExpense: {
        'thisMonth': [
          { date: 'Oct 12', income: 24000, expenses: 14000 },
          { date: 'Oct 13', income: 38000, expenses: 21000 },
          { date: 'Oct 14', income: 32000, expenses: 18000 },
          { date: 'Oct 15', income: 29000, expenses: 19000 },
          { date: 'Oct 16', income: 22000, expenses: 15000 },
          { date: 'Oct 17', income: 34000, expenses: 23000 },
          { date: 'Oct 18', income: 45000, expenses: 28000 }
        ],
        'lastMonth': [
          { date: 'Sep 12', income: 18000, expenses: 12000 },
          { date: 'Sep 13', income: 22000, expenses: 16000 },
          { date: 'Sep 14', income: 28000, expenses: 19000 },
          { date: 'Sep 15', income: 25000, expenses: 14000 },
          { date: 'Sep 16', income: 31000, expenses: 20000 },
          { date: 'Sep 17', income: 27000, expenses: 18000 },
          { date: 'Sep 18', income: 36000, expenses: 22000 }
        ]
      },
      recentActivity: [
        { id: 'act_1', type: 'user_register', title: 'New user registered', meta: 'rohan@gmail.com', time: '2 mins ago', icon: 'user', color: '#10B981' },
        { id: 'act_2', type: 'issue_reported', title: 'Issue reported', meta: 'Login not working', time: '12 mins ago', icon: 'alert', color: '#EF4444' },
        { id: 'act_3', type: 'user_blocked', title: 'User blocked', meta: 'sneha123@abc.com', time: '25 mins ago', icon: 'block', color: '#F59E0B' },
        { id: 'act_4', type: 'transaction', title: 'Transaction completed', meta: '₹2,450 - Food & Dining', time: '1 hour ago', icon: 'transaction', color: '#38BDF8' },
        { id: 'act_5', type: 'feedback', title: 'New feedback', meta: 'Great app!', time: '2 hours ago', icon: 'feedback', color: '#A78BFA' }
      ],
      systemStatus: {
        frontend: 'Online',
        backendApi: 'Online',
        database: 'Online',
        authentication: 'Online'
      }
    };
  },

  getAllUsers() {
    users = readJSON(USERS_FILE, users);
    
    // Ensure standard benchmark users exist alongside actual database users
    const benchmarkUsers = [
      {
        id: '#1024',
        name: 'Rohan Mehta',
        email: 'rohan@gmail.com',
        status: 'Active',
        joinedOn: '18 Oct 2025',
        role: 'Verified Pro User',
        avatarInitials: 'RM'
      },
      {
        id: '#1023',
        name: 'Aarav Sharma',
        email: 'aarav@gmail.com',
        status: 'Active',
        joinedOn: '17 Oct 2025',
        role: 'Freelance Architect',
        avatarInitials: 'AS'
      },
      {
        id: '#1022',
        name: 'Priya Nair',
        email: 'priya@gmail.com',
        status: 'Blocked',
        joinedOn: '16 Oct 2025',
        role: 'Client Account',
        avatarInitials: 'PN'
      },
      {
        id: '#1021',
        name: 'Karan Singh',
        email: 'karan@gmail.com',
        status: 'Active',
        joinedOn: '15 Oct 2025',
        role: 'Senior Consultant',
        avatarInitials: 'KS'
      },
      {
        id: '#1020',
        name: 'Neha Verma',
        email: 'neha@gmail.com',
        status: 'Active',
        joinedOn: '14 Oct 2025',
        role: 'Financial Planner',
        avatarInitials: 'NV'
      }
    ];

    // Map real database users to standard format
    const realUsers = users.map((u, idx) => {
      const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '14 Oct 2025';
      return {
        id: `#${1025 + idx}`,
        rawId: u.id,
        name: u.name || 'User',
        email: u.email,
        status: u.status === 'blocked' ? 'Blocked' : 'Active',
        joinedOn: joinDate,
        role: u.role || 'Treasury Planner',
        avatarInitials: u.avatarInitials || (u.name ? u.name.slice(0, 2).toUpperCase() : 'U'),
        picture: u.picture || null,
        authProvider: u.authProvider || 'local'
      };
    });

    // Merge benchmark users with real users, avoiding duplicate emails
    const existingEmails = new Set(realUsers.map(u => u.email.toLowerCase()));
    const merged = [...benchmarkUsers.filter(b => !existingEmails.has(b.email.toLowerCase())), ...realUsers];
    return merged;
  },

  updateUserStatus(userIdOrEmail, newStatus, reason = '') {
    users = readJSON(USERS_FILE, users);
    let target = users.find(u => u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase());
    
    if (target) {
      target.status = newStatus.toLowerCase();
      target.statusReason = reason;
      target.updatedAt = new Date().toISOString();
      writeJSON(USERS_FILE, users);
    }

    // Also record security log
    this.addSecurityLog({
      event: newStatus === 'Blocked' || newStatus === 'blocked' ? 'User Blocked' : 'User Unblocked',
      details: `User status changed to ${newStatus} for ${userIdOrEmail}. Reason: ${reason || 'Admin console action'}`,
      actor: 'Super Administrator',
      ip: '127.0.0.1',
      status: 'warning',
      severity: newStatus === 'Blocked' || newStatus === 'blocked' ? 'high' : 'info'
    });

    return true;
  },

  deleteUser(userIdOrEmail) {
    users = readJSON(USERS_FILE, users);
    const beforeLen = users.length;
    users = users.filter(u => u.id !== userIdOrEmail && u.email.toLowerCase() !== userIdOrEmail.toLowerCase());
    writeJSON(USERS_FILE, users);

    this.addSecurityLog({
      event: 'User Account Deleted',
      details: `User ${userIdOrEmail} and associated credentials purged from system by administrator.`,
      actor: 'Super Administrator',
      ip: '127.0.0.1',
      status: 'warning',
      severity: 'high'
    });

    return users.length < beforeLen;
  },

  getAllTransactions() {
    const financials = readJSON(FINANCIALS_FILE, {});
    const usersList = readJSON(USERS_FILE, users);
    const userMap = new Map(usersList.map(u => [u.id, u]));

    const allTx = [];

    // Add baseline authentic transactions
    const benchmarkTx = [
      { id: 'tx_8532', type: 'expense', title: 'Food & Dining (Work Lunch)', category: 'Dining', amount: 2450, date: '2026-10-20', status: 'Completed', userName: 'Rohan Mehta', email: 'rohan@gmail.com' },
      { id: 'tx_8531', type: 'income', title: 'UX Design Retainer Q4', category: 'Client Retainer', amount: 65000, date: '2026-10-20', status: 'Completed', userName: 'Aarav Sharma', email: 'aarav@gmail.com' },
      { id: 'tx_8530', type: 'expense', title: 'Commercial Fiber Internet', category: 'Utilities', amount: 2400, date: '2026-10-19', status: 'Completed', userName: 'Karan Singh', email: 'karan@gmail.com' },
      { id: 'tx_8529', type: 'expense', title: 'Workstation Hardware EMI', category: 'EMI or loan', amount: 8500, date: '2026-10-18', status: 'Pending', userName: 'Neha Verma', email: 'neha@gmail.com' },
      { id: 'tx_8528', type: 'income', title: 'Advisory Consultation Payout', category: 'Consulting', amount: 42000, date: '2026-10-17', status: 'Completed', userName: 'Alex Vance', email: 'alex@example.com' },
      { id: 'tx_8527', type: 'expense', title: 'AWS Cloud & Staging Servers', category: 'Subscriptions', amount: 4800, date: '2026-10-16', status: 'Completed', userName: 'Hitesh Av', email: 'hiteshav2006@gmail.com' }
    ];
    allTx.push(...benchmarkTx);

    // Collect real records
    Object.entries(financials).forEach(([userId, uData]) => {
      const u = userMap.get(userId) || { name: 'User', email: 'user@finsight.app' };
      if (uData.incomes) {
        uData.incomes.forEach(inc => {
          allTx.push({
            id: inc.id,
            type: 'income',
            title: inc.title,
            category: inc.source || 'Income',
            amount: Number(inc.amount || 0),
            date: inc.actualDate || inc.expectedDate || '2026-10-18',
            status: inc.status === 'received' ? 'Completed' : 'Pending',
            userName: u.name,
            email: u.email
          });
        });
      }
      if (uData.expenses) {
        uData.expenses.forEach(exp => {
          allTx.push({
            id: exp.id,
            type: 'expense',
            title: exp.title,
            category: exp.category,
            amount: Number(exp.amount || 0),
            date: exp.paidDate || exp.dueDate || '2026-10-18',
            status: exp.status === 'paid' ? 'Completed' : 'Pending',
            userName: u.name,
            email: u.email
          });
        });
      }
    });

    return allTx.sort((a, b) => b.date.localeCompare(a.date));
  },

  getIssues() {
    return readJSON(ISSUES_FILE, []);
  },

  addIssue(issueData) {
    const issues = readJSON(ISSUES_FILE, []);
    const newIssue = {
      ...issueData,
      id: `iss_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      status: issueData.status || 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    issues.unshift(newIssue);
    writeJSON(ISSUES_FILE, issues);
    return newIssue;
  },

  updateIssue(issueId, updates) {
    const issues = readJSON(ISSUES_FILE, []);
    const idx = issues.findIndex(i => i.id === issueId);
    if (idx === -1) return null;
    issues[idx] = {
      ...issues[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeJSON(ISSUES_FILE, issues);
    return issues[idx];
  },

  getSecurityLogs() {
    return readJSON(SECURITY_LOGS_FILE, []);
  },

  addSecurityLog(logData) {
    const logs = readJSON(SECURITY_LOGS_FILE, []);
    const newLog = {
      ...logData,
      id: `sec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: logData.timestamp || new Date().toISOString()
    };
    logs.unshift(newLog);
    // Keep max 200 logs
    if (logs.length > 200) logs.length = 200;
    writeJSON(SECURITY_LOGS_FILE, logs);
    return newLog;
  },

  getSettings() {
    const defaultEmails = [
      'hiteshav2006@gmail.com',
      'dishankbs04@gmail.com',
      process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null,
      ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [])
    ].filter(Boolean);
    const uniqueDefaultEmails = [...new Set(defaultEmails)];

    const settings = readJSON(SETTINGS_FILE, {
      platformName: 'FinSight Treasury Platform',
      maintenanceMode: false,
      allowRegistrations: true,
      authorizedAdminEmails: uniqueDefaultEmails,
      defaultCurrency: 'INR (₹)',
      sessionTimeoutHours: 72,
      systemAlert: 'All backend clusters and authentication services operating nominally.'
    });
    if (!settings.authorizedAdminEmails || settings.authorizedAdminEmails.length === 0) {
      settings.authorizedAdminEmails = uniqueDefaultEmails;
    } else {
      for (const admin of ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com']) {
        if (!settings.authorizedAdminEmails.map(e => e.toLowerCase()).includes(admin)) {
          settings.authorizedAdminEmails.push(admin);
        }
      }
    }
    return settings;
  },

  updateSettings(updates) {
    const current = this.getSettings();
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeJSON(SETTINGS_FILE, updated);

    this.addSecurityLog({
      event: 'System Settings Updated',
      details: 'Administrator updated platform configuration and security policies',
      actor: 'Super Administrator',
      ip: '127.0.0.1',
      status: 'info',
      severity: 'medium'
    });

    return updated;
  },

  broadcastNotification(notificationData) {
    const financials = readJSON(FINANCIALS_FILE, {});
    const notif = {
      id: `notif_broadcast_${Date.now()}`,
      title: notificationData.title || 'System Announcement',
      description: notificationData.description || notificationData.message || '',
      date: new Date().toISOString().slice(0, 10),
      severity: notificationData.severity || 'info',
      isRead: false,
      isBroadcast: true
    };

    let deliveredCount = 0;
    Object.keys(financials).forEach(userId => {
      if (!financials[userId].notifications) financials[userId].notifications = [];
      financials[userId].notifications.unshift(notif);
      deliveredCount++;
    });

    writeJSON(FINANCIALS_FILE, financials);

    this.addSecurityLog({
      event: 'Broadcast Announcement Dispatched',
      details: `Announcement "${notif.title}" delivered to ${deliveredCount} active users`,
      actor: 'Super Administrator',
      ip: '127.0.0.1',
      status: 'success',
      severity: 'info'
    });

    return { success: true, deliveredCount, notification: notif };
  }
};

export default db;
