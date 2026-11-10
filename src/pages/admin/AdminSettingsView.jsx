import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import {
  Settings,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Mail,
  KeyRound
} from 'lucide-react';

export function AdminSettingsView() {
  const { settings, updateSettings } = useAdmin();

  const [platformName, setPlatformName] = useState(settings?.platformName || 'FinSight Treasury Platform');
  const [maintenanceMode, setMaintenanceMode] = useState(Boolean(settings?.maintenanceMode));
  const [allowRegistrations, setAllowRegistrations] = useState(settings?.allowRegistrations ?? true);
  const [adminEmails, setAdminEmails] = useState(settings?.authorizedAdminEmails || []);
  const [newEmail, setNewEmail] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAddEmail = () => {
    if (!newEmail || !newEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }
    const clean = newEmail.trim().toLowerCase();
    if (adminEmails.includes(clean)) {
      setErrorMsg('This email address is already in the authorized administrator whitelist.');
      return;
    }
    setAdminEmails(prev => [...prev, clean]);
    setNewEmail('');
    setErrorMsg(null);
  };

  const handleRemoveEmail = (targetEmail) => {
    if (adminEmails.length <= 1) {
      setErrorMsg('At least one authorized administrator email must remain in the whitelist.');
      return;
    }
    setAdminEmails(prev => prev.filter(e => e !== targetEmail));
    setErrorMsg(null);
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        platformName,
        maintenanceMode,
        allowRegistrations,
        authorizedAdminEmails: adminEmails
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMsg('Failed to update platform settings.');
    }
  };

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
            Platform & Security Settings
          </h2>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            Configure authorized administrator Google emails, system maintenance, and platform policies.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            borderRadius: 10,
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.25)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'; }}
        >
          <Save size={15} />
          <span>Save Changes</span>
        </button>
      </div>

      {saveSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 12,
          padding: '12px 16px',
          color: '#059669',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <CheckCircle2 size={18} />
          <span>Platform settings and admin whitelist saved successfully!</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 12,
          padding: '12px 16px',
          color: '#DC2626',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Authorized Admin Google Whitelist Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderTop: '2px solid #2563EB',
        borderRadius: 20,
        padding: '24px',
        boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <KeyRound size={20} color="#2563EB" />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Authorized Administrator Google Whitelist
          </h3>
        </div>
        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 18px 0', lineHeight: 1.5 }}>
          Enforce strict Google OAuth security: Only accounts matching this whitelist can sign into the Admin Panel. Any other user attempting to login will be rejected with an access-denied policy.
        </p>

        {/* Existing Whitelist List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {adminEmails.map((email, idx) => (
            <div
              key={email}
              className="admin-whitelist-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0, wordBreak: 'break-all' }}>
                <Mail size={16} color="#2563EB" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: '#0F172A', fontWeight: 600 }}>{email}</span>
                {idx === 0 && (
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: '#1D4ED8',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    padding: '2px 7px',
                    borderRadius: 4
                  }}>
                    Primary Owner
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleRemoveEmail(email)}
                title="Remove from whitelist"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 4
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new email input */}
        <div className="admin-whitelist-add-group">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Add new admin email (e.g. yourname@gmail.com)..."
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#FFFFFF',
              border: '1px solid rgba(203, 213, 225, 0.8)',
              borderRadius: 8,
              color: '#0F172A',
              fontSize: 13,
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleAddEmail}
            style={{
              padding: '10px 18px',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              borderRadius: 8,
              color: '#1D4ED8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.16)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'; }}
          >
            <Plus size={15} />
            <span>Add to Whitelist</span>
          </button>
        </div>
      </div>

      {/* 2. Platform Toggles */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 20,
        padding: '24px',
        boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05)'
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
          Platform Availability & Controls
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Maintenance Mode Toggle */}
          <div className="admin-toggle-row">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Maintenance Mode</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Temporarily pause user access while server upgrades run.</div>
            </div>

            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              style={{
                background: 'none',
                border: 'none',
                color: maintenanceMode ? '#DC2626' : '#059669',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700
              }}
            >
              {maintenanceMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              <span>{maintenanceMode ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>

          {/* User Registration Toggle */}
          <div className="admin-toggle-row">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Allow New Registrations</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Allow prospective users to register accounts via Google SSO or email.</div>
            </div>

            <button
              type="button"
              onClick={() => setAllowRegistrations(!allowRegistrations)}
              style={{
                background: 'none',
                border: 'none',
                color: allowRegistrations ? '#059669' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700
              }}
            >
              {allowRegistrations ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              <span>{allowRegistrations ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
