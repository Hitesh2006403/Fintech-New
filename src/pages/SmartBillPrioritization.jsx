import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR } from '../services/financialEngine.js';
import {
  ArrowDownUp,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Zap,
  Info,
  Calendar,
  Layers
} from 'lucide-react';

export function SmartBillPrioritization() {
  const { billRanking, balanceDetails, markExpensePaid, setActiveRoute } = useApp();
  const [filterPriority, setFilterPriority] = useState('all');

  const { rankedBills, topRecommendations } = billRanking;

  const filteredBills = rankedBills.filter(b => {
    if (filterPriority === 'all') return true;
    return b.priority === filterPriority;
  });

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Smart Bill Prioritization</h1>
          <p className="page-subtitle">
            What should I pay first? Mathematical ranking based on credit risk, late fee penalties, grace periods, and your current liquidity runway.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setActiveRoute('expenses')}
        >
          <span>Manage Expenses</span>
        </button>
      </div>

      {/* Top 3 Recommended Actions Strip */}
      <div className="recommendations-3col-grid">
        {topRecommendations.map((rec, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: '18px 20px',
              borderLeftWidth: 4,
              borderLeftColor: rec.type === 'critical' ? 'var(--neu-danger, #EF4444)' : rec.type === 'warning' ? 'var(--neu-warning, #F59E0B)' : 'var(--neu-brand-primary, #059669)',
              boxShadow: 'var(--neu-shadow-raised-sm, 3px 3px 8px rgba(163, 177, 198, 0.30), -3px -3px 8px rgba(255, 255, 255, 0.85))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {rec.type === 'critical' ? (
                <AlertTriangle size={16} color="var(--neu-danger, #EF4444)" />
              ) : rec.type === 'warning' ? (
                <Clock size={16} color="var(--neu-warning, #F59E0B)" />
              ) : (
                <Zap size={16} color="var(--neu-brand-primary, #059669)" />
              )}
              <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: 0, color: 'var(--neu-text-primary, #172033)' }}>{rec.title}</h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', lineHeight: 1.5, margin: 0 }}>
              {rec.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div className="filter-chips-row" style={{
          background: 'var(--neu-bg-primary, #E9EEF3)',
          padding: 4,
          borderRadius: 12,
          border: '1px solid var(--neu-border, #DCE4EB)',
          boxShadow: 'var(--neu-shadow-inset-sm, inset 2px 2px 5px rgba(163, 177, 198, 0.25), inset -2px -2px 5px rgba(255, 255, 255, 0.85))',
          gap: 4
        }}>
          {[
            { id: 'all', label: 'All Ranked Bills' },
            { id: 'critical', label: 'Critical' },
            { id: 'high', label: 'High' },
            { id: 'medium', label: 'Medium' },
            { id: 'low', label: 'Low / Deferrable' }
          ].map(tab => {
            const isActive = filterPriority === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                style={{
                  border: isActive ? '1px solid var(--neu-brand-primary, #059669)' : '1px solid transparent',
                  background: isActive ? 'var(--neu-brand-gradient, linear-gradient(135deg, #059669 0%, #047857 100%))' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--neu-text-secondary, #64748B)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 12.5,
                  padding: '6px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isActive ? '2px 2px 6px rgba(5, 150, 105, 0.35), -1px -1px 4px rgba(255, 255, 255, 0.7)' : 'none'
                }}
                onClick={() => setFilterPriority(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--neu-text-secondary, #64748B)' }}>
          Available Cash to Allocate: <strong style={{ color: 'var(--neu-success-dark, #047857)', fontSize: 14, fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>{formatINR(balanceDetails.availableCash)}</strong>
        </div>
      </div>

      {/* Ranked Bills Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {filteredBills.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--neu-text-muted, #94A3B8)' }}>
            No unpaid bills in this priority tier.
          </div>
        ) : (
          filteredBills.map((bill, index) => (
            <div
              key={bill.id}
              className="card bill-priority-card-grid"
            >
              {/* Rank Number & Priority Badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--neu-brand-primary, #059669)' }}>
                  #{index + 1}
                </span>
                <span className={`priority-tier-badge ${bill.priority}`}>
                  {bill.priority}
                </span>
              </div>

              {/* Bill Details */}
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--neu-text-primary, #172033)', margin: '0 0 4px 0' }}>
                  {bill.title}
                </h4>
                <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>
                  Due <strong style={{ color: 'var(--neu-text-primary, #172033)' }}>{bill.dueDate}</strong> • Category: {bill.category}
                </div>
                {bill.lateFee > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--neu-danger-dark, #B91C1C)', fontWeight: 600, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                    Penalty: {formatINR(bill.lateFee)} after grace
                  </div>
                )}
              </div>

              {/* Explainable Ranking Reason */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--neu-text-muted, #94A3B8)', marginBottom: 4 }}>
                  Why this ranking?
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--neu-text-secondary, #64748B)', lineHeight: 1.45 }}>
                  {bill.reasons.join(' • ')}
                </div>
              </div>

              {/* Expected Effect on Balance & Action */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--neu-text-muted, #94A3B8)', marginBottom: 2 }}>
                  Amount & Effect
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neu-text-primary, #172033)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(bill.amount)}
                </div>
                <div style={{ fontSize: 11, color: bill.postPaymentBalance >= 0 ? 'var(--neu-success-dark, #047857)' : 'var(--neu-danger-dark, #B91C1C)', marginTop: 2, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  Leaves {formatINR(bill.postPaymentBalance)} cash
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--neu-brand-primary, #059669)', marginTop: 4 }}>
                  {bill.suggestedAction}
                </div>
              </div>

              {/* Pay Action Button */}
              <div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: 12, padding: '8px 14px' }}
                  onClick={() => markExpensePaid(bill.id)}
                >
                  <CheckCircle2 size={13} />
                  <span>Mark Paid</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Disclaimers & Methodology Note */}
      <div style={{
        background: 'var(--neu-bg-primary, #E9EEF3)',
        border: '1px solid var(--neu-border, #DCE4EB)',
        borderRadius: 14,
        padding: '16px 20px',
        fontSize: 12,
        color: 'var(--neu-text-secondary, #64748B)',
        lineHeight: 1.5,
        boxShadow: 'var(--neu-shadow-raised-sm, 3px 3px 8px rgba(163, 177, 198, 0.30), -3px -3px 8px rgba(255, 255, 255, 0.85))'
      }}>
        <strong style={{ color: 'var(--neu-text-primary, #172033)' }}>Ranking Methodology: </strong>
        Bills are evaluated across 5 explainable factors: due date proximity, debt/credit bureau impact (EMI & Rent), essential survival status, punitive late fee penalties, and grace period leeway. Prioritization is for scenario planning and does not constitute formal legal or financial advice.
      </div>

    </div>
  );
}
