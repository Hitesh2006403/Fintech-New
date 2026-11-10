import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { formatINR } from '../../services/financialEngine.js';
import {
  IndianRupee,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';

export function AdminTransactionsView() {
  const { transactions } = useAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Completed' | 'Pending'

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const filteredTx = safeTransactions.filter(t => {
    const matchesSearch =
      t?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t?.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t?.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || t?.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || t?.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Type', 'Title', 'Category', 'Amount (INR)', 'Date', 'Status', 'User Name', 'Email'];
    const rows = filteredTx.map(t => [
      t?.id || '',
      t?.type || '',
      `"${(t?.title || '').replace(/"/g, '""')}"`,
      `"${t?.category || ''}"`,
      t?.amount || 0,
      t?.date || '',
      t?.status || '',
      `"${t?.userName || ''}"`,
      `"${t?.email || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finsight_platform_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title & Controls Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 4px 0' }}>
            Platform Transactions
          </h2>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            Audit financial transactions, deposits, and bill obligations across all user accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 16px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(129, 140, 248, 0.3)',
            borderRadius: 10,
            color: '#818CF8',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(99, 102, 241, 0.15)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.22)'; e.currentTarget.style.color = '#FFFFFF'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'; e.currentTarget.style.color = '#818CF8'; }}
        >
          <Download size={15} />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
        background: 'rgba(14, 21, 34, 0.78)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: 14,
        padding: '14px 18px'
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} color="#64748B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by transaction title, user, or category..."
            style={{
              width: '100%',
              padding: '9px 14px 9px 40px',
              background: 'rgba(10, 15, 25, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: 8,
              color: '#F8FAFC',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Type filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'income', 'expense'].map(tp => (
              <button
                key={tp}
                type="button"
                onClick={() => setTypeFilter(tp)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: typeFilter === tp ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: typeFilter === tp ? '#818CF8' : '#94A3B8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tp}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Status filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'Completed', 'Pending'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: statusFilter === st ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: statusFilter === st ? '#818CF8' : '#94A3B8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={{
        background: 'rgba(14, 21, 34, 0.78)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: 16,
        padding: '20px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Tx Record</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>User Account</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Category</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Date</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Status</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
                    No transactions matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isCompleted = tx.status === 'Completed';

                  return (
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.04)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isIncome ? '#34D399' : '#F87171',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>
                              {tx.title}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>
                              ID: {tx.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 600 }}>{tx.userName}</div>
                        <div style={{ fontSize: 11.5, color: '#94A3B8' }}>{tx.email}</div>
                      </td>

                      <td style={{ padding: '14px', fontSize: 13, color: '#94A3B8' }}>
                        {tx.category || 'General'}
                      </td>

                      <td style={{ padding: '14px', fontSize: 12.5, color: '#94A3B8' }}>
                        {tx.date}
                      </td>

                      <td style={{ padding: '14px' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isCompleted ? '#34D399' : '#FBBF24',
                          border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {tx.status}
                        </span>
                      </td>

                      <td style={{
                        padding: '14px',
                        textAlign: 'right',
                        fontSize: 14,
                        fontWeight: 800,
                        color: isIncome ? '#34D399' : '#F8FAFC'
                      }}>
                        {isIncome ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
