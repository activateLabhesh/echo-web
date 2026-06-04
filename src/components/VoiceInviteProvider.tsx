"use client";

// src/components/VoiceInviteProvider.tsx
// Provider component that handles voice invite notifications app-wide
// Displays toast notifications when someone invites the user to a voice channel

import React, { ReactNode, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVoiceCall } from "@/contexts/VoiceCallContext";
import {
  useVoiceInviteNotifications,
  VoiceInvite,
} from "@/hooks/useVoiceInviteNotifications";
import VoiceInviteToast from "./VoiceInviteToast";
import { getUser } from "@/api";

interface VoiceInviteProviderProps {
  children: ReactNode;
}

export default function VoiceInviteProvider({
  children,
}: VoiceInviteProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const { joinCall, activeCall } = useVoiceCall();

  // Get user ID on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getUser();
        if (user?.id) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error("[VoiceInviteProvider] Failed to get user:", err);
      }
    };
    fetchUser();
  }, []);

  // Handle accepting an invite
  const handleAcceptInvite = useCallback(
    async (invite: VoiceInvite) => {
      console.log("[VoiceInviteProvider] Accepting invite:", invite);

      try {
        // If already in a call, leave it first
        // The VoiceContext should handle this automatically when joining a new channel

        // Navigate to the server's voice channel
        // The URL format depends on your app's routing structure
        router.push(
          `/servers?serverId=${invite.serverId}&channelId=${invite.channelId}&channelType=voice`
        );

        // Note: The actual voice channel join will happen via VoiceChannelView
        // when the page navigates and renders the voice view
      } catch (err) {
        console.error("[VoiceInviteProvider] Failed to join via invite:", err);
      }
    },
    [router]
  );

  // Handle declining an invite
  const handleDeclineInvite = useCallback((invite: VoiceInvite) => {
    console.log(
      "[VoiceInviteProvider] Declined invite from:",
      invite.inviterUsername
    );
    // Could optionally send a socket event to notify the inviter
  }, []);

  // Set up the notification hook
  const { invites, acceptInvite, declineInvite, clearInvite } =
    useVoiceInviteNotifications({
      userId,
      onAccept: handleAcceptInvite,
      onDecline: handleDeclineInvite,
      inviteExpirationMs: 30000, // 30 seconds
    });

  // Filter out invites for channels we're already in
  const filteredInvites = invites.filter(
    (invite) => activeCall?.channelId !== invite.channelId
  );

  return (
    <>
      {children}

      {/* Voice invite toasts - always rendered at root level */}
      <VoiceInviteToast
        invites={filteredInvites}
        onAccept={acceptInvite}
        onDecline={declineInvite}
        onClose={clearInvite}
      />
    </>
  );
}
