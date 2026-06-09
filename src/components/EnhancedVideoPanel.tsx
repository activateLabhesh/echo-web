"use client";

import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { VoiceVideoManager } from "@/lib/VoiceVideoManager";

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
  localScreenTileId?: number | null;
  localMediaState?: MediaState;
  currentUser?: { username: string };
  collapsed?: boolean;
  // Legacy props for backward compatibility
  localStream?: MediaStream | null;
  localScreenStream?: MediaStream | null;
}

/* ---------------------------- PARTICIPANT TILE ---------------------------- */

const ParticipantVideo = memo(
  function ParticipantVideo({
    participant,
    manager,
    isLocal = false,
    isFullscreen = false,
    variant = "default",
    cameraOnly = false,
    onToggleFullscreen,
  }: {
    participant: Participant;
    manager?: VoiceVideoManager | null;
    isLocal?: boolean;
    isFullscreen?: boolean;
    variant?: "default" | "stage" | "thumbnail" | "grid";
    cameraOnly?: boolean;
    onToggleFullscreen?: () => void;
  }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const screenRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [isVideoBound, setIsVideoBound] = useState(false);
    const [isScreenBound, setIsScreenBound] = useState(false);

    const hasTileId =
      participant.tileId !== undefined && participant.tileId !== null;
    const hasVideoState = !!participant.mediaState.video || hasTileId;
    const hasScreenShareState = !!participant.mediaState.screenSharing;
    const hasScreenShareStream = !!(
      participant.screenStream && participant.mediaState.screenSharing
    );
    const hasVideoStream = !!(
      participant.stream && participant.stream.getVideoTracks().length > 0
    );
    const hasActiveVideoTrack =
      hasVideoStream &&
      !!participant.stream?.getVideoTracks().some((t) => t.enabled);

    const hasScreenTileId =
      participant.screenTileId !== undefined &&
      participant.screenTileId !== null;

    // Local sharer must use the capture MediaStream — Chime tile bind shows black locally
    const useLocalScreenStream =
      isLocal &&
      (hasScreenShareState ||
        (!!participant.screenStream &&
          participant.screenStream.getVideoTracks().length > 0));
    const hasLocalScreenStreamReady =
      isLocal &&
      !!participant.screenStream &&
      participant.screenStream.getVideoTracks().length > 0;
    // Never tile-bind local screen share (always black); remote viewers use tiles
    const useRemoteScreenTile = !isLocal && hasScreenTileId && !!manager;

    const shouldShowScreenShare =
      !cameraOnly &&
      (hasScreenShareStream ||
        hasScreenShareState ||
        useRemoteScreenTile ||
        useLocalScreenStream);
    const shouldShowCameraPiP =
      hasVideoState && (hasActiveVideoTrack || hasTileId) && shouldShowScreenShare;
    const shouldShowVideo =
      (hasVideoState || hasTileId) && !shouldShowScreenShare;
    const shouldBindVideoTile =
      hasTileId && !!manager && (shouldShowVideo || shouldShowCameraPiP);

    // Bind Chime video tile to video element
    // This effect handles binding the Chime SDK video tile to the HTML video element
    useEffect(() => {
      const tileId = participant.tileId;
      const videoEl = videoRef.current;

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
            setTimeout(() => bindTile(retryCount + 1), 100);
          } else {
            console.warn(
              `[ParticipantVideo] Video element never became available for tile ${tileId}`
            );
          }
          return;
        }

        try {
          manager.bindVideoElement(tileId, currentVideoEl);
          setIsVideoBound(true);

          // Try to play the video
          currentVideoEl.play().catch((err) => {
            // Autoplay might be blocked, that's okay - user interaction will start it
            console.warn(
              `[ParticipantVideo] Video autoplay blocked:`,
              err.message
            );
          });
        } catch (err) {
          console.error(
            `[ParticipantVideo] Failed to bind video tile ${tileId}:`,
            err
          );
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
          try {
            manager.unbindVideoElement(tileId);
          } catch (err) {
            // Ignore errors on cleanup
          }
          setIsVideoBound(false);
        }
      };
    }, [
      manager,
      participant.tileId,
      participant.username,
      isLocal,
      shouldBindVideoTile,
      shouldShowCameraPiP,
      hasVideoState,
    ]);

    // Bind Chime SCREEN SHARE tile to screen video element (remote participants only)
    useEffect(() => {
      const screenTileId = participant.screenTileId;

      if (!useRemoteScreenTile || screenTileId === undefined || screenTileId === null) {
        return;
      }

      // Function to perform the binding with retry logic
      const bindScreenTile = (retryCount = 0) => {
        const currentScreenEl = screenRef.current;

        if (!currentScreenEl) {
          // Screen element not ready yet, retry after a short delay
          if (retryCount < 5) {
            setTimeout(() => bindScreenTile(retryCount + 1), 100);
          } else {
            console.warn(
              `[ParticipantVideo] Screen element never became available for tile ${screenTileId}`
            );
          }
          return;
        }

        try {
          manager.bindVideoElement(screenTileId, currentScreenEl);
          setIsScreenBound(true);

          // Try to play the video
          currentScreenEl.play().catch((err) => {
            console.warn(
              `[ParticipantVideo] Screen share autoplay blocked:`,
              err.message
            );
          });
        } catch (err) {
          console.error(
            `[ParticipantVideo] Failed to bind screen tile ${screenTileId}:`,
            err
          );
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
          try {
            manager.unbindVideoElement(screenTileId);
          } catch (err) {
            // Ignore errors on cleanup
          }
          setIsScreenBound(false);
        }
      };
    }, [
      manager,
      participant.screenTileId,
      participant.username,
      useRemoteScreenTile,
      shouldShowScreenShare,
      hasScreenShareState,
    ]);

    // Local screen share preview via capture stream (Chime SDK requirement)
    useEffect(() => {
      const screenStream = participant.screenStream;
      if (!hasLocalScreenStreamReady || !screenStream) {
        return;
      }

      const bindLocalScreen = (retryCount = 0) => {
        const screenEl = screenRef.current;
        if (!screenEl) {
          if (retryCount < 5) {
            setTimeout(() => bindLocalScreen(retryCount + 1), 100);
          }
          return;
        }

        if (screenEl.srcObject !== screenStream) {
          screenEl.srcObject = screenStream;
        }
        screenEl.play().catch((err) => {
          console.warn(
            `[ParticipantVideo] Local screen preview play failed:`,
            err.message
          );
        });
      };

      const bindTimeout = setTimeout(() => bindLocalScreen(0), 50);

      return () => {
        clearTimeout(bindTimeout);
        if (screenRef.current) {
          screenRef.current.pause();
          screenRef.current.srcObject = null;
        }
      };
    }, [
      hasLocalScreenStreamReady,
      participant.screenStream,
      participant.username,
      isLocal,
    ]);

    // Legacy: track video stream changes (for non-Chime usage)
    // useEffect(() => {
    //   const tracks = participant.stream?.getVideoTracks() || [];
    //   const bump = () => setShowControls((s) => s);
    //   tracks.forEach((t) => {
    //     t.addEventListener("mute", bump);
    //     t.addEventListener("unmute", bump);
    //     t.addEventListener("ended", bump);
    //   });
    //   return () => {
    //     tracks.forEach((t) => {
    //       t.removeEventListener("mute", bump);
    //       t.removeEventListener("unmute", bump);
    //       t.removeEventListener("ended", bump);
    //     });
    //   };
    // }, [participant.stream]);

    // Legacy: bind stream to video element (fallback if no Chime tile)
    useEffect(() => {
      // Skip if we're using Chime tile binding
      if (hasTileId && manager) return;

      const hasActiveCam =
        !!participant.stream &&
        participant.stream.getVideoTracks().some((t) => t.enabled);
      if (videoRef.current && participant.stream && hasActiveCam) {
        if (videoRef.current.srcObject !== participant.stream) {
          videoRef.current.srcObject = participant.stream;
        }
        videoRef.current.play().catch((err) => {
          console.warn(`Video play failed for ${participant.username}`, err);
        });
      }
      return () => {
        if (videoRef.current && !participant.stream && !hasTileId) {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        }
      };
    }, [
      participant.stream,
      participant.mediaState.video,
      participant.mediaState.screenSharing,
      hasTileId,
      manager,
    ]);

    // Legacy: bind screen stream to screen element (non-Chime fallback)
    useEffect(() => {
      if (useLocalScreenStream || useRemoteScreenTile) return;

      if (
        screenRef.current &&
        participant.screenStream &&
        shouldShowScreenShare
      ) {
        if (screenRef.current.srcObject !== participant.screenStream) {
          screenRef.current.srcObject = participant.screenStream;
        }
        screenRef.current.play().catch((err) => {
          console.warn(
            `Screen share play failed for ${participant.username}.`,
            err
          );
        });
      }
    }, [
      participant.screenStream,
      shouldShowScreenShare,
      useLocalScreenStream,
      useRemoteScreenTile,
      manager,
    ]);

    useEffect(() => {
      if (audioRef.current && participant.stream) {
        if (audioRef.current.srcObject !== participant.stream) {
          audioRef.current.srcObject = participant.stream as any;
        }
        audioRef.current.play().catch(() => {});
      }
    }, [participant.stream]);

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

    const containerClass =
      variant === "stage"
        ? "absolute inset-0 h-full w-full"
        : variant === "thumbnail" || variant === "grid"
          ? "h-full w-full"
          : isFullscreen
            ? "fixed inset-0 z-50"
            : "h-full w-full";

    const avatarSizeClass =
      variant === "thumbnail" ? "h-8 w-8 text-sm" : "h-16 w-16 text-2xl";

    return (
      <div
        className={`relative group bg-gray-900 rounded-lg overflow-hidden border-2 ${
          participant.mediaState.speaking && !participant.mediaState.muted
            ? "border-green-500"
            : "border-gray-700"
        } ${containerClass}`}
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
            {shouldShowCameraPiP && variant !== "thumbnail" && (
              <div className="absolute bottom-4 right-4 h-24 w-32 bg-gray-800 rounded border border-gray-600 overflow-hidden z-10">
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
            style={{ backgroundColor: "black" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-800">
            <div className="text-center px-2">
              <div
                className={`mx-auto mb-1 flex items-center justify-center rounded-full bg-gray-600 font-bold text-white ${avatarSizeClass}`}
              >
                <span>
                  {participant.username?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              {variant !== "thumbnail" && (
                <>
                  <p className="truncate text-sm text-gray-300">
                    {participant.username || `User ${participant.oduserId}`}
                  </p>
                  {!participant.mediaState.video && (
                    <p className="mt-1 text-xs text-gray-500">Camera off</p>
                  )}
                </>
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
          ) : (
            !shouldShowScreenShare && (
              <div className="bg-gray-600 rounded-full p-1">
                <IconVideoSlash size={12} className="text-white" />
              </div>
            )
          )}
        </div>

        {variant !== "thumbnail" && (
          <div className="absolute bottom-2 right-2 max-w-[45%] rounded bg-black/70 px-2 py-1">
            <span className="block truncate text-xs text-white">
              {participant.username || `User ${participant.oduserId}`}
              {isLocal && " (You)"}
            </span>
          </div>
        )}

        {variant === "thumbnail" && (
          <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-[10px] text-white">
            {participant.username || "User"}
            {isLocal && " (You)"}
          </div>
        )}

        {onToggleFullscreen && !isFullscreen && variant !== "thumbnail" && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="absolute top-2 right-2 rounded bg-black/60 p-1.5 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100"
            aria-label="Fullscreen"
          >
            <IconExpand size={14} />
          </button>
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
      prev.variant === next.variant &&
      prev.cameraOnly === next.cameraOnly &&
      prev.manager === next.manager;
    return same;
  }
);

const isParticipantScreenSharing = (participant: Participant): boolean =>
  !!participant.mediaState.screenSharing ||
  (participant.screenTileId !== undefined &&
    participant.screenTileId !== null) ||
  !!(
    participant.screenStream &&
    participant.screenStream.getVideoTracks().length > 0
  );

/* ----------------------------- VIDEO PANEL UI ----------------------------- */

const EnhancedVideoPanel: React.FC<EnhancedVideoPanelProps> = ({
  manager,
  participants = [],
  localVideoTileId,
  localScreenTileId,
  localMediaState = {
    muted: false,
    speaking: false,
    video: false,
    screenSharing: false,
  },
  currentUser,
  collapsed = false,
  // Legacy props
  localStream,
  localScreenStream,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const [isPanelFullscreen, setIsPanelFullscreen] = useState(false);

  const [fullscreenParticipant, setFullscreenParticipant] = useState<
    string | null
  >(null);
  const [focusedStageId, setFocusedStageId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const togglePanelFullscreen = async () => {
    if (!panelRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await panelRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen failed:", err);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsPanelFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const localParticipant: Participant = useMemo(
    () => ({
      id: "local",
      oduserId: "local",
      username: currentUser?.username || "You",
      stream: localStream || null,
      screenStream: localScreenStream || null,
      tileId: localVideoTileId !== null ? localVideoTileId : undefined,
      screenTileId:
        localScreenTileId !== null ? localScreenTileId : undefined,
      isLocal: true,
      mediaState: localMediaState,
    }),
    [
      currentUser?.username,
      localStream,
      localScreenStream,
      localVideoTileId,
      localScreenTileId,
      localMediaState,
    ]
  );

  // Filter out any remote participants that might be the local user
  // (this can happen when using external manager from VoiceCallContext)
  // We identify the local user by checking multiple criteria
  const allParticipants = useMemo(() => {
    const localUsername = currentUser?.username || "";

    // Filter out participants that are actually the local user
    // (they will be represented by localParticipant instead)
    const remoteParticipants = participants.filter((p) => {
      // Keep participant if they are NOT the local user
      // A participant is local if:
      // 1. Their id is "local"
      // 2. Their isLocal flag is true
      // 3. Their username matches the currentUser's username
      // 4. Their oduserId matches the currentUser's username (Chime uses username as externalUserId)
      if (p.id === "local" || p.isLocal) {
        return false; // Filter out - this is the local user
      }

      // Also check if username matches (for cases where isLocal wasn't set correctly)
      if (
        localUsername &&
        (p.username === localUsername || p.oduserId === localUsername)
      ) {
        return false; // Filter out - this is the local user
      }

      return true;
    });

    return [localParticipant, ...remoteParticipants];
  }, [localParticipant, participants, currentUser?.username]);

  const totalParticipants = allParticipants.length;

  const screenSharers = useMemo(
    () => allParticipants.filter(isParticipantScreenSharing),
    [allParticipants]
  );

  const hasStageLayout = screenSharers.length > 0;

  useEffect(() => {
    if (!hasStageLayout) {
      setFocusedStageId(null);
      return;
    }

    setFocusedStageId((current) => {
      if (current && screenSharers.some((p) => p.id === current)) {
        return current;
      }
      const nextId = screenSharers[screenSharers.length - 1]?.id ?? null;
      setHighlightedId((prev) => prev ?? nextId);
      return nextId;
    });
  }, [hasStageLayout, screenSharers]);

  const stageParticipant = useMemo(() => {
    if (!hasStageLayout || !focusedStageId) return null;
    return allParticipants.find((p) => p.id === focusedStageId) ?? null;
  }, [hasStageLayout, focusedStageId, allParticipants]);

  const gridColumnClass = useMemo(() => {
    if (totalParticipants <= 1) return "grid-cols-1";
    if (totalParticipants <= 2) return "grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-3";
    if (totalParticipants <= 9) return "grid-cols-3";
    return "grid-cols-4";
  }, [totalParticipants]);

  const handleFilmstripSelect = (participant: Participant) => {
    setHighlightedId(participant.id);
    if (isParticipantScreenSharing(participant)) {
      setFocusedStageId(participant.id);
    }
  };

  const toggleFullscreen = (participantId: string) => {
    setFullscreenParticipant((prev) =>
      prev === participantId ? null : participantId
    );
  };

  if (collapsed) return <div className="w-full h-0 overflow-hidden" />;

  const isFullscreenMode = !!fullscreenParticipant;

  return (
    <div
      ref={panelRef}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-black"
    >
      {hasStageLayout && stageParticipant && !isFullscreenMode ? (
        <>
          {/* Main stage: screen share */}
          <div className="relative min-h-0 flex-1 overflow-hidden p-2">
            <div className="relative h-full w-full overflow-hidden rounded-lg">
              <ParticipantVideo
                key={`stage-${stageParticipant.id}`}
                participant={stageParticipant}
                manager={manager}
                isLocal={
                  stageParticipant.id === "local" || stageParticipant.isLocal
                }
                variant="stage"
                onToggleFullscreen={() =>
                  toggleFullscreen(stageParticipant.id)
                }
              />
            </div>
          </div>

          {/* Filmstrip: fixed-height participant row */}
          <div className="shrink-0 border-t border-gray-800 bg-[#111214] px-2 py-2">
            <div className="flex h-[88px] gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-700">
              {allParticipants.map((participant) => {
                const isPresenter = participant.id === stageParticipant.id;
                const isSharing = isParticipantScreenSharing(participant);
                const isHighlighted =
                  participant.id === highlightedId || isPresenter;

                return (
                  <div
                    key={`thumb-${participant.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleFilmstripSelect(participant)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleFilmstripSelect(participant);
                      }
                    }}
                    className={`relative h-full w-[124px] shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
                      isPresenter
                        ? "border-blue-500 ring-1 ring-blue-500/40"
                        : isHighlighted
                          ? "border-gray-500"
                          : "border-gray-700 hover:border-gray-500"
                    }`}
                    title={
                      isSharing
                        ? `${participant.username || "User"} — presenting`
                        : participant.username || "User"
                    }
                  >
                    <ParticipantVideo
                      participant={participant}
                      manager={manager}
                      isLocal={
                        participant.id === "local" || participant.isLocal
                      }
                      variant="thumbnail"
                      cameraOnly={isSharing}
                    />
                    {isSharing && (
                      <div className="pointer-events-none absolute left-1 top-1 flex items-center gap-0.5 rounded bg-blue-600/90 px-1 py-0.5">
                        <IconDesktop size={8} className="text-white" />
                        <span className="text-[8px] font-medium text-white">
                          LIVE
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
          <div
            className={`grid ${gridColumnClass} auto-rows-fr gap-2`}
            style={{ gridAutoRows: "minmax(140px, 1fr)" }}
          >
            {allParticipants
              .filter((p) => !isFullscreenMode || p.id === fullscreenParticipant)
              .map((participant) => (
                <div
                  key={participant.id}
                  className="aspect-video w-full min-h-[120px]"
                >
                  <ParticipantVideo
                    participant={participant}
                    manager={manager}
                    isLocal={
                      participant.id === "local" || participant.isLocal
                    }
                    isFullscreen={participant.id === fullscreenParticipant}
                    variant="grid"
                    onToggleFullscreen={() =>
                      toggleFullscreen(participant.id)
                    }
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={togglePanelFullscreen}
        className={`absolute right-3 z-50 rounded-lg bg-black/80 px-3 py-1.5 text-xs text-white transition hover:bg-black ${
          hasStageLayout && !isFullscreenMode ? "bottom-[6.75rem]" : "bottom-3"
        }`}
      >
        {isPanelFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>

      {!isFullscreenMode && totalParticipants > 1 && (
        <div className="pointer-events-none absolute left-3 top-3 z-40 rounded bg-black/70 px-3 py-1">
          <span className="text-xs text-white sm:text-sm">
            {totalParticipants} participant
            {totalParticipants !== 1 ? "s" : ""}
            {screenSharers.length > 0 &&
              ` · ${screenSharers[0]?.username || "Someone"} presenting`}
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoPanel;
