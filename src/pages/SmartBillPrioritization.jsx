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
              borderLeftColor: rec.type === 'critical' ? '#EF4444' : rec.type === 'warning' ? '#F59E0B' : 'var(--accent-primary)',
              boxShadow: rec.type === 'critical' ? '0 10px 30px -4px rgba(239, 68, 68, 0.15)' : rec.type === 'warning' ? '0 10px 30px -4px rgba(245, 158, 11, 0.15)' : '0 10px 30px -4px rgba(56, 189, 248, 0.15)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {rec.type === 'critical' ? (
                <AlertTriangle size={16} color="#EF4444" />
              ) : rec.type === 'warning' ? (
                <Clock size={16} color="#F59E0B" />
              ) : (
                <Zap size={16} color="var(--accent-primary)" />
              )}
              <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{rec.title}</h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {rec.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div className="filter-chips-row" style={{ background: 'rgba(11, 18, 32, 0.8)', padding: 4, borderRadius: 10, border: '1px solid var(--border-glass)', gap: 4 }}>
          {[
            { id: 'all', label: 'All Ranked Bills' },
            { id: 'critical', label: 'Critical' },
            { id: 'high', label: 'High' },
            { id: 'medium', label: 'Medium' },
            { id: 'low', label: 'Low / Deferrable' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              style={{
                border: filterPriority === tab.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                background: filterPriority === tab.id ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(167, 139, 250, 0.25) 100%)' : 'transparent',
                color: filterPriority === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: filterPriority === tab.id ? 700 : 500,
                fontSize: 12.5,
                padding: '6px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: filterPriority === tab.id ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none'
              }}
              onClick={() => setFilterPriority(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          Available Cash to Allocate: <strong style={{ color: '#10B981', fontSize: 14, textShadow: '0 0 10px rgba(16, 185, 129, 0.35)', marginLeft: 4 }}>{formatINR(balanceDetails.availableCash)}</strong>
        </div>
      </div>

      {/* Ranked Bills Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {filteredBills.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
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
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)', textShadow: '0 0 10px rgba(56, 189, 248, 0.3)' }}>
                  #{index + 1}
                </span>
                <span className={`priority-tier-badge ${bill.priority}`}>
                  {bill.priority}
                </span>
              </div>

              {/* Bill Details */}
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  {bill.title}
                </h4>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Due <strong style={{ color: 'var(--text-primary)' }}>{bill.dueDate}</strong> • Category: {bill.category}
                </div>
                {bill.lateFee > 0 && (
                  <div style={{ fontSize: 11.5, color: '#EF4444', fontWeight: 600, marginTop: 3 }}>
                    Penalty: ₹{formatINR(bill.lateFee)} after grace
                  </div>
                )}
              </div>

              {/* Explainable Ranking Reason */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Why this ranking?
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {bill.reasons.join(' • ')}
                </div>
              </div>

              {/* Expected Effect on Balance & Action */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 2 }}>
                  Amount & Effect
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFeatureSettings: 'tnum' }}>
                  {formatINR(bill.amount)}
                </div>
                <div style={{ fontSize: 11, color: bill.postPaymentBalance >= 0 ? '#10B981' : '#EF4444', marginTop: 2, fontWeight: 600 }}>
                  Leaves {formatINR(bill.postPaymentBalance)} cash
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent-primary)', marginTop: 4 }}>
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
      <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid var(--border-glass)', borderRadius: 12, padding: '16px 20px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, backdropFilter: 'blur(10px)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Ranking Methodology: </strong>
        Bills are evaluated across 5 explainable factors: due date proximity, debt/credit bureau impact (EMI & Rent), essential survival status, punitive late fee penalties, and grace period leeway. Prioritization is for scenario planning and does not constitute formal legal or financial advice.
      </div>

    </div>
  );
}
