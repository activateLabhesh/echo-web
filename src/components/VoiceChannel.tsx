// src/components/VoiceChannel.tsx
"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  VoiceVideoManager,
  VoiceRosterMember,
  VideoTileInfo,
} from "@/lib/VoiceVideoManager";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaVideo,
  FaVideoSlash,
  FaRedo,
  FaMinus,
} from "react-icons/fa";
import { createAuthSocket } from "../socket";



interface VoiceChannelProps {
  channelId: string;
  userId: string;
  serverId?: string;
  channelName?: string;
  onHangUp: () => void;
  onMinimize?: () => void;
  headless?: boolean;
  onLocalStreamChange?: (stream: MediaStream | null) => void;
  onRemoteStreamAdded?: (id: string, stream: MediaStream) => void;
  onRemoteStreamRemoved?: (id: string) => void;
  onVoiceRoster?: (members: any[]) => void;
  externalManager?: VoiceVideoManager | null;
  useExternalManager?: boolean;
  currentUser?: { username: string };
  debug?: boolean;
  externalState?: {
    participants: VoiceRosterMember[];
    isConnected: boolean;
    isConnecting: boolean;
    localMediaState: any;
    localVideoTileId: number | null;
    videoTiles: Map<number, VideoTileInfo>;
    permissionError: string | null;
    connectionError: string | null;
  };
}

interface VoiceMember {
  odattendeeId: string;
  oduserId: string;
  username?: string;
  muted: boolean;
  speaking: boolean;
  video: boolean;
}

interface VoiceState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
}



const VideoPlayer = ({
  isMuted = false,
  isLocal = false,
  username = "Unknown",
  voiceState,
  manager,
  tileId,
}: {
  isMuted?: boolean;
  isLocal?: boolean;
  username?: string;
  voiceState?: VoiceState;
  manager?: VoiceVideoManager | null;
  tileId?: number | null;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Bind/unbind Chime tile to video element
  useEffect(() => {
    if (!videoRef.current || !manager || tileId == null) return;

    manager.bindVideoElement(tileId, videoRef.current);

    return () => {
      manager.unbindVideoElement(tileId);
    };
  }, [manager, tileId]);

  const showVideo = tileId != null && voiceState?.video;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden relative w-full h-full min-h-0">
      {/* Always render video element when we have a tile — never unmount it */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted || isLocal}
        className={`w-full h-full object-cover ${
          showVideo ? "block" : "hidden"
        } ${isLocal ? "transform -scale-x-100" : ""}`}
      />

      {/* Avatar fallback when no video */}
      {!showVideo && (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
              <span className="text-2xl font-bold text-white">
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-300">{username}</p>
          </div>
        </div>
      )}

      {/* Voice indicators */}
      <div className="absolute bottom-2 left-2 flex space-x-1">
        {voiceState?.muted && (
          <div className="bg-red-600 rounded-full p-1">
            <FaMicrophoneSlash size={12} className="text-white" />
          </div>
        )}
        {voiceState?.speaking && !voiceState?.muted && (
          <div className="bg-green-600 rounded-full p-1 animate-pulse">
            <FaMicrophone size={12} className="text-white" />
          </div>
        )}
        {!voiceState?.video && (
          <div className="bg-gray-600 rounded-full p-1">
            <FaVideoSlash size={12} className="text-white" />
          </div>
        )}
      </div>

      {/* Username */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1">
        <span className="text-xs text-white">{username}</span>
      </div>
    </div>
  );
};



const VoiceChannel = ({
  channelId,
  userId,
  serverId,
  channelName,
  onHangUp,
  onMinimize,
  headless = false,
  onLocalStreamChange,
  onRemoteStreamAdded,
  onRemoteStreamRemoved,
  onVoiceRoster,
  externalManager,
  useExternalManager = false,
  currentUser: currentUserProp,
  externalState,
}: VoiceChannelProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<VoiceMember[]>([]);
  const [voiceStates, setVoiceStates] = useState<Map<string, VoiceState>>(
    new Map()
  );
  const [videoTiles, setVideoTiles] = useState<Map<number, VideoTileInfo>>(
    new Map()
  );
  const [localVideoTileId, setLocalVideoTileId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(currentUserProp || null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVoiceChannelConnected, setIsVoiceChannelConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isFetchingRoster, setIsFetchingRoster] = useState(false);

  const managerRef = useRef<VoiceVideoManager | null>(null);
  const isManagerInitialized = useRef(false);
  const socketRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const onLocalStreamChangeRef = useRef(onLocalStreamChange);
  const onRemoteStreamAddedRef = useRef(onRemoteStreamAdded);
  const onRemoteStreamRemovedRef = useRef(onRemoteStreamRemoved);
  const onVoiceRosterRef = useRef(onVoiceRoster);

  
  useEffect(() => {
    onLocalStreamChangeRef.current = onLocalStreamChange;
  });
  useEffect(() => {
    onRemoteStreamAddedRef.current = onRemoteStreamAdded;
  });
  useEffect(() => {
    onRemoteStreamRemovedRef.current = onRemoteStreamRemoved;
  });
  useEffect(() => {
    onVoiceRosterRef.current = onVoiceRoster;
  });


  useEffect(() => {
    if (!externalState || !useExternalManager) return;

    setIsConnected(externalState.isConnected);
    setIsVoiceChannelConnected(externalState.isConnected);
    setConnectionError(externalState.connectionError);
    setPermissionError(externalState.permissionError);
    setVideoTiles(externalState.videoTiles);
    setLocalVideoTileId(externalState.localVideoTileId);

    if (externalState.localMediaState) {
      setIsMuted(externalState.localMediaState.muted);
      setIsCameraOn(externalState.localMediaState.video);
    }

    if (externalState.participants?.length > 0) {
      setHasPermissions(true);
      setIsVoiceChannelConnected(true);

      const members: VoiceMember[] = externalState.participants.map((p) => ({
        odattendeeId: p.attendeeId,
        oduserId: p.oduserId || p.attendeeId,
        username: p.name || p.oduserId || `User ${p.attendeeId.slice(0, 8)}`,
        muted: p.muted ?? false,
        speaking: p.speaking ?? false,
        video: p.video ?? false,
      }));
      setVoiceMembers(members);

      const states = new Map<string, VoiceState>();
      externalState.participants.forEach((p) => {
        states.set(p.attendeeId, {
          muted: p.muted ?? false,
          speaking: p.speaking ?? false,
          video: p.video ?? false,
        });
      });
      setVoiceStates(states);
    }
  }, [externalState, useExternalManager]);

  // ── Reset state on channel change ───────────────────────────────────────
  useEffect(() => {
    setVoiceMembers([]);
    setVoiceStates(new Map());
    setVideoTiles(new Map());
    setLocalVideoTileId(null);
    setIsVoiceChannelConnected(false);
    if (!useExternalManager) {
      isManagerInitialized.current = false;
    }
  }, [channelId, useExternalManager]);

  // ── Socket: roster sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !channelId) return;

    if (!socketRef.current) {
      socketRef.current = createAuthSocket(userId);
    }
    const socket = socketRef.current;

    const mapMember = (m: any): VoiceMember => ({
      odattendeeId: m.socketId || m.odattendeeId || m.attendeeId || m.id,
      oduserId: m.userId || m.oduserId || m.username || m.id,
      username:
        m.username ||
        m.userId ||
        m.oduserId ||
        `User ${(m.userId || m.socketId || "").slice(0, 8)}`,
      muted: m.muted || false,
      speaking: m.speaking || false,
      video: m.video || false,
    });

    setIsFetchingRoster(true);
    socket.emit("get_voice_channel_roster", channelId, (data: any) => {
      if (!isMountedRef.current) return;
      if (data && Array.isArray(data.members)) {
        setVoiceMembers(data.members.map(mapMember));
      }
      setIsFetchingRoster(false);
    });

    const handleRoster = (data: any) => {
      if (!isMountedRef.current) return;
      if (data?.channelId === channelId && Array.isArray(data.members)) {
        setVoiceMembers(data.members.map(mapMember));
      }
    };

    socket.on("voice_channel_roster", handleRoster);

    return () => {
      socket.off("voice_channel_roster", handleRoster);
      // Don't disconnect socket on channel change — only on full unmount
    };
  }, [userId, channelId]);

  // Disconnect socket only on full unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // ── Manager init + event listeners ──────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    // Use external manager or create own
    if (useExternalManager && externalManager) {
      managerRef.current = externalManager;
      isManagerInitialized.current = true;
      setHasPermissions(true);
      setIsConnected(true);
    } else if (!managerRef.current) {
      managerRef.current = new VoiceVideoManager(userId);
    }

    const manager = managerRef.current;
    if (!manager) return;

    const setupListeners = () => {
      manager.onVoiceRoster((members) => {
        if (!isMountedRef.current) return;

        const mapped: VoiceMember[] = members.map((m) => ({
          odattendeeId: m.attendeeId,
          oduserId: m.oduserId || m.attendeeId,
          username:
            (m as any).odName ||
            (m as any).name ||
            m.oduserId ||
            `User ${m.attendeeId.slice(0, 8)}`,
          muted: m.muted ?? false,
          speaking: m.speaking ?? false,
          video: m.video ?? false,
        }));

        setVoiceMembers(mapped);
        setIsVoiceChannelConnected(true);
        onVoiceRosterRef.current?.(members);
      });

      manager.onUserJoined((attendeeId) => {
        if (!isMountedRef.current) return;
        setVoiceStates((prev) =>
          new Map(prev).set(attendeeId, {
            muted: false,
            speaking: false,
            video: false,
          })
        );
      });

      manager.onUserLeft((attendeeId) => {
        if (!isMountedRef.current) return;
        setVoiceStates((prev) => {
          const next = new Map(prev);
          next.delete(attendeeId);
          return next;
        });
        setVoiceMembers((prev) =>
          prev.filter((m) => m.odattendeeId !== attendeeId)
        );
        onRemoteStreamRemovedRef.current?.(attendeeId);
      });

      manager.onMediaState((attendeeId, state) => {
        if (!isMountedRef.current) return;
        setVoiceStates((prev) =>
          new Map(prev).set(attendeeId, {
            muted: state.muted ?? false,
            speaking: state.speaking ?? false,
            video: state.video ?? false,
          })
        );
        setVoiceMembers((prev) =>
          prev.map((m) =>
            m.odattendeeId === attendeeId ? { ...m, ...state } : m
          )
        );
      });

      manager.onVideoTileUpdated((tile) => {
        if (!isMountedRef.current) return;
        setVideoTiles((prev) => new Map(prev).set(tile.tileId, tile));
        if (tile.isLocal && !tile.isContent) {
          setLocalVideoTileId(tile.tileId);
        }
      });

      manager.onVideoTileRemoved((tileId) => {
        if (!isMountedRef.current) return;
        setVideoTiles((prev) => {
          const next = new Map(prev);
          next.delete(tileId);
          return next;
        });
        setLocalVideoTileId((prev) => (prev === tileId ? null : prev));
      });

      manager.onConnectionStateChange((connected) => {
        if (!isMountedRef.current) return;
        setIsConnected(connected);
        if (!connected) setIsVoiceChannelConnected(false);
      });

      manager.onError((error) => {
        if (!isMountedRef.current) return;
        setConnectionError(error.message);
      });
    };

    const init = async () => {
      if (useExternalManager) {
        setupListeners();
        return;
      }

      if (isManagerInitialized.current) {
        setupListeners();
        return;
      }

      try {
        setIsInitializing(true);
        setPermissionError(null);

        try {
          await manager.initialize(true, true);
        } catch {
          try {
            await manager.initializeAudioOnly();
            setPermissionError("Video permission denied. Audio-only mode.");
          } catch {
            await manager.initializeVideoOnly();
            setPermissionError("Audio permission denied. Video-only mode.");
          }
        }

        if (!isMountedRef.current) return;
        setHasPermissions(manager.hasAnyPermissions());
        setIsInitializing(false);
        setIsConnected(true);
        isManagerInitialized.current = true;

        setupListeners();
      } catch (error: any) {
        if (!isMountedRef.current) return;
        setIsInitializing(false);

        if (
          error.name === "NotAllowedError" ||
          error.message?.includes("permission")
        ) {
          setPermissionError("Camera and microphone access denied.");
        } else if (error.name === "NotFoundError") {
          setPermissionError("No camera or microphone found.");
        } else if (error.name === "NotReadableError") {
          setPermissionError("Camera or microphone is in use by another app.");
        } else {
          setPermissionError(`Media error: ${error.message}`);
        }
      }
    };

    init();

    // Load current user from localStorage
    if (typeof window !== "undefined" && !currentUserProp) {
      try {
        const stored = localStorage.getItem("user");
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch {}
    }

    return () => {
      isMountedRef.current = false;
      // Only disconnect if we own the manager
      if (!useExternalManager && managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
        isManagerInitialized.current = false;
      }
    };
  }, [userId, useExternalManager, externalManager]);

  // ── Join voice channel ───────────────────────────────────────────────────
  useEffect(() => {
    if (useExternalManager) return; // context handles joining

    const manager = managerRef.current;
    if (!manager || !isManagerInitialized.current || !hasPermissions) return;

    let cancelled = false;

    const join = async () => {
      try {
        setIsVoiceChannelConnected(false);
        await manager.joinVoiceChannel(channelId);
        if (cancelled) return;
        onLocalStreamChangeRef.current?.(null);
        setIsVoiceChannelConnected(true);
      } catch (error: any) {
        if (cancelled) return;
        setPermissionError("Failed to connect to voice channel.");
      }
    };

    join();

    return () => {
      cancelled = true;
      manager.leaveVoiceChannel();
      setIsVoiceChannelConnected(false);
    };
  }, [channelId, hasPermissions, useExternalManager]);

  // ── Controls ─────────────────────────────────────────────────────────────
  const handleToggleMute = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    const newMuted = !isMuted;
    manager.toggleAudio(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const handleToggleCamera = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;
    const newCameraOn = !isCameraOn;
    await manager.toggleVideo(newCameraOn);
    setIsCameraOn(newCameraOn);
  }, [isCameraOn]);

  const retryMediaAccess = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    isManagerInitialized.current = false;
    setIsInitializing(true);
    setPermissionError(null);

    try {
      await manager.initialize(true, true);
      setHasPermissions(manager.hasAnyPermissions());
      setIsInitializing(false);
      isManagerInitialized.current = true;
    } catch (error: any) {
      setIsInitializing(false);
      setPermissionError(`Media error: ${error.message}`);
    }
  }, []);

 
 const getTileIdForAttendee = useCallback(
   (attendeeId: string): number | null => {
     const entries = Array.from(videoTiles.entries());
     const found = entries.find(
       ([_, tile]) =>
         tile.attendeeId === attendeeId && !tile.isLocal && !tile.isContent
     );
     return found ? found[0] : null;
   },
   [videoTiles]
 );
  const currentUserVoiceState = useMemo<VoiceState>(
    () => ({ muted: isMuted, speaking: false, video: isCameraOn }),
    [isMuted, isCameraOn]
  );

  const currentUsername = useMemo(
    () =>
      currentUserProp?.username ||
      currentUser?.username ||
      currentUser?.fullname ||
      "You",
    [currentUserProp, currentUser]
  );

  // Filter out self from members list
  const remoteMembers = useMemo(
    () => voiceMembers.filter((m) => m.oduserId !== userId),
    [voiceMembers, userId]
  );


  const total = 1 + remoteMembers.length;
  const getLayout = (count: number) => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count === 3) return { cols: 3, rows: 1 };
    if (count === 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  };
  const { cols, rows } = getLayout(total);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (headless) return null;

  if (permissionError && !hasPermissions) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg flex flex-col items-center justify-center h-full text-center">
        <FaVideoSlash size={48} className="text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Media Access Required
        </h3>
        <p className="text-gray-300 mb-4 max-w-md">{permissionError}</p>
        <div className="flex space-x-3">
          <button
            onClick={retryMediaAccess}
            disabled={isInitializing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg"
          >
            {isInitializing ? "Requesting..." : "Try Again"}
          </button>
          <button
            onClick={onHangUp}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg flex flex-col items-center justify-center h-full">
        <div className="mb-4 animate-spin">
          <FaVideo size={48} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Connecting...</h3>
        <p className="text-gray-300">Requesting camera and microphone access</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-2 bg-gray-900 rounded-lg flex flex-col h-full">
      {/* Status bars */}
      {connectionError && (
        <div className="mb-2 p-2 bg-red-600 rounded text-center text-white text-sm">
          {connectionError}
        </div>
      )}
      {!isConnected && !connectionError && hasPermissions && (
        <div className="mb-2 p-2 bg-yellow-600 rounded text-center text-white text-sm">
          Reconnecting...
        </div>
      )}
      {isConnected && !isVoiceChannelConnected && !connectionError && (
        <div className="mb-2 p-2 bg-yellow-600 rounded text-center text-white text-sm">
          Joining voice channel...
        </div>
      )}

      {/* Video grid */}
      <div
        className="flex-1 min-h-0 p-1 gap-2"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {/* Local tile */}
        <VideoPlayer
          isLocal
          isMuted
          username={currentUsername}
          voiceState={currentUserVoiceState}
          manager={managerRef.current}
          tileId={localVideoTileId}
        />

        {/* Remote tiles — one per member, no duplicates */}
        {remoteMembers.map((member) => {
          const tileId = getTileIdForAttendee(member.odattendeeId);
          const voiceState = voiceStates.get(member.odattendeeId) ?? {
            muted: member.muted,
            speaking: member.speaking,
            video: member.video,
          };
          return (
            <VideoPlayer
              key={member.odattendeeId}
              username={
                member.username || `User ${member.odattendeeId.slice(0, 8)}`
              }
              voiceState={voiceState}
              manager={managerRef.current}
              tileId={tileId}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 mt-2 p-3 bg-gray-800 rounded-md flex-shrink-0">
        <button
          onClick={handleToggleMute}
          className={`p-3 rounded-full transition ${
            isMuted
              ? "bg-red-600 hover:bg-red-500"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <FaMicrophoneSlash size={20} className="text-white" />
          ) : (
            <FaMicrophone size={20} className="text-white" />
          )}
        </button>

        <button
          onClick={handleToggleCamera}
          className={`p-3 rounded-full transition ${
            !isCameraOn
              ? "bg-red-600 hover:bg-red-500"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
          title={isCameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {isCameraOn ? (
            <FaVideo size={20} className="text-white" />
          ) : (
            <FaVideoSlash size={20} className="text-white" />
          )}
        </button>

        <button
          onClick={onHangUp}
          className="p-3 rounded-full bg-red-600 hover:bg-red-500 transition"
          title="Leave"
        >
          <FaPhoneSlash size={20} className="text-white" />
        </button>

        {serverId && channelName && onMinimize && (
          <button
            onClick={onMinimize}
            className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 transition"
            title="Go back to chat"
          >
            <FaMinus size={20} className="text-white" />
          </button>
        )}

        {!hasPermissions && (
          <button
            onClick={retryMediaAccess}
            className="p-3 rounded-full bg-yellow-600 hover:bg-yellow-500 transition"
            title="Retry media access"
          >
            <FaRedo size={20} className="text-white" />
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="mt-2 p-2 bg-gray-800 rounded-md flex-shrink-0">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          Voice Members ({voiceMembers.length})
        </h4>
        {isFetchingRoster ? (
          <div className="text-xs text-gray-400">Loading members...</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {voiceMembers.map((member) => {
              const vs = voiceStates.get(member.odattendeeId);
              return (
                <div
                  key={member.odattendeeId}
                  className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1"
                >
                  <span className="text-xs text-white">{member.username}</span>
                  {(vs?.muted ?? member.muted) && (
                    <FaMicrophoneSlash size={10} className="text-red-400" />
                  )}
                  {(vs?.speaking ?? member.speaking) &&
                    !(vs?.muted ?? member.muted) && (
                      <FaMicrophone size={10} className="text-green-400" />
                    )}
                  {!(vs?.video ?? member.video) && (
                    <FaVideoSlash size={10} className="text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChannel;
