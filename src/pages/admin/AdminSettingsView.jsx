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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '0 0 4px 0' }}>
            Platform & Security Settings
          </h2>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
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
            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
            border: '1px solid rgba(129, 140, 248, 0.3)',
            borderRadius: 10,
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'; }}
        >
          <Save size={15} />
          <span>Save Changes</span>
        </button>
      </div>

      {saveSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 12,
          padding: '12px 16px',
          color: '#34D399',
          fontSize: 13,
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
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 12,
          padding: '12px 16px',
          color: '#FCA5A5',
          fontSize: 13,
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
        background: 'rgba(14, 21, 34, 0.78)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderTop: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: 16,
        padding: '24px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <KeyRound size={20} color="#818CF8" />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
            Authorized Administrator Google Whitelist
          </h3>
        </div>
        <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 18px 0', lineHeight: 1.5 }}>
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
                <Mail size={16} color="#818CF8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, color: '#F8FAFC', fontWeight: 600 }}>{email}</span>
                {idx === 0 && (
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818CF8',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
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
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
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
              background: 'rgba(10, 15, 25, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 8,
              color: '#F8FAFC',
              fontSize: 13,
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleAddEmail}
            style={{
              padding: '10px 18px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(129, 140, 248, 0.35)',
              borderRadius: 8,
              color: '#818CF8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)'; e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'; e.currentTarget.style.color = '#818CF8'; }}
          >
            <Plus size={15} />
            <span>Add to Whitelist</span>
          </button>
        </div>
      </div>

      {/* 2. Platform Toggles */}
      <div style={{
        background: 'rgba(14, 21, 34, 0.78)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: 16,
        padding: '24px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC', margin: '0 0 16px 0' }}>
          Platform Availability & Controls
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Maintenance Mode Toggle */}
          <div className="admin-toggle-row">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>Maintenance Mode</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Temporarily pause user access while server upgrades run.</div>
            </div>

            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              style={{
                background: 'none',
                border: 'none',
                color: maintenanceMode ? '#EF4444' : '#10B981',
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
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>Allow New Registrations</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Allow prospective users to register accounts via Google SSO or email.</div>
            </div>

            <button
              type="button"
              onClick={() => setAllowRegistrations(!allowRegistrations)}
              style={{
                background: 'none',
                border: 'none',
                color: allowRegistrations ? '#10B981' : '#64748B',
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
