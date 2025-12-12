"use client";
import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Check } from 'lucide-react';
import { getUser } from '../../api';
import { useNotifications } from '../../../hooks/useNotifications';

interface Notification {
  id: string;
  user_id: string;
  message_id: string;
  is_read: boolean;
  created_at: string;
  message?: {
    id: string;
    content: string;
    sender_id: string;
    channel_id: string;
    users?: {
      username: string;
      avatar_url: string;
    };
    channels?: {
      name: string;
      server_id: string;
      servers?: {
        name: string;
      };
    };
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const user = await getUser();
      if (!user?.id) return;

      const response = await fetch(`/api/mentions?userId=${user.id}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#4f545c] bg-black sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Bell size={32} className="text-white" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Notifications</h1>
              <p className="text-gray-400 text-sm">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Toggle */}
            <div className="flex bg-[#2f3136] rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors ${
                  filter === 'unread' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Mark All Read Button */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm"
              >
                <CheckCheck size={16} />
                <span className="hidden sm:inline">Mark All Read</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={loadNotifications}
              className="bg-[#4f545c] hover:bg-[#5f656c] text-white px-3 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm"
            >
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">↻</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px] text-center py-16">
            <div>
              <Bell size={64} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500 px-4">
                {filter === 'unread' 
                  ? 'All your notifications have been read!' 
                  : "You'll see mentions and other notifications here when they arrive."}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-3 pb-20">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-all hover:shadow-lg ${
                  notification.is_read 
                    ? 'bg-[#2f3136] border-[#4f545c]' 
                    : 'bg-blue-600/10 border-blue-500/30 border-l-4 border-l-blue-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <img
                    src={notification.message?.users?.avatar_url || '/avatar.png'}
                    alt="User"
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold">
                            {notification.message?.users?.username || 'Unknown User'}
                          </span>
                          <span className="text-gray-400 text-sm">mentioned you in</span>
                          <span className="text-blue-400 font-medium text-sm">
                            #{notification.message?.channels?.name || 'unknown'}
                          </span>
                          {notification.message?.channels?.servers?.name && (
                            <>
                              <span className="text-gray-400 text-sm">on</span>
                              <span className="text-gray-300 font-medium text-sm">
                                {notification.message.channels.servers.name}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <p className="text-gray-300 mb-2">
                          "{truncateContent(notification.message?.content || '')}"
                        </p>
                        
                        <span className="text-gray-500 text-sm">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-gray-400 hover:text-white p-2 rounded hover:bg-[#4f545c] transition-colors"
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.is_read && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-400 text-sm font-medium">Unread</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
