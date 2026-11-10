import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('FinSight Authentication Neumorphism Redesign Suite', async (t) => {
  const cssPath = path.join(__dirname, 'src/styles/neumorphismTheme.css');
  const authPagePath = path.join(__dirname, 'src/pages/AuthPage.jsx');
  const updatePasswordPath = path.join(__dirname, 'src/pages/UpdatePasswordPage.jsx');
  const appPath = path.join(__dirname, 'src/App.jsx');
  const adminLoginPath = path.join(__dirname, 'src/pages/admin/AdminLoginPage.jsx');
  const adminPortalPath = path.join(__dirname, 'src/pages/admin/AdminPortal.jsx');

  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const authContent = fs.readFileSync(authPagePath, 'utf8');
  const updateContent = fs.readFileSync(updatePasswordPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');
  const adminLoginContent = fs.readFileSync(adminLoginPath, 'utf8');
  const adminPortalContent = fs.readFileSync(adminPortalPath, 'utf8');

  await t.test('1. neumorphismTheme.css contains all required Neumorphic Auth tokens and rules', () => {
    assert.ok(cssContent.includes('.user-neumorphic-root.auth-page-root'), 'Missing .auth-page-root style rule');
    assert.ok(cssContent.includes('.auth-card-surface'), 'Missing .auth-card-surface style rule');
    assert.ok(cssContent.includes('.auth-neu-input'), 'Missing .auth-neu-input style rule');
    assert.ok(cssContent.includes('.btn-google-sso'), 'Missing .btn-google-sso style rule');
    assert.ok(cssContent.includes('.btn-guest-access'), 'Missing .btn-guest-access style rule');
    assert.ok(cssContent.includes('.btn-autofill'), 'Missing .btn-autofill style rule');
    assert.ok(cssContent.includes('.auth-back-btn'), 'Missing .auth-back-btn style rule');
    assert.ok(cssContent.includes('.auth-alert-error'), 'Missing .auth-alert-error style rule');
    assert.ok(cssContent.includes('.auth-alert-success'), 'Missing .auth-alert-success style rule');
    assert.ok(cssContent.includes('.auth-alert-warning'), 'Missing .auth-alert-warning style rule');
    assert.ok(cssContent.includes('.auth-neu-tagline-badge'), 'Missing .auth-neu-tagline-badge style rule');
    assert.ok(cssContent.includes('@media (max-width: 900px)'), 'Missing responsive tablet/mobile breakpoint');
  });

  await t.test('2. AuthPage.jsx applies Neumorphism root, dual surfaces, and showcase panel', () => {
    assert.ok(authContent.includes('auth-page-root user-neumorphic-root'), 'AuthPage does not use auth-page-root user-neumorphic-root');
    assert.ok(authContent.includes('auth-card-surface'), 'AuthPage does not wrap forms in auth-card-surface');
    assert.ok(authContent.includes('auth-neu-tagline-badge'), 'AuthPage missing auth-neu-tagline-badge');
    assert.ok(authContent.includes('True Safe-to-Spend Engine'), 'AuthPage missing True Safe-to-Spend Engine feature showcase');
    assert.ok(authContent.includes('Payment Delay Stress-Tester'), 'AuthPage missing Payment Delay Stress-Tester feature showcase');
  });

  await t.test('3. AuthPage.jsx preserves all core functional IDs and interactions', () => {
    assert.ok(authContent.includes('id="guest-login-button"'), 'Missing #guest-login-button');
    assert.ok(authContent.includes('id="register-guest-button"'), 'Missing #register-guest-button');
    assert.ok(authContent.includes('id="register-back-button"'), 'Missing #register-back-button');
    assert.ok(authContent.includes('id="link-account-back-button"'), 'Missing #link-account-back-button');
    assert.ok(authContent.includes('id="forgot-back-button"'), 'Missing #forgot-back-button');
    assert.ok(authContent.includes('id="wizard-back-button"'), 'Missing #wizard-back-button');
    assert.ok(authContent.includes('id="wizard-step1-return-btn"'), 'Missing #wizard-step1-return-btn');
    assert.ok(authContent.includes('id="wizard-next-btn"'), 'Missing #wizard-next-btn');
    assert.ok(authContent.includes('id="wizard-step2-back-btn"'), 'Missing #wizard-step2-back-btn');
    assert.ok(authContent.includes('id="wizard-finish-btn"'), 'Missing #wizard-finish-btn');
  });

  await t.test('4. UpdatePasswordPage.jsx adopts Neumorphism styling and semantic states', () => {
    assert.ok(updateContent.includes('auth-page-root user-neumorphic-root update-password-page-root'), 'UpdatePasswordPage missing Neumorphic root wrapper');
    assert.ok(updateContent.includes('auth-card-surface update-password-card'), 'UpdatePasswordPage missing auth-card-surface');
    assert.ok(updateContent.includes('auth-neu-input'), 'UpdatePasswordPage missing auth-neu-input');
    assert.ok(updateContent.includes('KeyRound'), 'UpdatePasswordPage missing KeyRound icon');
  });

  await t.test('5. LoadingScreen in App.jsx inherits Neumorphic theme tokens', () => {
    assert.ok(appContent.includes('user-neumorphic-root'), 'App.jsx LoadingScreen missing user-neumorphic-root');
    assert.ok(appContent.includes('#059669'), 'App.jsx LoadingScreen missing brand emerald accent');
  });

  await t.test('6. STRICT ADMIN ISOLATION: Admin Portal remains 100% untouched', () => {
    assert.ok(!adminLoginContent.includes('user-neumorphic-root'), 'AdminLoginPage mistakenly contaminated with user-neumorphic-root');
    assert.ok(!adminPortalContent.includes('user-neumorphic-root'), 'AdminPortal mistakenly contaminated with user-neumorphic-root');
    assert.ok(!adminLoginContent.includes('neumorphismTheme.css'), 'AdminLoginPage mistakenly imports neumorphismTheme.css');
    assert.ok(!adminPortalContent.includes('neumorphismTheme.css'), 'AdminPortal mistakenly imports neumorphismTheme.css');
  });
});
