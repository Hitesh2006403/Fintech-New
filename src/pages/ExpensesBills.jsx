import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR, toISODate, diffInDays } from '../services/financialEngine.js';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  Calendar,
  Layers
} from 'lucide-react';

export function ExpensesBills() {
  const { expenses, addExpense, editExpense, deleteExpense, markExpensePaid, setQuickAddModalOpen } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid'); // 'all' | 'unpaid' | 'overdue' | 'paid'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [payModalExpense, setPayModalExpense] = useState(null);
  const [paymentDate, setPaymentDate] = useState(toISODate(new Date()));

  const todayStr = toISODate(new Date());
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  // Metrics
  const unpaidBills = safeExpenses.filter(e => e && e.status !== 'paid');
  const totalUnpaid = unpaidBills.reduce((s, e) => s + Number(e.amount || 0), 0);

  const due7Days = unpaidBills.filter(e => {
    if (!e || !e.dueDate) return false;
    const diff = diffInDays(todayStr, e.dueDate);
    return diff >= 0 && diff <= 7;
  });
  const totalDue7Days = due7Days.reduce((s, e) => s + Number(e.amount || 0), 0);

  const overdueBills = unpaidBills.filter(e => e && e.dueDate && e.dueDate < todayStr);
  const totalOverdue = overdueBills.reduce((s, e) => s + Number(e.amount || 0), 0);

  const essentialUnpaid = unpaidBills.filter(e => e && e.isEssential);
  const totalEssentialUnpaid = essentialUnpaid.reduce((s, e) => s + Number(e.amount || 0), 0);

  // Filtered List
  const filteredExpenses = safeExpenses.filter(exp => {
    if (!exp) return false;
    const matchesSearch = (exp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (exp.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'unpaid') matchesStatus = exp.status !== 'paid';
    else if (statusFilter === 'paid') matchesStatus = exp.status === 'paid';
    else if (statusFilter === 'overdue') matchesStatus = exp.status !== 'paid' && exp.dueDate < todayStr;

    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleConfirmPay = () => {
    if (!payModalExpense) return;
    markExpensePaid(payModalExpense.id, paymentDate);
    setPayModalExpense(null);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    editExpense(editingExpense.id, editingExpense);
    setEditingExpense(null);
  };

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Expenses & Bills Management</h1>
          <p className="page-subtitle">
            Manage upcoming obligations, loan EMIs, rent deadlines, and late fee consequences.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="kpi-strip-grid">
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Unpaid</span>
            <Receipt size={16} color="var(--neu-brand-primary, #059669)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-text-primary, #172033)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalUnpaid)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
            {unpaidBills.length} active bills scheduled
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due in 7 Days</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-warning, #F59E0B)', boxShadow: '0 0 6px rgba(245, 158, 11, 0.5)' }}></span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-warning-dark, #B45309)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalDue7Days)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
            {due7Days.length} urgent upcoming commitments
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderColor: overdueBills.length > 0 ? 'var(--neu-danger-border, rgba(239, 68, 68, 0.4))' : 'var(--neu-border, #DCE4EB)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: overdueBills.length > 0 ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overdue Bills</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-danger, #EF4444)', boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)' }}></span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-danger-dark, #B91C1C)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalOverdue)}
          </div>
          <div style={{ fontSize: 11.5, color: overdueBills.length > 0 ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
            {overdueBills.length > 0 ? `${overdueBills.length} past due (penalty risk)` : 'Zero overdue payments'}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Essential Commitments</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-brand-primary, #059669)', boxShadow: '0 0 6px rgba(5, 150, 105, 0.4)' }}></span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-brand-primary, #059669)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(totalEssentialUnpaid)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 4 }}>
            Housing, EMI & utilities protected
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
            placeholder="Search bills by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Category Select */}
          <select
            className="form-input-control"
            style={{ width: 'auto', padding: '6px 12px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Rent">Rent</option>
            <option value="EMI or loan">EMI or loan</option>
            <option value="Utilities">Utilities</option>
            <option value="Subscriptions">Subscriptions</option>
            <option value="Insurance">Insurance</option>
            <option value="Groceries">Groceries</option>
          </select>

          {/* Status Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--neu-bg-primary, #E9EEF3)',
            padding: 4,
            borderRadius: 12,
            border: '1px solid var(--neu-border, #DCE4EB)',
            boxShadow: 'var(--neu-shadow-inset-sm, inset 2px 2px 5px rgba(163, 177, 198, 0.25), inset -2px -2px 5px rgba(255, 255, 255, 0.85))',
            gap: 4
          }}>
            {[
              { id: 'unpaid', label: 'Unpaid' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'paid', label: 'Paid' },
              { id: 'all', label: 'All Bills' }
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
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Bill / Commitment</th>
                <th>Category</th>
                <th>Amount (INR)</th>
                <th>Due Date</th>
                <th>Essential / Discretionary</th>
                <th>Penalties / Grace</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No expense records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => {
                  const isOverdue = exp.status !== 'paid' && exp.dueDate < todayStr;
                  return (
                    <tr key={exp.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--neu-text-primary, #172033)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{exp.title}</span>
                        </div>
                        {exp.emiDetails && (
                          <div style={{ fontSize: 11.5, color: 'var(--neu-brand-primary, #059669)', fontWeight: 600, marginTop: 2 }}>
                            EMI: {exp.emiDetails.remainingInstallments} installments remaining
                          </div>
                        )}
                        {exp.notes && (
                          <div style={{ fontSize: 11.5, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>{exp.notes}</div>
                        )}
                      </td>

                      <td style={{ color: 'var(--neu-text-secondary, #64748B)', fontSize: 13 }}>{exp.category}</td>

                      <td className="num-val" style={{ color: 'var(--neu-text-primary, #172033)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {formatINR(exp.amount)}
                      </td>

                      <td style={{ fontSize: 13 }}>
                        <span style={{ color: isOverdue ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-text-secondary, #64748B)', fontWeight: isOverdue ? 700 : 500 }}>
                          {exp.dueDate}
                        </span>
                        {isOverdue && (
                          <div style={{ fontSize: 11, color: 'var(--neu-danger-dark, #B91C1C)', fontWeight: 600 }}>Past Due</div>
                        )}
                      </td>

                      <td>
                        {exp.isEssential ? (
                          <span className="status-badge overdue">
                            <span>Essential</span>
                          </span>
                        ) : (
                          <span className="status-badge neutral">
                            <span>Discretionary</span>
                          </span>
                        )}
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>
                        {exp.lateFee > 0 ? (
                          <span style={{ color: 'var(--neu-danger-dark, #B91C1C)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {formatINR(exp.lateFee)} penalty
                          </span>
                        ) : (
                          <span style={{ color: 'var(--neu-text-muted, #94A3B8)' }}>No penalty</span>
                        )}
                        {exp.gracePeriod > 0 && (
                          <div style={{ color: 'var(--neu-text-secondary, #64748B)' }}>{exp.gracePeriod}d grace</div>
                        )}
                      </td>

                      <td>
                        {exp.status === 'paid' ? (
                          <span className="status-badge received">
                            <CheckCircle2 size={12} />
                            <span>Paid</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="status-badge overdue">
                            <AlertTriangle size={12} />
                            <span>Overdue</span>
                          </span>
                        ) : (
                          <span className="status-badge upcoming">
                            <Clock size={12} />
                            <span>Unpaid</span>
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {exp.status !== 'paid' && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                fontSize: 11.5,
                                padding: '5px 10px',
                                color: 'var(--neu-brand-primary, #059669)',
                                borderColor: 'var(--neu-border, #DCE4EB)'
                              }}
                              title="Record payment of this bill"
                              onClick={() => setPayModalExpense(exp)}
                            >
                              <CheckCircle2 size={12} />
                              <span>Mark Paid</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 11.5, padding: '6px 9px' }}
                            onClick={() => setEditingExpense(exp)}
                            title="Edit bill"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 11.5, padding: '6px 9px', color: 'var(--neu-danger, #EF4444)' }}
                            onClick={() => setDeleteConfirmId(exp.id)}
                            title="Delete bill"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Confirmation Modal */}
      {payModalExpense && (
        <div className="modal-backdrop" onClick={() => setPayModalExpense(null)}>
          <div className="modal-content-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--neu-success-dark, #047857)' }}>Record Bill Payment</h3>
            </div>
            <div className="modal-body-area">
              <p style={{ fontSize: 13.5, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 16 }}>
                Record payment of <strong style={{ color: 'var(--neu-text-primary, #172033)' }}>{formatINR(payModalExpense.amount)}</strong> for <strong style={{ color: 'var(--neu-text-primary, #172033)' }}>{payModalExpense.title}</strong>. This will deduct the payment from your live available cash balance exactly once.
              </p>

              <div className="form-group-item">
                <label className="form-label-title">Actual Payment Date</label>
                <input
                  type="date"
                  className="form-input-control"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer-bar">
              <button type="button" className="btn-secondary" onClick={() => setPayModalExpense(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirmPay}>
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--neu-danger, #EF4444)' }}>Delete Bill</h3>
            </div>
            <div className="modal-body-area">
              <p style={{ fontSize: 13.5, color: 'var(--neu-text-secondary, #64748B)', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to remove this bill? This will adjust your upcoming obligation forecast.
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
                  deleteExpense(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                Delete Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {editingExpense && (
        <div className="modal-backdrop" onClick={() => setEditingExpense(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Edit Bill Details</h3>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body-area">
                <div className="form-group-item">
                  <label className="form-label-title">Bill / Obligation Name</label>
                  <input
                    type="text"
                    className="form-input-control"
                    value={editingExpense.title}
                    onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Amount (₹)</label>
                    <input
                      type="number"
                      className="form-input-control"
                      value={editingExpense.amount}
                      onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Category</label>
                    <select
                      className="form-input-control"
                      value={editingExpense.category}
                      onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                    >
                      <option value="Rent">Rent</option>
                      <option value="EMI or loan">EMI or loan</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Subscriptions">Subscriptions</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Groceries">Groceries</option>
                      <option value="Medical">Medical</option>
                      <option value="Transport">Transport</option>
                      <option value="Education">Education</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Due Date</label>
                    <input
                      type="date"
                      className="form-input-control"
                      value={editingExpense.dueDate}
                      onChange={(e) => setEditingExpense({ ...editingExpense, dueDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Essential Status</label>
                    <select
                      className="form-input-control"
                      value={editingExpense.isEssential ? 'true' : 'false'}
                      onChange={(e) => setEditingExpense({ ...editingExpense, isEssential: e.target.value === 'true' })}
                    >
                      <option value="true">Essential Living Expense</option>
                      <option value="false">Discretionary / Can Defer</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Late Fee Penalty (₹)</label>
                    <input
                      type="number"
                      className="form-input-control"
                      value={editingExpense.lateFee || 0}
                      onChange={(e) => setEditingExpense({ ...editingExpense, lateFee: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Grace Period (Days)</label>
                    <input
                      type="number"
                      className="form-input-control"
                      value={editingExpense.gracePeriod || 0}
                      onChange={(e) => setEditingExpense({ ...editingExpense, gracePeriod: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer-bar">
                <button type="button" className="btn-secondary" onClick={() => setEditingExpense(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
