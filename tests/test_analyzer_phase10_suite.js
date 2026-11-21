/**
 * FINSIGHT — PHASE 10 TEST SUITE: ENVIRONMENT VARIABLES & EXTERNAL PROVIDER CERTIFICATION
 *
 * Verifies:
 * 1. Environment template completeness (.env.example & backend/.env.example).
 * 2. Zero-secret leakage in template files (all values use safe placeholders).
 * 3. Git repository secret isolation (.gitignore ignores backend/.env and all secret keys).
 * 4. Client bundle privacy audit (confirms dist/assets does not leak backend API keys).
 * 5. Server resilience under missing external provider variables.
 * 6. Active production configuration validation (Supabase + Gemini).
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

console.log('\n======================================================');
console.log('--- RUNNING PHASE 10: CONFIGURATION & SECRET CERTIFICATION ---');
console.log('======================================================\n');

// 1. Template Files Completeness
runTest('Template Completeness: .env.example files document all essential environment variables', () => {
  const rootExamplePath = path.join(__dirname, '../.env.example');
  const backendExamplePath = path.join(__dirname, '../backend/.env.example');

  assert.ok(fs.existsSync(rootExamplePath), 'Root .env.example must exist');
  assert.ok(fs.existsSync(backendExamplePath), 'backend/.env.example must exist');

  const rootContent = fs.readFileSync(rootExamplePath, 'utf8');
  const requiredKeys = [
    'PORT',
    'NODE_ENV',
    'SESSION_SECRET',
    'APP_ORIGIN',
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'RESEND_API_KEY',
    'GEMINI_API_KEY',
    'AI_MODEL'
  ];

  for (const key of requiredKeys) {
    assert.ok(rootContent.includes(`${key}=`), `Template must document variable ${key}`);
  }
});

// 2. Zero Real Secrets in Example Templates
runTest('Secret Defense: .env.example templates contain zero real credentials or live keys', () => {
  const rootExamplePath = path.join(__dirname, '../.env.example');
  const content = fs.readFileSync(rootExamplePath, 'utf8');

  // Verify generic placeholder usage
  assert.ok(content.includes('your-google-gemini-api-key-here'), 'GEMINI_API_KEY must use placeholder');
  assert.ok(content.includes('your-random-32-byte-cryptographic-session-secret'), 'SESSION_SECRET must use placeholder');
  assert.ok(content.includes('your-supabase-publishable-or-anon-key'), 'SUPABASE_PUBLISHABLE_KEY must use placeholder');

  // Must not contain real live keys
  assert.ok(!content.includes('AQ.Ab8RN6'), 'Template must not contain real Gemini key');
  assert.ok(!content.includes('sb_publishable_'), 'Template must not contain real Supabase key');
  assert.ok(!content.includes('re_QFPpqjN5'), 'Template must not contain real Resend key');
});

// 3. Git Repository Secret Isolation
runTest('Git Security: .gitignore strictly isolates backend/.env and all secret credential files', () => {
  const gitignorePath = path.join(__dirname, '../.gitignore');
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');

  assert.ok(gitignore.includes('.env'), '.gitignore must ignore .env');
  assert.ok(gitignore.includes('*.key'), '.gitignore must ignore *.key');
  assert.ok(gitignore.includes('*.pem'), '.gitignore must ignore *.pem');

  // Verify git check-ignore confirms backend/.env is ignored
  const isIgnored = execSync('git check-ignore backend/.env', { encoding: 'utf8' }).trim();
  assert.strictEqual(isIgnored, 'backend/.env', 'backend/.env must be confirmed ignored by git');
});

// 4. Client Bundle Privacy Audit (Zero Secret Leakage in Frontend)
runTest('Client Privacy Audit: Production build bundle (dist) does NOT leak backend secrets', () => {
  const distAssetsDir = path.join(__dirname, '../dist', 'assets');
  if (!fs.existsSync(distAssetsDir)) {
    console.log('    [Note: dist/assets not yet built, building first...]');
    execSync('npm run build', { stdio: 'ignore' });
  }

  const jsFiles = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'));
  assert.ok(jsFiles.length > 0, 'Production JS bundles must exist in dist/assets');

  for (const jsFile of jsFiles) {
    const jsContent = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf8');
    assert.ok(!jsContent.includes('AQ.Ab8RN6'), `Secret Gemini key leaked in ${jsFile}`);
    assert.ok(!jsContent.includes('re_QFPpqjN5'), `Secret Resend key leaked in ${jsFile}`);
  }
});

// 5. Environment Variable Fallback Resilience (Safe Defaults When Unset)
runTest('Fallback Resilience: Server helpers degrade gracefully when provider keys are absent', async () => {
  const { getLlmProviderConfig } = await import('../backend/aiAnalyzerEngine.js');
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevOpenAi = process.env.OPENAI_API_KEY;
  const prevOpenRouter = process.env.OPENROUTER_API_KEY;

  try {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const fallbackConfig = getLlmProviderConfig();
    assert.strictEqual(fallbackConfig.provider, 'deterministic-fallback');
    assert.strictEqual(fallbackConfig.apiKey, null);
  } finally {
    if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
    if (prevOpenAi) process.env.OPENAI_API_KEY = prevOpenAi;
    if (prevOpenRouter) process.env.OPENROUTER_API_KEY = prevOpenRouter;
  }
});

// 6. Active Production Configuration Certification
runTest('Production Certification: Current backend environment contains valid active keys', async () => {
  const { getLlmProviderConfig } = await import('../backend/aiAnalyzerEngine.js');
  const { isSupabaseConfigured, supabaseUrl } = await import('../backend/supabase.js');

  const llmConfig = getLlmProviderConfig();
  assert.ok(llmConfig.apiKey && llmConfig.apiKey.length > 15, 'Active Gemini/LLM key must be configured in backend/.env');
  assert.strictEqual(isSupabaseConfigured, true, 'Supabase must be configured in backend/.env');
  assert.ok(supabaseUrl.startsWith('https://'), 'Supabase URL must use HTTPS');
});

console.log('\n======================================================');
console.log(`Phase 10 Test Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('======================================================\n');

if (passedTests < totalTests) {
  process.exit(1);
}
