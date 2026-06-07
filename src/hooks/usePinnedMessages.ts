"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPinnedMessages,
  pinMessage,
  unpinMessage,
} from "@/api/message.api";
import {
  MAX_PINNED_MESSAGES,
  PinnedMessage,
} from "@/api/types/message.types";

type UsePinnedMessagesOptions = {
  channelId?: string | null;
  threadId?: string | null;
  onError?: (message: string) => void;
};

export const usePinnedMessages = ({
  channelId,
  threadId,
  onError,
}: UsePinnedMessagesOptions) => {
  const [pins, setPins] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const contextKey = channelId
    ? `channel:${channelId}`
    : threadId
      ? `thread:${threadId}`
      : null;

  const loadPins = useCallback(async () => {
    if (!channelId && !threadId) {
      setPins([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getPinnedMessages({
        channel_id: channelId ?? undefined,
        thread_id: threadId ?? undefined,
      });
      setPins(data.slice(0, MAX_PINNED_MESSAGES));
    } catch (error) {
      console.error("Failed to load pinned messages", error);
      onError?.("Failed to load pinned messages.");
    } finally {
      setLoading(false);
    }
  }, [channelId, threadId, onError]);

  useEffect(() => {
    loadPins();
  }, [loadPins, contextKey]);

  const isPinned = useCallback(
    (messageId: string | number) => {
      const id = String(messageId);
      return pins.some(
        (pin) => pin.message_id === id || pin.dm_message_id === id || pin.id === id
      );
    },
    [pins]
  );

  const pin = useCallback(
    async (messageId: string | number, isDm = false) => {
      const id = String(messageId);
      if (!id || id.startsWith("temp-")) return false;

      if (pins.length >= MAX_PINNED_MESSAGES) {
        onError?.(`You can only pin up to ${MAX_PINNED_MESSAGES} messages.`);
        return false;
      }

      if (isPinned(messageId)) return true;

      const body = isDm ? { dm_message_id: id } : { message_id: id };

      try {
        await pinMessage(body);
        await loadPins();
        return true;
      } catch (error: any) {
        const message =
          error?.response?.data?.error ??
          error?.response?.data?.message ??
          "Failed to pin message.";
        onError?.(message);
        return false;
      }
    },
    [pins.length, isPinned, channelId, threadId, loadPins, onError]
  );

  const unpin = useCallback(
    async (messageId: string | number, isDm = false) => {
      const id = String(messageId);
      if (!id) return false;

      const body = isDm ? { dm_message_id: id } : { message_id: id };

      try {
        await unpinMessage(body);
        await loadPins();
        return true;
      } catch (error: any) {
        const message =
          error?.response?.data?.error ??
          error?.response?.data?.message ??
          "Failed to unpin message.";
        onError?.(message);
        return false;
      }
    },
    [channelId, threadId, loadPins, onError]
  );

  const togglePin = useCallback(
    async (messageId: string | number, isDm = false) => {
      if (isPinned(messageId)) {
        return unpin(messageId, isDm);
      }
      return pin(messageId, isDm);
    },
    [isPinned, pin, unpin]
  );

  return {
    pins,
    loading,
    isPinned,
    pin,
    unpin,
    togglePin,
    canPinMore: pins.length < MAX_PINNED_MESSAGES,
    maxPins: MAX_PINNED_MESSAGES,
    refreshPins: loadPins,
  };
};
