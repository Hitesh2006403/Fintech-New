import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { navigationTracker } from './src/services/navigationTracker.js';

describe('FinSight Responsive Navigation & Setup Flow Comprehensive Suite', () => {
  // Mock sessionStorage for Node environment
  const mockStorage = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
  };
  globalThis.window = { sessionStorage: globalThis.sessionStorage };

  it('1. NavigationTracker starts empty and canGoBack() is false', () => {
    navigationTracker.clear();
    assert.strictEqual(navigationTracker.canGoBack(), false);
    assert.strictEqual(navigationTracker.getPreviousRoute(), null);
    assert.deepStrictEqual(navigationTracker.getStack(), []);
  });

  it('2. Scenario 9: First page opened in a tab (/setup direct load) safely routes to fallback without exiting website', () => {
    navigationTracker.clear();
    navigationTracker.record('/setup');
    assert.strictEqual(navigationTracker.canGoBack(), false);

    let navigatedTo = null;
    const mockNavigate = (dest) => { navigatedTo = dest; };

    // When on Step 1 with no prior history, goBack must navigate to fallback
    navigationTracker.goBack(mockNavigate, '/dashboard');
    assert.strictEqual(navigatedTo, '/dashboard', 'Must fallback to in-app page instead of popping out of website');
  });

  it('3. Repeated navigation to same route avoids duplicate history entries (no loops)', () => {
    navigationTracker.clear();
    navigationTracker.record('/setup');
    navigationTracker.record('/setup');
    navigationTracker.record('/setup');
    assert.deepStrictEqual(navigationTracker.getStack(), ['/setup']);
  });

  it('4. Scenario 2: Step 1 -> Step 2 (/setup?step=2) updates history and enables backward navigation', () => {
    navigationTracker.clear();
    navigationTracker.record('/setup?step=1');
    navigationTracker.record('/setup?step=2');
    assert.strictEqual(navigationTracker.canGoBack(), true);
    assert.strictEqual(navigationTracker.getPreviousRoute(), '/setup?step=1');

    let navigatedTo = null;
    const mockNavigate = (dest) => { navigatedTo = dest; };
    navigationTracker.goBack(mockNavigate, '/setup?step=1');
    assert.strictEqual(navigatedTo, -1, 'Step 2 visible Back button must call navigate(-1)');
  });

  it('5. Scenario 3 & 4: In-app navigation history stack handles back and forward transitions', () => {
    navigationTracker.clear();
    // Simulate user flow: login -> setup step 1 -> setup step 2
    navigationTracker.record('/login');
    navigationTracker.record('/setup?step=1');
    navigationTracker.record('/setup?step=2');
    assert.strictEqual(navigationTracker.canGoBack(), true);
    assert.strictEqual(navigationTracker.getPreviousRoute(), '/setup?step=1');

    // From step 1, previous was /login
    const stack = navigationTracker.getStack();
    assert.strictEqual(stack[0], '/login');
    assert.strictEqual(stack[1], '/setup?step=1');
    assert.strictEqual(stack[2], '/setup?step=2');
  });

  it('6. Scenario 5 & 6: Form data persistence retains entered values across steps and page refresh', () => {
    navigationTracker.clearSetupDraft();

    // User types in Step 1 fields
    navigationTracker.saveSetupDraft({
      balance: '95000',
      buffer: '40000',
      frequency: 'Gig / Weekly Variable',
      threshold: '25000'
    });

    // Simulated refresh on Step 1
    const draftAfterRefresh = navigationTracker.loadSetupDraft({
      startingBalance: 45000,
      safetyBuffer: 25000,
      incomeFrequency: 'Irregular / Milestone-based',
      lowBalanceAlertThreshold: 20000
    });

    assert.strictEqual(draftAfterRefresh.balance, '95000', 'Balance must be exactly preserved');
    assert.strictEqual(draftAfterRefresh.buffer, '40000', 'Safety buffer must be exactly preserved');
    assert.strictEqual(draftAfterRefresh.frequency, 'Gig / Weekly Variable', 'Frequency must be exactly preserved');
    assert.strictEqual(draftAfterRefresh.threshold, '25000', 'Alert threshold must be exactly preserved');
  });

  it('7. Scenario 7: Setup completion cleanly purges draft without leaving stale entries', () => {
    navigationTracker.saveSetupDraft({ balance: '95000', buffer: '40000' });
    navigationTracker.clearSetupDraft();

    const cleanDraft = navigationTracker.loadSetupDraft({ startingBalance: 45000, safetyBuffer: 25000 });
    assert.strictEqual(cleanDraft.balance, '45000', 'Clean draft returns to default');
    assert.strictEqual(cleanDraft.buffer, '25000');
  });

  it('8. Subpage navigation (/income, /expenses, /simulator) Header Back button behavior', () => {
    navigationTracker.clear();
    navigationTracker.record('/dashboard');
    navigationTracker.record('/income');

    let navigatedTo = null;
    const mockNavigate = (dest) => { navigatedTo = dest; };

    // Clicking Header Back on /income with /dashboard in history
    navigationTracker.goBack(mockNavigate, '/dashboard');
    assert.strictEqual(navigatedTo, -1, 'Header Back must use navigate(-1) when prior page exists');

    // If opened directly as /income in new tab
    navigationTracker.clear();
    navigationTracker.record('/income');
    navigationTracker.goBack(mockNavigate, '/dashboard');
    assert.strictEqual(navigatedTo, '/dashboard', 'Header Back must fallback to /dashboard if no prior history');
  });

  it('9. Scenario 8 & 11: Route definitions in App.jsx cover all required entrypoints', () => {
    const appCode = fs.readFileSync('./src/App.jsx', 'utf-8');
    assert.ok(appCode.includes('path="/setup"'), 'Route /setup must be declared');
    assert.ok(appCode.includes('path="/register"'), 'Route /register must be declared');
    assert.ok(appCode.includes('path="/onboarding"'), 'Route /onboarding alias must be declared');
    assert.ok(appCode.includes('path="/login"'), 'Route /login must be declared');
    assert.ok(appCode.includes('path="/dashboard"'), 'Route /dashboard must be declared');
    assert.ok(appCode.includes('NavigationWatcher'), 'NavigationWatcher must be wired');
  });

  it('10. Scenario 10: App.css contains responsive back button styling with accessibility and touch targets', () => {
    const cssCode = fs.readFileSync('./src/App.css', 'utf-8');
    assert.ok(cssCode.includes('.wizard-header-nav'), '.wizard-header-nav class must exist');
    assert.ok(cssCode.includes('.wizard-back-btn'), '.wizard-back-btn class must exist');
    assert.ok(cssCode.includes('.header-back-btn'), '.header-back-btn class must exist');
    assert.ok(cssCode.includes('.auth-back-btn'), '.auth-back-btn class must exist');
    assert.ok(cssCode.includes(':focus-visible'), 'Focus visible indicator must be styled');
    assert.ok(cssCode.includes('@media (max-width: 640px)'), 'Mobile media query must be configured');
  });

  it('11. AuthPage contains visible Back buttons with accessible labels on Step 1, Step 2, and Register', () => {
    const authCode = fs.readFileSync('./src/pages/AuthPage.jsx', 'utf-8');
    assert.ok(authCode.includes('id="wizard-back-button"'), 'Setup wizard top back button must exist');
    assert.ok(authCode.includes('id="wizard-step1-return-btn"'), 'Step 1 return button must exist');
    assert.ok(authCode.includes('id="wizard-step2-back-btn"'), 'Step 2 bottom back button must exist');
    assert.ok(authCode.includes('id="register-back-button"'), 'Register back button must exist');
    assert.ok(authCode.includes('aria-label='), 'Back buttons must include accessible aria-label attributes');
  });

  it('12. Header contains visible Back button on subpages', () => {
    const headerCode = fs.readFileSync('./src/components/layout/Header.jsx', 'utf-8');
    assert.ok(headerCode.includes('id="header-back-button"'), 'Header back button must exist');
    assert.ok(headerCode.includes('isSubpage'), 'Header back button must conditionally render on subpages');
  });
});
