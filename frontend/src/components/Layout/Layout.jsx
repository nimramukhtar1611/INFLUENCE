// components/Layout/Layout.js - COMPLETE FIXED VERSION
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../Common/Loader';

const Layout = ({ userType: propUserType }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [currentUserType, setCurrentUserType] = useState(null);

// components/Layout/Layout.jsx - ADD THIS

useEffect(() => {
  console.log('📊 Layout State:', {
    userFromAuth: user,
    userFromStorage: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
    token: !!localStorage.getItem('token'),
    currentUserType
  });
}, [user, currentUserType]);

  useEffect(() => {
    // Determine user type from props, auth context, or URL path
    if (propUserType) {
      setCurrentUserType(propUserType);
    } else if (user?.userType) {
      setCurrentUserType(user.userType);
    } else {
      // Fallback to URL path
      const path = location.pathname;
      if (path.startsWith('/admin')) {
        setCurrentUserType('admin');
      } else if (path.startsWith('/brand')) {
        setCurrentUserType('brand');
      } else if (path.startsWith('/creator')) {
        setCurrentUserType('creator');
      }
    }
  }, [propUserType, user, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  // Debug log to check what user type is being used
  console.log('Layout - Current User Type:', currentUserType);
  console.log('Layout - User from auth:', user);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userType={currentUserType} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;