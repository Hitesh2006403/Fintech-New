import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Background3D } from '../components/common/Background3D.jsx';
import { Compass, Home, LogIn, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { checkIsAdmin } from '../App.jsx';
import { navigationTracker } from '../services/navigationTracker.js';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useApp();

  const isAuthenticated = Boolean(user && user.isAuthenticated);
  const isAdmin = checkIsAdmin(user);
  const fallbackRoute = isAuthenticated ? (isAdmin ? '/admin' : '/dashboard') : '/login';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0B1220',
      position: 'relative',
      padding: '24px',
      overflow: 'hidden',
      color: '#F8FAFC',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <Background3D />

      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 500,
        width: '100%',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderTop: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: 20,
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(56, 189, 248, 0.15)'
      }}>
        {/* Glow Icon */}
        <div style={{
          width: 64,
          height: 64,
          margin: '0 auto 20px',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.25) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)'
        }}>
          <Compass size={32} color="#38BDF8" />
        </div>

        {/* 404 Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          color: '#38BDF8',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1,
          padding: '4px 12px',
          borderRadius: 20,
          marginBottom: 16
        }}>
          HTTP 404 • ROUTE UNRESOLVED
        </div>

        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          margin: '0 0 10px 0',
          letterSpacing: -0.5,
          color: '#F8FAFC'
        }}>
          Page Not Found
        </h1>

        <p style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: '#94A3B8',
          margin: '0 0 28px 0'
        }}>
          The financial treasury destination or deep link you entered does not exist or has been relocated.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(fallbackRoute)}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 12,
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              {isAdmin ? <ShieldAlert size={16} /> : <Home size={16} />}
              <span>{isAdmin ? 'Return to Admin Portal' : 'Return to User Dashboard'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 12,
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              <LogIn size={16} />
              <span>Return to Login</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigationTracker.goBack(navigate, fallbackRoute)}
            style={{
              width: '100%',
              padding: '11px 18px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#94A3B8',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F8FAFC';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94A3B8';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
