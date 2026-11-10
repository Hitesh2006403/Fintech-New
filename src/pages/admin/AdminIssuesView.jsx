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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 4px 0' }}>
            Feedback & Reported Issues
          </h2>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            Track client concerns, authentication queries, and platform feature requests.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '6px 14px',
          borderRadius: 10,
          color: '#F87171',
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
            placeholder="Search tickets by keyword, category, or user..."
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['all', 'open', 'in_progress', 'resolved'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: 'none',
                background: filterStatus === st ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: filterStatus === st ? '#818CF8' : '#94A3B8',
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
            background: 'rgba(14, 21, 34, 0.78)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
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
              issue.severity === 'medium' ? '#F59E0B' : '#818CF8';

            return (
              <div
                key={issue.id}
                style={{
                  background: 'rgba(14, 21, 34, 0.78)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderLeft: `4px solid ${severityColor}`,
                  borderRadius: 14,
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
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
                      background: `${severityColor}22`,
                      color: severityColor,
                      border: `1px solid ${severityColor}44`
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
                      background: isResolved ? 'rgba(16, 185, 129, 0.15)' : isInProgress ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isResolved ? '#34D399' : isInProgress ? '#FBBF24' : '#F87171'
                    }}>
                      {issue.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', margin: '0 0 6px 0' }}>
                    {issue.title}
                  </h4>

                  <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                    {issue.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#64748B' }}>
                    <span>Reported by: <strong style={{ color: '#F8FAFC' }}>{issue.userName || issue.reportedBy}</strong></span>
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
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: 8,
                        color: '#34D399',
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
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: 8,
                        color: '#FBBF24',
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
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 8,
                        color: '#94A3B8',
                        fontSize: 12,
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
