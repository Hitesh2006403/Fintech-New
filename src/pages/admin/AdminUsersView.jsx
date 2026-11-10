import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import {
  Users,
  Search,
  Filter,
  Ban,
  CheckCircle,
  Eye,
  Trash2,
  UserPlus,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';

export function AdminUsersView() {
  const { usersList, toggleUserStatus, deleteUser } = useAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'blocked'
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Safe users list
  const safeUsersList = Array.isArray(usersList) ? usersList : [];

  // Filtered users
  const filteredUsers = safeUsersList.filter(user => {
    const matchesSearch =
      user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user?.status?.toLowerCase() === 'active') ||
      (statusFilter === 'blocked' && user?.status?.toLowerCase() === 'blocked');

    return matchesSearch && matchesStatus;
  });

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
            User Management
          </h2>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            Manage platform members, adjust access permissions, and monitor activity.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(79, 70, 229, 0.08)',
          border: '1px solid rgba(79, 70, 229, 0.2)',
          padding: '6px 14px',
          borderRadius: 10,
          color: '#4338CA',
          fontSize: 12.5,
          fontWeight: 700
        }}>
          <Users size={16} />
          <span>{safeUsersList.length} Total Registered Users</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 14,
        padding: '14px 18px',
        boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} color="#64748B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email address, or ID..."
            style={{
              width: '100%',
              padding: '9px 14px 9px 40px',
              background: '#FFFFFF',
              border: '1px solid rgba(203, 213, 225, 0.8)',
              borderRadius: 8,
              color: '#0F172A',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['all', 'active', 'blocked'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: statusFilter === st ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(226, 232, 240, 0.8)',
                background: statusFilter === st ? 'rgba(79, 70, 229, 0.12)' : 'rgba(241, 245, 249, 0.8)',
                color: statusFilter === st ? '#4338CA' : '#475569',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 20,
        padding: '20px',
        boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.9)', background: 'rgba(241, 245, 249, 0.6)' }}>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>User</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Identifier</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Status</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Platform Role</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Registered</th>
                <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: 14 }}>
                    No users matching criteria "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isBlocked = u.status === 'Blocked' || u.status === 'blocked';
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(241, 245, 249, 0.9)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#4338CA',
                            fontWeight: 700,
                            fontSize: 13
                          }}>
                            {u.avatarInitials || (u.name ? u.name.slice(0, 2).toUpperCase() : 'U')}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{u.name}</div>
                            <div style={{ fontSize: 12, color: '#64748B' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px', fontSize: 13, color: '#475569', fontWeight: 600, fontFamily: 'monospace' }}>
                        {u.id}
                      </td>

                      <td style={{ padding: '14px' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: isBlocked ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: isBlocked ? '#DC2626' : '#059669',
                          border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`
                        }}>
                          {u.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px', fontSize: 13, color: '#334155' }}>
                        {u.role || 'Treasury Planner'}
                      </td>

                      <td style={{ padding: '14px', fontSize: 12.5, color: '#64748B' }}>
                        {u.joinedOn || '18 Oct 2025'}
                      </td>

                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            type="button"
                            title="View Profile"
                            onClick={() => setSelectedUser(u)}
                            style={{
                              background: 'rgba(241, 245, 249, 0.8)',
                              border: '1px solid rgba(203, 213, 225, 0.8)',
                              color: '#334155',
                              borderRadius: 6,
                              padding: 6,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = 'rgba(203, 213, 225, 0.8)'; }}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            title={isBlocked ? 'Unblock Account' : 'Block Account'}
                            onClick={() => toggleUserStatus(u, isBlocked ? 'Unblocked by admin' : 'Administrative block')}
                            style={{
                              background: isBlocked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              border: `1px solid ${isBlocked ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                              color: isBlocked ? '#059669' : '#DC2626',
                              borderRadius: 6,
                              padding: 6,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Ban size={14} />
                          </button>

                          <button
                            type="button"
                            title="Purge User"
                            onClick={() => setConfirmDelete(u)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#DC2626',
                              borderRadius: 6,
                              padding: 6,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: 20,
            padding: 28,
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
              User Overview
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div><span style={{ color: '#64748B' }}>Identifier:</span> <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{selectedUser.id}</strong></div>
              <div><span style={{ color: '#64748B' }}>Full Name:</span> <strong style={{ color: '#0F172A' }}>{selectedUser.name}</strong></div>
              <div><span style={{ color: '#64748B' }}>Email:</span> <strong style={{ color: '#2563EB' }}>{selectedUser.email}</strong></div>
              <div><span style={{ color: '#64748B' }}>Role:</span> <strong style={{ color: '#0F172A' }}>{selectedUser.role}</strong></div>
              <div><span style={{ color: '#64748B' }}>Auth Provider:</span> <strong style={{ color: '#4338CA' }}>{selectedUser.authProvider || 'google'}</strong></div>
              <div><span style={{ color: '#64748B' }}>Status:</span> <strong style={{ color: selectedUser.status === 'Blocked' ? '#DC2626' : '#059669' }}>{selectedUser.status}</strong></div>
              <div><span style={{ color: '#64748B' }}>Joined:</span> <strong style={{ color: '#0F172A' }}>{selectedUser.joinedOn}</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{
                  padding: '9px 20px',
                  background: '#0F172A',
                  border: 'none',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1E293B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#0F172A'; }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 20,
            padding: 28,
            maxWidth: 420,
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#DC2626', margin: '0 0 12px 0' }}>
              Confirm Account Purge
            </h3>
            <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to permanently delete the account for <strong style={{ color: '#0F172A' }}>{confirmDelete.name}</strong> ({confirmDelete.email})? This action cannot be reversed.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '9px 16px',
                  background: 'rgba(241, 245, 249, 0.8)',
                  border: '1px solid rgba(203, 213, 225, 0.8)',
                  borderRadius: 10,
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteUser(confirmDelete.rawId || confirmDelete.id);
                  setConfirmDelete(null);
                }}
                style={{
                  padding: '9px 18px',
                  background: '#EF4444',
                  border: 'none',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
