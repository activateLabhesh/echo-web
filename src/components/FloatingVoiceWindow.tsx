"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import Draggable from "react-draggable";
import type { DraggableData, DraggableEvent } from "react-draggable";
import { usePathname, useRouter } from "next/navigation";
import { useVoiceCall } from "@/contexts/VoiceCallContext";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaExpand,
  FaUsers,
} from "react-icons/fa";
import { VoiceRosterMember } from "@/lib/VoiceVideoManager";

const POSITION_STORAGE_KEY = "floating-voice-window-position";
const DEFAULT_POSITION = { x: -20, y: -20 };

interface UIParticipant extends VoiceRosterMember {
  username: string;
  tileId?: number;
}

interface Position {
  x: number;
  y: number;
}

interface FloatingVoiceWindowProps {
  currentServerId?: string | null;
}

const FloatingVoiceWindow: React.FC<FloatingVoiceWindowProps> = ({
  currentServerId,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const nodeRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    activeCall,
    isConnected,
    participants,
    localMediaState,
    bindVideoElement,
    unbindVideoElement,
    toggleAudio,
    toggleVideo,
    leaveCall,
  } = useVoiceCall();

  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [viewedServerId, setViewedServerId] = useState<string | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const DragWrapper: any = Draggable;

  /* ---------------- position ---------------- */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(parsed);
        }
      }
    } catch {}
    setIsPositionLoaded(true);
  }, []);

  const handleDragStop = (_e: DraggableEvent, data: DraggableData) => {
    const pos = { x: data.x, y: data.y };
    setPosition(pos);
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos));
  };

  /* ---------------- view sync ---------------- */

  useEffect(() => {
    const update = () => {
      setViewedServerId(localStorage.getItem("currentViewedServerId"));
      setCurrentViewMode(localStorage.getItem("currentViewMode"));
    };

    update();
    window.addEventListener("storage", update);
    const interval = setInterval(update, 500);

    return () => {
      window.removeEventListener("storage", update);
      clearInterval(interval);
    };
  }, []);

  const isOnServersPage = pathname === "/servers";
  const effectiveServerId = currentServerId || viewedServerId;
  const isViewingSameServer = effectiveServerId === activeCall?.serverId;
  const isInVoiceView = currentViewMode === "voice";

  const shouldShowFloating =
    !isOnServersPage || !isViewingSameServer || !isInVoiceView;

  useEffect(() => {
    setIsVisible(shouldShowFloating);
  }, [shouldShowFloating]);

  /* ---------------- SAFE ACTIVE SPEAKER ---------------- */

  const focusedParticipant = useMemo<UIParticipant | null>(() => {
    const safeParticipants: UIParticipant[] = participants.map((p) => ({
      ...p,
      muted: p.muted ?? false,
      speaking: p.speaking ?? false,
      video: p.video ?? false,
      screenSharing: p.screenSharing ?? false,
      tileId: (p as any).tileId, // temporary until you wire tiles properly
      username: p.attendeeId,
    }));

    // Prefer participant with video
    const withVideo = safeParticipants.find((p) => p.video && p.tileId);
    if (withVideo) return withVideo;

    // Otherwise last speaker
    const lastSpeaker = [...safeParticipants]
      .reverse()
      .find((p) => p.speaking && p.tileId);

    return lastSpeaker || null;
  }, [participants]);

  /* ---------------- VIDEO BINDING ---------------- */

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (!isVisible) return;
    if (!focusedParticipant?.tileId) return;
    if (!focusedParticipant.video) return;

    const tileId = focusedParticipant.tileId;

    bindVideoElement(tileId, videoEl);
    videoEl.play().catch(() => {});

    return () => {
      unbindVideoElement(tileId);
    };
  }, [focusedParticipant?.tileId, focusedParticipant?.video, isVisible]);

  /* ---------------- exit guards ---------------- */

  if (!activeCall || !isPositionLoaded || !shouldShowFloating) {
    return null;
  }

  /* ---------------- render ---------------- */

  return (
    <DragWrapper
      nodeRef={nodeRef}
      defaultPosition={position}
      onStop={handleDragStop}
      bounds="parent"
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        className="fixed bottom-6 right-6 z-50 select-none"
        style={{ touchAction: "none" }}
      >
        <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden w-64">
          <div className="drag-handle cursor-move bg-gray-800 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                }`}
              />
              <div className="truncate">
                <p className="text-white text-sm font-medium truncate">
                  {activeCall.channelName}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {activeCall.serverName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <FaUsers size={12} />
              <span className="text-xs">{participants.length}</span>
            </div>
          </div>

          <div className="relative bg-black aspect-video">
            {focusedParticipant?.tileId && focusedParticipant.video ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <span className="text-lg font-bold text-white">
                      {(focusedParticipant?.username || "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">Camera off</p>
                </div>
              </div>
            )}

            {localMediaState.muted && (
              <div className="absolute top-2 left-2 bg-red-600 rounded-full p-1">
                <FaMicrophoneSlash size={10} className="text-white" />
              </div>
            )}
          </div>

          <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAudio(localMediaState.muted)}
                className={`p-2 rounded-full ${
                  localMediaState.muted ? "bg-red-600" : "bg-gray-700"
                }`}
              >
                {localMediaState.muted ? (
                  <FaMicrophoneSlash size={14} />
                ) : (
                  <FaMicrophone size={14} />
                )}
              </button>

              <button
                onClick={() => toggleVideo(!localMediaState.video)}
                className={`p-2 rounded-full ${
                  !localMediaState.video ? "bg-red-600" : "bg-gray-700"
                }`}
              >
                {localMediaState.video ? (
                  <FaVideo size={14} />
                ) : (
                  <FaVideoSlash size={14} />
                )}
              </button>

              <button
                onClick={leaveCall}
                className="p-2 rounded-full bg-red-600"
              >
                <FaPhoneSlash size={14} />
              </button>
            </div>

            <button
              onClick={() =>
                router.push(
                  `/servers?serverId=${activeCall.serverId}&view=voice&t=${Date.now()}`
                )
              }
              className="p-2 rounded-full bg-blue-600"
            >
              <FaExpand size={14} />
            </button>
          </div>
        </div>
      </div>
    </DragWrapper>
  );
};

export default FloatingVoiceWindow;
