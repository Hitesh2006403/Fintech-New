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
              You can safely spend up to <strong>{formatINR(calculation.safeToSpendToday)}</strong> today. We have fully reserved <strong>{formatINR(calculation.safetyBuffer)}</strong> for your minimum safety buffer and quarantined <strong>{formatINR(calculation.totalObligationsProtected)}</strong> to guarantee your essential bills before your next reliable payout on <strong>{calculation.nextIncomeDate || 'schedule'}</strong>.
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
              <strong style={{ color: 'var(--accent-primary)', fontFeatureSettings: 'tnum', fontSize: 16, textShadow: '0 0 12px rgba(56, 189, 248, 0.35)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              <span>₹5,000 (Lean)</span>
              <span>₹50,000</span>
              <span>₹1,00,000 (Conservative)</span>
            </div>
          </div>

          {/* Planning Horizon */}
          <div style={{ marginBottom: 24 }}>
            <label className="form-label-title">Planning Horizon</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[7, 14, 30, 45].map(days => (
                <button
                  key={days}
                  type="button"
                  style={{
                    border: horizonDays === days ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid var(--border-glass)',
                    background: horizonDays === days ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(167, 139, 250, 0.25) 100%)' : 'rgba(255, 255, 255, 0.03)',
                    color: horizonDays === days ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 12.5,
                    padding: '9px 0',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: horizonDays === days ? '0 0 16px rgba(56, 189, 248, 0.25)' : 'none'
                  }}
                  onClick={() => setHorizonDays(days)}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Forecast Scenario */}
          <div style={{ marginBottom: 24 }}>
            <label className="form-label-title">Scenario Rigor</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                style={{
                  border: scenario === 'conservative' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid var(--border-glass)',
                  background: scenario === 'conservative' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                  color: scenario === 'conservative' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '12px 14px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: scenario === 'conservative' ? '0 0 20px rgba(56, 189, 248, 0.15)' : 'none'
                }}
                onClick={() => setScenario('conservative')}
              >
                <div style={{ fontWeight: 700, color: scenario === 'conservative' ? '#F8FAFC' : 'var(--text-primary)' }}>Conservative</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>Only current cash counted</div>
              </button>

              <button
                type="button"
                style={{
                  border: scenario === 'expected' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid var(--border-glass)',
                  background: scenario === 'expected' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                  color: scenario === 'expected' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '12px 14px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: scenario === 'expected' ? '0 0 20px rgba(56, 189, 248, 0.15)' : 'none'
                }}
                onClick={() => setScenario('expected')}
              >
                <div style={{ fontWeight: 700, color: scenario === 'expected' ? '#F8FAFC' : 'var(--text-primary)' }}>Expected</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>Includes confirmed invoices</div>
              </button>
            </div>
          </div>

          {/* Expense Assumption Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: 10, border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Include Discretionary Bills</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>Protect subscriptions & non-essentials</div>
            </div>
            <input
              type="checkbox"
              style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
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
            <span className="badge badge-purple">
              <span>Auditable Math</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }}></span>
                <span>Current Recorded Available Cash</span>
              </div>
              <span className="num-val" style={{ color: 'var(--accent-primary)' }}>
                +{formatINR(calculation.availableCash)}
              </span>
            </div>

            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }}></span>
                <span>
                  Essential Commitments (before next payout: {calculation.nextIncomeDate || 'horizon'})
                </span>
              </div>
              <span className="num-val" style={{ color: '#EF4444' }}>
                -{formatINR(calculation.essentialBeforeIncome)}
              </span>
            </div>

            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)' }}></span>
                <span>Other Committed Expenses in {horizonDays}-Day Horizon</span>
              </div>
              <span className="num-val" style={{ color: '#F59E0B' }}>
                -{formatINR(calculation.otherCommittedInHorizon)}
              </span>
            </div>

            <div className="breakdown-row-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#A78BFA', boxShadow: '0 0 8px rgba(167, 139, 250, 0.6)' }}></span>
                <span>Quarantined Minimum Safety Buffer</span>
              </div>
              <span className="num-val" style={{ color: '#A78BFA' }}>
                -{formatINR(calculation.safetyBuffer)}
              </span>
            </div>

            {scenario !== 'conservative' && (
              <div className="breakdown-row-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }}></span>
                  <span>Discounted Confirmed Income Credit (Expected Mode)</span>
                </div>
                <span className="num-val" style={{ color: '#10B981' }}>
                  +{formatINR(calculation.eligibleFutureIncome * 0.5)}
                </span>
              </div>
            )}

            <div className="breakdown-row-item" style={{ background: 'rgba(56, 189, 248, 0.06)', borderTop: '1px solid rgba(56, 189, 248, 0.2)', margin: '0 -24px -24px -24px', padding: '20px 24px', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Safe-to-Spend Today</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>Clamped to ₹0 minimum (never negative)</div>
              </div>
              <span className="num-val" style={{ fontSize: 24, fontWeight: 800, color: calculation.safeToSpendToday > 0 ? 'var(--accent-primary)' : '#EF4444', textShadow: calculation.safeToSpendToday > 0 ? '0 0 16px rgba(56, 189, 248, 0.4)' : '0 0 16px rgba(239, 68, 68, 0.4)' }}>
                {formatINR(calculation.safeToSpendToday)}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
