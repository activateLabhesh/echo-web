"use client";
import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getUser } from '@/api';
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

interface NotificationsState {
  notifications: MentionNotification[];
  unreadCount: number;
}

let sharedState: NotificationsState = { notifications: [], unreadCount: 0 };
const subscribers = new Set<(state: NotificationsState) => void>();
let sharedSocket: Socket | null = null;
let socketRefCount = 0;
let socketInitPromise: Promise<void> | null = null;
let initialUnreadPromise: Promise<void> | null = null;
let permissionRequested = false;

const notifySubscribers = () => {
  subscribers.forEach((listener) => listener(sharedState));
};

const setSharedNotifications = (
  updater: ((prev: MentionNotification[]) => MentionNotification[]) | MentionNotification[]
) => {
  const next = typeof updater === 'function' ? updater(sharedState.notifications) : updater;
  sharedState = { ...sharedState, notifications: next };
  notifySubscribers();
};

const setSharedUnreadCount = (
  updater: ((prev: number) => number) | number
) => {
  const next = typeof updater === 'function' ? updater(sharedState.unreadCount) : updater;
  sharedState = { ...sharedState, unreadCount: Math.max(0, next) };
  notifySubscribers();
};

const ensureSocket = async () => {
  if (socketInitPromise) return socketInitPromise;

  socketInitPromise = (async () => {
    const user = await getUser();
    if (!user?.id) {
      socketInitPromise = null;
      return;
    }

    sharedSocket = createAuthSocket(user.id);

    sharedSocket.on('mention_notification', (notification: MentionNotification) => {
      setSharedNotifications((prev) => [notification, ...prev.slice(0, 49)]);
      setSharedUnreadCount((prev) => prev + 1);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${notification.senderUsername} mentioned you`, {
          body: `"${notification.content.substring(0, 100)}..."`,
          icon: notification.senderAvatar || '/avatar.png',
          tag: notification.id,
        });
      }
    });

    sharedSocket.on('mention_marked_read', (notificationId: string) => {
      setSharedNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setSharedUnreadCount((prev) => Math.max(0, prev - 1));
    });
  })();

  return socketInitPromise;
};

const ensureInitialUnread = async () => {
  if (initialUnreadPromise) return initialUnreadPromise;

  initialUnreadPromise = (async () => {
    try {
      const user = await getUser();
      if (!user?.id) return;

      const response = await apiClient.get(`/api/mentions?userId=${user.id}&unreadOnly=true`);
      if (response.data) {
        const data = response.data;
        setSharedUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (error) {
      // Silently ignore errors - notifications will load when user is authenticated
    }
  })();

  return initialUnreadPromise;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<MentionNotification[]>(sharedState.notifications);
  const [unreadCount, setUnreadCountState] = useState(sharedState.unreadCount);

  useEffect(() => {
    const handleUpdate = (state: NotificationsState) => {
      setNotifications(state.notifications);
      setUnreadCountState(state.unreadCount);
    };

    subscribers.add(handleUpdate);
    handleUpdate(sharedState);

    socketRefCount += 1;
    ensureSocket();
    ensureInitialUnread();

    return () => {
      subscribers.delete(handleUpdate);
      socketRefCount = Math.max(0, socketRefCount - 1);

      if (socketRefCount === 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        socketInitPromise = null;
      }
    };
  }, []);

  useEffect(() => {
    if (permissionRequested) return;
    permissionRequested = true;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Use apiClient for authenticated request
      await apiClient.patch(`/api/mentions/${notificationId}/read`);
      
      if (sharedSocket) {
        sharedSocket.emit('mention_read', notificationId);
      }
      setSharedNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setSharedUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      // Use apiClient for authenticated request
      const response = await apiClient.patch('/api/mentions/mark-all-read');
      const result = response.data;
      
      // Update local state
      setSharedNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setSharedUnreadCount(0);

      // Emit socket events for each marked notification
      const socket = sharedSocket;
      if (socket && Array.isArray(result.markedIds)) {
        result.markedIds.forEach((id: string) => {
          socket.emit('mention_read', id);
        });
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  const setUnreadCount = useCallback<React.Dispatch<React.SetStateAction<number>>>(
    (value) => {
      setSharedUnreadCount(value);
    },
    []
  );

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setUnreadCount
  };
}
