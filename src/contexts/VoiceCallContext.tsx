// src/contexts/VoiceCallContext.tsx
// Global voice call state provider - persists call across page navigation

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  VoiceVideoManager,
  VoiceRosterMember,
  VideoTileInfo,
  MediaState,
} from "@/lib/VoiceVideoManager";
import {
  emitJoinVoiceChannel,
  emitLeaveVoiceChannel,
  emitVoiceStateUpdate,
  getVoicePresenceSocket,
} from "@/lib/voicePresenceSocket";

// ==================== TYPES ====================

export interface ActiveCall {
  channelId: string;
  channelName: string;
  serverId: string;
  serverName: string;
}

export interface VoiceCallContextValue {
  // State
  manager: VoiceVideoManager | null;
  activeCall: ActiveCall | null;
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  participants: VoiceRosterMember[];
  localMediaState: MediaState;
  localVideoTileId: number | null;
  localScreenTileId: number | null;
  localScreenStream: MediaStream | null;
  videoTiles: Map<number, VideoTileInfo>;
  permissionError: string | null;
  connectionError: string | null;

  // Actions
  joinCall: (
    channelId: string,
    channelName: string,
    serverId: string,
    serverName: string
  ) => Promise<void>;
  leaveCall: () => void;
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  bindVideoElement: (tileId: number, element: HTMLVideoElement) => void;
  unbindVideoElement: (tileId: number) => void;
}

// Default context value
const defaultContextValue: VoiceCallContextValue = {
  manager: null,
  activeCall: null,
  isConnected: false,
  isConnecting: false,
  isInitialized: false,
  participants: [],
  localMediaState: {
    muted: true,
    speaking: false,
    video: false,
    screenSharing: false,
    recording: false,
    mediaQuality: "auto",
    activeStreams: { audio: false, video: false, screen: false },
    availablePermissions: { audio: false, video: false },
  },
  localVideoTileId: null,
  localScreenTileId: null,
  localScreenStream: null,
  videoTiles: new Map(),
  permissionError: null,
  connectionError: null,
  joinCall: async () => {},
  leaveCall: () => {},
  toggleAudio: () => {},
  toggleVideo: async () => {},
  toggleScreenShare: async () => {},
  bindVideoElement: () => {},
  unbindVideoElement: () => {},
};

// ==================== CONTEXT ====================

const VoiceCallContext =
  createContext<VoiceCallContextValue>(defaultContextValue);

// ==================== PROVIDER ====================

interface VoiceCallProviderProps {
  children: ReactNode;
}

export function VoiceCallProvider({ children }: VoiceCallProviderProps) {
  // Manager ref - persists across renders and page navigations
  const managerRef = useRef<VoiceVideoManager | null>(null);
  const isManagerCreated = useRef(false);
  const listenersSetupRef = useRef(false);
  const activeCallRef = useRef<ActiveCall | null>(null);

  // State
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [participants, setParticipants] = useState<VoiceRosterMember[]>([]);
  const [localMediaState, setLocalMediaState] = useState<MediaState>(
    defaultContextValue.localMediaState
  );
  const [localVideoTileId, setLocalVideoTileId] = useState<number | null>(null);
  const [localScreenTileId, setLocalScreenTileId] = useState<number | null>(
    null
  );
  const [localScreenStream, setLocalScreenStream] =
    useState<MediaStream | null>(null);
  const [videoTiles, setVideoTiles] = useState<Map<number, VideoTileInfo>>(
    new Map()
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const getCurrentUser = useCallback(() => {
    if (typeof window === "undefined")
      return { id: "guest", username: "Guest" };
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return {
        id: user.id || "guest",
        username: user.username || "Guest",
      };
    } catch {
      return { id: "guest", username: "Guest" };
    }
  }, []);

  const broadcastVoicePresence = useCallback(
    (state?: MediaState) => {
      const call = activeCallRef.current;
      if (!call) return;

      const user = getCurrentUser();
      getVoicePresenceSocket(user.id);

      const media = state ?? managerRef.current?.getMediaState();
      if (!media) return;

      emitVoiceStateUpdate({
        channelId: call.channelId,
        serverId: call.serverId,
        muted: media.muted,
        video: media.video,
        screenSharing: media.screenSharing,
      });
    },
    [getCurrentUser]
  );

  // Create manager instance (only once)
  const getOrCreateManager = useCallback(() => {
    if (!isManagerCreated.current) {
      const user = getCurrentUser();
      managerRef.current = new VoiceVideoManager(user.id, user.username);
      isManagerCreated.current = true;
    }
    return managerRef.current;
  }, [getCurrentUser]);

  // Setup event listeners for the manager
  const setupEventListeners = useCallback((manager: VoiceVideoManager) => {
    console.log("[VoiceCallContext] Setting up event listeners");

    // Voice roster updates
    manager.onVoiceRoster((members) => {
      console.log(
        "[VoiceCallContext] Roster update:",
        members.length,
        "members"
      );
      setParticipants(members);
    });

    // Video tile updates
    manager.onVideoTileUpdated((tile) => {
      setVideoTiles((prev) => {
        const newMap = new Map(prev);
        newMap.set(tile.tileId, tile);
        return newMap;
      });

      if (tile.isLocal) {
        if (tile.isContent) {
          setLocalScreenTileId(tile.tileId);
        } else {
          setLocalVideoTileId(tile.tileId);
        }
      }
    });

    // Video tile removed
    manager.onVideoTileRemoved((tileId) => {
      console.log("[VoiceCallContext] Video tile removed:", tileId);
      setVideoTiles((prev) => {
        const newMap = new Map(prev);
        newMap.delete(tileId);
        return newMap;
      });

      setLocalVideoTileId((prev) => (prev === tileId ? null : prev));
      setLocalScreenTileId((prev) => (prev === tileId ? null : prev));
    });

    // Connection state changes
    manager.onConnectionStateChange((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setIsConnecting(false);
      }
    });

    // Error handling
    manager.onError((error) => {
      console.error("[VoiceCallContext] Error:", error);
      setConnectionError(error.message);
      setIsConnecting(false);
    });

    // User joined/left (for logging)
    manager.onUserJoined((attendeeId, externalUserId) => {
      console.log(
        "[VoiceCallContext] User joined:",
        attendeeId,
        externalUserId
      );
    });

    manager.onUserLeft((attendeeId) => {
      console.log("[VoiceCallContext] User left:", attendeeId);
    });

    manager.onScreenSharing(() => {
      setParticipants(manager.getRoster());
      broadcastVoicePresence(manager.getMediaState());
    });
  }, [broadcastVoicePresence]);

  // Initialize manager (request permissions)
  const initializeManager = useCallback(
    async (manager: VoiceVideoManager) => {
      if (isInitialized) return true;

      console.log(
        "[VoiceCallContext] Initializing manager (requesting permissions)"
      );
      setPermissionError(null);

      try {
        // Try full permissions first
        await manager.initialize(true, true);
        setIsInitialized(true);
        setLocalMediaState(manager.getMediaState());
        console.log("[VoiceCallContext] Full permissions granted");
        return true;
      } catch (fullError: any) {
        console.warn(
          "[VoiceCallContext] Full permissions failed, trying fallbacks"
        );

        // Try audio-only
        try {
          await manager.initializeAudioOnly();
          setIsInitialized(true);
          setLocalMediaState(manager.getMediaState());
          setPermissionError(
            "Video permission denied. Audio-only mode active."
          );
          console.log("[VoiceCallContext] Audio-only mode");
          return true;
        } catch (audioError) {
          // Try video-only
          try {
            await manager.initializeVideoOnly();
            setIsInitialized(true);
            setLocalMediaState(manager.getMediaState());
            setPermissionError(
              "Audio permission denied. Video-only mode active."
            );
            console.log("[VoiceCallContext] Video-only mode");
            return true;
          } catch (videoError) {
            // All failed
            console.error("[VoiceCallContext] All permission requests failed");
            setPermissionError(
              "Camera and microphone access denied. Please allow permissions and try again."
            );
            return false;
          }
        }
      }
    },
    [isInitialized]
  );

  // ==================== ACTIONS ====================

  // Join a voice call
  const joinCall = useCallback(
    async (
      channelId: string,
      channelName: string,
      serverId: string,
      serverName: string
    ) => {
      console.log("[VoiceCallContext] joinCall:", {
        channelId,
        channelName,
        serverId,
        serverName,
      });

      // Clear previous errors
      setConnectionError(null);
      setIsConnecting(true);

      try {
        const manager = getOrCreateManager();
        if (!manager) {
          throw new Error("Failed to create voice manager");
        }

        const user = getCurrentUser();
        getVoicePresenceSocket(user.id);

        // If already in a call, leave it first
        if (activeCall) {
          console.log(
            "[VoiceCallContext] Leaving previous call:",
            activeCall.channelId
          );
          emitLeaveVoiceChannel({
            channelId: activeCall.channelId,
            serverId: activeCall.serverId,
          });
          manager.leaveVoiceChannel();
          // Clear state
          setParticipants([]);
          setVideoTiles(new Map());
          setLocalVideoTileId(null);
          setLocalScreenTileId(null);
          setLocalScreenStream(null);
        }

        if (!isInitialized) {
          const success = await initializeManager(manager);
          if (!success) {
            setIsConnecting(false);
            return;
          }
        }

        if (!listenersSetupRef.current) {
          setupEventListeners(manager);
          listenersSetupRef.current = true;
        }

        // Set active call state
        setActiveCall({
          channelId,
          channelName,
          serverId,
          serverName,
        });

        await manager.joinVoiceChannel(channelId);

        const mediaState = manager.getMediaState();
        setLocalMediaState(mediaState);
        setIsConnecting(false);

        emitJoinVoiceChannel({
          channelId,
          serverId,
          userId: user.id,
          username: user.username,
          muted: mediaState.muted,
          video: mediaState.video,
        });
        broadcastVoicePresence(mediaState);

        console.log("[VoiceCallContext] Successfully joined call:", channelId);
      } catch (error: any) {
        console.error("[VoiceCallContext] Failed to join call:", error);
        setConnectionError(error.message || "Failed to join voice channel");
        setActiveCall(null);
        setIsConnecting(false);
      }
    },
    [
      activeCall,
      isInitialized,
      getOrCreateManager,
      getCurrentUser,
      initializeManager,
      setupEventListeners,
      broadcastVoicePresence,
    ]
  );

  // Leave current call
  const leaveCall = useCallback(() => {
    console.log("[VoiceCallContext] leaveCall");

    const call = activeCallRef.current;
    if (call) {
      emitLeaveVoiceChannel({
        channelId: call.channelId,
        serverId: call.serverId,
      });
    }

    const manager = managerRef.current;
    if (manager) {
      manager.leaveVoiceChannel();
    }

    // Clear state
    setActiveCall(null);
    setIsConnected(false);
    setParticipants([]);
    setVideoTiles(new Map());
    setLocalVideoTileId(null);
    setLocalScreenTileId(null);
    setLocalScreenStream(null);
    setConnectionError(null);
  }, []);

  // Toggle audio (mute/unmute)
  const toggleAudio = useCallback((enabled: boolean) => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.toggleAudio(enabled);
    const mediaState = manager.getMediaState();
    setLocalMediaState(mediaState);
    broadcastVoicePresence(mediaState);
  }, [broadcastVoicePresence]);

  const toggleVideo = useCallback(async (enabled: boolean) => {
    const manager = managerRef.current;
    if (!manager) return;

    try {
      await manager.toggleVideo(enabled);
      const mediaState = manager.getMediaState();
      setLocalMediaState(mediaState);
      broadcastVoicePresence(mediaState);
    } catch (error) {
      console.error("[VoiceCallContext] Toggle video failed:", error);
    }
  }, [broadcastVoicePresence]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    try {
      const currentState = manager.getMediaState();
      if (currentState.screenSharing) {
        manager.stopScreenShare();
        setLocalScreenStream(null);
      } else {
        await manager.startScreenShare();
        setLocalScreenStream(manager.getLocalScreenStream());
      }
      const mediaState = manager.getMediaState();
      setLocalMediaState(mediaState);
      broadcastVoicePresence(mediaState);
    } catch (error: any) {
      // User cancelled - not an error
      if (error?.name === "NotAllowedError") {
        console.log("[VoiceCallContext] Screen share cancelled by user");
        return;
      }
      console.error("[VoiceCallContext] Toggle screen share failed:", error);
    }
  }, [broadcastVoicePresence]);

  // Bind video element to tile
  const bindVideoElement = useCallback(
    (tileId: number, element: HTMLVideoElement) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.bindVideoElement(tileId, element);
    },
    []
  );

  // Unbind video element from tile
  const unbindVideoElement = useCallback((tileId: number) => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.unbindVideoElement(tileId);
  }, []);

  // Periodically update local media state
  useEffect(() => {
    if (!activeCall) return;

    const interval = setInterval(() => {
      const manager = managerRef.current;
      if (manager) {
        setLocalMediaState(manager.getMediaState());
        setLocalScreenStream(manager.getLocalScreenStream());
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeCall]);

  // Cleanup on unmount (full app close)
  useEffect(() => {
    return () => {
      console.log(
        "[VoiceCallContext] Provider unmounting, disconnecting manager"
      );
      const manager = managerRef.current;
      if (manager) {
        manager.disconnect();
      }
    };
  }, []);

  // ==================== CONTEXT VALUE ====================

  const contextValue = useMemo<VoiceCallContextValue>(
    () => ({
      manager: managerRef.current,
      activeCall,
      isConnected,
      isConnecting,
      isInitialized,
      participants,
      localMediaState,
      localVideoTileId,
      localScreenTileId,
      localScreenStream,
      videoTiles,
      permissionError,
      connectionError,
      joinCall,
      leaveCall,
      toggleAudio,
      toggleVideo,
      toggleScreenShare,
      bindVideoElement,
      unbindVideoElement,
    }),
    [
      activeCall,
      isConnected,
      isConnecting,
      isInitialized,
      participants,
      localMediaState,
      localVideoTileId,
      localScreenTileId,
      localScreenStream,
      videoTiles,
      permissionError,
      connectionError,
      joinCall,
      leaveCall,
      toggleAudio,
      toggleVideo,
      toggleScreenShare,
      bindVideoElement,
      unbindVideoElement,
    ]
  );

  return (
    <VoiceCallContext.Provider value={contextValue}>
      {children}
    </VoiceCallContext.Provider>
  );
}

// ==================== HOOK ====================

export function useVoiceCall(): VoiceCallContextValue {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error("useVoiceCall must be used within a VoiceCallProvider");
  }
  return context;
}

export default VoiceCallContext;
