"use client";

// src/hooks/useVoiceInviteNotifications.ts
// Hook to listen for incoming voice channel invites and display notifications
// Should be used at a high level (e.g., in the main layout or providers)

import { useEffect, useState, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { createAuthSocket } from "@/socket";

// ==================== TYPES ====================

export interface VoiceInvite {
  id: string;
  channelId: string;
  channelName: string;
  serverId: string;
  serverName: string;
  inviterUserId: string;
  inviterUsername: string;
  inviterAvatar?: string;
  timestamp: string;
  expiresAt: number; // Unix timestamp when invite expires (e.g., 30 seconds after receipt)
}

export interface UseVoiceInviteNotificationsOptions {
  userId: string | null;
  onAccept?: (invite: VoiceInvite) => void;
  onDecline?: (invite: VoiceInvite) => void;
  inviteExpirationMs?: number; // How long invites stay visible (default 30 seconds)
}

export interface UseVoiceInviteNotificationsReturn {
  invites: VoiceInvite[];
  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
  clearInvite: (inviteId: string) => void;
  clearAllInvites: () => void;
}

// ==================== HOOK ====================

export function useVoiceInviteNotifications({
  userId,
  onAccept,
  onDecline,
  inviteExpirationMs = 30000, // 30 seconds default
}: UseVoiceInviteNotificationsOptions): UseVoiceInviteNotificationsReturn {
  const [invites, setInvites] = useState<VoiceInvite[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const expirationTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up expired invites
  const clearInvite = useCallback((inviteId: string) => {
    setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));

    // Clear any existing timer
    const timer = expirationTimersRef.current.get(inviteId);
    if (timer) {
      clearTimeout(timer);
      expirationTimersRef.current.delete(inviteId);
    }
  }, []);

  const clearAllInvites = useCallback(() => {
    setInvites([]);

    // Clear all timers
    expirationTimersRef.current.forEach((timer) => clearTimeout(timer));
    expirationTimersRef.current.clear();
  }, []);

  // Accept invite
  const acceptInvite = useCallback(
    (inviteId: string) => {
      const invite = invites.find((inv) => inv.id === inviteId);
      if (invite) {
        onAccept?.(invite);
        clearInvite(inviteId);
      }
    },
    [invites, onAccept, clearInvite]
  );

  // Decline invite
  const declineInvite = useCallback(
    (inviteId: string) => {
      const invite = invites.find((inv) => inv.id === inviteId);
      if (invite) {
        onDecline?.(invite);
        clearInvite(inviteId);
      }
    },
    [invites, onDecline, clearInvite]
  );

  // Set up socket connection and listeners
  useEffect(() => {
    if (!userId) return;

    // Create socket connection
    const socket = createAuthSocket(userId);
    socketRef.current = socket;

    // Listen for voice invite notifications
    const handleVoiceInviteReceived = (data: {
      channelId: string;
      channelName: string;
      serverId: string;
      serverName: string;
      inviterUserId: string;
      inviterUsername: string;
      inviterAvatar?: string;
      timestamp: string;
    }) => {
      console.log("[VoiceInvite] Received invite:", data);

      const inviteId = `${data.channelId}-${data.inviterUserId}-${Date.now()}`;
      const expiresAt = Date.now() + inviteExpirationMs;

      const newInvite: VoiceInvite = {
        id: inviteId,
        channelId: data.channelId,
        channelName: data.channelName,
        serverId: data.serverId,
        serverName: data.serverName,
        inviterUserId: data.inviterUserId,
        inviterUsername: data.inviterUsername,
        inviterAvatar: data.inviterAvatar,
        timestamp: data.timestamp,
        expiresAt,
      };

      setInvites((prev) => {
        // Don't add duplicate invites from the same person to the same channel
        const isDuplicate = prev.some(
          (inv) =>
            inv.channelId === data.channelId &&
            inv.inviterUserId === data.inviterUserId
        );
        if (isDuplicate) {
          // Update the existing invite's expiration
          return prev.map((inv) =>
            inv.channelId === data.channelId &&
            inv.inviterUserId === data.inviterUserId
              ? { ...inv, expiresAt, timestamp: data.timestamp }
              : inv
          );
        }
        return [...prev, newInvite];
      });

      // Set up expiration timer
      const timer = setTimeout(() => {
        clearInvite(inviteId);
      }, inviteExpirationMs);
      expirationTimersRef.current.set(inviteId, timer);

      // Play notification sound (optional - browser notification API)
      try {
        // Request permission for browser notifications if not already granted
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Voice Invite from ${data.inviterUsername}`, {
            body: `Join ${data.channelName} in ${data.serverName}`,
            icon: data.inviterAvatar || "/default-avatar.png",
            tag: inviteId, // Prevents duplicate notifications
            requireInteraction: true,
          });
        }
      } catch (err) {
        console.warn("[VoiceInvite] Could not show browser notification:", err);
      }
    };

    socket.on("voice_invite_received", handleVoiceInviteReceived);

    // Cleanup
    return () => {
      socket.off("voice_invite_received", handleVoiceInviteReceived);
      socket.disconnect();
      socketRef.current = null;

      // Clear all timers
      expirationTimersRef.current.forEach((timer) => clearTimeout(timer));
      expirationTimersRef.current.clear();
    };
  }, [userId, inviteExpirationMs, clearInvite]);

  return {
    invites,
    acceptInvite,
    declineInvite,
    clearInvite,
    clearAllInvites,
  };
}

export default useVoiceInviteNotifications;
