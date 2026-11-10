import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR, simulatePaymentDelay, toISODate, addDays } from '../services/financialEngine.js';
import { CashFlowChart } from '../components/charts/CashFlowChart.jsx';
import {
  Sliders,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  Zap
} from 'lucide-react';

export function PaymentDelaySimulator() {
  const { balanceDetails, incomes, expenses, preferences } = useApp();

  // Find candidate confirmed / expected incomes to simulate
  const upcomingIncomes = incomes.filter(i => i.status !== 'received');
  const defaultIncomeId = upcomingIncomes[0]?.id || '';

  // Simulator Controls State
  const [selectedIncomeId, setSelectedIncomeId] = useState(defaultIncomeId);
  const [delayDays, setDelayDays] = useState(10);
  const [unexpectedExpense, setUnexpectedExpense] = useState(0);
  const [incomeReductionPct, setIncomeReductionPct] = useState(0);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Selected income object
  const targetIncome = incomes.find(i => i.id === selectedIncomeId) || upcomingIncomes[0];

  // Run live simulation from shared mathematical engine
  const simResult = simulatePaymentDelay({
    availableCash: balanceDetails.availableCash,
    incomes,
    expenses,
    safetyBuffer: preferences.safetyBuffer,
    delayConfig: {
      incomeId: selectedIncomeId,
      delayDays: Number(delayDays),
      unexpectedExpense: Number(unexpectedExpense),
      incomeReductionPct: Number(incomeReductionPct)
    },
    scenario: 'expected'
  });

  const { baseline, simulated, contributingBills, recommendations } = simResult;

  // Reset simulation to 0 delay
  const handleReset = () => {
    setDelayDays(0);
    setUnexpectedExpense(0);
    setIncomeReductionPct(0);
  };

  // Save scenario (isolated in local simulator state without touching real DB)
  const handleSaveScenario = () => {
    const newScenario = {
      id: `scen_${Date.now()}`,
      title: `${targetIncome?.title || 'Payment'} Delayed by ${delayDays} Days`,
      delayDays,
      unexpectedExpense,
      incomeReductionPct,
      maxShortfall: simulated.maxShortfall,
      minBalance: simulated.minimumBalance,
      savedAt: new Date().toLocaleTimeString()
    };
    setSavedScenarios([newScenario, ...savedScenarios]);
    setSaveSuccessMsg('Scenario preserved in sandbox!');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  const originalDate = targetIncome?.expectedDate || toISODate(new Date());
  const simulatedDate = addDays(originalDate, delayDays);

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--accent-primary)', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '4px 10px', borderRadius: 8, boxShadow: '0 0 12px rgba(56, 189, 248, 0.15)' }}>
              Hackathon Signature Feature
            </span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Zero-Risk Sandboxed Simulation</span>
          </div>
          <h1 className="page-title">Payment Delay Simulator</h1>
          <p className="page-subtitle">
            What happens if your client pays 10, 15, or 25 days late? Stress-test your liquidity runway before shocks happen.
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
          >
            <RotateCcw size={15} />
            <span>Reset Baseline</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveScenario}
          >
            <Save size={15} />
            <span>Save Scenario</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34D399', padding: '12px 18px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(10px)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)' }}>
          <CheckCircle2 size={16} />
          <span style={{ fontWeight: 600 }}>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Two-Panel Workspace Grid */}
      <div className="simulator-workspace-grid">
        
        {/* Left Panel: Simulator Controls */}
        <div className="sim-control-panel card">
          <h3 className="card-title-h3" style={{ marginBottom: 18 }}>Simulation Controls</h3>

          {/* 1. Target Income Selector */}
          <div className="form-group-item">
            <label className="form-label-title">Select Scheduled Income to Stress-Test</label>
            <select
              className="form-input-control"
              value={selectedIncomeId}
              onChange={(e) => setSelectedIncomeId(e.target.value)}
            >
              {upcomingIncomes.map(inc => (
                <option key={inc.id} value={inc.id}>
                  {inc.title} (+{formatINR(inc.amount)}) — Due {inc.expectedDate}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Delay Slider (0 to 30 days) */}
          <div className="sim-slider-container" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-glass)', borderRadius: 12, padding: '18px 16px' }}>
            <div className="sim-slider-header" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Payment Delay Duration:
              </span>
              <strong style={{ fontSize: 17, color: 'var(--accent-primary)', fontFeatureSettings: 'tnum', textShadow: '0 0 12px rgba(56, 189, 248, 0.35)' }}>
                {delayDays} Days
              </strong>
            </div>

            <input
              type="range"
              min="0"
              max="30"
              step="1"
              className="interactive-slider-control"
              value={delayDays}
              onChange={(e) => setDelayDays(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              <span>On Time (0d)</span>
              <span>10 Days</span>
              <span>20 Days</span>
              <span>30 Days (Critical)</span>
            </div>

            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              background: 'rgba(11, 18, 32, 0.7)',
              borderRadius: 8,
              border: '1px solid var(--border-glass)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div>Original: <strong style={{ color: 'var(--text-primary)' }}>{originalDate}</strong></div>
              <div>Simulated: <strong style={{ color: delayDays > 0 ? '#EF4444' : '#10B981', textShadow: delayDays > 0 ? '0 0 10px rgba(239, 68, 68, 0.3)' : '0 0 10px rgba(16, 185, 129, 0.3)' }}>{simulatedDate}</strong></div>
            </div>
          </div>

          {/* 3. Unexpected Expense Input */}
          <div className="form-group-item" style={{ marginTop: 16 }}>
            <label className="form-label-title">Simulate Immediate Emergency Expense (₹)</label>
            <input
              type="number"
              min="0"
              step="1000"
              className="form-input-control"
              placeholder="e.g. 5000 (Medical / Vehicle repair)"
              value={unexpectedExpense || ''}
              onChange={(e) => setUnexpectedExpense(e.target.value)}
            />
            <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Deducts immediately on Day 1 to test buffer resilience.</span>
          </div>

          {/* 4. Client Payment Deduction / Withholding */}
          <div className="form-group-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label-title" style={{ margin: 0 }}>Client Scope Deduction / TDS</label>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary)', textShadow: '0 0 10px rgba(56, 189, 248, 0.3)' }}>{incomeReductionPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="5"
              className="interactive-slider-control"
              value={incomeReductionPct}
              onChange={(e) => setIncomeReductionPct(e.target.value)}
            />
          </div>

          {/* Saved Scenarios List */}
          {savedScenarios.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                Saved Sandboxes ({savedScenarios.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedScenarios.map(sc => (
                  <div key={sc.id} style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: 8, border: '1px solid var(--border-glass)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sc.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Saved at {sc.savedAt}</div>
                    </div>
                    <strong style={{ color: sc.maxShortfall > 0 ? '#EF4444' : '#10B981', fontFeatureSettings: 'tnum', textShadow: sc.maxShortfall > 0 ? '0 0 10px rgba(239, 68, 68, 0.3)' : '0 0 10px rgba(16, 185, 129, 0.3)' }}>
                      {sc.maxShortfall > 0 ? `Deficit -${formatINR(sc.maxShortfall)}` : 'Solvent'}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Panel: Simulation Impact Analysis & Recommendations */}
        <div className="sim-results-panel">
          
          {/* Dynamic KPI Cards Strip */}
          <div className="sim-impact-kpi-grid">
            <div className={`sim-impact-card ${simulated.maxShortfall > 0 ? 'danger' : ''}`}>
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: simulated.maxShortfall > 0 ? '#FCA5A5' : 'var(--text-muted)', marginBottom: 6 }}>
                Peak Shortfall
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: simulated.maxShortfall > 0 ? '#EF4444' : '#10B981', fontFeatureSettings: 'tnum', textShadow: simulated.maxShortfall > 0 ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(16, 185, 129, 0.4)' }}>
                {simulated.maxShortfall > 0 ? `-${formatINR(simulated.maxShortfall)}` : '₹0 (Solvent)'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                {simulated.firstNegativeDate ? `First negative on ${simulated.firstNegativeDate}` : 'No negative balance'}
              </div>
            </div>

            <div className={`sim-impact-card ${simulated.daysBelowBuffer > 0 ? 'warning' : ''}`}>
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: simulated.daysBelowBuffer > 0 ? '#FDE68A' : 'var(--text-muted)', marginBottom: 6 }}>
                Days Below Buffer
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: simulated.daysBelowBuffer > 0 ? '#F59E0B' : 'var(--text-primary)', fontFeatureSettings: 'tnum', textShadow: simulated.daysBelowBuffer > 0 ? '0 0 16px rgba(245, 158, 11, 0.4)' : 'none' }}>
                {simulated.daysBelowBuffer} Days
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                Buffer: {formatINR(preferences.safetyBuffer)}
              </div>
            </div>

            <div className="sim-impact-card">
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
                Lowest Balance
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: simulated.minimumBalance < 0 ? '#EF4444' : 'var(--accent-primary)', fontFeatureSettings: 'tnum', textShadow: simulated.minimumBalance < 0 ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(56, 189, 248, 0.4)' }}>
                {formatINR(simulated.minimumBalance)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                Baseline was {formatINR(baseline.minimumBalance)}
              </div>
            </div>
          </div>

          {/* Visual Comparison: Baseline Curve vs Simulated Delay Curve */}
          <div className="card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title-h3">Liquidity Trajectory Under Delay</h3>
                <p className="card-subtitle-p">
                  Simulating {delayDays}-day delay on {targetIncome?.title || 'selected income'}.
                </p>
              </div>
              <span className={`badge ${simulated.maxShortfall > 0 ? 'badge-danger' : simulated.daysBelowBuffer > 0 ? 'badge-warning' : 'badge-success'}`}>
                {simulated.maxShortfall > 0 ? 'Cash Deficit Triggered' : simulated.daysBelowBuffer > 0 ? 'Safety Cushion Strained' : 'Safe to Absorb'}
              </span>
            </div>

            <CashFlowChart
              forecastData={simulated.forecast}
              safetyBuffer={preferences.safetyBuffer}
              startingBalance={balanceDetails.availableCash}
              height={260}
              showControls={false}
            />
          </div>

          {/* Actionable Recommendations & Bill Mitigation */}
          <div className="card">
            <h3 className="card-title-h3" style={{ marginBottom: 14 }}>
              Intelligent Mitigation Strategy
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {recommendations.map(rec => (
                <div
                  key={rec.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: rec.type === 'critical' ? 'rgba(239, 68, 68, 0.12)' : rec.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.1)',
                    border: `1px solid ${rec.type === 'critical' ? 'rgba(239, 68, 68, 0.3)' : rec.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.25)'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12
                  }}
                >
                  <Zap size={18} color={rec.type === 'critical' ? '#EF4444' : rec.type === 'warning' ? '#F59E0B' : 'var(--accent-primary)'} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{rec.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{rec.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contributing Bills in the Shortage Window */}
            {contributingBills.length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                  Obligations Due During Delay Window ({contributingBills.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {contributingBills.map(bill => (
                    <div
                      key={bill.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: 8,
                        border: '1px solid var(--border-glass)',
                        fontSize: 12.5,
                        flexWrap: 'wrap',
                        gap: 8
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{bill.title}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>Due {bill.dueDate}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span className={`badge ${bill.isEssential ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: 10.5 }}>
                          {bill.isEssential ? 'Essential' : 'Can Defer'}
                        </span>
                        <strong style={{ fontFeatureSettings: 'tnum', color: 'var(--text-primary)' }}>{formatINR(bill.amount)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
