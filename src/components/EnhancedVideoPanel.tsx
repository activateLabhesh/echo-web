"use client";

import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { VoiceVideoManager } from "@/lib/VoiceVideoManager";

/* ---------------------- INLINE SVG ICONS (a11y-safe) ---------------------- */

const IconMicrophone = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const IconMicrophoneSlash = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <line x1="1" y1="1" x2="23" y2="23"></line>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const IconVideo = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const IconVideoSlash = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const IconDesktop = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const IconExpand = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M15 3h6v6"></path>
    <path d="M9 21H3v-6"></path>
    <path d="M21 3l-7 7"></path>
    <path d="M3 21l7-7"></path>
  </svg>
);

const IconCompress = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 14h6v6"></path>
    <path d="M20 10h-6V4"></path>
    <path d="M14 10l7-7"></path>
    <path d="M3 21l7-7"></path>
  </svg>
);

const IconVolumeUp = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
  </svg>
);

const IconVolumeOff = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <line x1="23" y1="9" x2="17" y2="15"></line>
    <line x1="17" y1="9" x2="23" y2="15"></line>
  </svg>
);

/* --------------------------------- TYPES ---------------------------------- */

interface MediaState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
}

interface Participant {
  id: string;
  oduserId: string;
  username?: string;
  stream: MediaStream | null;
  screenStream?: MediaStream | null;
  tileId?: number; // Chime video tile ID for binding
  screenTileId?: number; // Chime screen share tile ID for binding
  isLocal?: boolean;
  mediaState: MediaState;
}

interface EnhancedVideoPanelProps {
  manager?: VoiceVideoManager | null;
  participants?: Participant[];
  localVideoTileId?: number | null;
  localMediaState?: MediaState;
  currentUser?: { username: string };
  collapsed?: boolean;
  onParticipantVolumeChange?: (participantId: string, volume: number) => void;
  // Legacy props for backward compatibility
  localStream?: MediaStream | null;
  localScreenStream?: MediaStream | null;
}

/* ---------------------------- PARTICIPANT TILE ---------------------------- */

const ParticipantVideo = memo(function ParticipantVideo({
  participant,
  manager,
  isLocal = false,
  isFullscreen = false,
  onToggleFullscreen,
  onVolumeChange
}: {
  participant: Participant;
  manager?: VoiceVideoManager | null;
  isLocal?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onVolumeChange?: (volume: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isVideoBound, setIsVideoBound] = useState(false);
  const [isScreenBound, setIsScreenBound] = useState(false);

  const hasVideoState = !!participant.mediaState.video;
  const hasScreenShareState = !!participant.mediaState.screenSharing;
  const hasScreenShareStream = !!(participant.screenStream && participant.mediaState.screenSharing);
  const hasVideoStream = !!(participant.stream && participant.stream.getVideoTracks().length > 0);
  const hasActiveVideoTrack =
    hasVideoStream && !!participant.stream?.getVideoTracks().some((t) => t.enabled);

  // Check if we have Chime video/screen tiles to bind
  const hasTileId = participant.tileId !== undefined && participant.tileId !== null;
  const hasScreenTileId = participant.screenTileId !== undefined && participant.screenTileId !== null;
  
  const shouldShowScreenShare = hasScreenShareStream || hasScreenShareState;
  // Show video if video state is ON - we need to render the <video> element
  // so that Chime can bind the tile to it. Don't wait for tile ID.
  const shouldShowVideo = hasVideoState && !shouldShowScreenShare;

  // Debug logging
  console.log(`[ParticipantVideo ${participant.username}] Render state:`, {
    hasVideoState,
    shouldShowScreenShare,
    shouldShowVideo,
    mediaState: participant.mediaState,
    tileId: participant.tileId
  });

  // Bind Chime video tile to video element
  // This effect handles binding the Chime SDK video tile to the HTML video element
  useEffect(() => {
    const tileId = participant.tileId;
    const videoEl = videoRef.current;
    
    console.log(`[ParticipantVideo] Tile binding check for ${participant.username}:`, {
      hasTileId: tileId !== undefined && tileId !== null,
      tileId,
      hasManager: !!manager,
      hasVideoRef: !!videoEl,
      isLocal,
      shouldShowVideo,
      hasVideoState
    });

    // Early return if we don't have what we need
    if (!manager || tileId === undefined || tileId === null) {
      return;
    }

    // Function to perform the binding with retry logic
    const bindTile = (retryCount = 0) => {
      const currentVideoEl = videoRef.current;
      
      if (!currentVideoEl) {
        // Video element not ready yet, retry after a short delay
        if (retryCount < 5) {
          console.log(`[ParticipantVideo] Video element not ready, retry ${retryCount + 1}/5 for tile ${tileId}`);
          setTimeout(() => bindTile(retryCount + 1), 100);
        } else {
          console.warn(`[ParticipantVideo] Video element never became available for tile ${tileId}`);
        }
        return;
      }

      console.log(`[ParticipantVideo] Binding tile ${tileId} for ${participant.username} (isLocal: ${isLocal})`);
      try {
        manager.bindVideoElement(tileId, currentVideoEl);
        setIsVideoBound(true);
        
        // Try to play the video
        currentVideoEl.play().catch(err => {
          // Autoplay might be blocked, that's okay - user interaction will start it
          console.warn(`[ParticipantVideo] Video autoplay blocked:`, err.message);
        });
        
        console.log(`[ParticipantVideo] Successfully bound tile ${tileId} for ${participant.username}`);
      } catch (err) {
        console.error(`[ParticipantVideo] Failed to bind video tile ${tileId}:`, err);
        // Retry on failure
        if (retryCount < 3) {
          setTimeout(() => bindTile(retryCount + 1), 200);
        }
      }
    };

    // Start binding process - use a small delay to ensure React has finished rendering
    const bindTimeout = setTimeout(() => bindTile(0), 50);

    return () => {
      clearTimeout(bindTimeout);
      // Unbind when unmounting or tile changes
      if (manager && tileId !== undefined && tileId !== null) {
        console.log(`[ParticipantVideo] Cleanup: Unbinding tile ${tileId} for ${participant.username}`);
        try {
          manager.unbindVideoElement(tileId);
        } catch (err) {
          // Ignore errors on cleanup
        }
        setIsVideoBound(false);
      }
    };
  }, [manager, participant.tileId, participant.username, isLocal, shouldShowVideo, hasVideoState]);

  // Bind Chime SCREEN SHARE tile to screen video element
  // Similar to video tile binding but for screen share content
  useEffect(() => {
    const screenTileId = participant.screenTileId;
    
    console.log(`[ParticipantVideo] Screen tile binding check for ${participant.username}:`, {
      hasScreenTileId: screenTileId !== undefined && screenTileId !== null,
      screenTileId,
      hasManager: !!manager,
      hasScreenRef: !!screenRef.current,
      shouldShowScreenShare,
      hasScreenShareState
    });

    // Early return if we don't have what we need
    if (!manager || screenTileId === undefined || screenTileId === null) {
      return;
    }

    // Function to perform the binding with retry logic
    const bindScreenTile = (retryCount = 0) => {
      const currentScreenEl = screenRef.current;
      
      if (!currentScreenEl) {
        // Screen element not ready yet, retry after a short delay
        if (retryCount < 5) {
          console.log(`[ParticipantVideo] Screen element not ready, retry ${retryCount + 1}/5 for screen tile ${screenTileId}`);
          setTimeout(() => bindScreenTile(retryCount + 1), 100);
        } else {
          console.warn(`[ParticipantVideo] Screen element never became available for tile ${screenTileId}`);
        }
        return;
      }

      console.log(`[ParticipantVideo] Binding screen tile ${screenTileId} for ${participant.username}`);
      try {
        manager.bindVideoElement(screenTileId, currentScreenEl);
        setIsScreenBound(true);
        
        // Try to play the video
        currentScreenEl.play().catch(err => {
          console.warn(`[ParticipantVideo] Screen share autoplay blocked:`, err.message);
        });
        
        console.log(`[ParticipantVideo] Successfully bound screen tile ${screenTileId} for ${participant.username}`);
      } catch (err) {
        console.error(`[ParticipantVideo] Failed to bind screen tile ${screenTileId}:`, err);
        // Retry on failure
        if (retryCount < 3) {
          setTimeout(() => bindScreenTile(retryCount + 1), 200);
        }
      }
    };

    // Start binding process - use a small delay to ensure React has finished rendering
    const bindTimeout = setTimeout(() => bindScreenTile(0), 50);

    return () => {
      clearTimeout(bindTimeout);
      // Unbind when unmounting or tile changes
      if (manager && screenTileId !== undefined && screenTileId !== null) {
        console.log(`[ParticipantVideo] Cleanup: Unbinding screen tile ${screenTileId} for ${participant.username}`);
        try {
          manager.unbindVideoElement(screenTileId);
        } catch (err) {
          // Ignore errors on cleanup
        }
        setIsScreenBound(false);
      }
    };
  }, [manager, participant.screenTileId, participant.username, shouldShowScreenShare, hasScreenShareState]);

  // Legacy: track video stream changes (for non-Chime usage)
  useEffect(() => {
    const tracks = participant.stream?.getVideoTracks() || [];
    const bump = () => setShowControls((s) => s);
    tracks.forEach((t) => {
      t.addEventListener("mute", bump);
      t.addEventListener("unmute", bump);
      t.addEventListener("ended", bump);
    });
    return () => {
      tracks.forEach((t) => {
        t.removeEventListener("mute", bump);
        t.removeEventListener("unmute", bump);
        t.removeEventListener("ended", bump);
      });
    };
  }, [participant.stream]);

  // Legacy: bind stream to video element (fallback if no Chime tile)
  useEffect(() => {
    // Skip if we're using Chime tile binding
    if (hasTileId && manager) return;

    const hasActiveCam =
      !!participant.stream && participant.stream.getVideoTracks().some((t) => t.enabled);
    if (videoRef.current && participant.stream && hasActiveCam) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
      videoRef.current.play().catch((err) => {
        console.warn(`Video play failed for ${participant.username}`, err);
      });
      videoRef.current.volume = isMuted ? 0 : volume;
    }
    return () => {
      if (videoRef.current && !participant.stream && !hasTileId) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [participant.stream, participant.mediaState.video, participant.mediaState.screenSharing, isMuted, volume, hasTileId, manager]);

  // Legacy: bind screen stream to screen element (fallback if no Chime screen tile)
  useEffect(() => {
    // Skip if we're using Chime screen tile binding
    if (hasScreenTileId && manager) return;

    if (screenRef.current && participant.screenStream && shouldShowScreenShare) {
      if (screenRef.current.srcObject !== participant.screenStream) {
        screenRef.current.srcObject = participant.screenStream;
      }
      screenRef.current.play().catch((err) => {
        console.warn(`Screen share play failed for ${participant.username}.`, err);
      });
      screenRef.current.volume = isMuted ? 0 : volume;
    }
  }, [participant.screenStream, shouldShowScreenShare, isMuted, volume, hasScreenTileId, manager]);

  useEffect(() => {
    if (audioRef.current && participant.stream) {
      if (audioRef.current.srcObject !== participant.stream) {
        audioRef.current.srcObject = participant.stream as any;
      }
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.play().catch(() => {});
    }
  }, [participant.stream, isMuted, volume]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      if (screenRef.current) {
        screenRef.current.pause();
        screenRef.current.srcObject = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, []);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
    if (screenRef.current) screenRef.current.volume = newVolume;
    if (audioRef.current) audioRef.current.volume = newVolume;
    onVolumeChange?.(newVolume);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    handleVolumeChange(newMuted ? 0 : volume);
  };

  return (
    <div
      className={`relative group bg-gray-900 rounded-lg overflow-hidden border-2 ${
        participant.mediaState.speaking && !participant.mediaState.muted
          ? "border-green-500"
          : "border-gray-700"
      } ${isFullscreen ? "fixed inset-0 z-50" : "aspect-video"}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {shouldShowScreenShare ? (
        <div className="relative w-full h-full">
          <video
            ref={screenRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-contain bg-black"
          />
          <div className="absolute top-2 left-2 bg-blue-600 bg-opacity-90 rounded px-2 py-1 flex items-center space-x-1">
            <IconDesktop size={12} className="text-white" />
            <span className="text-xs text-white">Screen</span>
          </div>
          {hasVideoState && hasActiveVideoTrack && (
            <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 rounded border border-gray-600 overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full object-cover ${isLocal ? "transform -scale-x-100" : ""}`}
              />
            </div>
          )}
        </div>
      ) : shouldShowVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? "transform -scale-x-100" : ""}`}
          style={{ backgroundColor: 'black' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
              <span className="text-2xl font-bold text-white">
                {participant.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <p className="text-sm text-gray-300">
              {participant.username || `User ${participant.oduserId}`}
            </p>
            {!participant.mediaState.video && (
              <p className="text-xs text-gray-500 mt-1">Camera off</p>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex space-x-1">
        {participant.mediaState.muted && (
          <div className="bg-red-600 rounded-full p-1">
            <IconMicrophoneSlash size={12} className="text-white" />
          </div>
        )}
        {participant.mediaState.speaking && !participant.mediaState.muted && (
          <div className="bg-green-600 rounded-full p-1 animate-pulse">
            <IconMicrophone size={12} className="text-white" />
          </div>
        )}
        {participant.mediaState.video ? (
          <div className="bg-gray-600 rounded-full p-1">
            <IconVideo size={12} className="text-white" />
          </div>
        ) : !shouldShowScreenShare && (
          <div className="bg-gray-600 rounded-full p-1">
            <IconVideoSlash size={12} className="text-white" />
          </div>
        )}
      </div>

      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 rounded px-2 py-1">
        <span className="text-xs text-white">
          {participant.username || `User ${participant.oduserId}`}
          {isLocal && ` (You)`}
        </span>
      </div>

      {showControls && !isLocal && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black bg-opacity-70 rounded-lg p-2 flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isMuted ? <IconVolumeOff size={14} /> : <IconVolumeUp size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16"
            />
          </div>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="bg-black bg-opacity-70 rounded p-2 text-white hover:text-gray-300 transition-colors"
            >
              {isFullscreen ? <IconCompress size={14} /> : <IconExpand size={14} />}
            </button>
          )}
        </div>
      )}

      {isFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-4 right-4 bg-black bg-opacity-70 rounded p-2 text-white hover:text-gray-300 transition-colors z-10"
        >
          <IconCompress size={16} />
        </button>
      )}

      {/* hidden audio so remote voice plays even when no <video> is visible */}
      <audio ref={audioRef} autoPlay className="hidden" />
    </div>
  );
},
(prev, next) => {
  const a = prev.participant;
  const b = next.participant;
  const same =
    a.id === b.id &&
    a.stream === b.stream &&
    a.screenStream === b.screenStream &&
    a.tileId === b.tileId &&
    a.screenTileId === b.screenTileId &&
    a.mediaState.muted === b.mediaState.muted &&
    a.mediaState.speaking === b.mediaState.speaking &&
    a.mediaState.video === b.mediaState.video &&
    a.mediaState.screenSharing === b.mediaState.screenSharing &&
    prev.isLocal === next.isLocal &&
    prev.isFullscreen === next.isFullscreen &&
    prev.manager === next.manager;
  return same;
});

/* ----------------------------- VIDEO PANEL UI ----------------------------- */

const EnhancedVideoPanel: React.FC<EnhancedVideoPanelProps> = ({
  manager,
  participants = [],
  localVideoTileId,
  localMediaState = { muted: false, speaking: false, video: false, screenSharing: false },
  currentUser,
  collapsed = false,
  onParticipantVolumeChange,
  // Legacy props
  localStream,
  localScreenStream
}) => {
  const [fullscreenParticipant, setFullscreenParticipant] = useState<string | null>(null);

  // Create local participant object
  const localParticipant: Participant = useMemo(
    () => ({
      id: "local",
      oduserId: "local",
      username: currentUser?.username || "You",
      stream: localStream || null,
      screenStream: localScreenStream || null,
      tileId: localVideoTileId !== null ? localVideoTileId : undefined,
      isLocal: true,
      mediaState: localMediaState
    }),
    [currentUser?.username, localStream, localScreenStream, localVideoTileId, localMediaState]
  );

  const allParticipants = useMemo(
    () => [localParticipant, ...participants],
    [localParticipant, participants]
  );

  const totalParticipants = allParticipants.length;

  const getGridLayout = (count: number, hasFullscreen: boolean) => {
    if (hasFullscreen) return { cols: "grid-cols-1", rows: "grid-rows-1" };
    if (count === 1) return { cols: "grid-cols-1", rows: "grid-rows-1" };
    if (count === 2) return { cols: "grid-cols-2", rows: "grid-rows-1" };
    if (count <= 4) return { cols: "grid-cols-2", rows: "grid-rows-2" };
    if (count <= 6) return { cols: "grid-cols-3", rows: "grid-rows-2" };
    if (count <= 9) return { cols: "grid-cols-3", rows: "grid-rows-3" };
    return { cols: "grid-cols-4", rows: "grid-rows-3" };
  };

  const layout = useMemo(
    () => getGridLayout(totalParticipants, !!fullscreenParticipant),
    [totalParticipants, fullscreenParticipant]
  );

  const toggleFullscreen = (participantId: string) => {
    setFullscreenParticipant((prev) => (prev === participantId ? null : participantId));
  };

  const handleParticipantVolumeChange = (participantId: string, volume: number) => {
    onParticipantVolumeChange?.(participantId, volume);
  };

  if (collapsed) return <div className="w-full h-0 overflow-hidden" />;

  const isFullscreenMode = !!fullscreenParticipant;

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <div className={`grid ${layout.cols} ${layout.rows} gap-2 w-full h-full p-2`}>
        {allParticipants
          .filter((p) => !isFullscreenMode || p.id === fullscreenParticipant)
          .map((participant) => (
            <ParticipantVideo
              key={participant.id}
              participant={participant}
              manager={manager}
              isLocal={participant.id === "local" || participant.isLocal}
              isFullscreen={participant.id === fullscreenParticipant}
              onToggleFullscreen={() => toggleFullscreen(participant.id)}
              onVolumeChange={(v) => handleParticipantVolumeChange(participant.id, v)}
            />
          ))}
      </div>

      {!isFullscreenMode && totalParticipants > 1 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded px-3 py-1">
          <span className="text-white text-sm">
            {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {!isFullscreenMode && totalParticipants > 12 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded px-3 py-1">
          <span className="text-white text-sm">+{totalParticipants - 12} more</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoPanel;
