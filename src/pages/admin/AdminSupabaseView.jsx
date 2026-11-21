import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, ExternalLink, CheckCircle2, Shield, Cloud, Table, Eye } from 'lucide-react';

export function AdminSupabaseView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTable, setActiveTable] = useState('profiles');

  const fetchSupabaseLive = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/database/supabase-inspector');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.message || 'Failed to inspect Supabase cloud database');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching Supabase records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseLive();
  }, []);

  const counts = data?.counts || { profiles: 0, income_entries: 0, expenses: 0, user_preferences: 0 };
  const currentRows = data?.tables?.[activeTable] || [];

  return (
    <div className="admin-reports-view">
      {/* Header */}
      <div className="admin-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#059669',
              letterSpacing: 0.8,
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '2px 8px',
              borderRadius: 4
            }}>
              SUPABASE POSTGRESQL CLOUD
            </span>
            <span style={{ color: '#94A3B8' }}>•</span>
            <span style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>Real-Time Cloud Mirroring</span>
          </div>
          <h1 className="admin-view-title" style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
            Supabase Live Database Inspector
          </h1>
          <p className="admin-view-subtitle" style={{ margin: '4px 0 0 0', color: 'var(--neu-text-secondary, #64748B)', fontSize: 13 }}>
            Inspect live records mirrored directly into the Supabase PostgreSQL cloud instance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchSupabaseLive}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '8px 14px' }}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            <span>{loading ? 'Querying Cloud...' : 'Refresh from Supabase'}</span>
          </button>
          <a
            href="http://localhost:3001/api/database/supabase-inspector"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '8px 14px', textDecoration: 'none' }}
          >
            <span>Raw JSON Endpoint</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Cloud Status Banner */}
      <div style={{
        background: 'var(--neu-bg-primary, #E9EEF3)',
        border: '1px solid var(--neu-border, #DCE4EB)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 24,
        boxShadow: 'var(--neu-shadow-flat-sm, 2px 2px 5px rgba(163, 177, 198, 0.25), -2px -2px 5px rgba(255, 255, 255, 0.7))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669'
          }}>
            <Cloud size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>
              Connected Cloud: <span style={{ fontFamily: 'monospace', color: '#059669' }}>{data?.cloudProject || 'https://rmzbuevslhddkinkgikq.supabase.co'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>
              Status: <span style={{ color: '#059669', fontWeight: 600 }}>Active & Healthy</span> • Dual-Mode Resilient Persistence Active
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase' }}>Profiles</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{counts.profiles}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase' }}>Incomes</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#3B82F6' }}>{counts.income_entries}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase' }}>Expenses</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#EF4444' }}>{counts.expenses}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', textTransform: 'uppercase' }}>Preferences</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#8B5CF6' }}>{counts.preferences}</div>
          </div>
        </div>
      </div>

      {/* Table Selector Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--neu-border, #DCE4EB)', paddingBottom: 10 }}>
        {[
          { id: 'profiles', label: `Profiles (${counts.profiles})` },
          { id: 'income_entries', label: `Income Entries (${counts.income_entries})` },
          { id: 'expenses', label: `Expenses (${counts.expenses})` },
          { id: 'user_preferences', label: `User Preferences (${counts.preferences})` }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTable(t.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: activeTable === t.id ? '1px solid #059669' : '1px solid var(--neu-border, #DCE4EB)',
              background: activeTable === t.id ? 'rgba(16, 185, 129, 0.12)' : 'var(--neu-bg-primary, #E9EEF3)',
              color: activeTable === t.id ? '#059669' : 'var(--neu-text-primary, #172033)',
              fontWeight: activeTable === t.id ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Live Table Render */}
      <div style={{
        background: 'var(--neu-bg-primary, #E9EEF3)',
        borderRadius: 14,
        border: '1px solid var(--neu-border, #DCE4EB)',
        overflow: 'hidden',
        boxShadow: 'var(--neu-shadow-flat-sm)'
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--neu-text-secondary)' }}>
            Querying Supabase Cloud PostgreSQL...
          </div>
        ) : error ? (
          <div style={{ padding: 30, color: '#EF4444', textAlign: 'center' }}>
            {error}
          </div>
        ) : currentRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--neu-text-secondary)' }}>
            No records found in table `{activeTable}`.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--neu-bg-secondary, #F1F5F9)', borderBottom: '1px solid var(--neu-border, #DCE4EB)', textAlign: 'left' }}>
                  {activeTable === 'profiles' && (
                    <>
                      <th style={{ padding: '12px 16px' }}>Supabase ID</th>
                      <th style={{ padding: '12px 16px' }}>Name</th>
                      <th style={{ padding: '12px 16px' }}>Email</th>
                      <th style={{ padding: '12px 16px' }}>Role</th>
                      <th style={{ padding: '12px 16px' }}>Onboarding</th>
                      <th style={{ padding: '12px 16px' }}>Created At</th>
                    </>
                  )}
                  {activeTable === 'income_entries' && (
                    <>
                      <th style={{ padding: '12px 16px' }}>Income ID</th>
                      <th style={{ padding: '12px 16px' }}>Title</th>
                      <th style={{ padding: '12px 16px' }}>Amount (₹)</th>
                      <th style={{ padding: '12px 16px' }}>Expected Date</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>User ID</th>
                    </>
                  )}
                  {activeTable === 'expenses' && (
                    <>
                      <th style={{ padding: '12px 16px' }}>Expense ID</th>
                      <th style={{ padding: '12px 16px' }}>Title</th>
                      <th style={{ padding: '12px 16px' }}>Amount (₹)</th>
                      <th style={{ padding: '12px 16px' }}>Due Date</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Essential</th>
                    </>
                  )}
                  {activeTable === 'user_preferences' && (
                    <>
                      <th style={{ padding: '12px 16px' }}>User ID</th>
                      <th style={{ padding: '12px 16px' }}>Starting Balance</th>
                      <th style={{ padding: '12px 16px' }}>Safety Buffer</th>
                      <th style={{ padding: '12px 16px' }}>Income Cadence</th>
                      <th style={{ padding: '12px 16px' }}>Horizon</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, idx) => (
                  <tr key={row.id || row.user_id || idx} style={{ borderBottom: '1px solid var(--neu-border, #DCE4EB)' }}>
                    {activeTable === 'profiles' && (
                      <>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#059669' }}>{row.id}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--neu-text-secondary)' }}>{row.email}</td>
                        <td style={{ padding: '12px 16px' }}>{row.role}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: row.onboarding_completed ? '#059669' : '#D97706', fontWeight: 600 }}>
                            {row.onboarding_completed ? 'Completed' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--neu-text-secondary)', fontSize: 11.5 }}>
                          {row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A'}
                        </td>
                      </>
                    )}
                    {activeTable === 'income_entries' && (
                      <>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#059669' }}>{row.id}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.title}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px' }}>{row.expected_date}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: row.status === 'received' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                            color: row.status === 'received' ? '#059669' : '#2563EB'
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11.5, color: 'var(--neu-text-secondary)' }}>{row.user_id}</td>
                      </>
                    )}
                    {activeTable === 'expenses' && (
                      <>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#EF4444' }}>{row.id}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.title}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#EF4444' }}>₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px' }}>{row.due_date}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: row.status === 'paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: row.status === 'paid' ? '#059669' : '#DC2626'
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{row.is_essential ? 'Yes (Essential)' : 'No'}</td>
                      </>
                    )}
                    {activeTable === 'user_preferences' && (
                      <>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#8B5CF6' }}>{row.user_id}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>₹{Number(row.starting_balance || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#D97706' }}>₹{Number(row.safety_buffer || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px' }}>{row.income_frequency || 'Irregular'}</td>
                        <td style={{ padding: '12px 16px' }}>{row.default_horizon_days} Days</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
