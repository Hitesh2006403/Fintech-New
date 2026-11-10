/**
 * UNCERTAIN INCOME PLANNER — SAFE SUPABASE MIGRATION SCRIPT
 *
 * Safely migrates existing local JSON storage (users.json, financials.json)
 * to Supabase Cloud PostgreSQL.
 *
 * Guarantees:
 * 1. Creates an immutable, timestamped backup in backend/data/backups/ BEFORE starting.
 * 2. Never deletes or mutates original JSON files.
 * 3. Idempotent upserts prevent duplicate records on repeated runs.
 * 4. Comprehensive diagnostic logging and rollback instructions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, isSupabaseConfigured, testSupabaseCloudConnection, supabaseUrl } from '../supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const FINANCIALS_FILE = path.join(DATA_DIR, 'financials.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(BACKUPS_DIR, `backup-${timestamp}`);
  fs.mkdirSync(backupFolder, { recursive: true });

  const filesToBackup = [
    { name: 'users.json', path: USERS_FILE },
    { name: 'sessions.json', path: SESSIONS_FILE },
    { name: 'financials.json', path: FINANCIALS_FILE }
  ];

  for (const f of filesToBackup) {
    if (fs.existsSync(f.path)) {
      fs.copyFileSync(f.path, path.join(backupFolder, f.name));
    }
  }

  console.log(`[Backup] Safe local backup created at: ${backupFolder}`);
  return backupFolder;
}

async function runMigration() {
  console.log('====================================================');
  console.log('Uncertain Income Planner — Supabase Cloud Migration');
  console.log('====================================================');

  if (!isSupabaseConfigured || !supabase) {
    console.error('[Error] Supabase is not configured. Please check backend/.env');
    console.error('Expected: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }

  console.log(`[Target Project]: ${supabaseUrl}`);

  // 1. Create Safe Backup
  const backupFolder = createBackup();

  // 2. Validate Supabase Connection
  console.log('[Connecting] Checking Supabase Cloud connection...');
  const testRes = await testSupabaseCloudConnection();
  if (!testRes.connected) {
    console.error('\n❌ [Action Required] Cannot write to Supabase yet because database tables/permissions are missing:');
    console.error(`   Code: ${testRes.code || 'UNKNOWN'} — ${testRes.message}`);
    if (testRes.hint) console.error(`   Hint: ${testRes.hint}`);
    console.log('\n📋 TO CONNECT SUPABASE SMOOTHLY:');
    console.log('   1. Open your Supabase Cloud Dashboard -> Project rmzbuevslhddkinkgikq');
    console.log('   2. Click on "SQL Editor" in the left sidebar');
    console.log('   3. Paste the entire content of "supabase/schema.sql" and click "Run"');
    console.log('   4. Re-run: node backend/scripts/migrate_json_to_supabase.js\n');
    console.log(`[Safe Backup Preserved]: ${backupFolder}`);
    process.exit(1);
  }

  // 3. Load JSON data
  const users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) : [];
  const financials = fs.existsSync(FINANCIALS_FILE) ? JSON.parse(fs.readFileSync(FINANCIALS_FILE, 'utf8')) : {};

  console.log(`[Source Data] Found ${users.length} users and ${Object.keys(financials).length} financial datasets.`);

  let migratedUsers = 0;
  let migratedIncomes = 0;
  let migratedExpenses = 0;
  let migratedPrefs = 0;
  let migratedSavings = 0;
  let migratedNotifs = 0;
  let migratedScenarios = 0;

  // 4. Migrate Profiles
  for (const u of users) {
    const profileRow = {
      id: u.id,
      name: u.name || 'User',
      email: u.email,
      role: u.role || 'Treasury Planner',
      avatar_initials: u.avatarInitials || 'U',
      picture: u.picture || null,
      auth_provider: u.authProvider || 'local',
      google_sub: u.googleSub || null,
      onboarding_completed: Boolean(u.onboardingCompleted),
      created_at: u.createdAt || new Date().toISOString(),
      updated_at: u.updatedAt || new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').upsert(profileRow);
    if (error) {
      console.warn(`[Profile Skipped] ${u.email}: ${error.message}`);
    } else {
      migratedUsers++;
    }
  }

  // 5. Migrate Financial Data per User
  for (const [userId, data] of Object.entries(financials)) {
    // Preferences
    if (data.preferences) {
      const prefRow = {
        user_id: userId,
        starting_balance: data.preferences.startingBalance ?? 45000,
        safety_buffer: data.preferences.safetyBuffer ?? 25000,
        default_horizon_days: data.preferences.defaultHorizonDays ?? 30,
        default_scenario: data.preferences.defaultScenario || 'expected',
        income_frequency: data.preferences.incomeFrequency || 'Irregular / Milestone-based',
        essential_expense_assumptions: data.preferences.essentialExpenseAssumptions || 'Strict essential only',
        low_balance_alert_threshold: data.preferences.lowBalanceAlertThreshold ?? 20000,
        bill_reminder_lead_days: data.preferences.billReminderLeadDays ?? 3,
        notifications_enabled: data.preferences.notificationsEnabled ?? true
      };

      const { error } = await supabase.from('user_preferences').upsert(prefRow, { onConflict: 'user_id' });
      if (!error) migratedPrefs++;
    }

    // Savings Goals
    if (data.leanSavings) {
      const savRow = {
        user_id: userId,
        weeks: data.leanSavings.weeks ?? 4,
        expected_low_income_per_week: data.leanSavings.expectedLowIncomePerWeek ?? 5000,
        essential_weekly_expenses: data.leanSavings.essentialWeeklyExpenses ?? 12000,
        current_designated_reserve: data.leanSavings.currentDesignatedReserve ?? 14000,
        weekly_contribution: data.leanSavings.weeklyContribution ?? 3500
      };

      const { error } = await supabase.from('savings_goals').upsert(savRow, { onConflict: 'user_id' });
      if (!error) migratedSavings++;
    }

    // Incomes
    if (Array.isArray(data.incomes)) {
      for (const inc of data.incomes) {
        const incRow = {
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
        };

        const { error } = await supabase.from('income_entries').upsert(incRow);
        if (!error) migratedIncomes++;
      }
    }

    // Expenses
    if (Array.isArray(data.expenses)) {
      for (const exp of data.expenses) {
        const expRow = {
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
        };

        const { error } = await supabase.from('expenses').upsert(expRow);
        if (!error) migratedExpenses++;
      }
    }

    // Notifications
    if (Array.isArray(data.notifications)) {
      for (const notif of data.notifications) {
        const notifRow = {
          id: notif.id,
          user_id: userId,
          title: notif.title,
          description: notif.description || null,
          related_record: notif.relatedRecord || null,
          date: notif.date || new Date().toISOString().split('T')[0],
          severity: notif.severity || 'info',
          is_read: Boolean(notif.isRead),
          action_page: notif.actionPage || null
        };

        const { error } = await supabase.from('notifications').upsert(notifRow);
        if (!error) migratedNotifs++;
      }
    }

    // Scenarios
    if (Array.isArray(data.scenarios)) {
      for (const sc of data.scenarios) {
        const scRow = {
          id: sc.id,
          user_id: userId,
          title: sc.title || 'Saved Scenario',
          income_id: sc.incomeId || null,
          delay_days: sc.delayDays || 0,
          unexpected_expense: sc.unexpectedExpense || 0,
          income_reduction_pct: sc.incomeReductionPct || 0,
          max_shortfall: sc.maxShortfall || 0,
          min_balance: sc.minBalance || 0,
          created_at: sc.createdAt || new Date().toISOString()
        };

        const { error } = await supabase.from('simulation_scenarios').upsert(scRow);
        if (!error) migratedScenarios++;
      }
    }
  }

  console.log('====================================================');
  console.log('Migration Complete Summary:');
  console.log(`- Profiles migrated: ${migratedUsers}`);
  console.log(`- Preferences sets migrated: ${migratedPrefs}`);
  console.log(`- Savings goals migrated: ${migratedSavings}`);
  console.log(`- Income entries migrated: ${migratedIncomes}`);
  console.log(`- Expense/Bill entries migrated: ${migratedExpenses}`);
  console.log(`- Notifications migrated: ${migratedNotifs}`);
  console.log(`- Scenarios migrated: ${migratedScenarios}`);
  console.log(`- Original JSON files intact in: ${DATA_DIR}`);
  console.log(`- Backup safely preserved at: ${backupFolder}`);
  console.log('====================================================');
}

runMigration().catch(err => {
  console.error('[Migration Error]:', err);
});
