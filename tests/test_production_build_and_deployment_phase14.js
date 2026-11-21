/**
 * FINSIGHT — PHASE 14: PRODUCTION BUILD & DEPLOYMENT VERIFICATION
 *
 * Certified verification suite for production deployment:
 * 1. Production bundle existence, asset hashing, and chunk size limits.
 * 2. Client-side bundle privacy audit (Zero secret/API key leakage in dist/).
 * 3. HTML shell validation (Doctype, viewport, title, modulepreloads, #root).
 * 4. Serverless entrypoint certification (api/index.js export & /tmp fallback).
 * 5. Production Express server operational endpoints (/, /api/health, /api/database/status).
 * 6. Analyzer AI Engine status endpoint reporting (/api/analyzer/ai/status).
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import app from '../backend/server.js';
import db from '../backend/db.js';

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

describe('Phase 14: Production Build & Deployment Certification Suite', () => {

  // =========================================================================
  // CHECK 1: Production Bundle Output & Chunk Budget Audit
  // =========================================================================
  test('Check 1: Production build output exists, uses content hashing, and obeys chunk budget', () => {
    const distPath = path.resolve('dist');
    assert.ok(fs.existsSync(distPath), 'dist/ directory must exist');

    const indexPath = path.join(distPath, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'dist/index.html must exist');

    const assetsPath = path.join(distPath, 'assets');
    assert.ok(fs.existsSync(assetsPath), 'dist/assets/ directory must exist');

    const assetFiles = fs.readdirSync(assetsPath);
    assert.ok(assetFiles.length >= 4, 'Must generate hashed JS and CSS assets');

    // Verify all chunks are under 500 kB (budget limit)
    assetFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stat = fs.statSync(filePath);
      const sizeKb = stat.size / 1024;
      assert.ok(
        sizeKb < 500,
        `Chunk ${file} must be under 500 kB (current size: ${sizeKb.toFixed(2)} kB)`
      );
    });

    // Verify content hashing in filenames (e.g., name-hash.js)
    const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
    assert.ok(jsFiles.length >= 3, 'Must have at least 3 chunked JS bundles');
    jsFiles.forEach(f => {
      assert.match(f, /-[A-Za-z0-9_-]{8,}\.js$/, `File ${f} must include a unique content hash`);
    });
  });

  // =========================================================================
  // CHECK 2: Client Bundle Privacy Audit (Zero Secret Leakage)
  // =========================================================================
  test('Check 2: Client JavaScript bundles strictly contain zero private keys or server secrets', () => {
    const assetsPath = path.resolve('dist/assets');
    const assetFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.js'));

    const forbiddenPatterns = [
      /AIzaSy[A-Za-z0-9_-]{33}/,                // Google API Keys
      /re_[A-Za-z0-9_-]{24,}/,                  // Resend API Keys
      /Admin@FinSight2026!Master/,              // Admin Master Password
      /process\.env\.SESSION_SECRET/,           // Raw Session Secret variable
      /process\.env\.GEMINI_API_KEY/,           // Raw Gemini Key variable
      /SUPABASE_SERVICE_ROLE_KEY/               // Service role master key
    ];

    for (const file of assetFiles) {
      const content = fs.readFileSync(path.join(assetsPath, file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !pattern.test(content),
          `CRITICAL PRIVACY VIOLATION: Bundle ${file} matches secret pattern ${pattern}`
        );
      }
    }
  });

  // =========================================================================
  // CHECK 3: Production HTML Shell Validation
  // =========================================================================
  test('Check 3: dist/index.html is valid, includes modulepreloads, and defines #root mounting container', () => {
    const htmlPath = path.resolve('dist/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(html.includes('<!doctype html>') || html.includes('<!DOCTYPE html>'), 'Must include valid doctype');
    assert.ok(html.includes('<meta name="viewport"'), 'Must define viewport meta tag');
    assert.ok(html.includes('<div id="root"></div>'), 'Must contain #root element for React mounting');
    assert.ok(html.includes('<script type="module"'), 'Must load primary entrypoint as an ES module');
    assert.ok(html.includes('rel="modulepreload"'), 'Must include modulepreload hints for vendor chunks');
  });

  // =========================================================================
  // CHECK 4: Serverless Entrypoint Certification (api/index.js)
  // =========================================================================
  test('Check 4: Serverless entrypoint api/index.js exports Express application without missing modules', async () => {
    const apiIndexPath = path.resolve('api/index.js');
    assert.ok(fs.existsSync(apiIndexPath), 'api/index.js must exist');

    const serverlessModule = await import(apiIndexPath);
    assert.ok(serverlessModule.default, 'api/index.js must have a default export');
    assert.strictEqual(typeof serverlessModule.default, 'function', 'Export must be an Express request listener');
  });

  // =========================================================================
  // CHECK 5: Operational Production Endpoints
  // =========================================================================
  test('Check 5: Root, health, and database status endpoints return 200 OK with valid JSON', async () => {
    // 1. Root Service Info
    const rootRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(rootRes.status, 200);
    const rootData = await rootRes.json();
    assert.strictEqual(rootData.service, 'FinSight Backend API');
    assert.strictEqual(rootData.status, 'operational');

    // 2. Health Endpoint
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'healthy');

    // 3. Database Status Endpoint
    const dbRes = await fetch(`${baseUrl}/api/database/status`);
    assert.strictEqual(dbRes.status, 200);
    const dbData = await dbRes.json();
    assert.strictEqual(dbData.status, 'operational');
    assert.ok(typeof dbData.supabaseConfigured === 'boolean');
    assert.ok(dbData.activeDatabase);
  });

  // =========================================================================
  // CHECK 6: Analyzer Status Endpoint & Dual-Engine Health
  // =========================================================================
  test('Check 6: Authenticated user receives valid AI status and capability matrix', async () => {
    const testUserId = `usr_phase14_status_${Date.now()}`;
    db.clearUserData(testUserId);
    const { sessionId } = db.createSession(testUserId);

    const aiStatusRes = await fetch(`${baseUrl}/api/analyzer/ai/status`, {
      headers: {
        'Cookie': `session_token=${sessionId}`
      }
    });

    assert.strictEqual(aiStatusRes.status, 200);
    const statusData = await aiStatusRes.json();
    assert.strictEqual(statusData.success, true);
    assert.ok(statusData.provider);
    assert.ok(statusData.model);
    assert.strictEqual(statusData.singleAgentAvailable, true);
    assert.strictEqual(statusData.multiAgentAvailable, true);
    assert.strictEqual(typeof statusData.isExternalLlmActive, 'boolean');
  });
});
