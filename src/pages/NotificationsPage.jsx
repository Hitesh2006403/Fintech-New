import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Clock,
  Info,
  ArrowRight,
  Settings,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export function NotificationsPage() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    setActiveRoute,
    preferences,
    setPreferences
  } = useApp();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'critical'
  const [showConfig, setShowConfig] = useState(false);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'critical') return n.severity === 'critical';
    return true;
  });

  const handleNotificationClick = (notif) => {
    markNotificationRead(notif.id);
    if (notif.actionPage) {
      setActiveRoute(notif.actionPage);
    }
  };

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">
            Automated alerts for impending bills, projected balance shortfalls, and irregular income milestones.
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings size={15} />
            <span>Alert Preferences</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={markAllNotificationsRead}
            disabled={notifications.every(n => n.isRead)}
          >
            <CheckCheck size={15} />
            <span>Mark All Read</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ color: '#EF4444' }}
            onClick={clearNotifications}
            disabled={notifications.length === 0}
          >
            <Trash2 size={15} />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Config Drawer (Expandable) */}
      {showConfig && (
        <div className="card" style={{ marginBottom: 24, background: 'rgba(15, 23, 42, 0.75)', border: '1px solid var(--border-glass)' }}>
          <h3 className="card-title-h3" style={{ marginBottom: 14 }}>Notification Configuration</h3>
          
          <div className="form-grid-2">
            <div className="form-group-item">
              <label className="form-label-title">Low Balance Alert Threshold (₹ INR)</label>
              <input
                type="number"
                step="2500"
                className="form-input-control"
                value={preferences.lowBalanceAlertThreshold}
                onChange={(e) => setPreferences({ ...preferences, lowBalanceAlertThreshold: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>Triggers warning when projected balance falls below this number.</span>
            </div>

            <div className="form-group-item">
              <label className="form-label-title">Bill Due Reminder Lead Time</label>
              <select
                className="form-input-control"
                value={preferences.billReminderLeadDays}
                onChange={(e) => setPreferences({ ...preferences, billReminderLeadDays: Number(e.target.value) })}
              >
                <option value={1}>1 Day Before Due Date</option>
                <option value={3}>3 Days Before Due Date (Recommended)</option>
                <option value={7}>7 Days Before Due Date</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="filter-chips-row" style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(11, 18, 32, 0.8)', padding: 4, borderRadius: 10, border: '1px solid var(--border-glass)', maxWidth: '100%' }}>
        {[
          { id: 'all', label: `All Alerts (${notifications.length})` },
          { id: 'unread', label: `Unread (${notifications.filter(n => !n.isRead).length})` },
          { id: 'critical', label: `Critical Risk (${notifications.filter(n => n.severity === 'critical').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            style={{
              border: activeTab === tab.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(167, 139, 250, 0.25) 100%)' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 12.5,
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: activeTab === tab.id ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none'
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredNotifications.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>All Caught Up</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>No notifications in this filter category.</p>
          </div>
        ) : (
          filteredNotifications.map(notif => {
            const isCritical = notif.severity === 'critical';
            return (
              <div
                key={notif.id}
                className="card"
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  background: notif.isRead ? 'rgba(15, 23, 42, 0.55)' : 'rgba(23, 37, 84, 0.35)',
                  borderLeftWidth: 4,
                  borderLeftColor: isCritical ? '#EF4444' : 'var(--accent-primary)',
                  boxShadow: notif.isRead ? 'var(--shadow-sm)' : '0 8px 24px -4px rgba(56, 189, 248, 0.15)',
                  cursor: 'pointer'
                }}
                onClick={() => handleNotificationClick(notif)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      color: isCritical ? '#EF4444' : 'var(--accent-primary)',
                      border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {isCritical ? <AlertTriangle size={18} /> : <Bell size={18} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h4 style={{ fontSize: 14.5, fontWeight: notif.isRead ? 600 : 700, color: 'var(--text-primary)', margin: 0 }}>
                        {notif.title}
                      </h4>
                      {!notif.isRead && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 6px var(--accent-primary)' }} />
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.45 }}>
                      {notif.description}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {notif.date}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Resolve</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
