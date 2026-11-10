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
          <Calendar size={14} color="#38BDF8" />
          <span>{todayStr}</span>
        </div>

        {user?.isGuest && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 700,
              color: '#38BDF8'
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
        >
          <Bell size={18} />
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
          >
            <div className="user-avatar-circle">
              {user?.avatarInitials || 'AV'}
            </div>
            <div className="user-meta-text">
              <div className="user-name-title">{user?.name || 'User'}</div>
              <div className="user-role-sub">{user?.role || 'Freelance Planner'}</div>
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
                  width: 230,
                  maxWidth: 'calc(100vw - 24px)',
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(25px)',
                  WebkitBackdropFilter: 'blur(25px)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.65), 0 0 25px rgba(56, 189, 248, 0.12)',
                  padding: '8px 0',
                  zIndex: 200
                }}
              >
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{user?.email || ''}</div>
              </div>

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#94A3B8',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#F8FAFC';
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94A3B8';
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
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: 'none',
                    background: 'transparent',
                    color: '#38BDF8',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.14)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => {
                    navigate('/admin');
                    setProfileDropdownOpen(false);
                  }}
                >
                  <ShieldAlert size={15} color="#38BDF8" />
                  <span>Admin Console</span>
                </button>
              )}

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#94A3B8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#F8FAFC';
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94A3B8';
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

              <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#F87171',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
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
