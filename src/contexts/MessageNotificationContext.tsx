"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Socket } from "socket.io-client";
import { getUnreadMessageCounts } from "@/api";
import { getUser } from "@/api";
import { createAuthSocket } from "@/socket";

interface MessageNotificationContextType {
  unreadMessageCount: number;
  unreadPerThread: Record<string, number>;
  loading: boolean;
  refreshCount: () => Promise<void>;
}

const MessageNotificationContext =
  createContext<MessageNotificationContextType>({
    unreadMessageCount: 0,
    unreadPerThread: {},
    loading: true,
    refreshCount: async () => {},
  });

export function MessageNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadPerThread, setUnreadPerThread] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const refreshInFlightRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const { unreadCounts, totalUnread } = await getUnreadMessageCounts();
      setUnreadMessageCount(totalUnread);
      setUnreadPerThread(unreadCounts);
    } catch (error) {
      console.error("Error fetching message notifications:", error);
      setUnreadMessageCount(0);
      setUnreadPerThread({});
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

    const setupSocket = async () => {
      try {
        const user = await getUser();
        if (!mounted || !user?.id) return;

        const socket = createAuthSocket(user.id);
        socketRef.current = socket;

        const handleDmEvent = () => {
          void refreshCount();
        };

        socket.on("new_message", handleDmEvent);
        socket.on("receive_dm", handleDmEvent);
        socket.on("dm_sent_confirmation", handleDmEvent);

        return () => {
          socket.off("new_message", handleDmEvent);
          socket.off("receive_dm", handleDmEvent);
          socket.off("dm_sent_confirmation", handleDmEvent);
          socket.disconnect();
          if (socketRef.current === socket) {
            socketRef.current = null;
          }
        };
      } catch (error) {
        console.error("Failed to initialize DM notification socket:", error);
      }
    };

    const cleanupPromise = setupSocket();

    return () => {
      mounted = false;
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      });
    };
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
    throw new Error(
      "useMessageNotifications must be used within MessageNotificationProvider"
    );
  }
  return context;
}
