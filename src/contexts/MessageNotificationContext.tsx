"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { getUnreadMessageCounts } from '@/api';

interface MessageNotificationContextType {
  unreadMessageCount: number;
  unreadPerThread: Record<string, number>;
  loading: boolean;
  refreshCount: () => Promise<void>;
}

const MessageNotificationContext = createContext<MessageNotificationContextType>({
  unreadMessageCount: 0,
  unreadPerThread: {},
  loading: true,
  refreshCount: async () => {},
});

export function MessageNotificationProvider({ children }: { children: ReactNode }) {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadPerThread, setUnreadPerThread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refreshCount = useCallback(async () => {
    try {
      const { unreadCounts, totalUnread } = await getUnreadMessageCounts();
      setUnreadMessageCount(totalUnread);
      setUnreadPerThread(unreadCounts);
    } catch (error) {
      console.error('Error fetching message notifications:', error);
      setUnreadMessageCount(0);
      setUnreadPerThread({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch once on mount, no polling
    refreshCount();
  }, [refreshCount]);

  const contextValue = useMemo(
    () => ({
      unreadMessageCount,
      unreadPerThread,
      loading,
      refreshCount,
    }),
    [unreadMessageCount, unreadPerThread, loading, refreshCount]
  );

  return (
    <MessageNotificationContext.Provider value={contextValue}>
      {children}
    </MessageNotificationContext.Provider>
  );
}

export function useMessageNotifications() {
  const context = useContext(MessageNotificationContext);
  if (!context) {
    throw new Error('useMessageNotifications must be used within MessageNotificationProvider');
  }
  return context;
}
