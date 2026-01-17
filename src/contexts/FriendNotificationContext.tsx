"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { fetchFriendRequests } from '@/api';

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

  const refreshCount = useCallback(async () => {
    try {
      const requests = await fetchFriendRequests();
      setFriendRequestCount(requests.length);
    } catch (error: any) {
      console.error('Error fetching friend requests:', error);
      // If user is not authenticated, set count to 0 silently
      setFriendRequestCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch once on mount, no polling
    refreshCount();
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
