"use client";
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getUser } from '../app/api';

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
    const initializeSocket = async () => {
      const user = await getUser();
      if (!user?.id) return;

      const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        withCredentials: true,
      });

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

      return () => {
        socketInstance.disconnect();
      };
    };

    initializeSocket();
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/mentions/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok && socket) {
        socket.emit('mention_read', notificationId);
        setNotifications(prev =>
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [socket]);

  const markAllAsRead = useCallback(async () => {
    try {
      // Use the bulk mark-all-read endpoint
      const response = await fetch('/api/mentions/mark-all-read', {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        // console.log('Mark all as read result:', result);
        
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
      } else {
        console.error('Failed to mark all as read:', await response.text());
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
