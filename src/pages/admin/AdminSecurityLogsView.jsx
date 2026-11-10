import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Search,
  Filter,
  AlertTriangle,
  Globe,
  Clock,
  UserCheck
} from 'lucide-react';

export function AdminSecurityLogsView() {
  const { securityLogs } = useAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const safeLogs = Array.isArray(securityLogs) ? securityLogs : [];

  const filteredLogs = safeLogs.filter(log => {
    const matchesSeverity = severityFilter === 'all' || log?.severity === severityFilter;
    const matchesSearch =
      log?.event?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log?.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log?.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log?.ip?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSeverity && matchesSearch;
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
            Security Audit Trail
          </h2>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            Immutable logs of administrative operations, Google SSO handshakes, and access security.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '6px 14px',
          borderRadius: 10,
          color: '#34D399',
          fontSize: 12.5,
          fontWeight: 700
        }}>
          <ShieldCheck size={16} />
          <span>Active Audit Sentinel</span>
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
            placeholder="Search logs by actor, IP address, event or keyword..."
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
          {['all', 'info', 'warning', 'critical'].map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: 'none',
                background: severityFilter === sev ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: severityFilter === sev ? '#818CF8' : '#94A3B8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Security Logs Table */}
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
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Timestamp</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Event</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Details</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Actor</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>IP Address</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
                    No security events recorded matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isCritical = log.severity === 'critical';
                  const isWarning = log.severity === 'warning';

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.04)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() + ' ' + new Date(log.timestamp).toLocaleDateString() : 'Just now'}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                        {log.event}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#94A3B8', maxWidth: 360 }}>
                        {log.details}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#818CF8', fontWeight: 600 }}>
                        {log.actor}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                        {log.ip}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: isCritical ? 'rgba(239, 68, 68, 0.15)' : isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: isCritical ? '#F87171' : isWarning ? '#FBBF24' : '#818CF8',
                          border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.3)' : isWarning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                        }}>
                          {log.severity || 'info'}
                        </span>
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
