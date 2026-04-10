// components/Layout/Sidebar.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Handshake,
  PlusCircle,
  BarChart3,
  Wallet,
  Settings,
  Bell,
  MessageSquare,
  Search,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  HelpCircle,
  FileText,
  Shield,
  Award,
  Briefcase,
  TrendingUp,
  Lightbulb,
  Star,
  Clock,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useSubscription } from '../../context/SubscriptionContext';

const normalizePlanId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value.planId === 'string') return value.planId.trim().toLowerCase();
  if (typeof value.id === 'string') return value.id.trim().toLowerCase();
  return '';
};

 const Sidebar = ({ userType: propUserType }) => {
  const { user, logout } = useAuth();
    const { theme, sidebarCollapsed, toggleSidebar } = useTheme();
    const { currentSubscription } = useSubscription();
    const isDark = theme === 'dark';
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('');
    const currentPlanId = normalizePlanId(currentSubscription?.planId || currentSubscription?.plan || currentSubscription);
    const canAccessGrowthOS = ['professional', 'enterprise'].includes(currentPlanId);

  // ==================== DETERMINE USER TYPE ====================
  const currentUserType = propUserType || user?.userType ||
    (location.pathname.startsWith('/admin') ? 'admin' :
      location.pathname.startsWith('/brand') ? 'brand' :
        location.pathname.startsWith('/creator') ? 'creator' : null);

  // ==================== NAVIGATION ITEMS ====================
  const getNavItems = () => {
    const commonItems = [
      { to: '/', icon: Home, label: 'Home', exact: true }
    ];

    const brandItems = [
      { to: '/brand/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/brand/campaigns', icon: Megaphone, label: 'Campaigns' },
      { to: '/brand/search', icon: Search, label: 'Find Creators' },
      { to: '/brand/deals', icon: Handshake, label: 'Deals' },
      { to: '/brand/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/brand/payments', icon: Wallet, label: 'Payments' },
      { to: '/brand/subscription', icon: DollarSign, label: 'Subscription' },
      { to: '/brand/inbox', icon: MessageSquare, label: 'Inbox' },
      { to: '/brand/notifications', icon: Bell, label: 'Notifications' },
      { to: '/brand/settings', icon: Settings, label: 'Settings' }

    ];
    const creatorItems = [
      { to: '/creator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/creator/available-deals', icon: Search, label: 'Find Deals' },
      { to: '/creator/deals', icon: Handshake, label: 'My Deals' },
      { to: '/creator/analytics', icon: BarChart3, label: 'Analytics' },
      ...(canAccessGrowthOS ? [{ to: '/creator/growth-os', icon: Lightbulb, label: 'Growth OS' }] : []),
      { to: '/creator/earnings', icon: Wallet, label: 'Earnings' },
      { to: '/creator/subscription', icon: DollarSign, label: 'Subscription' },
      { to: '/creator/inbox', icon: MessageSquare, label: 'Inbox' },
      { to: '/creator/notifications', icon: Bell, label: 'Notifications' },
      { to: '/creator/settings', icon: Settings, label: 'Settings' }
    ];

    const adminItems = [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/users', icon: Users, label: 'Users' },
      { to: '/admin/brands', icon: Award, label: 'Brands' },
      { to: '/admin/creators', icon: Star, label: 'Creators' },
      { to: '/admin/campaigns', icon: Megaphone, label: 'Campaigns' },
      { to: '/admin/deals', icon: Handshake, label: 'Deals' },
      { to: '/admin/payments', icon: Wallet, label: 'Payments' },
      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
      { to: '/admin/fraud-review', icon: Shield, label: 'Fraud Review' },
      { to: '/admin/disputes', icon: AlertCircle, label: 'Disputes' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' }
    ];

    if (currentUserType === 'brand') return [...commonItems, ...brandItems];
    if (currentUserType === 'creator') return [...commonItems, ...creatorItems];
    if (currentUserType === 'admin') return [...commonItems, ...adminItems];

    return commonItems;
  };

  const navItems = getNavItems();

  // ==================== UPDATE ACTIVE ITEM ====================
  useEffect(() => {
    const currentPath = location.pathname;
    const active = navItems.find(item =>
      item.exact ? item.to === currentPath : currentPath.startsWith(item.to)
    );
    setActiveItem(active?.to || '');
  }, [location.pathname, navItems]);

  // ==================== CHECK IF ACTIVE ====================
  const isActive = (to, exact = false) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  // ==================== GET ACTIVE STYLES ====================
  const getActiveStyles = (to, exact = false) => {
    const active = isActive(to, exact);
    return active
      ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md'
      : isDark
        ? 'text-gray-300 hover:bg-gray-800'
        : 'text-gray-700 hover:bg-gray-100';
  };

  
  // ==================== MOBILE SIDEBAR ====================
  if (isMobileOpen) {
    return (
      <>
        {/* Overlay */}
        <div
          className={`fixed inset-0 z-40 lg:hidden backdrop-blur-md ${
            theme === 'dark' 
              ? 'bg-black/20' 
              : 'bg-black/10'
          }`}
          onClick={() => setIsMobileOpen(false)}
        />

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 w-72 shadow-2xl z-50 lg:hidden overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`} 
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, #111827 0%, #1f2937 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRight: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
          }} 
        >
          <div className={`p-4 flex items-center justify-between border-b`} 
            style={{
              borderBottom: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
            }}
          >
            <div className="flex items-center gap-2">
              <div 
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                }}
              >
                <span className="text-white font-bold text-xs">IX</span>
              </div>
              <span style={{
                fontSize: 18, fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px'
              }}>InfluenceX</span>
            </div>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className={`p-2 rounded-lg transition-all duration-200`}
              style={{
                background: isDark ? '#374151' : '#f1f5f9',
                borderColor: isDark ? '#4b5563' : '#e2e8f0',
                border: '1px solid ' + (isDark ? '#4b5563' : '#e2e8f0'),
              }}
            >
              <X className="w-6 h-6" style={{ color: isDark ? '#f3f4f6' : '#374151' }} />
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                `}
                style={({ isActive }) => ({
                  background: isActive 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'transparent',
                  color: isActive ? '#ffffff' : (isDark ? '#d1d5db' : '#374151'),
                  border: isActive ? 'none' : `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
                })}
              >
                <item.icon className="w-5 h-5 mr-3 self-center" style={{ color: 'inherit' }} />
                <span style={{ fontWeight: 600, letterSpacing: '0.01em' }}>{item.label}</span>
              </NavLink>
            ))}

                      </nav>
        </div>
      </>
    );
  }

  // ==================== DESKTOP SIDEBAR ====================
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className={`fixed top-4 left-4 z-50 lg:hidden p-3 rounded-xl shadow-lg transition-all duration-200`}
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, #111827 0%, #1f2937 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderColor: isDark ? '#374151' : '#e2e8f0',
          border: '1px solid ' + (isDark ? '#374151' : '#e2e8f0'),
        }}
      >
        <Menu className="w-6 h-6" style={{ color: isDark ? '#f3f4f6' : '#374151' }} />
      </button>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:block transition-all duration-300 flex-shrink-0 fixed top-0 left-0 h-screen z-30
          ${isDark ? 'bg-gray-900 border-r border-gray-700' : 'bg-white border-r border-gray-200'}
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
        style={{
          background: isDark ? '#111827' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRight: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
        }}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Logo */}
          <div className={`p-6 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <div 
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                }}
              >
                <span className="text-white font-bold text-xs">IX</span>
              </div>
              {!sidebarCollapsed && (
                <span style={{
                  fontSize: 18, fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px'
                }}>
                  InfluenceX
                </span>
              )}
            </div>

            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-all duration-200 lg:block relative z-10 flex-shrink-0 ${
                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              style={{
                background: isDark ? '#374151' : '#f1f5f9',
                border: '1px solid ' + (isDark ? '#4b5563' : '#e2e8f0'),
              }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              ) : (
                <ChevronLeft className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group min-w-0
                  ${isActive 
                    ? 'shadow-lg' 
                    : isDark 
                      ? 'text-gray-300 hover:bg-gray-800' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
                style={({ isActive }) => ({
                  background: isActive 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'transparent',
                  color: isActive ? '#ffffff' : (isDark ? '#d1d5db' : '#374151'),
                  border: isActive ? 'none' : `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
                })}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${sidebarCollapsed ? 'mx-auto' : 'mr-3 self-center'}`} style={{
                  color: 'inherit'
                }} />
                {!sidebarCollapsed && (
                  <span className="truncate text-xs flex-1 min-w-0" style={{
                    fontWeight: 500,
                    letterSpacing: '0.01em'
                  }}>{item.label}</span>
                )}

                {/* Tooltip for collapsed mode */}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all duration-200 shadow-lg" 
                    style={{
                      backdropFilter: 'blur(8px)',
                      background: 'rgba(17, 24, 39, 0.95)',
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;