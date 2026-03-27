import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  X,
  MessageSquare,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  MoreVertical,
  Loader,
  RefreshCw,
  Mail,
  Star,
  Award,
  TrendingUp,
  Briefcase,
  Heart,
  Share2,
  Eye,
  ThumbsUp,
  Flag
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../UI/Button';
import { timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [invitationActionId, setInvitationActionId] = useState(null);

  const fetchNotifications = async (reset = false) => {
    try {
      if (reset) {
        setRefreshing(true);
        setPage(1);
      } else if (page > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await api.get('/notifications', {
        params: {
          page: reset ? 1 : page,
          limit: 20,
          read: filter === 'unread' ? false : undefined
        }
      });

      if (response.data?.success) {
        const newNotifications = response.data.notifications || [];
        
        if (reset || page === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setUnreadCount(response.data.unreadCount || 0);
        setHasMore(newNotifications.length === 20);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
      
      toast.success(notification.message, {
        icon: getNotificationIcon(notification.type),
        duration: 5000
      });
    };

    const handleNotificationRead = ({ notificationId }) => {
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    };

    const handleNotificationDeleted = ({ notificationId }) => {
      const deleted = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);
    socket.on('notifications:all-read', handleAllRead);
    socket.on('notification:deleted', handleNotificationDeleted);

    return () => {
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notifications:all-read');
      socket.off('notification:deleted');
    };
  }, [socket]);

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'deal': return '💰';
      case 'message': return '💬';
      case 'payment': return '💵';
      case 'campaign': return '📢';
      case 'reminder': return '⏰';
      case 'alert': return '⚠️';
      case 'team': return '👥';
      default: return '🔔';
    }
  };

  const getIconComponent = (type) => {
    switch(type) {
      case 'deal': return DollarSign;
      case 'message': return MessageSquare;
      case 'payment': return DollarSign;
      case 'campaign': return Users;
      case 'reminder': return Clock;
      case 'alert': return AlertCircle;
      case 'team': return Users;
      case 'system': return Bell;
      default: return Bell;
    }
  };

  const getIconColor = (type) => {
    switch(type) {
      case 'deal': return 'text-green-600 bg-green-100';
      case 'message': return 'text-blue-600 bg-blue-100';
      case 'payment': return 'text-purple-600 bg-purple-100';
      case 'campaign': return 'text-indigo-600 bg-indigo-100';
      case 'reminder': return 'text-yellow-600 bg-yellow-100';
      case 'alert': return 'text-red-600 bg-red-100';
      case 'team': return 'text-cyan-700 bg-cyan-100';
      case 'system': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleInvitationResponse = async (notification, action) => {
    if (!notification?.data?.token || !user?._id) {
      toast.error('Invitation data is missing');
      return;
    }

    try {
      setInvitationActionId(notification._id);
      const response = await api.post(`/brands/team/invitations/${action}`, {
        token: notification.data.token,
        userId: user._id
      });

      if (response.data?.success) {
        if (action === 'accept' && notification.data?.brandId) {
          localStorage.setItem('activeBrandContextId', notification.data.brandId);
        }

        setNotifications((prev) => prev.map((item) => {
          if (item._id !== notification._id) return item;
          return {
            ...item,
            read: true,
            readAt: new Date().toISOString(),
            data: {
              ...item.data,
              invitationStatus: action === 'accept' ? 'accepted' : 'rejected'
            }
          };
        }));

        setUnreadCount((prev) => (!notification.read ? Math.max(0, prev - 1) : prev));
        toast.success(response.data.message || (action === 'accept' ? 'Invitation accepted' : 'Invitation rejected'));
      }
    } catch (error) {
      toast.error(error?.error || error?.message || `Failed to ${action} invitation`);
    } finally {
      setInvitationActionId(null);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      
      const deleted = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications/clear-all');
      
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      setPage(prev => prev + 1);
      fetchNotifications();
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter(n => !n.read)
      : notifications.filter(n => n.type === filter);

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with your latest activities</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-600">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCheck}
              onClick={markAllAsRead}
            >
              Mark All as Read
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchNotifications(true)}
            loading={refreshing}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
            <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs">
              {notifications.length}
            </span>
          </button>
          
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filter === 'unread'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread
            <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs">
              {unreadCount}
            </span>
          </button>
          
          {['deal', 'message', 'payment', 'campaign', 'reminder', 'alert', 'team'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${
                filter === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">You're all caught up!</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const Icon = getIconComponent(notification.type);
                const colorClass = getIconColor(notification.type);
                
                return (
                  <div
                    key={notification._id}
                    className={`p-6 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${colorClass} flex-shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {notification.title}
                              {!notification.read && (
                                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                              )}
                            </h3>
                            <p className="text-gray-600 mt-1">{notification.message}</p>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </div>
                        
                        {notification.data && (
                          <div className="mt-3">
                            {notification.data.dealId && (
                              <Link
                                to={`/dashboard/deals/${notification.data.dealId}`}
                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                                onClick={() => markAsRead(notification._id)}
                              >
                                View Deal
                                <Eye className="w-3 h-3" />
                              </Link>
                            )}
                            
                            {notification.data.messageId && (
                              <Link
                                to={`/inbox?message=${notification.data.messageId}`}
                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                                onClick={() => markAsRead(notification._id)}
                              >
                                View Message
                                <Eye className="w-3 h-3" />
                              </Link>
                            )}

                            {notification.type === 'team' && notification.data?.token && !['accepted', 'rejected', 'cancelled', 'expired'].includes(notification.data?.invitationStatus) && (
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleInvitationResponse(notification, 'accept')}
                                  loading={invitationActionId === notification._id}
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleInvitationResponse(notification, 'reject')}
                                  disabled={invitationActionId === notification._id}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}

                            {notification.type === 'team' && notification.data?.invitationStatus ? (
                              <p className="text-xs text-gray-500 mt-2 capitalize">
                                Invitation {notification.data.invitationStatus}
                              </p>
                            ) : null}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-4">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                              <CheckCheck className="w-4 h-4" />
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="text-center">
          <button
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;