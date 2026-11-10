import React from 'react';
import { AdminProvider, useAdmin } from '../../context/AdminContext.jsx';
import { AdminLayout } from './AdminLayout.jsx';
import { AdminBackground3D } from '../../components/admin/AdminBackground3D.jsx';
import { Navigate, useNavigate } from 'react-router-dom';
import '../../styles/adminTheme.css';

function AdminPortalInner({ onReturnToClient }) {
  const { isAdminAuthenticated, adminLoading } = useAdmin();
  const navigate = useNavigate();

  if (adminLoading) {
    return (
      <div className="admin-portal-root" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090D14',
        position: 'relative'
      }}>
        <AdminBackground3D />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{
            width: 44,
            height: 44,
            border: '3px solid rgba(99, 102, 241, 0.25)',
            borderTopColor: '#6366F1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)'
          }} />
          <div style={{ fontSize: 13.5, color: '#94A3B8', fontWeight: 600 }}>
            Verifying Administrator Credentials &amp; Session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminLayout
      onReturnToClient={() => {
        if (onReturnToClient) onReturnToClient();
        else navigate('/dashboard');
      }}
    />
  );
}

export function AdminPortal({ onReturnToClient }) {
  return (
    <AdminProvider>
      <AdminPortalInner onReturnToClient={onReturnToClient} />
    </AdminProvider>
  );
}

