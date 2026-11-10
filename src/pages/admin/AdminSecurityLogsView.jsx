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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
            Security Audit Trail
          </h2>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            Immutable logs of administrative operations, Google SSO handshakes, and access security.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '6px 14px',
          borderRadius: 10,
          color: '#059669',
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
            placeholder="Search logs by actor, IP address, event or keyword..."
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
          {['all', 'info', 'warning', 'critical'].map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: severityFilter === sev ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(226, 232, 240, 0.8)',
                background: severityFilter === sev ? 'rgba(79, 70, 229, 0.12)' : 'rgba(241, 245, 249, 0.8)',
                color: severityFilter === sev ? '#4338CA' : '#475569',
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
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 20,
        padding: '20px',
        boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.9)', background: 'rgba(241, 245, 249, 0.6)' }}>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Timestamp</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Event</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Details</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Actor</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>IP Address</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Severity</th>
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
                        borderBottom: '1px solid rgba(241, 245, 249, 0.9)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() + ' ' + new Date(log.timestamp).toLocaleDateString() : 'Just now'}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {log.event}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#334155', maxWidth: 360 }}>
                        {log.details}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#2563EB', fontWeight: 600 }}>
                        {log.actor}
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>
                        {log.ip}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: isCritical ? 'rgba(239, 68, 68, 0.12)' : isWarning ? 'rgba(245, 158, 11, 0.12)' : 'rgba(37, 99, 235, 0.1)',
                          color: isCritical ? '#DC2626' : isWarning ? '#D97706' : '#1D4ED8',
                          border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.25)' : isWarning ? 'rgba(245, 158, 11, 0.25)' : 'rgba(37, 99, 235, 0.2)'}`
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
