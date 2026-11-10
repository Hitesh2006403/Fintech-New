import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import {
  Menu,
  Bell,
  Plus,
  HelpCircle,
  Calendar,
  LogOut,
  Settings,
  RefreshCw,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationTracker } from '../../services/navigationTracker.js';

export function Header() {
  const {
    user,
    setMobileMenuOpen,
    setActiveRoute,
    unreadNotificationCount,
    setQuickAddModalOpen,
    refreshData,
    isSyncing,
    logout
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isSubpage = location.pathname !== '/dashboard' && location.pathname !== '/';

  const handleHeaderBack = () => {
    navigationTracker.goBack(navigate, '/dashboard');
  };

  const isAdminUser = Boolean(
    user?.isAdmin ||
    user?.role === 'Super Administrator' ||
    ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((user?.email || '').toLowerCase().trim())
  );

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="app-header">
      {/* Left: Responsive Back Button (on subpages), Mobile Toggle & Date Indicator */}
      <div className="header-left-col">
        {isSubpage && (
          <button
            type="button"
            className="header-back-btn"
            onClick={handleHeaderBack}
            aria-label="Back to previous page"
            title="Back to previous page"
            id="header-back-button"
          >
            <ArrowLeft size={16} />
            <span className="header-back-btn-text">Back</span>
          </button>
        )}

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open sidebar menu"
        >
          <Menu size={22} />
        </button>

        <div className="header-date-badge">
          <Calendar size={14} color="#059669" />
          <span>{todayStr}</span>
        </div>

        {user?.isGuest && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(5, 150, 105, 0.12)',
              border: '1px solid rgba(5, 150, 105, 0.28)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 700,
              color: '#059669',
              boxShadow: '2px 2px 5px rgba(163, 177, 198, 0.25)'
            }}
          >
            <span>Guest Demo Mode</span>
          </div>
        )}
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="header-actions-col">
        {/* Quick Add Button */}
        <button
          type="button"
          className="btn-quick-add"
          onClick={() => setQuickAddModalOpen(true)}
          title="Add Record"
          aria-label="Add Record"
        >
          <Plus size={16} />
          <span className="btn-quick-add-text">Add Record</span>
        </button>

        {/* Notifications Button */}
        <button
          type="button"
          className="btn-header-action"
          onClick={() => navigate('/notifications')}
          title="Notifications"
          aria-label="Notifications"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            color: '#0F172A',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
          }}
        >
          <Bell size={18} color="#0F172A" />
          {unreadNotificationCount > 0 && (
            <span className="header-notification-badge" />
          )}
        </button>

        {/* User Profile & Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="user-profile-btn"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            aria-label="Open user profile menu"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              color: '#0F172A',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
            }}
          >
            <div className="user-avatar-circle">
              {user?.avatarInitials || 'AV'}
            </div>
            <div className="user-meta-text">
              <div className="user-name-title" style={{ color: '#0F172A', fontWeight: 700 }}>
                {user?.name || (user?.isGuest ? 'Guest Explorer' : 'User')}
              </div>
              <div className="user-role-sub" style={{ color: '#475569', fontWeight: 600 }}>
                {user?.role || (user?.isGuest ? 'Demo Plan' : 'Freelance Planner')}
              </div>
            </div>
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 190 }}
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div
                className="profile-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '115%',
                  right: 0,
                  width: 240,
                  maxWidth: 'calc(100vw - 24px)',
                  background: 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: 16,
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  boxShadow: '0 16px 36px -8px rgba(15, 23, 42, 0.15)',
                  padding: '8px 0',
                  zIndex: 200
                }}
              >
              <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: 500 }}>{user?.email || ''}</div>
              </div>

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#059669';
                  e.currentTarget.style.background = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#334155';
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  navigate('/settings');
                  setProfileDropdownOpen(false);
                }}
              >
                <Settings size={15} />
                <span>Settings & Preferences</span>
              </button>

              {isAdminUser && (
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: 'none',
                    background: 'transparent',
                    color: '#2563EB',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => {
                    navigate('/admin');
                    setProfileDropdownOpen(false);
                  }}
                >
                  <ShieldAlert size={15} color="#2563EB" />
                  <span>Admin Console</span>
                </button>
              )}

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#059669';
                  e.currentTarget.style.background = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#334155';
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={async () => {
                  setProfileDropdownOpen(false);
                  await refreshData();
                }}
              >
                <RefreshCw size={15} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isSyncing ? 'Syncing Server Data...' : 'Sync Live Data'}</span>
              </button>

              <div style={{ height: 1, background: 'rgba(226, 232, 240, 0.9)', margin: '4px 0' }} />

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#EF4444',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  logout();
                  setProfileDropdownOpen(false);
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </header>
  );
}
