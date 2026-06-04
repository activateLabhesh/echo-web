"use client";

// src/components/VoiceInviteToast.tsx
// Toast notification component for incoming voice channel invites
// Displays at bottom-right of screen, similar to Discord's incoming call notification

import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, X } from "lucide-react";
import { VoiceInvite } from "@/hooks/useVoiceInviteNotifications";

// ==================== TYPES ====================

interface VoiceInviteToastProps {
  invites: VoiceInvite[];
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
  onClose: (inviteId: string) => void;
}

// ==================== COMPONENT ====================

const VoiceInviteToast: React.FC<VoiceInviteToastProps> = ({
  invites,
  onAccept,
  onDecline,
  onClose,
}) => {
  if (invites.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {invites.map((invite) => (
        <SingleInviteToast
          key={invite.id}
          invite={invite}
          onAccept={() => onAccept(invite.id)}
          onDecline={() => onDecline(invite.id)}
          onClose={() => onClose(invite.id)}
        />
      ))}
    </div>
  );
};

// ==================== SINGLE INVITE TOAST ====================

interface SingleInviteToastProps {
  invite: VoiceInvite;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

const SingleInviteToast: React.FC<SingleInviteToastProps> = ({
  invite,
  onAccept,
  onDecline,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, invite.expiresAt - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [invite.expiresAt]);

  // Calculate progress for the ring animation
  const progress = Math.max(0, timeLeft / 30); // Assuming 30 second timeout

  return (
    <div
      className={`
        bg-[#2b2d31] rounded-lg shadow-2xl border border-gray-700 overflow-hidden
        transform transition-all duration-300 ease-out
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      {/* Progress bar at top */}
      <div className="h-1 bg-gray-700">
        <div
          className="h-full bg-green-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="p-4">
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Inviter avatar with pulsing ring */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-[#5865f2] flex items-center justify-center overflow-hidden">
                {invite.inviterAvatar ? (
                  <img
                    src={invite.inviterAvatar}
                    alt={invite.inviterUsername}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-lg font-medium">
                    {invite.inviterUsername.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Pulsing ring animation */}
              <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-75" />
              <div className="absolute inset-0 rounded-full border-2 border-green-400" />
            </div>

            <div>
              <p className="text-white font-medium text-sm">
                {invite.inviterUsername}
              </p>
              <p className="text-gray-400 text-xs">invites you to voice</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Channel info */}
        <div className="bg-[#1e1f22] rounded-md p-3 mb-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-white text-sm font-medium">
                {invite.channelName}
              </p>
              <p className="text-gray-400 text-xs">{invite.serverName}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onDecline}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
          >
            <Phone className="w-4 h-4" />
            Join ({timeLeft}s)
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceInviteToast;
