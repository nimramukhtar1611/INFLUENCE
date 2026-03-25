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

 const Sidebar = ({ userType: propUserType }) => {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useTheme();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('');

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
      { to: '/brand/inbox', icon: MessageSquare, label: 'Inbox' },
      { to: '/brand/notifications', icon: Bell, label: 'Notifications' },
      { to: '/brand/team', icon: Users, label: 'Team' },
      { to: '/brand/settings', icon: Settings, label: 'Settings' }

    ];
    const creatorItems = [
      { to: '/creator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/creator/available-deals', icon: Search, label: 'Find Deals' },
      { to: '/creator/deals', icon: Handshake, label: 'My Deals' },
      { to: '/creator/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/creator/earnings', icon: Wallet, label: 'Earnings' },
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
      ? 'bg-indigo-600 text-white shadow-md'
      : 'text-gray-700 hover:bg-gray-100';
  };

  // ==================== HANDLE LOGOUT ====================
  const handleLogout = async () => {
    await logout();
  };

  // ==================== MOBILE SIDEBAR ====================
  if (isMobileOpen) {
    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />

        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 lg:hidden overflow-y-auto">
          <div className="p-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IX</span>
              </div>
              <span className="text-lg font-bold text-gray-900">InfluenceX</span>
            </div>
            <button onClick={() => setIsMobileOpen(false)}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </NavLink>
            ))}

            <div className="pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
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
        className="fixed top-4 left-4 z-30 lg:hidden bg-white p-2 rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:block bg-white border-r border-gray-200 transition-all duration-300
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className={`p-6 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">IX</span>
              </div>
              {!sidebarCollapsed && (
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  InfluenceX
                </span>
              )}
            </div>

            <button
              onClick={toggleSidebar}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group
                  ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}
                `}
                title={sidebarCollapsed ? item.label : ''}
              >
                <item.icon className={`w-5 h-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!sidebarCollapsed && item.label}

                {/* Tooltip for collapsed mode */}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200">
            {sidebarCollapsed ? (
              <button
                onClick={handleLogout}
                className="w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
                title="Logout"
              >
                <LogOut className="w-5 h-5 mx-auto" />
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                  Logout
                </span>
              </button>
            ) : (
              <div className="space-y-3">

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;