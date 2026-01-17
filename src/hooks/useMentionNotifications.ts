"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

export function useMentionNotifications() {
  const [unreadMentionsCount, setUnreadMentionsCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const socketConnection = io(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'}`, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    setSocket(socketConnection);

    // Listen for mention notifications
    socketConnection.on('mention_notification', (data) => {
      console.log('Received mention notification:', data);
      setUnreadMentionsCount(prev => prev + 1);
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Mention', {
          body: `You were mentioned in a message`,
          icon: '/echo-logo.png'
        });
      }
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/mentions?unreadOnly=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadMentionsCount(data.length);
      }
    } catch (error) {
      console.error('Failed to fetch unread mentions count:', error);
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }
    return false;
  }, []);

  // Mark mention as read (decrease count)
  const markMentionAsRead = useCallback(() => {
    setUnreadMentionsCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all mentions as read
  const markAllMentionsAsRead = useCallback(() => {
    setUnreadMentionsCount(0);
  }, []);

  return useMemo(() => ({
    unreadMentionsCount,
    fetchUnreadCount,
    requestNotificationPermission,
    markMentionAsRead,
    markAllMentionsAsRead,
    socket
  }), [
    unreadMentionsCount,
    fetchUnreadCount,
    requestNotificationPermission,
    markMentionAsRead,
    markAllMentionsAsRead,
    socket
  ]);
}
