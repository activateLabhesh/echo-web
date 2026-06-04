// src/hooks/useVoiceCall.ts
// Hook to integrate CallStateManager with voice channel components

"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { callStateManager, ActiveCallState } from "@/lib/CallStateManager";
import {
  VoiceVideoManager,
  VoiceRosterMember,
  VideoTileInfo,
  MediaState,
} from "@/lib/VoiceVideoManager";

interface UseVoiceCallOptions {
  userId: string;
  username: string;
  channelId: string;
  serverId: string;
  channelName: string;
}

interface UseVoiceCallReturn {
  // Manager instance
  manager: VoiceVideoManager | null;

  // Connection state
  isConnected: boolean;
  isConnecting: boolean;

  // Call state
  isInCall: boolean;
  isMinimized: boolean;
  callState: ActiveCallState | null;

  // Participants
  roster: VoiceRosterMember[];
  videoTiles: VideoTileInfo[];

  // Media state
  mediaState: MediaState | null;

  // Actions
  joinCall: (callType?: "voice" | "video") => Promise<void>;
  leaveCall: () => void;
  minimizeCall: () => void;
  maximizeCall: () => void;

  // Media controls
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;

  // Error state
  error: string | null;
}

export function useVoiceCall({
  userId,
  username,
  channelId,
  serverId,
  channelName,
}: UseVoiceCallOptions): UseVoiceCallReturn {
  const [manager, setManager] = useState<VoiceVideoManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roster, setRoster] = useState<VoiceRosterMember[]>([]);
  const [videoTiles, setVideoTiles] = useState<VideoTileInfo[]>([]);
  const [callState, setCallState] = useState<ActiveCallState | null>(null);
  const [mediaState, setMediaState] = useState<MediaState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track if we've set up listeners for this manager instance
  const listenersSetup = useRef(false);

  // Subscribe to call state changes
  useEffect(() => {
    return callStateManager.subscribe(setCallState);
  }, []);

  // Set up event listeners when manager changes
  const setupListeners = useCallback((voiceManager: VoiceVideoManager) => {
    if (listenersSetup.current) return;

    voiceManager.onVoiceRoster((members) => {
      setRoster(members);
    });

    voiceManager.onVideoTileUpdated((tile) => {
      setVideoTiles((prev) => {
        const existing = prev.findIndex((t) => t.tileId === tile.tileId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = tile;
          return updated;
        }
        return [...prev, tile];
      });
    });

    voiceManager.onVideoTileRemoved((tileId) => {
      setVideoTiles((prev) => prev.filter((t) => t.tileId !== tileId));
    });

    voiceManager.onConnectionStateChange((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setIsConnecting(false);
      }
    });

    voiceManager.onError((err) => {
      setError(err.message);
      setIsConnecting(false);
    });

    listenersSetup.current = true;
  }, []);

  // Join the call
  const joinCall = useCallback(
    async (callType: "voice" | "video" = "voice") => {
      setError(null);

      // Check if already in this channel
      if (callStateManager.isInChannel(channelId)) {
        // Already connected, just maximize
        callStateManager.maximizeCall();
        const existingManager = callStateManager.getManager();
        if (existingManager) {
          setManager(existingManager);
          setRoster(existingManager.getRoster());
          setMediaState(existingManager.getMediaState());
          setIsConnected(existingManager.isConnected());
        }
        return;
      }

      // If in a different call, end it first
      if (callStateManager.hasActiveCall()) {
        callStateManager.endCall();
        // Reset local state
        setRoster([]);
        setVideoTiles([]);
        listenersSetup.current = false;
      }

      setIsConnecting(true);

      try {
        // Get or create manager
        const voiceManager = callStateManager.getOrCreateManager(
          userId,
          username
        );

        // Set up event listeners
        setupListeners(voiceManager);

        // Initialize and join
        await voiceManager.initialize(callType === "video", true);
        await voiceManager.joinVoiceChannel(channelId);

        // Track the call
        callStateManager.startCall(channelId, serverId, channelName, callType);

        setManager(voiceManager);
        setMediaState(voiceManager.getMediaState());
        setIsConnected(true);
        setIsConnecting(false);

        console.log("[useVoiceCall] Successfully joined call");
      } catch (err) {
        console.error("[useVoiceCall] Failed to join call:", err);
        setError(err instanceof Error ? err.message : "Failed to join call");
        setIsConnecting(false);
        callStateManager.endCall();
      }
    },
    [userId, username, channelId, serverId, channelName, setupListeners]
  );

  // Leave the call
  const leaveCall = useCallback(() => {
    callStateManager.endCall();
    setManager(null);
    setIsConnected(false);
    setRoster([]);
    setVideoTiles([]);
    setMediaState(null);
    setError(null);
    listenersSetup.current = false;
  }, []);

  // Minimize (navigate away while keeping call)
  const minimizeCall = useCallback(() => {
    callStateManager.minimizeCall();
  }, []);

  // Maximize (return to call)
  const maximizeCall = useCallback(() => {
    callStateManager.maximizeCall();
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const currentManager = manager || callStateManager.getManager();
    if (currentManager) {
      const currentState = currentManager.getMediaState();
      currentManager.toggleAudio(currentState.muted); // Pass true to unmute, false to mute
      setMediaState(currentManager.getMediaState());
    }
  }, [manager]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const currentManager = manager || callStateManager.getManager();
    if (currentManager) {
      const currentState = currentManager.getMediaState();
      await currentManager.toggleVideo(!currentState.video);
      setMediaState(currentManager.getMediaState());

      // Update call type if video is enabled
      if (!currentState.video) {
        callStateManager.updateCallType("video");
      }
    }
  }, [manager]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    const currentManager = manager || callStateManager.getManager();
    if (currentManager) {
      const currentState = currentManager.getMediaState();
      if (currentState.screenSharing) {
        await currentManager.stopScreenShare();
      } else {
        await currentManager.startScreenShare();
      }
      setMediaState(currentManager.getMediaState());
    }
  }, [manager]);

  // Check if we're returning to an active call in this channel
  useEffect(() => {
    if (callStateManager.isInChannel(channelId)) {
      const existingManager = callStateManager.getManager();
      if (existingManager) {
        setManager(existingManager);
        setIsConnected(existingManager.isConnected());
        setRoster(existingManager.getRoster());
        setMediaState(existingManager.getMediaState());

        // Set up listeners if not already done
        setupListeners(existingManager);

        // Maximize if it was minimized
        callStateManager.maximizeCall();
      }
    }
  }, [channelId, setupListeners]);

  // Update media state periodically when in call
  useEffect(() => {
    if (!manager || !isConnected) return;

    const interval = setInterval(() => {
      setMediaState(manager.getMediaState());
    }, 1000);

    return () => clearInterval(interval);
  }, [manager, isConnected]);

  return {
    manager,
    isConnected,
    isConnecting,
    isInCall: callStateManager.hasActiveCall(),
    isMinimized: callState?.isMinimized ?? false,
    callState,
    roster,
    videoTiles,
    mediaState,
    joinCall,
    leaveCall,
    minimizeCall,
    maximizeCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    error,
  };
}

export default useVoiceCall;
