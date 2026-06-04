"use client";

import { useCallback, useEffect, useState } from "react";

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
};

type ReactionStorage = Record<string, Record<string, string[]>>;

const readStoredReactions = (storageKey: string): ReactionStorage => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const normalized: ReactionStorage = {};

    for (const [messageId, reactions] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (!reactions || typeof reactions !== "object") continue;

      const messageReactions: Record<string, string[]> = {};

      for (const [emoji, userIds] of Object.entries(
        reactions as Record<string, unknown>
      )) {
        if (!Array.isArray(userIds)) continue;

        const cleanUserIds = Array.from(
          new Set(
            userIds
              .map((userId) =>
                typeof userId === "string" ? userId.trim() : ""
              )
              .filter(Boolean)
          )
        );

        if (cleanUserIds.length > 0) {
          messageReactions[emoji.trim()] = cleanUserIds;
        }
      }

      if (Object.keys(messageReactions).length > 0) {
        normalized[messageId] = messageReactions;
      }
    }

    return normalized;
  } catch (error) {
    console.error("Failed to read message reactions", error);
    return {};
  }
};

const persistStoredReactions = (
  storageKey: string,
  reactions: ReactionStorage
) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(reactions));
  } catch (error) {
    console.error("Failed to persist message reactions", error);
  }
};

export const useMessageReactions = (
  storageKey: string | null,
  currentUserId?: string | null
) => {
  const [reactionsByMessageId, setReactionsByMessageId] =
    useState<ReactionStorage>({});

  useEffect(() => {
    if (!storageKey) {
      setReactionsByMessageId({});
      return;
    }

    setReactionsByMessageId(readStoredReactions(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      setReactionsByMessageId(readStoredReactions(storageKey));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey]);

  const toggleReaction = useCallback(
    (messageId: string | number, emoji: string, userId: string) => {
      if (!storageKey) return;

      const normalizedEmoji = emoji.trim();
      const normalizedUserId = userId.trim();
      if (!normalizedEmoji || !normalizedUserId) return;

      setReactionsByMessageId((current) => {
        const key = String(messageId);
        const next = { ...current };
        const messageReactions = { ...(next[key] ?? {}) };
        const existingUsers = new Set(messageReactions[normalizedEmoji] ?? []);

        if (existingUsers.has(normalizedUserId)) {
          existingUsers.delete(normalizedUserId);
        } else {
          existingUsers.add(normalizedUserId);
        }

        if (existingUsers.size === 0) {
          delete messageReactions[normalizedEmoji];
        } else {
          messageReactions[normalizedEmoji] = Array.from(existingUsers);
        }

        if (Object.keys(messageReactions).length === 0) {
          delete next[key];
        } else {
          next[key] = messageReactions;
        }

        persistStoredReactions(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const getReactionsForMessage = useCallback(
    (messageId: string | number): MessageReactionSummary[] => {
      const messageReactions = reactionsByMessageId[String(messageId)] ?? {};

      return Object.entries(messageReactions).map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        reactedByMe: !!currentUserId && userIds.includes(currentUserId.trim()),
      }));
    },
    [currentUserId, reactionsByMessageId]
  );

  return {
    reactionsByMessageId,
    getReactionsForMessage,
    toggleReaction,
  };
};
