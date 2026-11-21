/**
 * FINSIGHT CENTRALIZED TEST RUNNER
 * Orchestrates all 30 automated test suites with real-time reporting.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Test suite execution list (in optimal dependency order)
const TEST_SUITES = [
  // 1. Core Financial Engine Unit Tests
  { name: 'Financial Engine Unit Tests', file: 'tests/test_financial_engine.js', useTestRunner: true },

  // 2. Platform Authentication & Session Separation
  { name: 'Admin Portal Suite', file: 'tests/test_admin_suite.js', useTestRunner: true },
  { name: 'Google OAuth & Role-Based Auth', file: 'tests/test_oauth_suite.js', useTestRunner: true },
  { name: 'Unified Routing & Guards', file: 'tests/test_unified_routing_suite.js', useTestRunner: true },
  { name: 'Password Recovery Flow', file: 'tests/test_password_recovery_suite.js', useTestRunner: true },
  { name: 'Resend Password Recovery Integration', file: 'tests/test_resend_password_recovery.js', useTestRunner: true },
  { name: 'Navigation Flow Tracker', file: 'tests/test_navigation_flow_suite.js', useTestRunner: true },
  { name: 'Guest & Prototype Resilience', file: 'tests/test_guest_and_prototype_suite.js', useTestRunner: true },
  { name: 'Authentication Resilience', file: 'tests/test_auth_resilience_suite.js', useTestRunner: true },
  { name: 'End-to-End Workflow', file: 'tests/test_e2e_workflow.js', useTestRunner: true },
  { name: 'Nine-Issue Strict Suite', file: 'tests/test_nine_issues_strict_suite.js', useTestRunner: true },
  { name: 'Production Readiness Audit', file: 'tests/test_production_readiness_audit.js', useTestRunner: true },
  { name: 'Final Independent Audit', file: 'tests/test_final_independent_audit.js', useTestRunner: true },
  { name: 'Backend Logging Privacy', file: 'tests/test_backend_logging_privacy.js', useTestRunner: true },
  { name: 'Auth Neumorphism Design', file: 'tests/test_auth_neumorphism_suite.js', useTestRunner: true },
  { name: 'Admin/User Session Separation', file: 'tests/test_admin_user_session_separation.js', useTestRunner: true },
  { name: 'Registration & Financial Setup', file: 'tests/test_registration_and_financial_setup.js', useTestRunner: true },

  // 3. AI Personal Finance Analyzer (Phases 2-14)
  { name: 'Analyzer Phase 2: Tenant Isolation', file: 'tests/test_analyzer_phase2_suite.js', useTestRunner: true },
  { name: 'Analyzer Phase 3: Deterministic Engine', file: 'tests/test_analyzer_phase3_suite.js', useTestRunner: true },
  { name: 'Analyzer Phase 4: Multi-Agent AI', file: 'tests/test_analyzer_phase4_suite.js', useTestRunner: true },
  { name: 'Analyzer Phase 5: Financial AI Chat', file: 'tests/test_analyzer_phase5_suite.js', useTestRunner: true },
  { name: 'Analyzer Phase 6: Statement Parser', file: 'tests/test_analyzer_phase6_suite.js', useTestRunner: true },
  { name: 'Analyzer Phase 7: Supabase Cloud Isolation', file: 'tests/test_analyzer_phase7_suite.js', useTestRunner: true },
  { name: 'Analyzer Phase 8: Hardening & Resilience', file: 'tests/test_analyzer_phase8_suite.js', useTestRunner: false },
  { name: 'Analyzer Phase 9: Frontend/Backend Sync', file: 'tests/test_analyzer_phase9_suite.js', useTestRunner: false },
  { name: 'Analyzer Phase 10: Secret Defense', file: 'tests/test_analyzer_phase10_suite.js', useTestRunner: false },
  { name: 'Analyzer Phase 11: Master Stress Suite', file: 'tests/test_analyzer_master_suite.js', useTestRunner: false },
  { name: 'Analyzer Phase 12: Full System Regression', file: 'tests/test_finsight_full_regression_phase12.js', useTestRunner: true },
  { name: 'Analyzer Phase 13: Edge Cases & Hardening', file: 'tests/test_analyzer_phase13_edge_cases.js', useTestRunner: true },
  { name: 'Analyzer Phase 14: Build Certification', file: 'tests/test_production_build_and_deployment_phase14.js', useTestRunner: true }
];

console.log('======================================================');
console.log(`--- RUNNING FINSIGHT FULL TEST SUITE (${TEST_SUITES.length} SUITES) ---`);
console.log('======================================================\n');

let passedCount = 0;
let failedCount = 0;
const startTime = Date.now();

async function runSuite(suite, index) {
  return new Promise((resolve) => {
    const args = suite.useTestRunner
      ? ['--test', suite.file]
      : [suite.file];

    const proc = spawn('node', args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: process.env
    });

    proc.on('close', (code) => {
      if (code === 0) {
        passedCount++;
        resolve({ suite, success: true });
      } else {
        failedCount++;
        resolve({ suite, success: false, code });
      }
    });

    proc.on('error', (err) => {
      failedCount++;
      console.error(`Failed to launch ${suite.name}:`, err.message);
      resolve({ suite, success: false, error: err });
    });
  });
}

async function runAll() {
  for (let i = 0; i < TEST_SUITES.length; i++) {
    const res = await runSuite(TEST_SUITES[i], i);
    if (!res.success) {
      console.error(`\n❌ [FAILED] Suite: ${TEST_SUITES[i].name} (exit code: ${res.code})\n`);
      process.exit(1);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log(`✅ ALL ${passedCount}/${TEST_SUITES.length} TEST SUITES PASSED (100% SUCCESS)`);
  console.log(`⏱ Total Duration: ${durationSec}s`);
  console.log('======================================================\n');
  process.exit(0);
}

runAll();
