import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR } from '../services/financialEngine.js';
import { CashFlowChart } from '../components/charts/CashFlowChart.jsx';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  Receipt,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus
} from 'lucide-react';

export function OverviewDashboard() {
  const {
    user,
    balanceDetails,
    safeToSpend,
    confirmedUpcomingIncome,
    upcomingBillsNext7Days,
    standardForecast,
    dashboardInsights,
    expenses,
    incomes,
    setActiveRoute,
    setQuickAddModalOpen,
    preferences,
    dismissAlert
  } = useApp();

  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeBalance = balanceDetails || { availableCash: 0 };
  const safeSpend = safeToSpend || { safeToSpendToday: 0, projectedShortfall: 0 };
  const safeForecast = standardForecast?.forecast || [];
  const safePrefs = preferences || { startingBalance: 45000, safetyBuffer: 25000 };
  const safeInsights = dashboardInsights || { alerts: [], primaryInsight: null };

  const hasRecords = safeIncomes.length > 0 || safeExpenses.length > 0;

  // Unpaid bills up to 5
  const upcomingBills = safeExpenses
    .filter(e => e && e.status !== 'paid')
    .sort((a, b) => (a?.dueDate || '').localeCompare(b?.dueDate || ''))
    .slice(0, 5);

  // Combined recent activity (last 5 transactions)
  const recentTransactions = [
    ...safeIncomes.filter(i => i && i.status === 'received').map(i => ({
      id: i.id || `inc_${Math.random()}`,
      title: i.title || 'Income Received',
      category: i.source || 'Client Payout',
      date: i.actualDate || i.expectedDate || 'Cleared',
      amount: i.amount || 0,
      type: 'income',
      status: 'Received'
    })),
    ...safeExpenses.map(e => ({
      id: e.id || `exp_${Math.random()}`,
      title: e.title || 'Expense',
      category: e.category || 'General',
      date: e.paidDate || e.dueDate || 'Committed',
      amount: e.amount || 0,
      type: 'expense',
      status: e.status === 'paid' ? 'Paid' : 'Unpaid'
    }))
  ]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5);

  // Income Reliability totals
  const totalReceived = safeIncomes
    .filter(i => i && i.status === 'received')
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalConfirmed = safeIncomes
    .filter(i => i && i.status === 'confirmed')
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalUncertain = safeIncomes
    .filter(i => i && i.status === 'uncertain')
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const grandTotalPipeline = totalReceived + totalConfirmed + totalUncertain || 1;

  if (!hasRecords) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ width: 68, height: 68, borderRadius: 18, background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1px solid rgba(56, 189, 248, 0.3)', boxShadow: '0 0 25px rgba(56, 189, 248, 0.2)' }}>
          <Sparkles size={34} />
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#F8FAFC', marginBottom: 8, letterSpacing: -0.4 }}>
          Welcome to Uncertain Income Planner, {user?.name || 'Treasury Planner'}
        </h2>
        <p style={{ color: '#94A3B8', maxWidth: 480, marginBottom: 28, fontSize: 15, lineHeight: 1.6 }}>
          Take the stress out of irregular earnings. Record your current cash, upcoming gigs, and essential bills to see your true Safe-to-Spend.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => { setActiveRoute('income'); setQuickAddModalOpen(true); }}
          >
            <Plus size={16} />
            <span>Add Your First Income</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setActiveRoute('expenses'); setQuickAddModalOpen(true); }}
          >
            <Receipt size={16} />
            <span>Add Your First Bill</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      
      {/* A. Header Row */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#38BDF8', letterSpacing: 0.8, background: 'rgba(56, 189, 248, 0.12)', padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              TREASURY OVERVIEW
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Irregular Cash-Flow Engine</span>
          </div>
          <h1 className="page-title">Good day, {user?.name || 'Treasury Planner'}</h1>
          <p className="page-subtitle">
            Here's your real-time spendable cash, protected obligations, and 30-day runway.
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setQuickAddModalOpen(true)}
          >
            <Plus size={16} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Prominent Data-Driven Financial Insight Bar */}
      {safeInsights?.primaryInsight && (
        <div
          className="dashboard-insight-banner"
          style={{
            background: safeInsights.primaryInsight.type === 'danger'
              ? 'rgba(239, 68, 68, 0.14)'
              : safeInsights.primaryInsight.type === 'warning'
              ? 'rgba(245, 158, 11, 0.14)'
              : 'rgba(56, 189, 248, 0.12)',
            border: `1px solid ${
              safeInsights.primaryInsight.type === 'danger'
                ? 'rgba(239, 68, 68, 0.35)'
                : safeInsights.primaryInsight.type === 'warning'
                ? 'rgba(245, 158, 11, 0.35)'
                : 'rgba(56, 189, 248, 0.28)'
            }`,
            borderTop: `1px solid ${
              safeInsights.primaryInsight.type === 'danger'
                ? 'rgba(239, 68, 68, 0.5)'
                : safeInsights.primaryInsight.type === 'warning'
                ? 'rgba(245, 158, 11, 0.5)'
                : 'rgba(56, 189, 248, 0.45)'
            }`,
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {safeInsights.primaryInsight.type === 'danger' ? (
              <AlertTriangle size={18} color="#F87171" style={{ filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))' }} />
            ) : safeInsights.primaryInsight.type === 'warning' ? (
              <Clock size={18} color="#FBBF24" style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))' }} />
            ) : (
              <Sparkles size={18} color="#38BDF8" style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.4))' }} />
            )}
            <div>
              <strong style={{ fontSize: 13, color: '#F8FAFC', marginRight: 8 }}>
                {safeInsights.primaryInsight.title}:
              </strong>
              <span style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.45 }}>
                {safeInsights.primaryInsight.message}
              </span>
            </div>
          </div>

          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: '#38BDF8',
              fontWeight: 600,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setActiveRoute('simulator')}
          >
            <span>Simulate Scenario</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* B. Exactly Four Primary KPI Cards */}
      <div className="kpi-cards-grid-4">
        {/* Card 1: Available Balance */}
        <div className="kpi-card" onClick={() => setActiveRoute('income')}>
          <div className="kpi-top-row">
            <span className="kpi-label">Available Balance</span>
            <div className="kpi-icon-container blue">
              <Wallet size={18} />
            </div>
          </div>
          <div className="kpi-amount-val">
            {formatINR(safeBalance.availableCash)}
          </div>
          <div className="kpi-subtitle-meta">
            <span>Based on recorded transactions.</span>
            <span className="kpi-status-badge positive">Live Cash</span>
          </div>
        </div>

        {/* Card 2: Safe-to-Spend Today */}
        <div
          className="kpi-card"
          onClick={() => setActiveRoute('safe-to-spend')}
          style={{
            borderColor: (safeSpend.safeToSpendToday || 0) > 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.35)',
            boxShadow: (safeSpend.safeToSpendToday || 0) > 0 ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(56, 189, 248, 0.12)' : '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(239, 68, 68, 0.12)'
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">Safe-to-Spend Today</span>
            <div className="kpi-icon-container purple">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="kpi-amount-val" style={{ color: (safeSpend.safeToSpendToday || 0) > 0 ? '#38BDF8' : '#F87171', textShadow: (safeSpend.safeToSpendToday || 0) > 0 ? '0 0 20px rgba(56, 189, 248, 0.4)' : '0 0 20px rgba(239, 68, 68, 0.4)' }}>
            {formatINR(safeSpend.safeToSpendToday)}
          </div>
          <div className="kpi-subtitle-meta">
            <span>After planned commitments.</span>
            {(safeSpend.projectedShortfall || 0) > 0 ? (
              <span className="kpi-status-badge warning">Buffer Protected</span>
            ) : (
              <span className="kpi-status-badge positive">Safe Buffer Intact</span>
            )}
          </div>
        </div>

        {/* Card 3: Confirmed Upcoming Income */}
        <div className="kpi-card" onClick={() => setActiveRoute('income')}>
          <div className="kpi-top-row">
            <span className="kpi-label">Confirmed Upcoming Income</span>
            <div className="kpi-icon-container emerald">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-amount-val" style={{ color: '#10B981', textShadow: '0 0 20px rgba(16, 185, 129, 0.35)' }}>
            +{formatINR(confirmedUpcomingIncome)}
          </div>
          <div className="kpi-subtitle-meta">
            <span>Expected, not yet available.</span>
            <span className="kpi-status-badge neutral">Contracts Signed</span>
          </div>
        </div>

        {/* Card 4: Upcoming Bills */}
        <div className="kpi-card" onClick={() => setActiveRoute('expenses')}>
          <div className="kpi-top-row">
            <span className="kpi-label">Upcoming Bills</span>
            <div className="kpi-icon-container amber">
              <Receipt size={18} />
            </div>
          </div>
          <div className="kpi-amount-val" style={{ color: '#F59E0B', textShadow: '0 0 20px rgba(245, 158, 11, 0.35)' }}>
            {formatINR(upcomingBillsNext7Days)}
          </div>
          <div className="kpi-subtitle-meta">
            <span>Due in the next 7 days.</span>
            <span className="kpi-status-badge warning">Committed</span>
          </div>
        </div>
      </div>

      {/* C. Main Content Layout (Two Columns) */}
      <div className="dashboard-grid-2col">
        {/* Left Column: 30-Day Cash Flow Forecast Chart */}
        <div className="card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-title-h3">30-Day Cash Flow Trajectory</h3>
              <p className="card-subtitle-p">
                Projected cash balance against safety buffer ({formatINR(safePrefs.safetyBuffer)}).
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => setActiveRoute('forecast')}
            >
              <span>Full Forecast</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <CashFlowChart
            forecastData={safeForecast}
            safetyBuffer={safePrefs.safetyBuffer ?? 25000}
            startingBalance={safeBalance.availableCash ?? 0}
            height={260}
            showControls={false}
          />
        </div>

        {/* Right Column: Upcoming Bills & High Priority Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Upcoming Bills (Max 5) */}
          <div className="card">
            <div className="card-header-flex" style={{ marginBottom: 14 }}>
              <h3 className="card-title-h3" style={{ fontSize: 15 }}>Upcoming Bills</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setActiveRoute('expenses')}
              >
                View all ({safeExpenses.filter(e => e && e.status !== 'paid').length})
              </button>
            </div>

            {upcomingBills.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: 13, margin: '14px 0' }}>No unpaid bills on schedule.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingBills.map(bill => (
                  <div
                    key={bill.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(11, 18, 32, 0.65)',
                      borderRadius: 10,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(8px)',
                      transition: 'border-color 0.15s'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.title}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Due {bill.dueDate} • {bill.category}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#F8FAFC', fontFeatureSettings: 'tnum' }}>{formatINR(bill.amount)}</div>
                      {bill.isEssential ? (
                        <span style={{ fontSize: 10, color: '#F87171', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: 4, display: 'inline-block', marginTop: 2 }}>Essential</span>
                      ) : (
                        <span style={{ fontSize: 10, color: '#94A3B8', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 6px', borderRadius: 4, display: 'inline-block', marginTop: 2 }}>Discretionary</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Alerts (Max 3) */}
          <div className="card">
            <div className="card-header-flex" style={{ marginBottom: 14 }}>
              <h3 className="card-title-h3" style={{ fontSize: 15 }}>Financial Alerts</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setActiveRoute('notifications')}
              >
                Notification Center
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(safeInsights.alerts || []).length === 0 ? (
                <div style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center', padding: '16px 8px' }}>
                  No active alerts. All financial flows are within safe parameters.
                </div>
              ) : (
                safeInsights.alerts.map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: alert.severity === 'critical'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : alert.severity === 'warning'
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(11, 18, 32, 0.65)',
                      border: `1px solid ${
                        alert.severity === 'critical'
                          ? 'rgba(239, 68, 68, 0.3)'
                          : alert.severity === 'warning'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(255, 255, 255, 0.08)'
                      }`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 10,
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => alert.actionPage && setActiveRoute(alert.actionPage)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                      {alert.severity === 'critical' ? (
                        <AlertTriangle size={15} color="#F87171" style={{ flexShrink: 0, marginTop: 2 }} />
                      ) : alert.severity === 'warning' ? (
                        <Clock size={15} color="#FBBF24" style={{ flexShrink: 0, marginTop: 2 }} />
                      ) : (
                        <CheckCircle2 size={15} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F8FAFC', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{alert.title}</div>
                        <div style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.4, marginTop: 2, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{alert.description}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Dismiss alert"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '0 4px',
                        fontSize: 16,
                        lineHeight: 1,
                        borderRadius: 4
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* D. Bottom Row: Recent Activity & Income Reliability Breakdown */}
      <div className="dashboard-bottom-grid">
        
        {/* Recent Activity Table (Max 5) */}
        <div className="card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-title-h3">Recent Activity</h3>
              <p className="card-subtitle-p">Cleared and committed financial transactions.</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => setActiveRoute('expenses')}
            >
              <span>View all transactions</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: 600, color: '#F8FAFC' }}>{tx.title}</td>
                    <td style={{ color: '#94A3B8', fontSize: 12.5 }}>{tx.date}</td>
                    <td style={{ color: '#94A3B8', fontSize: 12.5 }}>{tx.category}</td>
                    <td className="num-val" style={{ color: tx.type === 'income' ? '#10B981' : '#F8FAFC' }}>
                      {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                    </td>
                    <td>
                      <span className={`badge ${tx.status === 'Received' || tx.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Income Reliability Breakdown */}
        <div className="card">
          <div className="card-header-flex">
            <div>
              <h3 className="card-title-h3">Income Reliability</h3>
              <p className="card-subtitle-p">Quality distribution of incoming cash flow.</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => setActiveRoute('income')}
            >
              <span>Manage</span>
            </button>
          </div>

          {/* Segmented Progress Bar */}
          <div style={{ height: 10, borderRadius: 5, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', display: 'flex', marginBottom: 20 }}>
            <div style={{ width: `${(totalReceived / grandTotalPipeline) * 100}%`, background: '#10B981' }} title="Received" />
            <div style={{ width: `${(totalConfirmed / grandTotalPipeline) * 100}%`, background: '#38BDF8' }} title="Confirmed" />
            <div style={{ width: `${(totalUncertain / grandTotalPipeline) * 100}%`, background: '#F59E0B' }} title="Uncertain" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '10px 12px', background: 'rgba(11, 18, 32, 0.55)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 160px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', flexShrink: 0 }}></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Received</div>
                  <div style={{ color: '#94A3B8', fontSize: 11 }}>In Hand / Cash Balance</div>
                </div>
              </div>
              <strong style={{ color: '#10B981', fontFeatureSettings: 'tnum', fontSize: 13.5, flexShrink: 0 }}>{formatINR(totalReceived)}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '10px 12px', background: 'rgba(11, 18, 32, 0.55)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 160px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8', flexShrink: 0 }}></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Confirmed</div>
                  <div style={{ color: '#94A3B8', fontSize: 11 }}>Invoices / Signed Contracts</div>
                </div>
              </div>
              <strong style={{ color: '#38BDF8', fontFeatureSettings: 'tnum', fontSize: 13.5, flexShrink: 0 }}>{formatINR(totalConfirmed)}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '10px 12px', background: 'rgba(11, 18, 32, 0.55)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 160px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px #F59E0B', flexShrink: 0 }}></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Uncertain</div>
                  <div style={{ color: '#94A3B8', fontSize: 11 }}>Pipeline / Verbal Deals</div>
                </div>
              </div>
              <strong style={{ color: '#F59E0B', fontFeatureSettings: 'tnum', fontSize: 13.5, flexShrink: 0 }}>{formatINR(totalUncertain)}</strong>
            </div>
          </div>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Rule of Thumb:</span> Only Received cash is spent today. Confirmed income powers upcoming obligations; Uncertain income is excluded from baseline safety.
          </div>
        </div>

      </div>

    </div>
  );
}
