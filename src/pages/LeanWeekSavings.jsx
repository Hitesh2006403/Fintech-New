import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR, calculateLeanWeekSavings } from '../services/financialEngine.js';
import {
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  ShieldCheck,
  TrendingUp,
  Clock
} from 'lucide-react';

export function LeanWeekSavings() {
  const { leanSavings, updateLeanSavings, contributeToSavings, balanceDetails } = useApp();

  const [weeksInput, setWeeksInput] = useState(leanSavings.weeks || 4);
  const [lowIncomeInput, setLowIncomeInput] = useState(leanSavings.expectedLowIncomePerWeek || 5000);
  const [essentialExpenseInput, setEssentialExpenseInput] = useState(leanSavings.essentialWeeklyExpenses || 12000);
  const [weeklyContribInput, setWeeklyContribInput] = useState(leanSavings.weeklyContribution || 3500);

  const [addReserveAmount, setAddReserveAmount] = useState('');
  const [reserveSuccessMsg, setReserveSuccessMsg] = useState('');

  // Live calculation from shared financial engine
  const calculation = calculateLeanWeekSavings({
    weeks: weeksInput,
    expectedLowIncomePerWeek: lowIncomeInput,
    essentialWeeklyExpenses: essentialExpenseInput,
    currentDesignatedReserve: leanSavings.currentDesignatedReserve,
    weeklyContribution: weeklyContribInput
  });

  const handleApplyAssumptions = () => {
    updateLeanSavings({
      weeks: Number(weeksInput),
      expectedLowIncomePerWeek: Number(lowIncomeInput),
      essentialWeeklyExpenses: Number(essentialExpenseInput),
      weeklyContribution: Number(weeklyContribInput)
    });
  };

  const handleDeposit = (e) => {
    e.preventDefault();
    const amt = Number(addReserveAmount);
    if (amt <= 0) return;

    if (amt > balanceDetails.availableCash) {
      alert('Deposit amount exceeds your current recorded available cash.');
      return;
    }

    contributeToSavings(amt);
    setAddReserveAmount('');
    setReserveSuccessMsg(`Earmarked ${formatINR(amt)} into your Lean-Week Designated Reserve!`);
    setTimeout(() => setReserveSuccessMsg(''), 3000);
  };

  // Warning check: does proposed contribution exceed available cash?
  const isContributionRisky = weeklyContribInput > balanceDetails.availableCash * 0.4;

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Lean-Week Savings Buffer</h1>
          <p className="page-subtitle">
            Prepare for inevitable dry spells. Pre-fund your essential living deficit so a slow client month never creates an emergency.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Current Available Cash: <strong style={{ color: 'var(--accent-primary)', fontSize: 13.5, fontFeatureSettings: 'tnum', textShadow: '0 0 10px rgba(56, 189, 248, 0.35)', marginLeft: 4 }}>{formatINR(balanceDetails.availableCash)}</strong>
          </span>
        </div>
      </div>

      {reserveSuccessMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34D399', padding: '12px 18px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(10px)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)' }}>
          <CheckCircle2 size={16} />
          <span style={{ fontWeight: 600 }}>{reserveSuccessMsg}</span>
        </div>
      )}

      {/* Top Target & Progress Card */}
      <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
        <div className="kpi-strip-grid" style={{ marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Target Safety Reserve
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFeatureSettings: 'tnum' }}>
              {formatINR(calculation.targetReserve)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Covers {calculation.numWeeks} lean weeks
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Currently Designated
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#10B981', fontFeatureSettings: 'tnum', textShadow: '0 0 16px rgba(16, 185, 129, 0.4)' }}>
              {formatINR(calculation.currentDesignatedReserve)}
            </div>
            <div style={{ fontSize: 12, color: '#10B981', marginTop: 4, fontWeight: 600 }}>
              {calculation.progressPct}% Funded
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Remaining to Goal
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: calculation.remainingGoal > 0 ? 'var(--accent-primary)' : '#10B981', fontFeatureSettings: 'tnum', textShadow: calculation.remainingGoal > 0 ? '0 0 16px rgba(56, 189, 248, 0.4)' : '0 0 16px rgba(16, 185, 129, 0.4)' }}>
              {formatINR(calculation.remainingGoal)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {calculation.remainingGoal === 0 ? 'Goal Achieved!' : `Deficit: ${formatINR(calculation.weeklyDeficit)}/wk`}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Time to Full Target
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFeatureSettings: 'tnum' }}>
              {calculation.weeksToGoal} Weeks
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              At {formatINR(calculation.weeklyContribution)} / week
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            <span>Buffer Progress</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{calculation.progressPct}% Complete</span>
          </div>
          <div style={{ height: 14, borderRadius: 8, background: 'rgba(11, 18, 32, 0.8)', border: '1px solid var(--border-glass)', overflow: 'hidden', padding: 2 }}>
            <div
              style={{
                width: `${calculation.progressPct}%`,
                height: '100%',
                background: calculation.progressPct >= 100 ? '#10B981' : 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 60%, #10B981 100%)',
                borderRadius: 6,
                boxShadow: '0 0 14px rgba(56, 189, 248, 0.4)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Calculator Inputs vs Deposit Action */}
      <div className="split-2col-grid">
        
        {/* Calculator Assumptions Form */}
        <div className="card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-title-h3">Dry-Spell Assumptions</h3>
              <p className="card-subtitle-p">Model your typical baseline when client invoices slow down.</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={handleApplyAssumptions}
            >
              Save Defaults
            </button>
          </div>

          <div className="form-grid-2">
            <div className="form-group-item">
              <label className="form-label-title">Dry Spell Duration (Weeks)</label>
              <select
                className="form-input-control"
                value={weeksInput}
                onChange={(e) => setWeeksInput(Number(e.target.value))}
              >
                <option value={2}>2 Weeks (Minor Dip)</option>
                <option value={4}>4 Weeks (1 Full Month - Recommended)</option>
                <option value={8}>8 Weeks (Extended Gap)</option>
                <option value={12}>12 Weeks (Quarterly Runway)</option>
              </select>
            </div>

            <div className="form-group-item">
              <label className="form-label-title">Expected Low Weekly Income (₹)</label>
              <input
                type="number"
                min="0"
                step="1000"
                className="form-input-control"
                value={lowIncomeInput}
                onChange={(e) => setLowIncomeInput(Number(e.target.value))}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>Minimum passive/retainer income during slow month.</span>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group-item">
              <label className="form-label-title">Essential Weekly Expenses (₹)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                className="form-input-control"
                value={essentialExpenseInput}
                onChange={(e) => setEssentialExpenseInput(Number(e.target.value))}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>Rent, groceries, utilities, and EMI obligations.</span>
            </div>

            <div className="form-group-item">
              <label className="form-label-title">Proposed Weekly Contribution (₹)</label>
              <input
                type="number"
                min="500"
                step="500"
                className="form-input-control"
                value={weeklyContribInput}
                onChange={(e) => setWeeklyContribInput(Number(e.target.value))}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>Target to earmark from incoming payments.</span>
            </div>
          </div>

          {isContributionRisky && (
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '12px 16px', borderRadius: 10, fontSize: 12, color: '#FDE68A', display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <AlertTriangle size={16} color="#F59E0B" />
              <span>
                Caution: High contribution relative to current liquidity. Ensure you don't starve upcoming bills.
              </span>
            </div>
          )}
        </div>

        {/* Earmark Funds into Reserve */}
        <div className="card">
          <h3 className="card-title-h3" style={{ marginBottom: 10 }}>Earmark Cash into Buffer</h3>
          <p className="card-subtitle-p" style={{ marginBottom: 20 }}>
            Quarantine surplus money from your live balance into your protected Lean-Week Reserve.
          </p>

          <form onSubmit={handleDeposit}>
            <div className="form-group-item">
              <label className="form-label-title">Deposit Amount (₹ INR)</label>
              <input
                type="number"
                min="500"
                max={balanceDetails.availableCash}
                className="form-input-control"
                placeholder="e.g. 5000"
                value={addReserveAmount}
                onChange={(e) => setAddReserveAmount(e.target.value)}
                required
              />
              <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                Max available: <strong style={{ color: 'var(--accent-primary)' }}>{formatINR(balanceDetails.availableCash)}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[2500, 5000, 10000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-glass)',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setAddReserveAmount(amt)}
                >
                  +{formatINR(amt)}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={balanceDetails.availableCash <= 0}
            >
              <PiggyBank size={16} />
              <span>Deposit into Designated Buffer</span>
            </button>
          </form>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border-glass)', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <ShieldCheck size={15} color="#10B981" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Double-Counting Protection:</strong> Earmarked reserves are excluded from your Safe-to-Spend calculator to ensure your buffer remains intact during emergencies.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
