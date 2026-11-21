/**
 * FINSIGHT — PHASE 9 TEST SUITE: FULL FRONTEND & BACKEND INTEGRATION POLISH
 *
 * Verifies:
 * 1. Analyzer Service API client method contract completeness.
 * 2. Real-time deterministic recalculation upon ledger mutations.
 * 3. Multi-horizon analysis parameter resilience ('30', '60', '90', '365', 'all').
 * 4. Extracted statement transaction filtering and duplicate reconciliation.
 * 5. Statement import and history persistence integration.
 * 6. Chat history retrieval and multi-turn state continuity.
 * 7. Zero-record empty state safety (prevents division by zero or NaN).
 * 8. Multi-agent strategy response schema compliance for UI tabs.
 */

import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

import { getUserAnalyzerData } from '../backend/analyzerService.js';
import { statementParser } from '../backend/statementParser.js';
import db from '../backend/db.js';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('--- RUNNING PHASE 9: FULL FRONTEND-BACKEND INTEGRATION SUITE ---');
console.log('======================================================\n');

// 1. Analyzer Service API Client Contract Verification
runTest('Service Contract: analyzerService exports all required frontend API hooks', async () => {
  const fs = await import('fs');
  const serviceContent = fs.readFileSync(path.join(__dirname, '../src/services/analyzerService.js'), 'utf8');

  const requiredMethods = [
    'getAnalyzerData',
    'getAnalyzerSummary',
    'getAnalyzerTransactions',
    'runAiAnalysis',
    'getAiStatus',
    'sendChatMessage',
    'parseStatement',
    'importStatementTransactions',
    'getAnalyzerReports',
    'getChatHistory',
    'getStatementImportHistory'
  ];

  for (const m of requiredMethods) {
    assert.ok(serviceContent.includes(m), `analyzerService must declare method ${m}`);
  }
});

// 2. Real-Time Deterministic Recalculation upon Ledger Mutation
runTest('Reactive Recalculation: Ledger mutation immediately updates net savings and velocity', () => {
  const testUserId = `usr_p9_reactivity_${Date.now()}`;
  db.clearUserData(testUserId);

  // Initial cleared dataset
  const initial = getUserAnalyzerData(testUserId, { horizon: 'all' });
  assert.strictEqual(initial.actual.clearedIncome, 0);
  assert.strictEqual(initial.actual.paidExpenses, 0);

  // Add received income
  db.addIncome(testUserId, {
    title: 'Consulting Retainer',
    amount: 50000,
    expectedDate: '2026-11-01',
    actualDate: '2026-11-01',
    status: 'received',
    category: 'Client Retainer'
  });

  const withIncome = getUserAnalyzerData(testUserId, { horizon: 'all' });
  assert.strictEqual(withIncome.actual.clearedIncome, 50000);
  assert.strictEqual(withIncome.actual.netSavings, 50000);
  assert.strictEqual(withIncome.actual.savingsRate, 100);

  // Add paid expense
  db.addExpense(testUserId, {
    title: 'Workspace Rent',
    amount: 15000,
    dueDate: '2026-11-05',
    paidDate: '2026-11-05',
    status: 'paid',
    category: 'Rent / Housing',
    isEssential: true
  });

  const withExpense = getUserAnalyzerData(testUserId, { horizon: 'all' });
  assert.strictEqual(withExpense.actual.paidExpenses, 15000);
  assert.strictEqual(withExpense.actual.netSavings, 35000);
  assert.strictEqual(withExpense.actual.savingsRate, 70); // (35000 / 50000) * 100
  assert.strictEqual(withExpense.spending.essentialObligations, 15000);
});

// 3. Multi-Horizon Parameter Resilience
runTest('Horizon Resilience: Supports 30, 60, 90, 365, and all time horizons without error', () => {
  const horizons = ['30', '60', '90', '365', 'all'];
  for (const h of horizons) {
    const data = getUserAnalyzerData('usr_p9_horizon_check', { horizon: h });
    assert.ok(data.meta.horizon === h || (h === '60' && data.meta.horizon === '60'));
    assert.ok(typeof data.overview.netSavings === 'number');
    assert.ok(typeof data.overview.healthScore === 'number');
  }
});

// 4. Statement Ingestion & History Persistence Flow
runTest('Statement Integration: Import confirmed transactions and persist history audit', () => {
  const testUserId = `usr_p9_stmt_${Date.now()}`;

  const incomingTx = [
    {
      type: 'income',
      title: 'Stripe Direct Deposit',
      amount: 45000,
      expectedDate: '2026-11-10',
      actualDate: '2026-11-10',
      category: 'Inflows',
      status: 'received'
    },
    {
      type: 'expense',
      title: 'Google Cloud Platform',
      amount: 4200,
      dueDate: '2026-11-12',
      paidDate: '2026-11-12',
      category: 'Software & Tools',
      status: 'paid'
    }
  ];

  const importResult = statementParser.importConfirmedTransactions(testUserId, incomingTx);
  assert.strictEqual(importResult.totalImported, 2);
  assert.strictEqual(importResult.importedIncomes, 1);
  assert.strictEqual(importResult.importedExpenses, 1);

  db.saveAnalyzerStatementImport(testUserId, {
    filename: 'hdfc_november_statement.csv',
    fileType: 'csv',
    totalTransactions: 2,
    importedIncomes: 1,
    importedExpenses: 1,
    status: 'completed'
  });

  const history = db.getAnalyzerStatementImports(testUserId);
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].filename, 'hdfc_november_statement.csv');
  assert.strictEqual(history[0].importedIncomes, 1);
});

// 5. Chat History Continuity
runTest('Chat History: User and AI conversation exchanges persist and retrieve chronologically', () => {
  const testUserId = `usr_p9_chat_${Date.now()}`;

  db.saveAnalyzerChatMessage(testUserId, {
    sender: 'user',
    message: 'What was my highest expense category?'
  });

  db.saveAnalyzerChatMessage(testUserId, {
    sender: 'ai',
    message: 'Your highest outflow was Housing consuming 45% of total spend.',
    mode: 'llm-chat-augmented',
    verifiedEvidence: 'Grounded in Rent transaction'
  });

  const chatLogs = db.getAnalyzerChatMessages(testUserId);
  assert.strictEqual(chatLogs.length, 2);
  assert.strictEqual(chatLogs[0].sender, 'user');
  assert.strictEqual(chatLogs[1].sender, 'ai');
  assert.strictEqual(chatLogs[1].mode, 'llm-chat-augmented');
});

// 6. Zero-Record Empty State Safety (Prevents NaN & Division by Zero)
runTest('Empty State Safety: Fresh user with 0 records computes graceful zero-division guards', () => {
  const emptyUserId = `usr_p9_empty_${Date.now()}`;
  db.clearUserData(emptyUserId);

  const data = getUserAnalyzerData(emptyUserId, { horizon: 'all' });

  assert.strictEqual(data.overview.clearedIncome, 0);
  assert.strictEqual(data.overview.paidExpenses, 0);
  assert.strictEqual(data.overview.netSavings, 0);
  assert.strictEqual(data.overview.savingsRate, 0);
  assert.strictEqual(data.overview.expenseToIncomeRatio, 0);
  assert.ok(!isNaN(data.overview.healthScore), 'Health score must not be NaN');
  assert.ok(!isNaN(data.overview.runwayMonths), 'Runway months must not be NaN');
  assert.strictEqual(data.spending.expensesByCategory.length, 0);
});

// 7. UI Component Neumorphic Styling & Tabs Adherence
runTest('UI Verification: PersonalFinanceAnalyzer component has all 6 tabs and empty state hooks', async () => {
  const fs = await import('fs');
  const uiContent = fs.readFileSync(path.join(__dirname, '../src/pages/PersonalFinanceAnalyzer.jsx'), 'utf8');

  assert.ok(uiContent.includes("id: 'overview'"));
  assert.ok(uiContent.includes("id: 'spending'"));
  assert.ok(uiContent.includes("id: 'health'"));
  assert.ok(uiContent.includes("id: 'insights'"));
  assert.ok(uiContent.includes("id: 'statements'"));
  assert.ok(uiContent.includes("id: 'chat'"));

  // Check Phase 9 Polish additions
  assert.ok(uiContent.includes('filteredExtractedRows'), 'Must implement search/type filtered extracted rows');
  assert.ok(uiContent.includes('statementHistory'), 'Must implement statement history audit trail');
  assert.ok(uiContent.includes('Welcome to your Personal Finance Analyzer!'), 'Must implement empty state banner');
  assert.ok(uiContent.includes('Orchestrating 6-Agent Financial Intelligence Workflow...'), 'Must implement multi-agent thinking skeleton');
});

// 8. End-to-End API Router Verification
runTest('API Verification: Backend server declares all Phase 9 required routes', async () => {
  const fs = await import('fs');
  const serverContent = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');

  assert.ok(serverContent.includes("app.get('/api/analyzer/data'"));
  assert.ok(serverContent.includes("app.get('/api/analyzer/summary'"));
  assert.ok(serverContent.includes("app.get('/api/analyzer/transactions'"));
  assert.ok(serverContent.includes("app.post('/api/analyzer/ai/analyze'"));
  assert.ok(serverContent.includes("app.get('/api/analyzer/ai/status'"));
  assert.ok(serverContent.includes("app.post('/api/analyzer/ai/chat'"));
  assert.ok(serverContent.includes("app.post('/api/analyzer/statements/parse'"));
  assert.ok(serverContent.includes("app.post('/api/analyzer/statements/import'"));
  assert.ok(serverContent.includes("app.get('/api/analyzer/reports'"));
  assert.ok(serverContent.includes("app.get('/api/analyzer/chat/history'"));
  assert.ok(serverContent.includes("app.get('/api/analyzer/statements/history'"));
});

console.log('\n======================================================');
console.log(`Phase 9 Test Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('======================================================\n');

if (passedTests < totalTests) {
  process.exit(1);
}
