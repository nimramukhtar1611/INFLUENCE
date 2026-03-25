import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('Not authenticated, redirecting...');
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const isAdminPath = location.pathname.startsWith('/admin');
    return <Navigate to={isAdminPath ? '/admin/login' : '/login'} state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const userRole = user.userType || user.role;
    const hasAccess = allowedRoles.some(role => {
      if (role === 'admin') return userRole === 'admin' || userRole === 'super_admin';
      return role === userRole;
    });
    if (!hasAccess) {
      if (userRole === 'admin' || userRole === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
      if (userRole === 'brand') return <Navigate to="/brand/dashboard" replace />;
      if (userRole === 'creator') return <Navigate to="/creator/dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;