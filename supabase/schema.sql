-- ====================================================================
-- UNCERTAIN INCOME PLANNER — SUPABASE POSTGRESQL SCHEMA (V2)
-- Author: Team Lynx (NextGen Buildathon)
-- Database: Supabase Cloud PostgreSQL with Row Level Security (RLS)
-- Supports both Custom Backend Auth (usr_*) and Supabase Auth (UUID)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop previous draft tables to ensure clean type alignment (TEXT IDs)
DROP TABLE IF EXISTS public.simulation_scenarios CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.savings_goals CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.income_entries CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. User Profiles Table
-- Uses TEXT PRIMARY KEY to accommodate custom backend IDs (e.g. usr_alex_01)
-- as well as standard Supabase Auth UUID strings.
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'Treasury Planner',
  avatar_initials TEXT,
  picture TEXT,
  auth_provider TEXT DEFAULT 'local',
  google_sub TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. User Planning Preferences Table
CREATE TABLE public.user_preferences (
  id TEXT PRIMARY KEY DEFAULT ('pref_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  starting_balance NUMERIC(14,2) DEFAULT 45000.00,
  safety_buffer NUMERIC(14,2) DEFAULT 25000.00,
  default_horizon_days INTEGER DEFAULT 30,
  default_scenario TEXT DEFAULT 'expected' CHECK (default_scenario IN ('conservative', 'expected', 'optimistic')),
  income_frequency TEXT DEFAULT 'Irregular / Milestone-based',
  essential_expense_assumptions TEXT DEFAULT 'Strict essential only',
  low_balance_alert_threshold NUMERIC(14,2) DEFAULT 20000.00,
  bill_reminder_lead_days INTEGER DEFAULT 3,
  notifications_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Income Entries Table (Certainty Tagging: received, confirmed, uncertain)
CREATE TABLE public.income_entries (
  id TEXT PRIMARY KEY DEFAULT ('inc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  expected_date DATE NOT NULL,
  actual_date DATE,
  status TEXT NOT NULL CHECK (status IN ('received', 'confirmed', 'uncertain')),
  recurring TEXT DEFAULT 'one-time',
  notes TEXT,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Expenses and Bills Table (Priority & Due Date Tracking)
CREATE TABLE public.expenses (
  id TEXT PRIMARY KEY DEFAULT ('exp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  paid_date DATE,
  is_essential BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'high' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  recurring TEXT DEFAULT 'one-time',
  late_fee NUMERIC(10,2) DEFAULT 0,
  grace_period INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'paid', 'overdue')),
  emi_details JSONB DEFAULT NULL,
  notes TEXT,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Financial Transactions Ledger Table (Permanent audit trail)
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY DEFAULT ('tx_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings_deposit', 'savings_withdrawal')),
  transaction_date DATE NOT NULL,
  related_record_id TEXT,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Lean-Week Savings Goals & Reserve Table
CREATE TABLE public.savings_goals (
  id TEXT PRIMARY KEY DEFAULT ('sav_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  weeks INTEGER DEFAULT 4 CHECK (weeks > 0),
  expected_low_income_per_week NUMERIC(14,2) DEFAULT 5000.00,
  essential_weekly_expenses NUMERIC(14,2) DEFAULT 12000.00,
  current_designated_reserve NUMERIC(14,2) DEFAULT 14000.00 CHECK (current_designated_reserve >= 0),
  weekly_contribution NUMERIC(14,2) DEFAULT 3500.00,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Notifications Table
CREATE TABLE public.notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  related_record TEXT,
  date DATE DEFAULT CURRENT_DATE,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
  is_read BOOLEAN DEFAULT false,
  action_page TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Payment Delay Simulation Scenarios Table (Sandboxed saved scenarios)
CREATE TABLE public.simulation_scenarios (
  id TEXT PRIMARY KEY DEFAULT ('scen_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  income_id TEXT,
  delay_days INTEGER DEFAULT 0,
  unexpected_expense NUMERIC(14,2) DEFAULT 0,
  income_reduction_pct NUMERIC(5,2) DEFAULT 0,
  max_shortfall NUMERIC(14,2) DEFAULT 0,
  min_balance NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_incomes_user_status ON public.income_entries (user_id, status);
CREATE INDEX IF NOT EXISTS idx_incomes_expected_date ON public.income_entries (user_id, expected_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_status ON public.expenses (user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON public.expenses (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_scenarios_user ON public.simulation_scenarios (user_id);

-- ====================================================================
-- DATABASE GRANTS & PERMISSIONS (RESOLVES 42501 PERMISSION DENIED)
-- ====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_scenarios ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE USING (true);

-- 2. User Preferences Policies
DROP POLICY IF EXISTS "Preferences select policy" ON public.user_preferences;
CREATE POLICY "Preferences select policy" ON public.user_preferences FOR SELECT USING (true);

DROP POLICY IF EXISTS "Preferences modify policy" ON public.user_preferences;
CREATE POLICY "Preferences modify policy" ON public.user_preferences FOR ALL USING (true) WITH CHECK (true);

-- 3. Income Entries Policies
DROP POLICY IF EXISTS "Incomes select policy" ON public.income_entries;
CREATE POLICY "Incomes select policy" ON public.income_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Incomes modify policy" ON public.income_entries;
CREATE POLICY "Incomes modify policy" ON public.income_entries FOR ALL USING (true) WITH CHECK (true);

-- 4. Expenses & Bills Policies
DROP POLICY IF EXISTS "Expenses select policy" ON public.expenses;
CREATE POLICY "Expenses select policy" ON public.expenses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Expenses modify policy" ON public.expenses;
CREATE POLICY "Expenses modify policy" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- 5. Transactions Ledger Policies
DROP POLICY IF EXISTS "Transactions select policy" ON public.transactions;
CREATE POLICY "Transactions select policy" ON public.transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Transactions modify policy" ON public.transactions;
CREATE POLICY "Transactions modify policy" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- 6. Savings Goals Policies
DROP POLICY IF EXISTS "Savings select policy" ON public.savings_goals;
CREATE POLICY "Savings select policy" ON public.savings_goals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Savings modify policy" ON public.savings_goals;
CREATE POLICY "Savings modify policy" ON public.savings_goals FOR ALL USING (true) WITH CHECK (true);

-- 7. Notifications Policies
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
CREATE POLICY "Notifications select policy" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Notifications modify policy" ON public.notifications;
CREATE POLICY "Notifications modify policy" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 8. Simulation Scenarios Policies
DROP POLICY IF EXISTS "Simulations select policy" ON public.simulation_scenarios;
CREATE POLICY "Simulations select policy" ON public.simulation_scenarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Simulations modify policy" ON public.simulation_scenarios;
CREATE POLICY "Simulations modify policy" ON public.simulation_scenarios FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- AUTOMATED TIMESTAMP TRIGGER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_profiles_timestamp ON public.profiles;
CREATE TRIGGER trg_update_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_update_preferences_timestamp ON public.user_preferences;
CREATE TRIGGER trg_update_preferences_timestamp BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_update_incomes_timestamp ON public.income_entries;
CREATE TRIGGER trg_update_incomes_timestamp BEFORE UPDATE ON public.income_entries FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_update_expenses_timestamp ON public.expenses;
CREATE TRIGGER trg_update_expenses_timestamp BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_update_savings_timestamp ON public.savings_goals;
CREATE TRIGGER trg_update_savings_timestamp BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Force PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
