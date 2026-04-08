// components/Layout/Header.js - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  User,
  ChevronDown,
  Search,
  Menu,
  X,
  Settings,
  LogOut,
  HelpCircle,
  Moon,
  Sun,
  UserCircle,
  Award,
  Briefcase,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  Star,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { unreadCount: messageUnread } = useSocket();
  const navigate = useNavigate();
  const isMessagingUser = ['brand', 'creator'].includes(user?.userType);
  const notificationsRoute = user?.userType === 'brand'
    ? '/brand/notifications'
    : user?.userType === 'creator'
      ? '/creator/notifications'
      : '/admin/notifications';
  const messageRoute = user?.userType === 'brand' ? '/brand/inbox' : '/creator/inbox';
  const settingsRoute = user?.userType === 'admin' ? '/admin/settings' : user?.userType === 'brand' ? '/brand/settings' : '/creator/settings';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // ==================== CLOSE ON CLICK OUTSIDE ====================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==================== FETCH NOTIFICATIONS ====================
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications', {
          params: { limit: 5, read: false }
        });
        if (response.data?.success) {
          setNotifications(response.data.notifications || []);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    if (isMessagingUser) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [isMessagingUser]);

  // ==================== HANDLE SEARCH ====================
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await api.get('/search/suggestions', {
        params: { q: searchQuery }
      });
      
      if (response.data?.success) {
        setSearchResults(response.data.suggestions || []);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== HANDLE SEARCH ITEM CLICK ====================
  const handleResultClick = (result) => {
    setShowResults(false);
    setSearchQuery('');
    
    if (result.type === 'creator') {
      navigate(`/brand/creators/${result.id}`);
    } else if (result.type === 'campaign') {
      navigate(`/brand/campaigns/${result.id}`);
    } else if (result.type === 'brand') {
      navigate(`/creator/brands/${result.id}`);
    }
  };

  // ==================== GET USER DASHBOARD LINK ====================
  const getDashboardLink = () => {
    if (!user) return '/';
    switch(user.userType) {
      case 'brand': return '/brand/dashboard';
      case 'creator': return '/creator/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/';
    }
  };

  // ==================== GET NOTIFICATION ICON ====================
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'deal': return <DollarSign className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'payment': return <DollarSign className="w-4 h-4" />;
      case 'campaign': return <Briefcase className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'alert': return <AlertCircle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  // ==================== GET NOTIFICATION COLOR ====================
  const getNotificationColor = (type) => {
    switch(type) {
      case 'deal': return 'bg-green-100 text-green-600';
      case 'message': return 'bg-blue-100 text-blue-600';
      case 'payment': return 'bg-purple-100 text-purple-600';
      case 'campaign': return 'bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 text-[#667eea]';
      case 'reminder': return 'bg-yellow-100 text-yellow-600';
      case 'alert': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <header 
      className={`px-4 sm:px-6 py-3 transition-all duration-200`}
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, #111827 0%, #1f2937 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderBottom: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
        boxShadow: isDark 
          ? '0 1px 3px rgba(0, 0, 0, 0.3)'
          : '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Logo & Search */}
        <div className="flex items-center flex-1 max-w-2xl gap-2 sm:gap-4">
          {/* Mobile Menu Button (hidden on desktop) */}
          <button className={`lg:hidden p-1 rounded-md transition-colors shrink-0 flex items-center justify-center ${
            isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
          }`}>
            <Menu className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-0" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Search campaigns, creators, deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className={`w-full pl-12 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent transition-all duration-200`}
                style={{
                  background: isDark ? '#374151' : '#f8fafc',
                  color: isDark ? '#f3f4f6' : '#111827',
                  borderColor: isDark ? '#4b5563' : '#e2e8f0',
                  fontSize: '14px',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowResults(false);
                  }}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                    isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl border py-2 max-h-96 overflow-y-auto z-50`} 
                style={{
                  background: isDark ? '#1f2937' : '#ffffff',
                  borderColor: isDark ? '#374151' : '#e2e8f0',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleResultClick(result)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all duration-200`}
                    style={{
                      background: 'transparent',
                      color: isDark ? '#f3f4f6' : '#111827',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = isDark ? '#374151' : '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                    }}
                  >
                    {result.type === 'creator' && (
                      <>
                        {result.image ? (
                          <img src={result.image} alt={result.name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-[#667eea]" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium  ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{result.name}</p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{result.handle}</p>
                        </div>
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{result.followers} followers</span>
                      </>
                    )}
                    
                    {result.type === 'campaign' && (
                      <>
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{result.title}</p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Budget: ${result.budget}</p>
                        </div>
                      </>
                    )}
                    
                    {result.type === 'brand' && (
                      <>
                        {result.image ? (
                          <img src={result.image} alt={result.name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Award className="w-4 h-4 text-purple-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{result.name}</p>
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Icons & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl transition-all duration-200 border ml-2 sm:ml-4`}
            style={{
              background: isDark ? '#374151' : '#f8fafc',
              borderColor: isDark ? '#4b5563' : '#e2e8f0',
              color: isDark ? '#f3f4f6' : '#374151',
            }}
            title={theme === 'light' ? 'Theme: Light (switch to dark)' : 'Theme: Dark (switch to light)'}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" style={{ color: '#667eea' }} />
            ) : (
              <Sun className="w-5 h-5" style={{ color: '#fbbf24' }} />
            )}
          </button>

          {/* Messages */}
          {isMessagingUser && (
            <Link
              to={messageRoute}
              className={`relative p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center`}
              style={{
                background: isDark ? '#374151' : '#f8fafc',
                borderColor: isDark ? '#4b5563' : '#e2e8f0',
                border: '1px solid ' + (isDark ? '#4b5563' : '#e2e8f0'),
                color: isDark ? '#f3f4f6' : '#374151',
              }}
            >
              <MessageSquare className="w-5 h-5" />
              {messageUnread > 0 && (
                <span 
                  className="absolute top-1 right-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  {messageUnread > 9 ? '9+' : messageUnread}
                </span>
              )}
            </Link>
          )}

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center`}
              style={{
                background: isDark ? '#374151' : '#f8fafc',
                borderColor: isDark ? '#4b5563' : '#e2e8f0',
                border: '1px solid ' + (isDark ? '#4b5563' : '#e2e8f0'),
                color: isDark ? '#f3f4f6' : '#374151',
              }}
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span 
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                ></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl border py-2 z-50`} 
                style={{
                  background: isDark ? '#1f2937' : '#ffffff',
                  borderColor: isDark ? '#374151' : '#e2e8f0',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className={`px-4 py-2 border-b flex justify-between items-center ${
                  isDark ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Notifications</h3>
                  <Link
                    to={notificationsRoute}
                    className={`text-xs hover:underline ${
                      isDark ? 'text-[#667eea] hover:text-[#667eea]/80' : 'text-[#667eea] hover:text-[#667eea]/800'
                    }`}
                    onClick={() => setShowNotifications(false)}
                  >
                    View All
                  </Link>
                </div>

                {notifications.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notif) => (
                      <Link
                        key={notif._id}
                        to={notif.data?.url || '#'}
                        className={`block px-4 py-3 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                        onClick={() => setShowNotifications(false)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${getNotificationColor(notif.type)}`}>
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{notif.title}</p>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{notif.message}</p>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-[#667eea] rounded-full"></span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Bell className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <div className="flex items-center gap-3">
              {/* User Profile Section */}
              <button
                type="button"
                onClick={() => {
                  navigate(settingsRoute);
                  setShowUserMenu(false);
                }}
                className={`flex items-center gap-3 rounded-xl p-2 transition-all duration-200 ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                style={{
                  background: isDark ? 'transparent' : '#f8fafc',
                  border: '1px solid ' + (isDark ? '#4b5563' : '#e2e8f0'),
                }}
              >
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-full flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-[#667eea]" />
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-700'}`}>{user?.fullName || 'User'}</p>
                  <p className={`text-xs capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.userType || 'Guest'}</p>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className={`p-2.5 rounded-xl transition-all duration-200`}
                style={{
                  background: isDark ? '#374151' : '#fef2f2',
                  borderColor: isDark ? '#4b5563' : '#fecaca',
                  border: '1px solid ' + (isDark ? '#4b5563' : '#fecaca'),
                  color: isDark ? '#f87171' : '#dc2626',
                }}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;