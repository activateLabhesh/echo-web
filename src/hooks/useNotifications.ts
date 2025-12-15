"use client";
import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getUser } from '../app/api';
import { createAuthSocket } from '@/socket';
import { apiClient } from '@/utils/apiClient';

interface MentionNotification {
  id: string;
  messageId: string;
  channelId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string | null;
  content: string;
  channelName: string;
  serverName: string;
  timestamp: string;
  type: 'mention';
  isRead?: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<MentionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Connect to socket
  useEffect(() => {
    let socketInstance: Socket | null = null;

    const initializeSocket = async () => {
      const user = await getUser();
      if (!user?.id) return;

      // Use createAuthSocket to properly register userId with backend
      socketInstance = createAuthSocket(user.id);
      setSocket(socketInstance);

      // Listen for mention notifications
      socketInstance.on('mention_notification', (notification: MentionNotification) => {
        // console.log('Received mention notification:', notification);
        
        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
        setUnreadCount(prev => prev + 1);

        // Optional: Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`${notification.senderUsername} mentioned you`, {
            body: `"${notification.content.substring(0, 100)}..."`,
            icon: notification.senderAvatar || '/avatar.png',
            tag: notification.id
          });
        }
      });

      // Listen for mention read confirmations
      socketInstance.on('mention_marked_read', (notificationId: string) => {
        setNotifications(prev =>
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      });
    };

    initializeSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch initial unread count on mount
  useEffect(() => {
    const fetchInitialUnreadCount = async () => {
      try {
        const user = await getUser();
        if (!user?.id) return;

        // Use apiClient to make authenticated request directly to backend
        const response = await apiClient.get(`/api/mentions?userId=${user.id}&unreadOnly=true`);
        
        if (response.data) {
          const data = response.data;
          setUnreadCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (error) {
        // Silently ignore errors - notifications will load when user is authenticated
      }
    };

    fetchInitialUnreadCount();
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Use apiClient for authenticated request
      await apiClient.patch(`/api/mentions/${notificationId}/read`);
      
      if (socket) {
        socket.emit('mention_read', notificationId);
      }
      setNotifications(prev =>
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [socket]);

  const markAllAsRead = useCallback(async () => {
    try {
      // Use apiClient for authenticated request
      const response = await apiClient.patch('/api/mentions/mark-all-read');
      const result = response.data;
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);

      // Emit socket events for each marked notification
      if (socket && result.markedIds) {
        result.markedIds.forEach((id: string) => {
          socket.emit('mention_read', id);
        });
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [socket]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setUnreadCount
  };
}
