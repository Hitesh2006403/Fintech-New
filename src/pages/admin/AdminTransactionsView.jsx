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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Platform Transactions
          </h2>
          <p style={{ fontSize: 13, color: '#475569', margin: 0, fontWeight: 500 }}>
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
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: 10,
            color: '#1D4ED8',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(37, 99, 235, 0.08)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.16)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'; }}
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
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 14,
        padding: '14px 18px',
        boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.04)'
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
              background: '#FFFFFF',
              border: '1px solid rgba(203, 213, 225, 0.8)',
              borderRadius: 8,
              color: '#0F172A',
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
                  border: typeFilter === tp ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(226, 232, 240, 0.8)',
                  background: typeFilter === tp ? 'rgba(79, 70, 229, 0.12)' : 'rgba(241, 245, 249, 0.8)',
                  color: typeFilter === tp ? '#4338CA' : '#475569',
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

          <div style={{ width: 1, height: 20, background: 'rgba(226, 232, 240, 0.9)' }} />

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
                  border: statusFilter === st ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(226, 232, 240, 0.8)',
                  background: statusFilter === st ? 'rgba(79, 70, 229, 0.12)' : 'rgba(241, 245, 249, 0.8)',
                  color: statusFilter === st ? '#4338CA' : '#475569',
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
        background: 'rgba(255, 255, 255, 0.76)',
        backdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.88)',
        borderRadius: 16,
        padding: '20px',
        boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.05), 0 10px 30px -10px rgba(15, 23, 42, 0.06)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.9)', background: 'rgba(241, 245, 249, 0.6)' }}>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tx Record</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>User Account</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: 14, fontWeight: 500 }}>
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
                        borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(241, 245, 249, 0.7)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: isIncome ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isIncome ? '#059669' : '#DC2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                              {tx.title}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                              ID: {tx.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ fontSize: 13, color: '#1E293B', fontWeight: 600 }}>{tx.userName}</div>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>{tx.email}</div>
                      </td>

                      <td style={{ padding: '14px', fontSize: 13, color: '#334155', fontWeight: 500 }}>
                        {tx.category || 'General'}
                      </td>

                      <td style={{ padding: '14px', fontSize: 12.5, color: '#334155', fontWeight: 500 }}>
                        {tx.date}
                      </td>

                      <td style={{ padding: '14px' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: isCompleted ? '#065F46' : '#92400E',
                          border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                        }}>
                          {tx.status}
                        </span>
                      </td>

                      <td style={{
                        padding: '14px',
                        textAlign: 'right',
                        fontSize: 14,
                        fontWeight: 700,
                        color: isIncome ? '#059669' : '#0F172A',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap'
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
