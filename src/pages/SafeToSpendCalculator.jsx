import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR, calculateSafeToSpend, toISODate } from '../services/financialEngine.js';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt
} from 'lucide-react';

export function SafeToSpendCalculator() {
  const { balanceDetails, incomes, expenses, preferences, setPreferences, setActiveRoute } = useApp();

  const [bufferInput, setBufferInput] = useState(preferences.safetyBuffer || 25000);
  const [horizonDays, setHorizonDays] = useState(30);
  const [scenario, setScenario] = useState('conservative'); // 'conservative' | 'expected'
  const [includeDiscretionary, setIncludeDiscretionary] = useState(true);

  // Live calculation from shared engine based on user slider adjustments
  const calculation = calculateSafeToSpend({
    availableCash: balanceDetails.availableCash,
    incomes,
    expenses,
    safetyBuffer: bufferInput,
    horizonDays,
    scenario,
    includeDiscretionary
  });

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Safe-to-Spend Calculator</h1>
          <p className="page-subtitle">
            The heart of irregular income peace of mind. Know exactly what you can spend today without compromising upcoming rent, loan EMIs, or emergency reserves.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setActiveRoute('simulator')}
        >
          <span>Test in Delay Simulator</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Main Result: Distinctive Hero Banner */}
      <div className="safe-to-spend-hero-banner">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.12)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>REAL-TIME DISCRETIONARY SPENDING LIMIT</span>
        </div>

        <div className="safe-spend-big-amount">
          {formatINR(calculation.safeToSpendToday)}
        </div>

        <p className="safe-spend-explainer">
          {calculation.safeToSpendToday > 0 ? (
            <>
              You can safely spend up to <strong>{formatINR(calculation.safeToSpendToday)}</strong> today. We have fully reserved <strong>{formatINR(calculation.safetyBuffer)}</strong> for your minimum safety buffer and quarantined <strong>{formatINR(calculation.totalObligationsProtected)}</strong> to guarantee your essential liabilities ({calculation.essentialOverdue > 0 ? `${formatINR(calculation.essentialOverdue)} overdue + ` : ''}{formatINR(calculation.upcomingEssential)} upcoming before your next payout on <strong>{calculation.nextIncomeDate || 'schedule'}</strong>).
            </>
          ) : (
            <>
              <span style={{ color: '#FCA5A5', fontWeight: 700 }}>Caution: </span>
              Your planned commitments and required safety buffer exceed your currently recorded cash balance by <strong>{formatINR(calculation.projectedShortfall)}</strong>. Hold discretionary purchases until your next confirmed invoice arrives.
            </>
          )}
        </p>

        {calculation.projectedShortfall > 0 && (
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(220, 38, 38, 0.25)', border: '1px solid rgba(248, 113, 113, 0.4)', padding: '8px 14px', borderRadius: 8, fontSize: 13, color: '#FECACA' }}>
            <AlertTriangle size={16} />
            <span>Projected Liquidity Shortfall: {formatINR(calculation.projectedShortfall)}</span>
          </div>
        )}
      </div>

      {/* Two Column Section: Interactive Controls vs Transparent Breakdown */}
      <div className="split-2col-grid">
        
        {/* Controls Column */}
        <div className="card">
          <h3 className="card-title-h3" style={{ marginBottom: 18 }}>Adjust Planning Assumptions</h3>

          {/* Safety Buffer Slider */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label-title" style={{ margin: 0 }}>
                Safety Buffer Target
              </label>
              <strong style={{ color: 'var(--neu-brand-primary, #059669)', fontVariantNumeric: 'tabular-nums', fontSize: 16 }}>
                {formatINR(bufferInput)}
              </strong>
            </div>
            <input
              type="range"
              min="5000"
              max="100000"
              step="2500"
              className="interactive-slider-control"
              value={bufferInput}
              onChange={(e) => setBufferInput(Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', marginTop: 6 }}>
              <span>₹5,000 (Lean)</span>
              <span>₹50,000</span>
              <span>₹1,00,000 (Conservative)</span>
            </div>
          </div>

          {/* Planning Horizon */}
          <div style={{ marginBottom: 24 }}>
            <label className="form-label-title">Planning Horizon</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[7, 14, 30, 45].map(days => {
                const isActive = horizonDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    style={{
                      border: isActive ? '1px solid var(--neu-brand-primary, #059669)' : '1px solid var(--neu-border, #DCE4EB)',
                      background: isActive ? 'var(--neu-brand-gradient, linear-gradient(135deg, #059669 0%, #047857 100%))' : 'var(--neu-bg-primary, #E9EEF3)',
                      color: isActive ? '#FFFFFF' : 'var(--neu-text-secondary, #64748B)',
                      fontWeight: 600,
                      fontSize: 12.5,
                      padding: '9px 0',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: isActive ? '2px 2px 6px rgba(5, 150, 105, 0.35), -1px -1px 4px rgba(255, 255, 255, 0.7)' : 'var(--neu-shadow-raised-sm)'
                    }}
                    onClick={() => setHorizonDays(days)}
                  >
                    {days} Days
                  </button>
                );
              })}
            </div>
          </div>

          {/* Forecast Scenario */}
          <div style={{ marginBottom: 24 }}>
            <label className="form-label-title">Scenario Rigor</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                style={{
                  border: scenario === 'conservative' ? '1.5px solid var(--neu-brand-primary, #059669)' : '1px solid var(--neu-border, #DCE4EB)',
                  background: 'var(--neu-bg-primary, #E9EEF3)',
                  color: scenario === 'conservative' ? 'var(--neu-brand-primary, #059669)' : 'var(--neu-text-secondary, #64748B)',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '12px 14px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  boxShadow: scenario === 'conservative' ? 'var(--neu-shadow-inset-sm)' : 'var(--neu-shadow-raised-sm)'
                }}
                onClick={() => setScenario('conservative')}
              >
                <div style={{ fontWeight: 700, color: scenario === 'conservative' ? 'var(--neu-brand-primary, #059669)' : 'var(--neu-text-primary, #172033)' }}>Conservative</div>
                <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', marginTop: 3 }}>Only current cash counted</div>
              </button>

              <button
                type="button"
                style={{
                  border: scenario === 'expected' ? '1.5px solid var(--neu-brand-primary, #059669)' : '1px solid var(--neu-border, #DCE4EB)',
                  background: 'var(--neu-bg-primary, #E9EEF3)',
                  color: scenario === 'expected' ? 'var(--neu-brand-primary, #059669)' : 'var(--neu-text-secondary, #64748B)',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '12px 14px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  boxShadow: scenario === 'expected' ? 'var(--neu-shadow-inset-sm)' : 'var(--neu-shadow-raised-sm)'
                }}
                onClick={() => setScenario('expected')}
              >
                <div style={{ fontWeight: 700, color: scenario === 'expected' ? 'var(--neu-brand-primary, #059669)' : 'var(--neu-text-primary, #172033)' }}>Expected</div>
                <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', marginTop: 3 }}>Includes confirmed invoices</div>
              </button>
            </div>
          </div>

          {/* Expense Assumption Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: 'var(--neu-bg-primary, #E9EEF3)',
            borderRadius: 12,
            border: '1px solid var(--neu-border, #DCE4EB)',
            boxShadow: 'var(--neu-shadow-raised-sm)'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neu-text-primary, #172033)' }}>Include Discretionary Bills</div>
              <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>Protect subscriptions & non-essentials</div>
            </div>
            <input
              type="checkbox"
              style={{ width: 18, height: 18, accentColor: 'var(--neu-brand-primary, #059669)', cursor: 'pointer' }}
              checked={includeDiscretionary}
              onChange={(e) => setIncludeDiscretionary(e.target.checked)}
            />
          </div>
        </div>

        {/* Mathematical Breakdown Column */}
        <div className="card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-title-h3">Transparent Mathematical Breakdown</h3>
              <p className="card-subtitle-p">Zero guesswork. Every rupee accounted for.</p>
            </div>
            <span className="status-badge neutral">
              <span>Auditable Math</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-brand-primary, #059669)', boxShadow: '0 0 6px rgba(5, 150, 105, 0.4)' }}></span>
                <span>Current Recorded Available Cash</span>
              </div>
              <span className="num-val" style={{ color: 'var(--neu-brand-primary, #059669)', fontVariantNumeric: 'tabular-nums' }}>
                +{formatINR(calculation.availableCash)}
              </span>
            </div>

            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-danger, #EF4444)', boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)' }}></span>
                <span>
                  Essential Overdue Commitments (Past Due Unpaid)
                </span>
              </div>
              <span className="num-val" style={{ color: 'var(--neu-danger-dark, #B91C1C)', fontVariantNumeric: 'tabular-nums' }}>
                -{formatINR(calculation.essentialOverdue)}
              </span>
            </div>

            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171', boxShadow: '0 0 6px rgba(248, 113, 113, 0.4)' }}></span>
                <span>
                  Upcoming Essential Commitments (before next payout: {calculation.nextIncomeDate || 'horizon'})
                </span>
              </div>
              <span className="num-val" style={{ color: 'var(--neu-danger-dark, #B91C1C)', fontVariantNumeric: 'tabular-nums' }}>
                -{formatINR(calculation.upcomingEssential)}
              </span>
            </div>

            <div className="breakdown-row-item" style={{ background: 'var(--neu-danger-bg, rgba(239, 68, 68, 0.08))', borderRadius: 10, margin: '2px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-danger, #EF4444)' }}></span>
                <span style={{ fontWeight: 600 }}>Total Essential Commitments (Overdue + Upcoming)</span>
              </div>
              <span className="num-val" style={{ color: 'var(--neu-danger-dark, #B91C1C)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                -{formatINR(calculation.totalEssentialCommitments)}
              </span>
            </div>

            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-warning, #F59E0B)', boxShadow: '0 0 6px rgba(245, 158, 11, 0.4)' }}></span>
                <span>Other Committed Expenses in {horizonDays}-Day Horizon</span>
              </div>
              <span className="num-val" style={{ color: 'var(--neu-warning-dark, #B45309)', fontVariantNumeric: 'tabular-nums' }}>
                -{formatINR(calculation.otherCommittedInHorizon)}
              </span>
            </div>

            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-info, #3B82F6)', boxShadow: '0 0 6px rgba(59, 130, 246, 0.4)' }}></span>
                <span>Quarantined Minimum Safety Buffer</span>
              </div>
              <span className="num-val" style={{ color: 'var(--neu-info-dark, #1D4ED8)', fontVariantNumeric: 'tabular-nums' }}>
                -{formatINR(calculation.safetyBuffer)}
              </span>
            </div>

            {scenario !== 'conservative' && (
              <div className="breakdown-row-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-success, #10B981)', boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)' }}></span>
                  <span>Discounted Confirmed Income Credit (Expected Mode)</span>
                </div>
                <span className="num-val" style={{ color: 'var(--neu-success-dark, #047857)', fontVariantNumeric: 'tabular-nums' }}>
                  +{formatINR(calculation.eligibleFutureIncome * 0.5)}
                </span>
              </div>
            )}

            <div className="breakdown-row-item" style={{
              background: 'var(--neu-bg-secondary, #F1F5F9)',
              borderTop: '1px solid var(--neu-border, #DCE4EB)',
              margin: '0 -24px -24px -24px',
              padding: '20px 24px',
              borderRadius: '0 0 var(--neu-radius-lg, 18px) var(--neu-radius-lg, 18px)'
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>Safe-to-Spend Today</div>
                <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>Clamped to ₹0 minimum (never negative)</div>
              </div>
              <span className="num-val" style={{
                fontSize: 24,
                fontWeight: 800,
                color: calculation.safeToSpendToday > 0 ? 'var(--neu-brand-primary, #059669)' : 'var(--neu-danger, #EF4444)',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {formatINR(calculation.safeToSpendToday)}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
