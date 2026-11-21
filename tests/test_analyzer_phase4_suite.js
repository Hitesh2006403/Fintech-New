import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../backend/server.js';
import {
  retrieveFinancialContext,
  validateAndSanitizeResponse,
  synthesizeDeterministicAnalysis,
  runSingleAgentAnalysis,
  runMultiAgentAnalysis,
  runAnalysis,
  getLlmProviderConfig
} from '../backend/aiAnalyzerEngine.js';

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

describe('Phase 4: AI Financial Intelligence & Multi-Agent Orchestration Suite', () => {

  // Test 1: Unauthenticated request rejection on AI endpoints
  test('Check 1: Unauthenticated requests to /api/analyzer/ai/* are rejected with HTTP 401', async () => {
    const postRes = await fetch(`${baseUrl}/api/analyzer/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'single' })
    });
    assert.equal(postRes.status, 401);
    const postBody = await postRes.json();
    assert.equal(postBody.error, 'Authentication required');

    const getRes = await fetch(`${baseUrl}/api/analyzer/ai/status`);
    assert.equal(getRes.status, 401);
  });

  // Test 2: Multi-tenant user isolation in AI analysis
  test('Check 2: Multi-tenant AI analysis strictly isolates User A and User B data', async () => {
    const ts = Date.now();
    const userAEmail = `ai_user_a_${ts}@example.com`;
    const userBEmail = `ai_user_b_${ts}@example.com`;

    // 1. Register User A
    const regARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'SecurePasswordA1!', name: 'AI User A' })
    });
    const userA = await regARes.json();
    const tokenA = userA.token;

    // 2. Register User B
    const regBRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userBEmail, password: 'SecurePasswordB1!', name: 'AI User B' })
    });
    const userB = await regBRes.json();
    const tokenB = userB.token;

    // 3. User A adds large private income
    await fetch(`${baseUrl}/api/incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: `Exclusive Royalty A ${ts}`,
        amount: 250000,
        expectedDate: '2026-11-20',
        actualDate: '2026-11-20',
        status: 'received'
      })
    });

    // 4. User B adds different income
    await fetch(`${baseUrl}/api/incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({
        title: `Exclusive Consultancy B ${ts}`,
        amount: 35000,
        expectedDate: '2026-11-20',
        actualDate: '2026-11-20',
        status: 'received'
      })
    });

    // 5. User A invokes AI analysis
    const aiARes = await fetch(`${baseUrl}/api/analyzer/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ mode: 'single', horizon: 'all' })
    });
    assert.equal(aiARes.status, 200);
    const aiA = await aiARes.json();
    assert.ok(aiA.success);
    assert.ok(aiA.analysis.cashFlowHealth.savingsRate >= 0);

    // 6. User B invokes AI analysis
    const aiBRes = await fetch(`${baseUrl}/api/analyzer/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({ mode: 'single', horizon: 'all' })
    });
    assert.equal(aiBRes.status, 200);
    const aiB = await aiBRes.json();
    assert.ok(aiB.success);

    // Verify User B does not receive User A's large inflow in context
    const contextB = retrieveFinancialContext(userB.user.id);
    assert.ok(contextB.facts.inflows.clearedRealized < 200000, 'User B must not have User A 250k income');
  });

  // Test 3: Financial Data Retriever (Agent 1) PII Scrubbing
  test('Check 3: Financial Data Retriever strips all PII (names, emails, credentials)', () => {
    const { facts } = retrieveFinancialContext('usr_demo_01');
    const jsonStr = JSON.stringify(facts);

    assert.ok(!jsonStr.includes('@'), 'Must not contain any email address');
    assert.ok(!jsonStr.includes('password'), 'Must not contain password');
    assert.ok(!jsonStr.includes('session_token'), 'Must not contain session tokens');
    assert.ok(facts.period.asOfDate !== undefined, 'Must contain asOfDate');
    assert.ok(facts.balances.availableCash !== undefined, 'Must contain verified cash balance');
    assert.ok(facts.ratios.healthScore !== undefined, 'Must contain health score');
  });

  // Test 4: Single-Agent Execution Mode
  test('Check 4: Single-Agent execution mode produces valid structured output anchored on verified metrics', async () => {
    const analysis = await runSingleAgentAnalysis('usr_demo_01', 'all');

    assert.ok(typeof analysis.overviewSummary === 'string');
    assert.ok(analysis.overviewSummary.length > 20);
    assert.ok(analysis.cashFlowHealth);
    assert.ok(typeof analysis.cashFlowHealth.score === 'number');
    assert.ok(typeof analysis.cashFlowHealth.runwayMonths === 'number');
    assert.ok(Array.isArray(analysis.spendingInsights));
    assert.ok(Array.isArray(analysis.riskAssessment));
    assert.ok(Array.isArray(analysis.strategicRecommendations));
    assert.ok(analysis.complianceDisclaimer.includes('Informational financial guidance'));
  });

  // Test 5: Multi-Agent Execution Mode
  test('Check 5: Multi-Agent execution mode coordinates specialized agents and returns validated report', async () => {
    const analysis = await runMultiAgentAnalysis('usr_demo_01', 'all');

    assert.ok(analysis.mode.includes('multi'));
    assert.ok(Array.isArray(analysis.riskAssessment));
    assert.ok(analysis.riskAssessment.length > 0);

    analysis.riskAssessment.forEach(r => {
      assert.ok(['high', 'medium', 'low'].includes(r.level));
      assert.ok(typeof r.risk === 'string');
      assert.ok(typeof r.mitigation === 'string');
    });

    assert.ok(Array.isArray(analysis.strategicRecommendations));
    analysis.strategicRecommendations.forEach(rec => {
      assert.ok(typeof rec.title === 'string');
      assert.ok(typeof rec.action === 'string');
      assert.ok(typeof rec.evidence === 'string');
    });
  });

  // Test 6: Response Validator (Agent 6) enforces backend facts & compliance
  test('Check 6: Response Validator strictly enforces authoritative engine metrics and appends disclaimer', () => {
    const mockFacts = {
      period: { horizon: '30', asOfDate: '2026-11-20' },
      balances: { safetyBuffer: 25000, availableCash: 45000 },
      ratios: { healthScore: 82, runwayMonths: 4.5, savingsRateRealized: 28, expenseToIncomeRatio: 72 }
    };

    const hallucinatedRaw = {
      overviewSummary: 'Fabricated overview',
      cashFlowHealth: { score: 999, runwayMonths: 100 }, // Hallucinated figures
      strategicRecommendations: []
    };

    const validated = validateAndSanitizeResponse(hallucinatedRaw, mockFacts);

    // Score and runway must be clamped to the verified facts
    assert.equal(validated.cashFlowHealth.score, 82, 'Must enforce authoritative score 82');
    assert.equal(validated.cashFlowHealth.runwayMonths, 4.5, 'Must enforce authoritative runway 4.5');
    assert.ok(validated.complianceDisclaimer.includes('Informational financial guidance only'));
  });

  // Test 7: Controlled Deterministic Fallback Synthesis
  test('Check 7: Deterministic fallback executes gracefully when no LLM key is configured', () => {
    const { facts } = retrieveFinancialContext('usr_demo_01');
    const result = synthesizeDeterministicAnalysis(facts, 'test-mode');

    assert.ok(result.overviewSummary.includes('During the'));
    assert.ok(result.spendingInsights.length >= 1);
    assert.ok(result.riskAssessment.length >= 1);
    assert.ok(result.strategicRecommendations.length >= 1);
    assert.equal(result.cashFlowHealth.score, facts.ratios.healthScore);
  });

  // Test 8: AI Status endpoint over HTTP
  test('Check 8: GET /api/analyzer/ai/status reports supported provider modes', async () => {
    const ts = Date.now();
    const testEmail = `status_test_${ts}@example.com`;

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'StatusPassword123!', name: 'Status Tester' })
    });
    const authData = await regRes.json();
    const token = authData.token;

    const res = await fetch(`${baseUrl}/api/analyzer/ai/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.ok(body.success);
    assert.ok(body.provider);
    assert.equal(body.singleAgentAvailable, true);
    assert.equal(body.multiAgentAvailable, true);
  });

});
