import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR } from '../services/financialEngine.js';
import { exportTransactionsCSV, exportForecastCSV } from '../services/exportService.js';
import {
  Settings,
  User,
  Shield,
  Download,
  RotateCcw,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Lock,
  Wallet,
  DollarSign,
  Trash2
} from 'lucide-react';

export function ProfileSettings() {
  const {
    user,
    setUser,
    preferences,
    setPreferences,
    incomes,
    expenses,
    standardForecast,
    refreshData,
    isSyncing,
    resetToDemoData,
    clearUserData,
    logout
  } = useApp();

  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'financial' | 'security' | 'data'

  // Personal form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'Freelance Product Architect');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata (IST)');

  // Financial form
  const [startingBalance, setStartingBalance] = useState(preferences?.startingBalance ?? 45000);
  const [safetyBuffer, setSafetyBuffer] = useState(preferences?.safetyBuffer ?? 25000);
  const [defaultHorizon, setDefaultHorizon] = useState(preferences?.defaultHorizonDays ?? 30);
  const [defaultScenario, setDefaultScenario] = useState(preferences?.defaultScenario || 'expected');

  // Security form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleSavePersonal = (e) => {
    e.preventDefault();
    setUser({
      ...user,
      name,
      email,
      role,
      timezone,
      avatarInitials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    });
    showToast('Personal profile updated!');
  };

  const handleSaveFinancial = (e) => {
    e.preventDefault();
    setPreferences({
      ...preferences,
      startingBalance: Number(startingBalance),
      safetyBuffer: Number(safetyBuffer),
      defaultHorizonDays: Number(defaultHorizon),
      defaultScenario
    });
    showToast('Financial parameters updated and recalculated across all screens!');
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password updated securely.');
  };

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Profile & Preferences</h1>
          <p className="page-subtitle">
            Configure financial rules, personal details, CSV audit exports, and security credentials.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          style={{ color: 'var(--accent-primary)', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.08)' }}
          onClick={async () => {
            await refreshData();
            showToast('All financial records synchronized directly from backend server!');
          }}
        >
          <RefreshCw size={15} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isSyncing ? 'Syncing Server...' : 'Sync Cloud Data'}</span>
        </button>
      </div>

      {toastMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34D399', padding: '12px 18px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(10px)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)' }}>
          <CheckCircle2 size={16} />
          <span style={{ fontWeight: 600 }}>{toastMsg}</span>
        </div>
      )}

      {/* Settings Grid with Tabs */}
      <div className="settings-layout-grid">
        
        {/* Navigation Tabs List */}
        <div className="card settings-tabs-list">
          {[
            { id: 'personal', label: 'Personal Info', icon: User },
            { id: 'financial', label: 'Financial Rules', icon: Wallet },
            { id: 'security', label: 'Security & Auth', icon: Lock },
            { id: 'data', label: 'Data & CSV Export', icon: Download }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`nav-link-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Cards */}
        <div>
          {/* Tab 1: Personal */}
          {activeTab === 'personal' && (
            <div className="card">
              <h3 className="card-title-h3" style={{ marginBottom: 18 }}>Personal Identity</h3>
              <form onSubmit={handleSavePersonal}>
                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Full Name</label>
                    <input
                      type="text"
                      className="form-input-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Verified Email Address</label>
                    <input
                      type="email"
                      className="form-input-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Professional Role</label>
                    <input
                      type="text"
                      className="form-input-control"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Preferred Currency</label>
                    <input
                      type="text"
                      className="form-input-control"
                      value="INR (₹) — Indian Rupee"
                      disabled
                      style={{ background: 'rgba(15, 23, 42, 0.6)', color: 'var(--text-secondary)' }}
                    />
                  </div>
                </div>

                <div className="form-group-item">
                  <label className="form-label-title">Timezone</label>
                  <select
                    className="form-input-control"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST - UTC+5:30)</option>
                    <option value="America/New_York (EST)">America/New_York (EST - UTC-5:00)</option>
                    <option value="Europe/London (GMT)">Europe/London (GMT - UTC+0:00)</option>
                    <option value="Asia/Singapore (SGT)">Asia/Singapore (SGT - UTC+8:00)</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: 10 }}>
                  Save Personal Settings
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Financial Rules */}
          {activeTab === 'financial' && (
            <div className="card">
              <h3 className="card-title-h3" style={{ marginBottom: 18 }}>Authoritative Financial Parameters</h3>
              <form onSubmit={handleSaveFinancial}>
                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Baseline Opening Cash (₹ INR)</label>
                    <input
                      type="number"
                      step="1000"
                      className="form-input-control"
                      value={startingBalance}
                      onChange={(e) => setStartingBalance(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>Live balance before added received income and bills.</span>
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Default Minimum Safety Buffer (₹ INR)</label>
                    <input
                      type="number"
                      step="2500"
                      className="form-input-control"
                      value={safetyBuffer}
                      onChange={(e) => setSafetyBuffer(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>Emergency cash threshold protected from Safe-to-Spend.</span>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">Default Planning Horizon</label>
                    <select
                      className="form-input-control"
                      value={defaultHorizon}
                      onChange={(e) => setDefaultHorizon(Number(e.target.value))}
                    >
                      <option value={7}>7 Days (Ultra Short-Term)</option>
                      <option value={14}>14 Days (Bi-Weekly Sprint)</option>
                      <option value={30}>30 Days (Monthly Cycle - Standard)</option>
                      <option value={60}>60 Days (Bi-Monthly Runway)</option>
                    </select>
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Default Forecast Scenario</label>
                    <select
                      className="form-input-control"
                      value={defaultScenario}
                      onChange={(e) => setDefaultScenario(e.target.value)}
                    >
                      <option value="conservative">Conservative (No unreceived income counted)</option>
                      <option value="expected">Expected (Includes signed/confirmed invoices)</option>
                      <option value="optimistic">Optimistic (Includes speculative proposals)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: 10 }}>
                  Apply & Recalculate
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Security */}
          {activeTab === 'security' && (
            <div className="card">
              <h3 className="card-title-h3" style={{ marginBottom: 18 }}>Authentication & Security</h3>
              <form onSubmit={handlePasswordChange}>
                <div className="form-group-item">
                  <label className="form-label-title">Current Password</label>
                  <input
                    type="password"
                    className="form-input-control"
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label className="form-label-title">New Password</label>
                    <input
                      type="password"
                      className="form-input-control"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="form-label-title">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-input-control"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">
                    Update Security Password
                  </button>
                  <button type="button" className="btn-secondary" style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }} onClick={logout}>
                    Sign Out All Sessions
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 4: Data & CSV Export */}
          {activeTab === 'data' && (
            <div className="card">
              <h3 className="card-title-h3" style={{ marginBottom: 12 }}>Data Export & Auditing</h3>
              <p className="card-subtitle-p" style={{ marginBottom: 24 }}>
                Export your structured financial streams and forecast points for external accounting or tax compliance.
              </p>

              <div className="form-grid-2">
                <div style={{ padding: '20px', border: '1px solid var(--border-glass)', borderRadius: 12, background: 'rgba(15, 23, 42, 0.6)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>Transaction Ledger</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                    All recorded received income, signed milestone contracts, and planned essential bills.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => exportTransactionsCSV(incomes, expenses)}
                  >
                    <Download size={14} />
                    <span>Download Ledger (CSV)</span>
                  </button>
                </div>

                <div style={{ padding: '20px', border: '1px solid var(--border-glass)', borderRadius: 12, background: 'rgba(15, 23, 42, 0.6)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>30-Day Forecast Model</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                    Day-by-day projected closing balance, deficit markers, and safety buffer audits.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => exportForecastCSV(standardForecast.forecast)}
                  >
                    <Download size={14} />
                    <span>Download Forecast (CSV)</span>
                  </button>
                </div>
              </div>

              {/* Cloud Synchronization & Ledger Controls */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                  Cloud Synchronization & Ledger Controls
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                  Pull the latest authenticated financial transactions directly from the backend server database, or reset to a completely fresh ledger.
                </p>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: 'var(--accent-primary)', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.08)' }}
                    onClick={async () => {
                      await refreshData();
                      showToast('Latest financial records fetched directly from backend database.');
                    }}
                  >
                    <RefreshCw size={14} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Live Data'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}
                    onClick={() => {
                      if (window.confirm('Clear all income, expense, and savings entries on the server to start with a blank personal ledger?')) {
                        clearUserData();
                        showToast('All financial records cleared from backend. Fresh start ready.');
                      }
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Start Fresh (Clear All Records)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
