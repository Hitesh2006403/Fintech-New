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
            <span style={{
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'var(--neu-brand-primary, #059669)',
              background: 'rgba(5, 150, 105, 0.10)',
              border: '1px solid rgba(5, 150, 105, 0.25)',
              padding: '4px 10px',
              borderRadius: 8
            }}>
              Hackathon Signature Feature
            </span>
            <span style={{ color: 'var(--neu-text-muted, #94A3B8)' }}>•</span>
            <span style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>Zero-Risk Sandboxed Simulation</span>
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
        <div style={{
          background: 'var(--neu-success-bg, rgba(16, 185, 129, 0.12))',
          border: '1px solid var(--neu-success-border, rgba(16, 185, 129, 0.28))',
          color: 'var(--neu-success-dark, #047857)',
          padding: '12px 18px',
          borderRadius: 12,
          marginBottom: 20,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: 'var(--neu-shadow-raised-sm)'
        }}>
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
          <div className="sim-slider-container" style={{
            background: 'var(--neu-bg-primary, #E9EEF3)',
            border: '1px solid var(--neu-border, #DCE4EB)',
            borderRadius: 14,
            padding: '18px 16px',
            boxShadow: 'var(--neu-shadow-inset-sm, inset 2px 2px 5px rgba(163, 177, 198, 0.25), inset -2px -2px 5px rgba(255, 255, 255, 0.85))'
          }}>
            <div className="sim-slider-header" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>
                Payment Delay Duration:
              </span>
              <strong style={{ fontSize: 17, color: 'var(--neu-brand-primary, #059669)', fontVariantNumeric: 'tabular-nums' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', marginTop: 8 }}>
              <span>On Time (0d)</span>
              <span>10 Days</span>
              <span>20 Days</span>
              <span>30 Days (Critical)</span>
            </div>

            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              background: 'var(--neu-bg-secondary, #F1F5F9)',
              borderRadius: 10,
              border: '1px solid var(--neu-border, #DCE4EB)',
              fontSize: 12,
              color: 'var(--neu-text-secondary, #64748B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div>Original: <strong style={{ color: 'var(--neu-text-primary, #172033)' }}>{originalDate}</strong></div>
              <div>Simulated: <strong style={{ color: delayDays > 0 ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-success-dark, #047857)' }}>{simulatedDate}</strong></div>
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
            <span style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4, display: 'block' }}>Deducts immediately on Day 1 to test buffer resilience.</span>
          </div>

          {/* 4. Client Payment Deduction / Withholding */}
          <div className="form-group-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label-title" style={{ margin: 0 }}>Client Scope Deduction / TDS</label>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neu-brand-primary, #059669)', fontVariantNumeric: 'tabular-nums' }}>{incomeReductionPct}%</span>
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
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--neu-border, #DCE4EB)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                Saved Sandboxes ({savedScenarios.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedScenarios.map(sc => (
                  <div key={sc.id} style={{
                    padding: '10px 14px',
                    background: 'var(--neu-bg-primary, #E9EEF3)',
                    borderRadius: 10,
                    border: '1px solid var(--neu-border, #DCE4EB)',
                    boxShadow: 'var(--neu-shadow-raised-sm)',
                    fontSize: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--neu-text-primary, #172033)' }}>{sc.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', marginTop: 2 }}>Saved at {sc.savedAt}</div>
                    </div>
                    <strong style={{ color: sc.maxShortfall > 0 ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-success-dark, #047857)', fontVariantNumeric: 'tabular-nums' }}>
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
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: simulated.maxShortfall > 0 ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-text-secondary, #64748B)', marginBottom: 6 }}>
                Peak Shortfall
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: simulated.maxShortfall > 0 ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-success-dark, #047857)', fontVariantNumeric: 'tabular-nums' }}>
                {simulated.maxShortfall > 0 ? `-${formatINR(simulated.maxShortfall)}` : '₹0 (Solvent)'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
                {simulated.firstNegativeDate ? `First negative on ${simulated.firstNegativeDate}` : 'No negative balance'}
              </div>
            </div>

            <div className={`sim-impact-card ${simulated.daysBelowBuffer > 0 ? 'warning' : ''}`}>
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: simulated.daysBelowBuffer > 0 ? 'var(--neu-warning-dark, #B45309)' : 'var(--neu-text-secondary, #64748B)', marginBottom: 6 }}>
                Days Below Buffer
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: simulated.daysBelowBuffer > 0 ? 'var(--neu-warning-dark, #B45309)' : 'var(--neu-text-primary, #172033)', fontVariantNumeric: 'tabular-nums' }}>
                {simulated.daysBelowBuffer} Days
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
                Buffer: {formatINR(preferences.safetyBuffer)}
              </div>
            </div>

            <div className="sim-impact-card">
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--neu-text-secondary, #64748B)', marginBottom: 6 }}>
                Lowest Balance
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: simulated.minimumBalance < 0 ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-brand-primary, #059669)', fontVariantNumeric: 'tabular-nums' }}>
                {formatINR(simulated.minimumBalance)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
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
              <span className={`status-badge ${simulated.maxShortfall > 0 ? 'overdue' : simulated.daysBelowBuffer > 0 ? 'upcoming' : 'received'}`}>
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
                    borderRadius: 12,
                    background: rec.type === 'critical'
                      ? 'var(--neu-danger-bg, rgba(239, 68, 68, 0.12))'
                      : rec.type === 'warning'
                      ? 'var(--neu-warning-bg, rgba(245, 158, 11, 0.12))'
                      : 'rgba(5, 150, 105, 0.08)',
                    border: `1px solid ${
                      rec.type === 'critical'
                        ? 'var(--neu-danger-border, rgba(239, 68, 68, 0.3))'
                        : rec.type === 'warning'
                        ? 'var(--neu-warning-border, rgba(245, 158, 11, 0.3))'
                        : 'rgba(5, 150, 105, 0.25)'
                    }`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    boxShadow: 'var(--neu-shadow-raised-sm)'
                  }}
                >
                  <Zap size={18} color={rec.type === 'critical' ? 'var(--neu-danger, #EF4444)' : rec.type === 'warning' ? 'var(--neu-warning, #F59E0B)' : 'var(--neu-brand-primary, #059669)'} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>{rec.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', marginTop: 3, lineHeight: 1.5 }}>{rec.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contributing Bills in the Shortage Window */}
            {contributingBills.length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
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
                        background: 'var(--neu-bg-primary, #E9EEF3)',
                        borderRadius: 10,
                        border: '1px solid var(--neu-border, #DCE4EB)',
                        boxShadow: 'var(--neu-shadow-raised-sm)',
                        fontSize: 12.5,
                        flexWrap: 'wrap',
                        gap: 8
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: 'var(--neu-text-primary, #172033)', fontWeight: 600 }}>{bill.title}</div>
                        <div style={{ color: 'var(--neu-text-secondary, #64748B)', fontSize: 11, marginTop: 2 }}>Due {bill.dueDate}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span className={`status-badge ${bill.isEssential ? 'overdue' : 'neutral'}`} style={{ fontSize: 10.5 }}>
                          {bill.isEssential ? 'Essential' : 'Can Defer'}
                        </span>
                        <strong style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--neu-text-primary, #172033)' }}>{formatINR(bill.amount)}</strong>
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
