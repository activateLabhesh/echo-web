"use client";

// src/components/MinimizedCallBar.tsx
// Floating call bar that appears when a call is minimized

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { callStateManager, ActiveCallState } from "@/lib/CallStateManager";

// Icons (using inline SVGs to avoid dependency issues)
const PhoneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const VideoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const MaximizeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const MicIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

export function MinimizedCallBar() {
  const router = useRouter();
  const [callState, setCallState] = useState<ActiveCallState | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Subscribe to call state changes
  useEffect(() => {
    return callStateManager.subscribe(setCallState);
  }, []);

  // Update mute state from manager
  useEffect(() => {
    const manager = callStateManager.getManager();
    if (manager) {
      setIsMuted(manager.getMediaState().muted);
    }
  }, [callState]);

  // Timer for call duration
  useEffect(() => {
    if (!callState) {
      setElapsed(0);
      return;
    }

    // Initial calculation
    setElapsed(Math.floor((Date.now() - callState.startTime.getTime()) / 1000));

    const interval = setInterval(() => {
      const seconds = Math.floor(
        (Date.now() - callState.startTime.getTime()) / 1000
      );
      setElapsed(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState?.startTime]);

  const handleMaximize = useCallback(() => {
    if (callState) {
      // Navigate to the voice channel
      router.push(
        `/server/${callState.serverId}/channel/${callState.channelId}`
      );
      callStateManager.maximizeCall();
    }
  }, [callState, router]);

  const handleEndCall = useCallback(() => {
    callStateManager.endCall();
  }, []);

  const handleToggleMute = useCallback(() => {
    const manager = callStateManager.getManager();
    if (manager) {
      manager.toggleAudio(isMuted); // If muted, unmute (pass true to enable)
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Only show when minimized
  if (!callState?.isMinimized) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-zinc-700/50 z-50 overflow-hidden transition-all duration-300 hover:shadow-green-500/20">
      {/* Green accent bar - animated pulse */}
      <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400 animate-pulse" />

      <div className="p-3 flex items-center gap-3">
        {/* Call icon with pulse animation */}
        <div className="relative">
          <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
            {callState.callType === "video" ? <VideoIcon /> : <PhoneIcon />}
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 w-11 h-11 bg-green-500 rounded-full animate-ping opacity-20" />
        </div>

        {/* Call info */}
        <div className="min-w-[100px]">
          <p className="text-sm font-semibold text-white truncate max-w-[140px]">
            {callState.channelName || "Voice Call"}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-xs text-green-400 font-medium tabular-nums">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 ml-2">
          {/* Mute toggle */}
          <button
            onClick={handleToggleMute}
            className={`p-2.5 rounded-full transition-all duration-200 ${
              isMuted
                ? "bg-red-500/90 hover:bg-red-600 shadow-lg shadow-red-500/30"
                : "bg-zinc-700/80 hover:bg-zinc-600"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOffIcon /> : <MicIcon />}
          </button>

          {/* Maximize/Return to call */}
          <button
            onClick={handleMaximize}
            className="p-2.5 bg-zinc-700/80 hover:bg-zinc-600 rounded-full transition-all duration-200 hover:scale-105"
            title="Return to call"
          >
            <MaximizeIcon />
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            className="p-2.5 bg-red-500/90 hover:bg-red-600 rounded-full transition-all duration-200 shadow-lg shadow-red-500/30 hover:scale-105"
            title="End call"
          >
            <PhoneOffIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MinimizedCallBar;
