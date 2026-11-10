import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { AdminBackground3D } from '../../components/admin/AdminBackground3D.jsx';
import { AdminDashboardView } from './AdminDashboardView.jsx';
import { AdminUsersView } from './AdminUsersView.jsx';
import { AdminTransactionsView } from './AdminTransactionsView.jsx';
import { AdminReportsView } from './AdminReportsView.jsx';
import { AdminIssuesView } from './AdminIssuesView.jsx';
import { AdminSecurityLogsView } from './AdminSecurityLogsView.jsx';
import { AdminSettingsView } from './AdminSettingsView.jsx';
import { AdminNotificationsView } from './AdminNotificationsView.jsx';
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  BarChart2,
  MessageSquare,
  ShieldAlert,
  Settings,
  Bell,
  Search,
  LogOut,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Star,
  ArrowLeft,
  X,
  Menu,
  ShieldCheck
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function AdminLayout({ onReturnToClient }) {
  const {
    adminUser,
    adminActiveTab,
    setAdminActiveTab,
    logoutAdmin,
    usersList,
    issues,
    globalSearch,
    setGlobalSearch,
    searchResults,
    refreshAdminData,
    isRefreshing,
    notificationCount
  } = useAdmin();

  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = React.useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'admin') {
      return parts[1];
    }
    return 'dashboard';
  }, [location.pathname]);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  const safeIssues = Array.isArray(issues) ? issues : [];
  const safeUsers = Array.isArray(usersList) ? usersList : [];
  const openIssuesCount = safeIssues.filter(i => i?.status !== 'resolved').length || 5;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
    { id: 'users', label: 'Users', icon: Users, badge: safeUsers.length || 24, badgeColor: '#10B981', section: 'management' },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, section: 'management' },
    { id: 'reports', label: 'Reports', icon: BarChart2, section: 'management' },
    { id: 'issues', label: 'Feedback & Issues', icon: MessageSquare, badge: openIssuesCount, badgeColor: '#EF4444', section: 'management' },
    { id: 'security', label: 'Security Logs', icon: ShieldAlert, section: 'management' },
    { id: 'settings', label: 'App Settings', icon: Settings, section: 'settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell, section: 'settings' }
  ];

  const handleNavClick = (tabId) => {
    if (tabId === 'dashboard') {
      navigate('/admin');
    } else {
      navigate(`/admin/${tabId}`);
    }
    setAdminActiveTab(tabId);
    setMobileSidebarOpen(false);
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <AdminDashboardView
            onViewAllUsers={() => { navigate('/admin/users'); setAdminActiveTab('users'); }}
            onViewAllIssues={() => { navigate('/admin/issues'); setAdminActiveTab('issues'); }}
            onViewAllLogs={() => { navigate('/admin/security'); setAdminActiveTab('security'); }}
          />
        );
      case 'users':
        return <AdminUsersView />;
      case 'transactions':
        return <AdminTransactionsView />;
      case 'reports':
        return <AdminReportsView />;
      case 'issues':
        return <AdminIssuesView />;
      case 'security':
        return <AdminSecurityLogsView />;
      case 'settings':
        return <AdminSettingsView />;
      case 'notifications':
        return <AdminNotificationsView />;
      default:
        return <AdminDashboardView />;
    }
  };

  return (
    <div
      className="admin-portal-root"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#090D14',
        color: '#F8FAFC',
        position: 'relative',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* Calm, Simplified 3D Atmospheric Background */}
      <AdminBackground3D />

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 1. Left Sidebar Navigation */}
      <aside className={`admin-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div style={{
          padding: '20px 20px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Sovereign Indigo Brand Icon */}
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(129, 140, 248, 0.12) 100%)',
            border: '1px solid rgba(129, 140, 248, 0.35)',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818CF8'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <div>
            <div style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 0.5,
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>FinSight</span>
              <span style={{
                fontSize: 9.5,
                fontWeight: 800,
                color: '#818CF8',
                background: 'rgba(99, 102, 241, 0.14)',
                border: '1px solid rgba(99, 102, 241, 0.28)',
                padding: '2px 6px',
                borderRadius: 4
              }}>
                PRO
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
              Admin Portal
            </div>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-close-btn admin-sidebar-close"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close admin menu"
        >
          <X size={20} />
        </button>
      </div>

        {/* Nav Items List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          {/* Section: Main */}
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              borderRadius: 10,
              border: 'none',
              background: currentTab === 'dashboard'
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(79, 70, 229, 0.1) 100%)'
                : 'transparent',
              color: currentTab === 'dashboard' ? '#FFFFFF' : '#94A3B8',
              boxShadow: currentTab === 'dashboard' ? '0 2px 10px rgba(99, 102, 241, 0.15)' : 'none',
              borderLeft: currentTab === 'dashboard' ? '3px solid #6366F1' : '3px solid transparent',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutDashboard size={18} color={currentTab === 'dashboard' ? '#818CF8' : '#94A3B8'} />
            <span>Dashboard</span>
          </button>

          {/* Section Label: MANAGEMENT */}
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            padding: '18px 12px 6px'
          }}>
            Management
          </div>

          {navItems.filter(i => i.section === 'management').map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(79, 70, 229, 0.1) 100%)'
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
                  boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.15)' : 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={17} color={isActive ? '#818CF8' : '#94A3B8'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 99,
                    background: `${item.badgeColor || '#6366F1'}22`,
                    color: item.badgeColor || '#818CF8',
                    border: `1px solid ${item.badgeColor || '#6366F1'}44`
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Section Label: SETTINGS */}
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            padding: '18px 12px 6px'
          }}>
            Settings
          </div>

          {navItems.filter(i => i.section === 'settings').map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(79, 70, 229, 0.1) 100%)'
                    : 'transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
                  boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.15)' : 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={17} color={isActive ? '#818CF8' : '#94A3B8'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Promo Obsidian Slate Card ("Better Financial Future for Everyone") */}
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.85) 0%, rgba(10, 15, 25, 0.95) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.22)',
            borderRadius: 14,
            padding: '16px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(99, 102, 241, 0.16)',
              color: '#818CF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10
            }}>
              <Star size={16} fill="#818CF8" />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
              Better Financial Future for Everyone
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              Manage. Monitor. Secure.
            </div>
          </div>
        </div>

        {/* Bottom Actions: Return to client app */}
        <div style={{
          padding: '12px 14px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={() => {
              if (onReturnToClient) onReturnToClient();
              else navigate('/dashboard');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 0,
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
          >
            <ArrowLeft size={14} />
            <span>User Portal</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await logoutAdmin();
              navigate('/login', { replace: true });
            }}
            title="Sign out of Admin Session"
            style={{
              background: 'none',
              border: 'none',
              color: '#F87171',
              cursor: 'pointer',
              padding: 4,
              transition: 'opacity 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* 2. Main Work Area */}
      <div className="admin-main-container">
        {/* Top Header */}
        <header className="admin-top-nav">
          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="mobile-menu-toggle admin-mobile-toggle"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open admin menu"
          >
            <Menu size={22} />
          </button>

          {/* Global Search Bar */}
          <div style={{ position: 'relative', width: 380, maxWidth: '100%' }}>
            <Search size={16} color="#64748B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search users, transactions, or issues..."
              style={{
                width: '100%',
                padding: '9px 14px 9px 40px',
                background: 'rgba(14, 21, 34, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: 10,
                color: '#F8FAFC',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.09)'; }}
            />

            {/* Live Search Results Popup */}
            {searchResults && searchResults.totalCount > 0 && (
              <div style={{
                position: 'absolute',
                top: '115%',
                left: 0,
                right: 0,
                background: 'rgba(14, 21, 34, 0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 12,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
                padding: '12px',
                zIndex: 200
              }}>
                {searchResults.users.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', marginBottom: 6 }}>Users</div>
                    {searchResults.users.map(u => (
                      <div
                        key={u.id}
                        onClick={() => { navigate('/admin/users'); setAdminActiveTab('users'); setGlobalSearch(''); }}
                        style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: '#F8FAFC' }}
                      >
                        {u.name} • <span style={{ color: '#94A3B8' }}>{u.email}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.transactions.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC', marginBottom: 6 }}>Transactions</div>
                    {searchResults.transactions.map(t => (
                      <div
                        key={t.id}
                        onClick={() => { navigate('/admin/transactions'); setAdminActiveTab('transactions'); setGlobalSearch(''); }}
                        style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: '#F8FAFC' }}
                      >
                        {t.title} • <span style={{ color: '#34D399' }}>₹{t.amount}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.issues.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#F87171', marginBottom: 6 }}>Issues</div>
                    {searchResults.issues.map(i => (
                      <div
                        key={i.id}
                        onClick={() => { navigate('/admin/issues'); setAdminActiveTab('issues'); setGlobalSearch(''); }}
                        style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: '#F8FAFC' }}
                      >
                        {i.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions, Notifications Bell & Admin Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Sync live data button */}
            <button
              type="button"
              onClick={refreshAdminData}
              title="Refresh metrics from server"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '8px 10px',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
            >
              <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            {/* Notification Bell with Badge */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  color: '#F8FAFC',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
              >
                <Bell size={18} />
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 800,
                  width: 17,
                  height: 17,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                }}>
                  {notificationCount}
                </span>
              </button>

              {notificationDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '125%',
                  right: 0,
                  width: 300,
                  background: 'rgba(14, 21, 34, 0.98)',
                  backdropFilter: 'blur(25px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  boxShadow: '0 20px 45px rgba(0,0,0,0.7)',
                  padding: '12px 0',
                  zIndex: 200
                }}>
                  <div style={{ padding: '4px 16px 8px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    Admin Notifications
                  </div>
                  {[
                    { text: 'Google SSO auth policy synchronized', time: '10m ago' },
                    { text: 'High severity issue reported by user', time: '12m ago' },
                    { text: 'Daily database backup verified', time: '1h ago' }
                  ].map((n, idx) => (
                    <div key={idx} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', fontSize: 12 }}>
                      <div style={{ color: '#F8FAFC', fontWeight: 600 }}>{n.text}</div>
                      <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{n.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {/* Admin Avatar Circle */}
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #818CF8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 14,
                  border: '2px solid rgba(255, 255, 255, 0.18)'
                }}>
                  {adminUser?.picture ? (
                    <img
                      src={adminUser.picture}
                      alt="Admin"
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    adminUser?.avatarInitials || 'AD'
                  )}
                </div>

                <div className="admin-user-meta-text" style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                    {adminUser?.name || 'Admin'}
                  </div>
                  <div style={{ fontSize: 11, color: '#818CF8', fontWeight: 600 }}>
                    Super Administrator
                  </div>
                </div>

                <ChevronDown size={14} color="#94A3B8" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                  style={{
                    position: 'absolute',
                    top: '125%',
                    right: 0,
                    width: 240,
                    background: 'rgba(14, 21, 34, 0.98)',
                    backdropFilter: 'blur(25px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 12,
                    boxShadow: '0 20px 45px rgba(0,0,0,0.7)',
                    padding: '8px 0',
                    zIndex: 200
                  }}
                >
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>{adminUser?.name || 'Admin'}</div>
                    <div style={{ fontSize: 11.5, color: '#818CF8', marginTop: 2 }}>{adminUser?.email || 'admin@finsight.internal'}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { navigate('/admin/settings'); setProfileDropdownOpen(false); }}
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
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
                  >
                    <Settings size={15} />
                    <span>App Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onReturnToClient) onReturnToClient();
                      else navigate('/dashboard');
                      setProfileDropdownOpen(false);
                    }}
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
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
                  >
                    <ExternalLink size={15} />
                    <span>Switch to User Portal</span>
                  </button>

                  <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

                  <button
                    type="button"
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      await logoutAdmin();
                      navigate('/login', { replace: true });
                    }}
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
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#F87171'; }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main style={{ padding: '28px', flex: 1 }}>
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
