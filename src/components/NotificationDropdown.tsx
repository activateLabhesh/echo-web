"use client";
import { useState, useEffect, useRef } from 'react';
import { X, Check, CheckCheck, Bell } from 'lucide-react';
import { getUser } from '@/api';
import { useNotifications } from '../hooks/useNotifications';
import { apiClient } from '@/utils/apiClient';

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
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
}

export default function NotificationDropdown({ 
  onClose,
  onNavigateToMessage
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { markAsRead: hookMarkAsRead, markAllAsRead: hookMarkAllAsRead } = useNotifications();

  useEffect(() => {
    loadNotifications();
    setMounted(true);
    
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

      const response = await apiClient.get(`/api/mentions?userId=${user.id}`);
      const data = response.data;
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/api/mentions/${notificationId}/read`);
      
      // Update local state immediately for better UX
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      // Also call the hook function to update global state
      await hookMarkAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/api/mentions/mark-all-read');
      
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
      className="fixed inset-0 z-[9999] flex justify-center pt-16 bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-[420px] max-h-[70vh] flex flex-col bg-[#111214] border border-gray-800 rounded-2xl shadow-2xl transition-all duration-200 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#111214]/95 backdrop-blur">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="p-2 rounded-full bg-gray-900 border border-gray-800">
              <Bell size={16} />
            </span>
            Mentions
          </h3>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-gray-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded-full bg-gray-900 border border-gray-800"
                title="Mark all as read"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-900"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500 mx-auto mb-2"></div>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
                <Bell size={22} className="opacity-70" />
              </div>
              <p className="text-sm text-gray-300">No mentions yet</p>
              <p className="text-xs mt-1 text-gray-500">
                You'll see mentions here when someone @mentions you.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group p-3 rounded-xl border transition-colors cursor-pointer ${
                    !notification.is_read
                      ? "bg-gray-900/80 border-gray-700"
                      : "bg-gray-900/50 border-gray-800 hover:bg-gray-800/60"
                  }`}
                  onClick={() => {
                    if (!notification.is_read) markAsRead(notification.id);
                    // If navigation handler is provided, call it with channelId and messageId
                    const channelId = notification.message?.channel_id || notification.message?.channels?.server_id;
                    const messageId = notification.message_id || notification.message?.id;
                    if (onNavigateToMessage && channelId && messageId) {
                      onNavigateToMessage(channelId, messageId);
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <img
                      src={notification.message?.users?.avatar_url || '/avatar.png'}
                      alt="User"
                      className="w-9 h-9 rounded-full flex-shrink-0"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">
                          {notification.message?.users?.username || 'Unknown User'}
                        </span>
                        <span className="text-gray-500 text-xs">
                          mentioned you
                        </span>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-gray-300 text-sm mb-2">
                        "{truncateContent(notification.message?.content || '')}"
                      </p>

                      <div className="flex items-center justify-between text-xs">
                        <div className="text-gray-500">
                          #{notification.message?.channels?.name || 'unknown'} •{' '}
                          {notification.message?.channels?.servers?.name || 'Unknown Server'}
                        </div>
                        <div className="text-gray-600">
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
          <div className="p-3 border-t border-gray-800 text-center bg-[#0f1012]">
            <button className="text-gray-300 hover:text-white text-sm">
              View all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
