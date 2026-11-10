import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Plus,
  Menu
} from 'lucide-react';

export function MobileBottomNav() {
  const {
    setActiveRoute,
    setMobileMenuOpen,
    setQuickAddModalOpen,
    unreadNotificationCount
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path, id) => {
    navigate(path);
    if (setActiveRoute) setActiveRoute(id);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {/* 1. Dashboard / Overview */}
      <button
        type="button"
        className={`mobile-nav-item ${location.pathname === '/dashboard' || location.pathname === '/' ? 'active' : ''}`}
        onClick={() => handleNav('/dashboard', 'dashboard')}
      >
        <div className="mobile-nav-icon-wrap">
          <LayoutDashboard size={20} />
        </div>
        <span className="mobile-nav-label">Overview</span>
      </button>

      {/* 2. Income Management */}
      <button
        type="button"
        className={`mobile-nav-item ${location.pathname === '/income' ? 'active' : ''}`}
        onClick={() => handleNav('/income', 'income')}
      >
        <div className="mobile-nav-icon-wrap">
          <TrendingUp size={20} />
        </div>
        <span className="mobile-nav-label">Income</span>
      </button>

      {/* 3. Center Quick Add Elevated Button */}
      <div className="mobile-nav-center-action">
        <button
          type="button"
          className="mobile-center-add-btn"
          onClick={() => setQuickAddModalOpen(true)}
          aria-label="Add transaction"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* 4. Bills / Expenses */}
      <button
        type="button"
        className={`mobile-nav-item ${location.pathname === '/expenses' || location.pathname === '/transactions' ? 'active' : ''}`}
        onClick={() => handleNav('/expenses', 'expenses')}
      >
        <div className="mobile-nav-icon-wrap">
          <Receipt size={20} />
        </div>
        <span className="mobile-nav-label">Bills</span>
      </button>

      {/* 5. Safe-to-Spend */}
      <button
        type="button"
        className={`mobile-nav-item ${location.pathname === '/safe-to-spend' ? 'active' : ''}`}
        onClick={() => handleNav('/safe-to-spend', 'safe-to-spend')}
      >
        <div className="mobile-nav-icon-wrap">
          <ShieldCheck size={20} />
        </div>
        <span className="mobile-nav-label">Safe Spend</span>
      </button>

      {/* 6. More / Drawer Menu */}
      <button
        type="button"
        className="mobile-nav-item mobile-nav-more"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu drawer"
      >
        <div className="mobile-nav-icon-wrap">
          <Menu size={20} />
          {unreadNotificationCount > 0 && (
            <span className="mobile-nav-badge-dot" />
          )}
        </div>
        <span className="mobile-nav-label">More</span>
      </button>
    </nav>
  );
}
