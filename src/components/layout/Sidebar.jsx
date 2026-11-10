import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  ShieldCheck,
  LineChart,
  Sliders,
  ArrowDownUp,
  PiggyBank,
  Bell,
  Settings,
  X,
  ShieldAlert
} from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';

export function Sidebar() {
  const {
    activeRoute,
    setActiveRoute,
    mobileMenuOpen,
    setMobileMenuOpen,
    unreadNotificationCount,
    user
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const isAdminUser = Boolean(
    user?.isAdmin ||
    user?.role === 'Super Administrator' ||
    ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'].includes((user?.email || '').toLowerCase().trim())
  );

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'income', path: '/income', label: 'Income', icon: TrendingUp },
    { id: 'expenses', path: '/expenses', label: 'Expenses & Bills', icon: Receipt },
    { id: 'safe-to-spend', path: '/safe-to-spend', label: 'Safe-to-Spend', icon: ShieldCheck },
    { id: 'forecast', path: '/forecast', label: 'Cash-Flow Forecast', icon: LineChart },
    { id: 'simulator', path: '/simulator', label: 'Delay Simulator', icon: Sliders, badge: 'Key Feature' },
    { id: 'prioritization', path: '/prioritization', label: 'Bill Prioritization', icon: ArrowDownUp },
    { id: 'savings', path: '/savings', label: 'Lean-Week Savings', icon: PiggyBank },
    { id: 'notifications', path: '/notifications', label: 'Notifications', icon: Bell, count: unreadNotificationCount },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (item) => {
    navigate(item.path);
    if (setActiveRoute) setActiveRoute(item.id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-wrapper">
          <div className="sidebar-logo">
            <div className="logo-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div>
              <div className="logo-text-title">FinSight</div>
              <div className="logo-text-sub">Uncertain Income Planner</div>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar menu"
          >
            <X size={20} />
          </button>
        </div>

      {/* Nav List */}
      <div className="sidebar-nav-container">
        <div className="sidebar-section-label">Core Planning</div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.id === 'dashboard' && location.pathname === '/') ||
            (item.id === 'expenses' && location.pathname === '/transactions');

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-link-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <Icon size={18} />
              <span>{item.label}</span>

              {item.badge && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  fontWeight: 700,
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38BDF8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 7px',
                  borderRadius: 10,
                  boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)'
                }}>
                  {item.badge}
                </span>
              )}

              {item.count > 0 && (
                <span className="nav-badge-pill">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="environment-status-pill">
          <span className="env-label">Mode: Live Treasury</span>
          <span className="env-status-dot"></span>
        </div>
        {isAdminUser && (
          <button
            type="button"
            onClick={() => {
              navigate('/admin');
              setMobileMenuOpen(false);
            }}
            style={{
              marginTop: 10,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 12px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 8,
              color: '#A5B4FC',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>Admin Console</span>
          </button>
        )}
      </div>
    </aside>
  </>
);
}
