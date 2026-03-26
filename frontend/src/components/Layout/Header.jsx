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
  Star
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  // ==================== GET USER PROFILE LINK ====================
  const getProfileLink = () => {
    if (!user) return '/';
    switch(user.userType) {
      case 'brand': return '/brand/profile';
      case 'creator': return '/creator/profile';
      case 'admin': return '/admin/settings';
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
      case 'campaign': return 'bg-indigo-100 text-indigo-600';
      case 'reminder': return 'bg-yellow-100 text-yellow-600';
      case 'alert': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        {/* Left Section - Logo & Search */}
        <div className="flex items-center flex-1 max-w-2xl">
          {/* Mobile Menu Button (hidden on desktop) */}
          <button className="lg:hidden mr-4 p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Search Bar */}
          <div className="relative flex-1" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search campaigns, creators, deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowResults(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-96 overflow-y-auto z-50">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                  >
                    {result.type === 'creator' && (
                      <>
                        {result.image ? (
                          <img src={result.image} alt={result.name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{result.name}</p>
                          <p className="text-xs text-gray-500">{result.handle}</p>
                        </div>
                        <span className="text-xs text-gray-400">{result.followers} followers</span>
                      </>
                    )}
                    
                    {result.type === 'campaign' && (
                      <>
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{result.title}</p>
                          <p className="text-xs text-gray-500">Budget: ${result.budget}</p>
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
                          <p className="text-sm font-medium text-gray-900">{result.name}</p>
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
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Messages */}
          {isMessagingUser ? (
            <Link
              to={messageRoute}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-gray-600" />
              {messageUnread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {messageUnread > 9 ? '9+' : messageUnread}
                </span>
              )}
            </Link>
          ) : null}

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <Link
                    to={notificationsRoute}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
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
                        className="block px-4 py-3 hover:bg-gray-50"
                        onClick={() => setShowNotifications(false)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${getNotificationColor(notif.type)}`}>
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 pl-2 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-1"
            >
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700">{user?.fullName || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.userType || 'Guest'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  to={getDashboardLink()}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </div>
                </Link>
                
                <Link
                  to={getProfileLink()}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    Profile
                  </div>
                </Link>
                
                <Link
                  to={settingsRoute}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </div>
                </Link>
                
                
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;