"use client";
import { useState, useEffect, useRef } from 'react';
import { X, Check, CheckCheck, Bell } from 'lucide-react';
import { getUser } from '../app/api';
import { useNotifications } from '../hooks/useNotifications';

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

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ 
  onClose 
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { markAsRead: hookMarkAsRead, markAllAsRead: hookMarkAllAsRead } = useNotifications();

  useEffect(() => {
    loadNotifications();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

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

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/mentions/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        
        // Also call the hook function to update global state
        await hookMarkAsRead(notificationId);
      } else {
        console.error('Failed to mark notification as read:', await response.text());
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/mentions/mark-all-read', {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        
        // Also call the hook function to update global state
        await hookMarkAllAsRead();
        
        // Reload notifications from backend to ensure sync
        setTimeout(() => {
          loadNotifications();
        }, 100);
      } else {
        console.error('Failed to mark all as read:', await response.text());
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-12 right-0 w-96 bg-[#2f3136] border border-[#72767d] rounded-lg shadow-xl z-50 max-h-96 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#72767d]">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Bell size={16} />
          Mentions
        </h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck size={12} />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <Bell size={24} className="mx-auto mb-2 opacity-50" />
            <p>No mentions yet</p>
            <p className="text-xs mt-1">You'll see mentions here when someone @mentions you</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-md hover:bg-[#23272a] transition-colors cursor-pointer ${
                  !notification.is_read ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <img
                    src={notification.message?.users?.avatar_url || '/avatar.png'}
                    alt="User"
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">
                        {notification.message?.users?.username || 'Unknown User'}
                      </span>
                      <span className="text-gray-400 text-xs">
                        mentioned you
                      </span>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-2">
                      "{truncateContent(notification.message?.content || '')}"
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        #{notification.message?.channels?.name || 'unknown'} • {' '}
                        {notification.message?.channels?.servers?.name || 'Unknown Server'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Mark as read button */}
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="text-gray-400 hover:text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-[#72767d] text-center">
          <button className="text-blue-400 hover:text-blue-300 text-sm">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
