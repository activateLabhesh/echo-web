"use client";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getUnreadMessageCounts } from '@/api';

export function useMessageNotifications() {
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

  return useMemo(() => ({ 
    unreadMessageCount,
    unreadPerThread,
    loading,
    refreshCount 
  }), [unreadMessageCount, unreadPerThread, loading, refreshCount]);
}
