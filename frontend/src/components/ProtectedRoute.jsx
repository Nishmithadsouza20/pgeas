import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="pg-spinner">
        <div className="spinner-border text-warning" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:48 }}>🚫</div>
        <h4 style={{ color:'var(--accent)' }}>Access Denied</h4>
        <p style={{ color:'var(--text-muted)' }}>You don't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
