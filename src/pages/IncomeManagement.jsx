import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR } from '../services/financialEngine.js';
import { classifyIncomeStatus, getCurrentLocalDate, toISODate } from '../services/dateService.js';
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  HelpCircle,
  Trash2,
  Edit3,
  Calendar,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

export function IncomeManagement() {
  const { incomes, addIncome, editIncome, deleteIncome, markIncomeReceived, setQuickAddModalOpen } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'received' | 'confirmed' | 'uncertain'
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [receiveModalIncome, setReceiveModalIncome] = useState(null);
  const [receiveDate, setReceiveDate] = useState(toISODate(new Date()));

  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const today = getCurrentLocalDate();

  // Summary Metrics using dynamic classification
  const totalReceived = safeIncomes
    .filter(i => i && (i.status === 'received' || i.actualDate))
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const totalConfirmed = safeIncomes
    .filter(i => i && classifyIncomeStatus(i, today) === 'confirmed')
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const totalOverdue = safeIncomes
    .filter(i => i && classifyIncomeStatus(i, today) === 'overdue')
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const totalUncertain = safeIncomes
    .filter(i => i && classifyIncomeStatus(i, today) === 'uncertain')
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const totalPipeline = totalReceived + totalConfirmed + totalOverdue + totalUncertain;

  // Filtered List
  const filteredIncomes = safeIncomes.filter(inc => {
    if (!inc) return false;
    const matchesSearch = (inc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (inc.source && inc.source.toLowerCase().includes(searchQuery.toLowerCase()));
    const opStatus = classifyIncomeStatus(inc, today);
    const matchesStatus = statusFilter === 'all' || opStatus === statusFilter || inc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingIncome) return;
    editIncome(editingIncome.id, editingIncome);
    setEditingIncome(null);
  };

  const handleConfirmReceive = () => {
    if (!receiveModalIncome) return;
    markIncomeReceived(receiveModalIncome.id, receiveDate);
    setReceiveModalIncome(null);
  };

  return (
    <div className="page-container">
      
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Income Management</h1>
          <p className="page-subtitle">
            Track irregular client retainers, milestone payments, and uncertain project proposals.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="kpi-strip-grid">
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Received in Bank</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-success, #10B981)', boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)' }}></span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-success-dark, #047857)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalReceived)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
            In hand, affects available cash.
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmed Invoices</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-brand-primary, #059669)', boxShadow: '0 0 6px rgba(5, 150, 105, 0.4)' }}></span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-brand-primary, #059669)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalConfirmed)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
            Expected; included in forecast.
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uncertain Pitches</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-warning, #F59E0B)', boxShadow: '0 0 6px rgba(245, 158, 11, 0.5)' }}></span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-warning-dark, #B45309)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalUncertain)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
            Excluded from conservative safety.
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pipeline</span>
            <TrendingUp size={15} color="var(--neu-brand-primary, #059669)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-text-primary, #172033)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalPipeline)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
            All active freelance revenue streams.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-toolbar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="search-input-field"
            placeholder="Search by client or milestone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--neu-bg-primary, #E9EEF3)',
          padding: 4,
          borderRadius: 12,
          border: '1px solid var(--neu-border, #DCE4EB)',
          boxShadow: 'var(--neu-shadow-inset-sm, inset 2px 2px 5px rgba(163, 177, 198, 0.25), inset -2px -2px 5px rgba(255, 255, 255, 0.85))'
        }}>
          {[
            { id: 'all', label: 'All Streams' },
            { id: 'received', label: 'Received' },
            { id: 'confirmed', label: 'Confirmed (Future)' },
            { id: 'overdue', label: `Overdue (${safeIncomes.filter(i => classifyIncomeStatus(i, today) === 'overdue').length})` },
            { id: 'uncertain', label: 'Uncertain' }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
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
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incomes Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Income Milestone</th>
                <th>Client / Source</th>
                <th>Amount (INR)</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Schedule</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--neu-text-muted, #94A3B8)' }}>
                    No income records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map(inc => (
                  <tr key={inc.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--neu-text-primary, #172033)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{inc.title}</span>
                      </div>
                      {inc.notes && (
                        <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>{inc.notes}</div>
                      )}
                    </td>

                    <td style={{ color: 'var(--neu-text-secondary, #64748B)' }}>{inc.source || 'Direct Client'}</td>

                    <td className="num-val" style={{
                      color: inc.status === 'received' ? 'var(--neu-success-dark, #047857)' : 'var(--neu-brand-primary, #059669)',
                      fontSize: 14,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      +{formatINR(inc.amount)}
                    </td>

                    <td style={{ color: 'var(--neu-text-secondary, #64748B)', fontSize: 13 }}>
                      {classifyIncomeStatus(inc, today) === 'received' ? (
                        <span>Received {inc.actualDate || inc.expectedDate}</span>
                      ) : classifyIncomeStatus(inc, today) === 'overdue' ? (
                        <span style={{ color: 'var(--neu-danger-dark, #B91C1C)', fontWeight: 600 }}>Expected {inc.expectedDate} (Past Due)</span>
                      ) : (
                        <span>Expected {inc.expectedDate}</span>
                      )}
                    </td>

                    <td>
                      {classifyIncomeStatus(inc, today) === 'received' ? (
                        <span className="status-badge received">
                          <CheckCircle2 size={12} />
                          <span>Received</span>
                        </span>
                      ) : classifyIncomeStatus(inc, today) === 'overdue' ? (
                        <span className="status-badge overdue">
                          <AlertTriangle size={12} />
                          <span>Overdue</span>
                        </span>
                      ) : classifyIncomeStatus(inc, today) === 'confirmed' ? (
                        <span className="status-badge neutral">
                          <Clock size={12} />
                          <span>Confirmed</span>
                        </span>
                      ) : (
                        <span className="status-badge upcoming">
                          <HelpCircle size={12} />
                          <span>Uncertain</span>
                        </span>
                      )}
                    </td>

                    <td style={{ textTransform: 'capitalize', color: 'var(--neu-text-secondary, #64748B)', fontSize: 12.5 }}>
                      {inc.recurring || 'Milestone'}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {inc.status !== 'received' && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              fontSize: 11.5,
                              padding: '5px 10px',
                              color: 'var(--neu-brand-primary, #059669)',
                              borderColor: 'var(--neu-border, #DCE4EB)'
                            }}
                            title="Mark money arrived into bank account"
                            onClick={() => setReceiveModalIncome(inc)}
                          >
                            <CheckCircle2 size={12} />
                            <span>Mark Received</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 11.5, padding: '6px 9px' }}
                          onClick={() => setEditingIncome(inc)}
                          title="Edit income entry"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 11.5, padding: '6px 9px', color: 'var(--neu-danger, #EF4444)' }}
                          onClick={() => setDeleteConfirmId(inc.id)}
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--neu-danger, #EF4444)' }}>Delete Income Stream</h3>
            </div>
            <div className="modal-body-area">
              <p style={{ fontSize: 13.5, color: 'var(--neu-text-secondary, #64748B)', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to remove this income entry? If it was marked received, it will adjust your calculated cash balance.
              </p>
            </div>
            <div className="modal-footer-bar">
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  deleteIncome(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Received Date Confirmation Modal */}
      {receiveModalIncome && (
        <div className="modal-backdrop" onClick={() => setReceiveModalIncome(null)}>
          <div className="modal-content-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--neu-success-dark, #047857)' }}>Record Cash Receipt</h3>
            </div>
            <div className="modal-body-area">
              <p style={{ fontSize: 13.5, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 16 }}>
                Record the arrival of <strong style={{ color: 'var(--neu-text-primary, #172033)' }}>{formatINR(receiveModalIncome.amount)}</strong> from <strong style={{ color: 'var(--neu-text-primary, #172033)' }}>{receiveModalIncome.title}</strong>. This will add the funds to your live available cash balance exactly once.
              </p>

              <div className="form-group-item">
                <label className="form-label-title">Actual Receipt Date</label>
                <input
                  type="date"
                  className="form-input-control"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer-bar">
              <button type="button" className="btn-secondary" onClick={() => setReceiveModalIncome(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" style={{ background: '#10B981', border: '1px solid rgba(16, 185, 129, 0.5)', boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)' }} onClick={handleConfirmReceive}>
                Confirm Cash Received
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Income Modal */}
      {editingIncome && (
        <div className="modal-backdrop" onClick={() => setEditingIncome(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Edit Income Stream</h3>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body-area">
                <div className="form-group-item">
                  <label className="form-label-title">Title / Milestone</label>
                  <input
                    type="text"
                    className="form-input-control"
                    value={editingIncome.title}
                    onChange={(e) => setEditingIncome({ ...editingIncome, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Amount (₹)</label>
                    <input
                      type="number"
                      className="form-input-control"
                      value={editingIncome.amount}
                      onChange={(e) => setEditingIncome({ ...editingIncome, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Client / Source</label>
                    <input
                      type="text"
                      className="form-input-control"
                      value={editingIncome.source || ''}
                      onChange={(e) => setEditingIncome({ ...editingIncome, source: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Scheduled / Received Date</label>
                    <input
                      type="date"
                      className="form-input-control"
                      value={editingIncome.expectedDate || ''}
                      onChange={(e) => setEditingIncome({ ...editingIncome, expectedDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Reliability Status</label>
                    <select
                      className="form-input-control"
                      value={editingIncome.status}
                      onChange={(e) => setEditingIncome({ ...editingIncome, status: e.target.value })}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="uncertain">Uncertain</option>
                      <option value="received">Received (In Bank)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-item">
                  <label className="form-label-title">Notes</label>
                  <input
                    type="text"
                    className="form-input-control"
                    value={editingIncome.notes || ''}
                    onChange={(e) => setEditingIncome({ ...editingIncome, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-bar">
                <button type="button" className="btn-secondary" onClick={() => setEditingIncome(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
