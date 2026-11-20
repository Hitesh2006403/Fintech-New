-- ====================================================================
-- FINSIGHT PERSONAL FINANCE ANALYZER — DATABASE SCHEMA MIGRATION
-- Migration Version: 20261120000000
-- Scope: AI Reports, Contextual Chat Messages, and Statement Imports
-- ====================================================================

-- 1. ANALYZER REPORTS TABLE
-- Stores executive financial analysis summaries, risk assessments, and recommendations
CREATE TABLE IF NOT EXISTS public.analyzer_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  horizon TEXT NOT NULL DEFAULT 'all',
  mode TEXT NOT NULL DEFAULT 'single', -- 'single' | 'multi'
  overview_summary TEXT,
  health_score NUMERIC(5, 2) DEFAULT 0,
  savings_rate NUMERIC(5, 2) DEFAULT 0,
  runway_months NUMERIC(6, 2) DEFAULT 0,
  spending_insights JSONB DEFAULT '[]'::jsonb,
  risk_assessment JSONB DEFAULT '[]'::jsonb,
  strategic_recommendations JSONB DEFAULT '[]'::jsonb,
  verified_facts_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ANALYZER CHAT MESSAGES TABLE
-- Stores conversational financial queries, answers, evidence grounding, and injection defense flags
CREATE TABLE IF NOT EXISTS public.analyzer_chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'ai', 'system')),
  message TEXT NOT NULL,
  mode TEXT DEFAULT 'deterministic-chat-engine',
  verified_evidence TEXT,
  is_defused BOOLEAN DEFAULT false,
  horizon TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ANALYZER STATEMENT IMPORTS TABLE
-- Stores audit history for ingested bank and card statements
CREATE TABLE IF NOT EXISTS public.analyzer_statement_imports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'csv',
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_inflows NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_outflows NUMERIC(15, 2) NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  imported_incomes INTEGER NOT NULL DEFAULT 0,
  imported_expenses INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_analyzer_reports_user ON public.analyzer_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyzer_chat_user ON public.analyzer_chat_messages(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_analyzer_imports_user ON public.analyzer_statement_imports(user_id, imported_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant isolation: Users may only access their own records
-- ====================================================================

-- Enable RLS on all 3 tables
ALTER TABLE public.analyzer_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyzer_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyzer_statement_imports ENABLE ROW LEVEL SECURITY;

-- 1. Analyzer Reports Policies
DROP POLICY IF EXISTS "Analyzer reports select policy" ON public.analyzer_reports;
CREATE POLICY "Analyzer reports select policy" ON public.analyzer_reports
  FOR SELECT USING (
    auth.uid()::text = user_id OR
    (current_setting('request.jwt.claim.sub', true) = user_id) OR
    current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Analyzer reports insert policy" ON public.analyzer_reports;
CREATE POLICY "Analyzer reports insert policy" ON public.analyzer_reports
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR
    (current_setting('request.jwt.claim.sub', true) = user_id) OR
    current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Analyzer reports delete policy" ON public.analyzer_reports;
CREATE POLICY "Analyzer reports delete policy" ON public.analyzer_reports
  FOR DELETE USING (
    auth.uid()::text = user_id OR
    (current_setting('request.jwt.claim.sub', true) = user_id) OR
    current_setting('role', true) = 'service_role'
  );

-- 2. Analyzer Chat Messages Policies
DROP POLICY IF EXISTS "Analyzer chat select policy" ON public.analyzer_chat_messages;
CREATE POLICY "Analyzer chat select policy" ON public.analyzer_chat_messages
  FOR SELECT USING (
    auth.uid()::text = user_id OR
    (current_setting('request.jwt.claim.sub', true) = user_id) OR
    current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Analyzer chat insert policy" ON public.analyzer_chat_messages;
CREATE POLICY "Analyzer chat insert policy" ON public.analyzer_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR
    (current_setting('request.jwt.claim.sub', true) = user_id) OR
    current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Analyzer chat delete policy" ON public.analyzer_chat_messages;
CREATE POLICY "Analyzer chat delete policy" ON public.analyzer_chat_messages
  FOR DELETE USING (
    auth.uid()::text = user_id OR
    (current_setting('request.jwt.claim.sub', true) = user_id) OR
    current_setting('role', true) = 'service_role'
  );

-- 3. Analyzer Statement Imports Policies
DROP POLICY IF EXISTS "Analyzer statement imports select policy" ON public.analyzer_statement_imports;
CREATE POLICY "Analyzer statement imports select policy" ON public.analyzer_statement_imports
  FOR SELECT USING (
    auth.uid()::text = user_id OR
    (current_setting('request.jwt.claim.sub', true) = user_id) OR
    current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "Analyzer statement imports insert policy" ON public.analyzer_statement_imports;
CREATE POLICY "Analyzer statement imports insert policy" ON public.analyzer_statement_imports
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR
    (current_setting('request.jwt.claim.sub', true) = user_id) OR
    current_setting('role', true) = 'service_role'
  );

-- ====================================================================
-- AUTOMATED TIMESTAMP TRIGGER
-- ====================================================================
DROP TRIGGER IF EXISTS trg_update_analyzer_reports_timestamp ON public.analyzer_reports;
CREATE TRIGGER trg_update_analyzer_reports_timestamp
  BEFORE UPDATE ON public.analyzer_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
