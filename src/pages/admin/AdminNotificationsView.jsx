import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
  Radio,
  Users,
  Trash2,
  Clock
} from 'lucide-react';

export function AdminNotificationsView() {
  const { broadcastAnnouncement, broadcastsList, deleteBroadcast, usersList } = useAdmin();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('info'); // 'info' | 'warning' | 'critical'
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const safeBroadcasts = Array.isArray(broadcastsList) ? broadcastsList : [];

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !description) return;

    setSending(true);
    setFeedback(null);

    try {
      const res = await broadcastAnnouncement({
        title,
        description,
        severity
      });
      setFeedback({
        type: 'success',
        message: `Announcement successfully broadcast to ${res?.deliveredCount || (Array.isArray(usersList) ? usersList.length : 0)} active users!`
      });
      setTitle('');
      setDescription('');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to broadcast announcement.'
      });
    } finally {
      setSending(false);
    }
  };

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'critical':
        return { color: '#DC2626', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', label: 'Critical Alert' };
      case 'warning':
        return { color: '#D97706', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', label: 'Important Notice' };
      default:
        return { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.3)', label: 'Informational' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title Header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
          Broadcast Platform Notifications
        </h2>
        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
          Send high-priority system announcements, tax alerts, or maintenance notices directly to all user dashboards.
        </p>
      </div>

      {feedback && (
        <div style={{
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
          borderRadius: 12,
          padding: '12px 16px',
          color: feedback.type === 'success' ? '#059669' : '#DC2626',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Broadcast Form Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 20,
        padding: '24px',
        boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05)'
      }}>
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
              Announcement Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled Maintenance Window • Q4 Tax Planning Alert"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#FFFFFF',
                border: '1px solid rgba(203, 213, 225, 0.8)',
                borderRadius: 8,
                color: '#0F172A',
                fontSize: 13.5,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
              Announcement Message
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete details for users..."
              rows={4}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#FFFFFF',
                border: '1px solid rgba(203, 213, 225, 0.8)',
                borderRadius: 8,
                color: '#0F172A',
                fontSize: 13.5,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
              Urgency / Severity Level
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { id: 'info', label: 'Informational', color: '#2563EB', activeBg: 'rgba(37, 99, 235, 0.12)' },
                { id: 'warning', label: 'Important Notice', color: '#D97706', activeBg: 'rgba(217, 119, 6, 0.12)' },
                { id: 'critical', label: 'Critical Alert', color: '#DC2626', activeBg: 'rgba(220, 38, 38, 0.12)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSeverity(opt.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `1px solid ${severity === opt.id ? opt.color : 'rgba(203, 213, 225, 0.8)'}`,
                    background: severity === opt.id ? opt.activeBg : 'rgba(241, 245, 249, 0.8)',
                    color: severity === opt.id ? opt.color : '#475569',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            style={{
              padding: '12px 20px',
              marginTop: 8,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              borderRadius: 10,
              color: '#FFFFFF',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 18px rgba(37, 99, 235, 0.25)',
              alignSelf: 'flex-start',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)'; }}
            onMouseLeave={(e) => { if (!sending) e.currentTarget.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'; }}
          >
            <Send size={16} />
            <span>{sending ? 'Broadcasting...' : 'Broadcast to All Users'}</span>
          </button>
        </form>
      </div>

      {/* Dispatched Broadcasts History */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 20,
        padding: '24px',
        boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={20} color="#4F46E5" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Broadcast History & Active Platform Notices
            </h3>
          </div>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
            {safeBroadcasts.length} Sent
          </span>
        </div>

        {safeBroadcasts.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>
            <Radio size={32} style={{ opacity: 0.35, margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>No Broadcast Notifications Sent Yet</div>
            <p style={{ fontSize: 12.5, color: '#64748B', maxWidth: 440, margin: '6px auto 0', lineHeight: 1.5 }}>
              Use the announcement form above to dispatch high-priority notifications, tax alerts, or system maintenance notices to all active users.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {safeBroadcasts.map((b) => {
              const style = getSeverityStyle(b.severity);
              return (
                <div
                  key={b.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: 12,
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`
                      }}>
                        {style.label}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                        {b.title}
                      </span>
                    </div>

                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                      {b.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11.5, color: '#94A3B8' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} />
                        {b.date || 'Today'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={13} />
                        Delivered to {b.deliveredCount || (Array.isArray(usersList) ? usersList.length : 0)} users
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteBroadcast(b.id)}
                    title="Dismiss / Delete Announcement"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 6,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'none'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
