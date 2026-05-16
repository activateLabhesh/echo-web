"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { fetchFriendRequests, getUser } from '@/api';
import { createAuthSocket } from '@/socket';

interface FriendNotificationContextType {
  friendRequestCount: number;
  loading: boolean;
  refreshCount: () => Promise<void>;
}

const FriendNotificationContext = createContext<FriendNotificationContextType>({
  friendRequestCount: 0,
  loading: true,
  refreshCount: async () => {},
});

export function FriendNotificationProvider({ children }: { children: ReactNode }) {
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const refreshInFlightRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const requests = await fetchFriendRequests();
      setFriendRequestCount(requests.length);
    } catch (error: any) {
      console.error('Error fetching friend requests:', error);
      // If user is not authenticated, set count to 0 silently
      setFriendRequestCount(0);
    } finally {
      setLoading(false);
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Only fetch once on mount, no polling
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    let mounted = true;
    let cleanupSocket: (() => void) | null = null;

    const setupSocket = async () => {
      try {
        const user = await getUser();
        if (!mounted || !user?.id) return;

        const socket = createAuthSocket(user.id);
        socketRef.current = socket;

        const handleFriendEvent = () => {
          void refreshCount();
        };

        socket.on('friend_request', handleFriendEvent);
        socket.on('friend_request_accepted', handleFriendEvent);

        cleanupSocket = () => {
          socket.off('friend_request', handleFriendEvent);
          socket.off('friend_request_accepted', handleFriendEvent);
          socket.disconnect();
          if (socketRef.current === socket) {
            socketRef.current = null;
          }
        };
      } catch (error) {
        console.error('Failed to initialize friend notification socket:', error);
      }
    };

    void setupSocket();

    return () => {
      mounted = false;
      cleanupSocket?.();
    };
  }, [refreshCount]);

  const contextValue = useMemo(
    () => ({ friendRequestCount, loading, refreshCount }),
    [friendRequestCount, loading, refreshCount]
  );

  return (
    <FriendNotificationContext.Provider value={contextValue}>
      {children}
    </FriendNotificationContext.Provider>
  );
}

export function useFriendNotifications() {
  return useContext(FriendNotificationContext);
}
