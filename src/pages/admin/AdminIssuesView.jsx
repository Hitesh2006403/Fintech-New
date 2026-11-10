import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  Filter,
  Check,
  User,
  ShieldCheck
} from 'lucide-react';

export function AdminIssuesView() {
  const { issues, updateIssueStatus } = useAdmin();

  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);

  const safeIssues = Array.isArray(issues) ? issues : [];

  const filteredIssues = safeIssues.filter(issue => {
    const matchesFilter = filterStatus === 'all' || issue?.status === filterStatus;
    const matchesSearch =
      issue?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue?.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue?.reportedBy?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
            Feedback & Reported Issues
          </h2>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            Track client concerns, authentication queries, and platform feature requests.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '6px 14px',
          borderRadius: 10,
          color: '#DC2626',
          fontSize: 12.5,
          fontWeight: 700
        }}>
          <AlertTriangle size={15} />
          <span>{safeIssues.filter(i => i?.status !== 'resolved').length} Open Tickets</span>
        </div>
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
            placeholder="Search tickets by keyword, category, or user..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['all', 'open', 'in_progress', 'resolved'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: filterStatus === st ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(226, 232, 240, 0.8)',
                background: filterStatus === st ? 'rgba(79, 70, 229, 0.12)' : 'rgba(241, 245, 249, 0.8)',
                color: filterStatus === st ? '#4338CA' : '#475569',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredIssues.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.78)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
            color: '#64748B'
          }}>
            No issues found under this filter.
          </div>
        ) : (
          filteredIssues.map(issue => {
            const isResolved = issue.status === 'resolved';
            const isInProgress = issue.status === 'in_progress';

            const severityColor =
              issue.severity === 'high' ? '#EF4444' :
              issue.severity === 'medium' ? '#F59E0B' : '#4F46E5';

            return (
              <div
                key={issue.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.78)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  borderLeft: `4px solid ${severityColor}`,
                  borderRadius: 14,
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: `${severityColor}15`,
                      color: severityColor,
                      border: `1px solid ${severityColor}35`
                    }}>
                      {issue.severity || 'normal'}
                    </span>

                    <span style={{ fontSize: 11.5, color: '#64748B' }}>
                      {issue.category} • ID: {issue.id}
                    </span>

                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: isResolved ? 'rgba(16, 185, 129, 0.12)' : isInProgress ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: isResolved ? '#059669' : isInProgress ? '#D97706' : '#DC2626'
                    }}>
                      {issue.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                    {issue.title}
                  </h4>

                  <p style={{ fontSize: 13, color: '#334155', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                    {issue.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748B' }}>
                    <span>Reported by: <strong style={{ color: '#0F172A' }}>{issue.userName || issue.reportedBy}</strong></span>
                    <span>•</span>
                    <span>{issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : 'Today'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => updateIssueStatus(issue.id, 'resolved')}
                      style={{
                        padding: '7px 14px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: 8,
                        color: '#059669',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Resolve</span>
                    </button>
                  )}

                  {!isResolved && !isInProgress && (
                    <button
                      type="button"
                      onClick={() => updateIssueStatus(issue.id, 'in_progress')}
                      style={{
                        padding: '7px 14px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 8,
                        color: '#D97706',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      In Progress
                    </button>
                  )}

                  {isResolved && (
                    <button
                      type="button"
                      onClick={() => updateIssueStatus(issue.id, 'open')}
                      style={{
                        padding: '7px 14px',
                        background: 'rgba(241, 245, 249, 0.8)',
                        border: '1px solid rgba(203, 213, 225, 0.8)',
                        borderRadius: 8,
                        color: '#475569',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
