import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { X, TrendingUp, Receipt } from 'lucide-react';
import { toISODate } from '../../services/financialEngine.js';

export function QuickAddModal() {
  const { quickAddModalOpen, setQuickAddModalOpen, addIncome, addExpense } = useApp();
  const [tab, setTab] = useState('income'); // 'income' | 'expense'

  // Income fields
  const [incomeTitle, setIncomeTitle] = useState('');
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(toISODate(new Date()));
  const [incomeStatus, setIncomeStatus] = useState('confirmed');
  const [incomeNotes, setIncomeNotes] = useState('');

  // Expense fields
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Rent');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(toISODate(new Date()));
  const [expenseEssential, setExpenseEssential] = useState(true);
  const [expenseIsPaid, setExpenseIsPaid] = useState(false);
  const [expenseLateFee, setExpenseLateFee] = useState('');
  const [expenseGrace, setExpenseGrace] = useState('0');

  if (!quickAddModalOpen) return null;

  const handleIncomeSubmit = (e) => {
    e.preventDefault();
    if (!incomeTitle || !incomeAmount) return;

    addIncome({
      title: incomeTitle,
      source: incomeSource || 'Client Direct',
      amount: Number(incomeAmount),
      expectedDate: incomeDate,
      actualDate: incomeStatus === 'received' ? incomeDate : null,
      status: incomeStatus,
      notes: incomeNotes
    });

    // Reset & close
    setIncomeTitle('');
    setIncomeAmount('');
    setQuickAddModalOpen(false);
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;

    addExpense({
      title: expenseTitle,
      category: expenseCategory,
      amount: Number(expenseAmount),
      dueDate: expenseDate,
      paidDate: expenseIsPaid ? expenseDate : null,
      isEssential: expenseEssential,
      priority: expenseEssential ? 'high' : 'low',
      lateFee: Number(expenseLateFee || 0),
      gracePeriod: Number(expenseGrace || 0),
      status: expenseIsPaid ? 'paid' : 'unpaid'
    });

    // Reset & close
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseIsPaid(false);
    setQuickAddModalOpen(false);
  };

  return (
    <div className="modal-backdrop" onClick={() => setQuickAddModalOpen(false)}>
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header-bar">
          <div className="modal-tab-group" style={{ display: 'flex', gap: 6, background: 'rgba(11, 18, 32, 0.75)', padding: 4, borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              style={{
                border: 'none',
                background: tab === 'income' ? 'linear-gradient(135deg, #38BDF8 0%, #6366F1 100%)' : 'transparent',
                color: tab === 'income' ? '#0B1220' : '#94A3B8',
                fontWeight: tab === 'income' ? 700 : 500,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 7,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: tab === 'income' ? '0 0 14px rgba(56, 189, 248, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setTab('income')}
            >
              <TrendingUp size={14} />
              <span>Income</span>
            </button>

            <button
              type="button"
              style={{
                border: 'none',
                background: tab === 'expense' ? 'linear-gradient(135deg, #38BDF8 0%, #6366F1 100%)' : 'transparent',
                color: tab === 'expense' ? '#0B1220' : '#94A3B8',
                fontWeight: tab === 'expense' ? 700 : 500,
                fontSize: 12.5,
                padding: '7px 14px',
                borderRadius: 7,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: tab === 'expense' ? '0 0 14px rgba(56, 189, 248, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setTab('expense')}
            >
              <Receipt size={14} />
              <span>Bill / Expense</span>
            </button>
          </div>

          <button
            type="button"
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 8, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setQuickAddModalOpen(false)}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-area">
          {tab === 'income' ? (
            <form onSubmit={handleIncomeSubmit}>
              <div className="form-group-item">
                <label className="form-label-title">Income Description / Milestone Title *</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. Website Redesign Milestone 1"
                  value={incomeTitle}
                  onChange={(e) => setIncomeTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group-item">
                  <label className="form-label-title">Amount (₹ INR) *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input-control"
                    placeholder="e.g. 45000"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label-title">Client / Source</label>
                  <input
                    type="text"
                    className="form-input-control"
                    placeholder="e.g. Acme Corp"
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group-item">
                  <label className="form-label-title">Expected Payment Date *</label>
                  <input
                    type="date"
                    className="form-input-control"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label-title">Income Reliability Status *</label>
                  <select
                    className="form-input-control"
                    value={incomeStatus}
                    onChange={(e) => setIncomeStatus(e.target.value)}
                  >
                    <option value="confirmed">Confirmed (Signed Contract / Invoice)</option>
                    <option value="uncertain">Uncertain (Pitch / Proposal / Pipeline)</option>
                    <option value="received">Received (Already in Bank Account)</option>
                  </select>
                </div>
              </div>

              <div className="form-group-item">
                <label className="form-label-title">Notes / Terms</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. Net-15 terms after approval"
                  value={incomeNotes}
                  onChange={(e) => setIncomeNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer-bar" style={{ margin: '16px -24px -24px -24px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setQuickAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Income
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleExpenseSubmit}>
              <div className="form-group-item">
                <label className="form-label-title">Bill / Obligation Name *</label>
                <input
                  type="text"
                  className="form-input-control"
                  placeholder="e.g. Studio Workspace Rent"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group-item">
                  <label className="form-label-title">Amount (₹ INR) *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input-control"
                    placeholder="e.g. 22000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label-title">Category *</label>
                  <select
                    className="form-input-control"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                  >
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Transport">Transport</option>
                    <option value="Insurance">Insurance</option>
                    <option value="EMI or loan">EMI or loan</option>
                    <option value="Medical">Medical</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Education">Education</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group-item">
                  <label className="form-label-title">Due Date *</label>
                  <input
                    type="date"
                    className="form-input-control"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label-title">Obligation Type</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={expenseEssential}
                        onChange={(e) => setExpenseEssential(e.target.checked)}
                      />
                      <span>Essential Living Expense</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={expenseIsPaid}
                        onChange={(e) => setExpenseIsPaid(e.target.checked)}
                      />
                      <span>Already Paid / Cash Expense (Immediate deduction)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group-item">
                  <label className="form-label-title">Late Fee Penalty (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input-control"
                    placeholder="e.g. 500"
                    value={expenseLateFee}
                    onChange={(e) => setExpenseLateFee(e.target.value)}
                  />
                </div>

                <div className="form-group-item">
                  <label className="form-label-title">Grace Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input-control"
                    placeholder="e.g. 3"
                    value={expenseGrace}
                    onChange={(e) => setExpenseGrace(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-bar" style={{ margin: '16px -24px -24px -24px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setQuickAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Bill
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
