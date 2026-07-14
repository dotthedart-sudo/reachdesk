import React from 'react';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { PendingScreen, DeniedScreen } from './Paywalls';

export default function ProtectedRoute({ session, profile, subStatus, loading, handleLogout, children }) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f0e17',
        color: '#fffffe',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#2e2f3e',
          padding: '2.5rem',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          border: '1px solid #3e4059'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#ff8906', fontSize: '1.5rem' }}>Profile Not Found</h3>
          <p style={{ color: '#a7a9be', marginBottom: '2rem', lineHeight: '1.5' }}>
            There was an issue loading your user profile. Please log out and try again.
          </p>
          <button 
            onClick={handleLogout} 
            style={{
              backgroundColor: '#ff8906',
              color: '#fffffe',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              width: '100%'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#f27b00'}
            onMouseLeave={e => e.target.style.backgroundColor = '#ff8906'}
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  if (profile?.account_locked) {
    return children;
  }

  if (subStatus === 'denied') {
    return <DeniedScreen handleLogout={handleLogout} />;
  }

  if (subStatus === 'pending') {
    return <PendingScreen profile={profile} handleLogout={handleLogout} />;
  }

  if (subStatus === 'trial_expired' || subStatus === 'subscription_expired') {
    return <Navigate to="/upgrade" replace />;
  }

  return children;
}

export function UpgradeRoute({ session, profile, subStatus, loading, handleLogout, children }) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f0e17',
        color: '#fffffe',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#2e2f3e',
          padding: '2.5rem',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          border: '1px solid #3e4059'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#ff8906', fontSize: '1.5rem' }}>Profile Not Found</h3>
          <p style={{ color: '#a7a9be', marginBottom: '2rem', lineHeight: '1.5' }}>
            There was an issue loading your user profile. Please log out and try again.
          </p>
          <button 
            onClick={handleLogout} 
            style={{
              backgroundColor: '#ff8906',
              color: '#fffffe',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              width: '100%'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#f27b00'}
            onMouseLeave={e => e.target.style.backgroundColor = '#ff8906'}
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  if (profile?.account_locked) {
    return children; // let locked/expired users reach /upgrade to complete checkout
  }

  if (subStatus === 'denied') {
    return <DeniedScreen handleLogout={handleLogout} />;
  }

  if (subStatus === 'pending') {
    return <PendingScreen profile={profile} handleLogout={handleLogout} />;
  }

  return children;
}
