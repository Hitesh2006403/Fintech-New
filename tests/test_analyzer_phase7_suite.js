import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import app from '../backend/server.js';
import db from '../backend/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 7: Supabase Database Migrations & Multi-Tenant Security Suite', () => {

  // Test 1: Migration file existence and structural validity
  test('Check 1: Supabase migration file exists and defines all 3 analyzer tables', () => {
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261120000000_personal_finance_analyzer.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist at supabase/migrations/');

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // 1. Table definitions
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.analyzer_reports'), 'Must define analyzer_reports table');
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.analyzer_chat_messages'), 'Must define analyzer_chat_messages table');
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.analyzer_statement_imports'), 'Must define analyzer_statement_imports table');

    // 2. Foreign keys to profiles(id)
    assert.ok(sqlContent.includes('REFERENCES public.profiles(id)'), 'Must reference profiles table');

    // 3. Performance indexes
    assert.ok(sqlContent.includes('idx_analyzer_reports_user'), 'Must index analyzer_reports');
    assert.ok(sqlContent.includes('idx_analyzer_chat_user'), 'Must index analyzer_chat_messages');
    assert.ok(sqlContent.includes('idx_analyzer_imports_user'), 'Must index analyzer_statement_imports');
  });

  // Test 2: Row Level Security (RLS) enforcement
  test('Check 2: Migration file enables RLS and declares tenant isolation policies on all 3 tables', () => {
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261120000000_personal_finance_analyzer.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // RLS Activation
    assert.ok(sql.includes('ALTER TABLE public.analyzer_reports ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS on analyzer_reports');
    assert.ok(sql.includes('ALTER TABLE public.analyzer_chat_messages ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS on analyzer_chat_messages');
    assert.ok(sql.includes('ALTER TABLE public.analyzer_statement_imports ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS on analyzer_statement_imports');

    // RLS Policy Declarations
    assert.ok(sql.includes('CREATE POLICY "Analyzer reports select policy"'), 'Must define reports select policy');
    assert.ok(sql.includes('CREATE POLICY "Analyzer chat select policy"'), 'Must define chat select policy');
    assert.ok(sql.includes('CREATE POLICY "Analyzer statement imports select policy"'), 'Must define statement imports select policy');

    // Tenant isolation check
    assert.ok(sql.includes('auth.uid()::text = user_id'), 'Policies must enforce auth.uid() = user_id');
  });

  // Test 3: Central schema file incorporates analyzer extensions
  test('Check 3: supabase/schema.sql contains analyzer tables and triggers', () => {
    const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
    assert.ok(fs.existsSync(schemaPath), 'Central schema.sql must exist');

    const schema = fs.readFileSync(schemaPath, 'utf8');
    assert.ok(schema.includes('analyzer_reports'), 'schema.sql must contain analyzer_reports');
    assert.ok(schema.includes('analyzer_chat_messages'), 'schema.sql must contain analyzer_chat_messages');
    assert.ok(schema.includes('analyzer_statement_imports'), 'schema.sql must contain analyzer_statement_imports');
    assert.ok(schema.includes('trg_update_analyzer_reports_timestamp'), 'schema.sql must include analyzer update trigger');
  });

  // Test 4: Dual-write methods persist records locally with Supabase forwarding
  test('Check 4: Database methods save and retrieve reports, chat, and statement imports', () => {
    const testUserId = `usr_test_ph7_${Date.now()}`;

    // 1. Save Report
    const report = db.saveAnalyzerReport(testUserId, {
      overviewSummary: 'Resilient treasury overview for Q3',
      healthScore: 84,
      savingsRate: 42,
      runwayMonths: 6.5,
      mode: 'multi',
      horizon: '90'
    });
    assert.ok(report.id, 'Report must be assigned an ID');
    assert.equal(report.overviewSummary, 'Resilient treasury overview for Q3');

    const reports = db.getAnalyzerReports(testUserId);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].id, report.id);

    // 2. Save Chat Message
    const chatMsg = db.saveAnalyzerChatMessage(testUserId, {
      sender: 'user',
      message: 'What is my runway?',
      horizon: 'all'
    });
    assert.ok(chatMsg.id, 'Chat message must be assigned an ID');

    const chatHistory = db.getAnalyzerChatMessages(testUserId);
    assert.equal(chatHistory.length, 1);
    assert.equal(chatHistory[0].message, 'What is my runway?');

    // 3. Save Statement Import
    const importAudit = db.saveAnalyzerStatementImport(testUserId, {
      filename: 'hdfc_june_statement.csv',
      totalTransactions: 15,
      totalInflows: 85000,
      totalOutflows: 32000,
      status: 'completed'
    });
    assert.ok(importAudit.id, 'Import audit must be assigned an ID');

    const importHistory = db.getAnalyzerStatementImports(testUserId);
    assert.equal(importHistory.length, 1);
    assert.equal(importHistory[0].filename, 'hdfc_june_statement.csv');
  });

  // Test 5: Multi-tenant partition isolation across users
  test('Check 5: Analyzer database partitions strictly isolate User A and User B records', () => {
    const userA = `usr_iso_a_${Date.now()}`;
    const userB = `usr_iso_b_${Date.now()}`;

    // User A creates a report and import
    db.saveAnalyzerReport(userA, {
      overviewSummary: 'User A confidential board report',
      healthScore: 95
    });
    db.saveAnalyzerStatementImport(userA, {
      filename: 'user_a_private_bank.csv',
      totalTransactions: 5
    });

    // User B creates a different report
    db.saveAnalyzerReport(userB, {
      overviewSummary: 'User B private report',
      healthScore: 60
    });

    // Verify User A partition
    const reportsA = db.getAnalyzerReports(userA);
    assert.equal(reportsA.length, 1);
    assert.equal(reportsA[0].overviewSummary, 'User A confidential board report');

    const importsA = db.getAnalyzerStatementImports(userA);
    assert.equal(importsA.length, 1);
    assert.equal(importsA[0].filename, 'user_a_private_bank.csv');

    // Verify User B partition contains 0 references to User A
    const reportsB = db.getAnalyzerReports(userB);
    assert.equal(reportsB.length, 1);
    assert.equal(reportsB[0].overviewSummary, 'User B private report');

    const importsB = db.getAnalyzerStatementImports(userB);
    assert.equal(importsB.length, 0, 'User B must have 0 imports from User A');
  });

  // Test 6: HTTP Endpoints for Analyzer history enforce authentication
  test('Check 6: Unauthenticated requests to /api/analyzer/*/history are rejected with HTTP 401', async () => {
    const r1 = await fetch(`${baseUrl}/api/analyzer/reports`);
    assert.equal(r1.status, 401);

    const r2 = await fetch(`${baseUrl}/api/analyzer/chat/history`);
    assert.equal(r2.status, 401);

    const r3 = await fetch(`${baseUrl}/api/analyzer/statements/history`);
    assert.equal(r3.status, 401);
  });

  // Test 7: HTTP Endpoints return authenticated user's records
  test('Check 7: Authenticated user receives their scoped reports, chat, and import history', async () => {
    const ts = Date.now();
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `ph7_api_${ts}@example.com`, password: 'Ph7Password1!', name: 'Ph7 User' })
    });
    const regData = await regRes.json();
    const token = regData.token;

    // 1. Generate an analysis report via API
    await fetch(`${baseUrl}/api/analyzer/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ mode: 'single', horizon: 'all' })
    });

    // 2. Fetch reports via GET endpoint
    const reportsRes = await fetch(`${baseUrl}/api/analyzer/reports`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(reportsRes.status, 200);
    const reportsBody = await reportsRes.json();
    assert.equal(reportsBody.success, true);
    assert.ok(reportsBody.reports.length >= 1, 'Should return saved report');

    // 3. Send a chat message via API
    await fetch(`${baseUrl}/api/analyzer/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ message: 'Where did I spend the most?' })
    });

    // 4. Fetch chat history via GET endpoint
    const chatRes = await fetch(`${baseUrl}/api/analyzer/chat/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(chatRes.status, 200);
    const chatBody = await chatRes.json();
    assert.equal(chatBody.success, true);
    assert.ok(chatBody.messages.length >= 2, 'Should return user prompt and AI answer');
  });

  // Test 8: Non-blocking resilience when Supabase is in local fallback mode
  test('Check 8: Supabase sync executes with resilient fallback without throwing errors', async () => {
    const ts = Date.now();
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `ph7_res_${ts}@example.com`, password: 'ResPassword1!', name: 'Res User' })
    });
    const { token, user } = await regRes.json();

    // Import statement via HTTP
    const importRes = await fetch(`${baseUrl}/api/analyzer/statements/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        filename: 'october_bank.csv',
        transactions: [
          { date: '2026-10-01', description: 'Monthly Cloud Service', amount: 4500, type: 'expense', category: 'Subscriptions' }
        ]
      })
    });

    assert.equal(importRes.status, 200);
    const importBody = await importRes.json();
    assert.equal(importBody.success, true);

    // Verify history endpoint returns the recorded import
    const historyRes = await fetch(`${baseUrl}/api/analyzer/statements/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(historyRes.status, 200);
    const historyBody = await historyRes.json();
    assert.equal(historyBody.success, true);
    assert.equal(historyBody.history.length, 1);
    assert.equal(historyBody.history[0].filename, 'october_bank.csv');
  });
});
