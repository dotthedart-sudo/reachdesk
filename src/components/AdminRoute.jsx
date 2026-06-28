import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ profile, children }) {
  const isAdmin = profile?.role === 'admin' || profile?.email === 'dotthedart@gmail.com';
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
