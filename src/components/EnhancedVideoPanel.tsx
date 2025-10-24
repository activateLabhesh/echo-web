// src/components/EnhancedVideoPanel.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash,
  FaDesktop,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeOff
} from 'react-icons/fa';

interface MediaState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
}

interface Participant {
  id: string;
  userId: string;
  username?: string;
  stream: MediaStream | null;
  screenStream?: MediaStream | null;
  mediaState: MediaState;
}

interface EnhancedVideoPanelProps {
  localStream?: MediaStream | null;
  localScreenStream?: MediaStream | null;
  participants?: Participant[];
  localMediaState?: MediaState;
  currentUser?: { username: string };
  collapsed?: boolean;
  onParticipantVolumeChange?: (participantId: string, volume: number) => void;
}

const ParticipantVideo: React.FC<{
  participant: Participant;
  isLocal?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onVolumeChange?: (volume: number) => void;
}> = ({ 
  participant, 
  isLocal = false, 
  isFullscreen = false,
  onToggleFullscreen,
  onVolumeChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Setup video stream
  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  // Setup screen stream
  useEffect(() => {
    if (screenRef.current && participant.screenStream) {
      if (screenRef.current.srcObject !== participant.screenStream) {
        screenRef.current.srcObject = participant.screenStream;
      }
    }
  }, [participant.screenStream]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (screenRef.current) {
      screenRef.current.volume = newVolume;
    }
    onVolumeChange?.(newVolume);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    handleVolumeChange(newMuted ? 0 : volume);
  };

  const hasVideo = participant.mediaState.video;
  const hasScreenShare = participant.screenStream && participant.mediaState.screenSharing;
  const hasVideoStream = participant.stream && participant.stream.getVideoTracks().length > 0;
  const hasActiveVideoTrack = hasVideoStream && participant.stream?.getVideoTracks().some(track => track.enabled);

  // Determine what will be rendered
  const shouldShowVideo = hasVideo && hasActiveVideoTrack && !hasScreenShare;
  const shouldShowScreenShare = hasScreenShare;
  const shouldShowAvatar = !shouldShowVideo && !shouldShowScreenShare;

  return (
    <div 
      className={`relative group bg-gray-900 rounded-lg overflow-hidden border-2 ${
        participant.mediaState.speaking && !participant.mediaState.muted 
          ? 'border-green-500' 
          : 'border-gray-700'
      } ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Screen Share (Priority) */}
      {shouldShowScreenShare ? (
        <div className="relative w-full h-full">
          <video
            ref={screenRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-contain bg-black"
          />
          
          {/* Screen Share Indicator */}
          <div className="absolute top-2 left-2 bg-blue-600 bg-opacity-90 rounded px-2 py-1 flex items-center space-x-1">
            <FaDesktop size={12} className="text-white" />
            <span className="text-xs text-white">Screen</span>
          </div>

          {/* Picture-in-Picture Video */}
          {hasVideo && hasActiveVideoTrack && (
            <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 rounded border border-gray-600 overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
              />
            </div>
          )}
        </div>
      ) : shouldShowVideo ? (
        /* Regular Video */
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
        />
      ) : (
        /* Avatar/Placeholder */
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
              <span className="text-2xl font-bold text-white">
                {participant.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <p className="text-sm text-gray-300">{participant.username || `User ${participant.userId}`}</p>
            {!participant.mediaState.video && (
              <p className="text-xs text-gray-500 mt-1">Camera off</p>
            )}
          </div>
        </div>
      )}

      {/* Voice State Indicators */}
      <div className="absolute bottom-2 left-2 flex space-x-1">
        {participant.mediaState.muted && (
          <div className="bg-red-600 rounded-full p-1">
            <FaMicrophoneSlash size={12} className="text-white" />
          </div>
        )}
        {participant.mediaState.speaking && !participant.mediaState.muted && (
          <div className="bg-green-600 rounded-full p-1 animate-pulse">
            <FaMicrophone size={12} className="text-white" />
          </div>
        )}
        {participant.mediaState.video && (
            <div className="bg-gray-600 rounded-full p-1">
            <FaVideo size={12} className="text-white" />
          </div>
        )}
        {!participant.mediaState.video && !hasScreenShare && (
          <div className="bg-gray-600 rounded-full p-1">
            <FaVideoSlash size={12} className="text-white" />
          </div>
        )}
      </div>

      {/* Username */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 rounded px-2 py-1">
        <span className="text-xs text-white">
          {participant.username}
          {isLocal && `(You)`}
        </span>
      </div>

      {/* Hover Controls */}
      {showControls && !isLocal && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Volume Control */}
          <div className="bg-black bg-opacity-70 rounded-lg p-2 flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isMuted ? <FaVolumeOff size={14} /> : <FaVolumeUp size={14} />}
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

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="bg-black bg-opacity-70 rounded p-2 text-white hover:text-gray-300 transition-colors"
            >
              {isFullscreen ? <FaCompress size={14} /> : <FaExpand size={14} />}
            </button>
          )}
        </div>
      )}

      {/* Fullscreen Exit */}
      {isFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-4 right-4 bg-black bg-opacity-70 rounded p-2 text-white hover:text-gray-300 transition-colors z-10"
        >
          <FaCompress size={16} />
        </button>
      )}
    </div>
  );
};

const EnhancedVideoPanel: React.FC<EnhancedVideoPanelProps> = ({
  localStream,
  localScreenStream,
  participants = [],
  localMediaState = { muted: false, speaking: false, video: false, screenSharing: false },
  currentUser,
  collapsed = false,
  onParticipantVolumeChange
}) => {
  const [fullscreenParticipant, setFullscreenParticipant] = useState<string | null>(null);

  const localParticipant: Participant = {
    id: 'local',
    userId: 'local',
    username: currentUser?.username || 'You',
    stream: localStream || null,
    screenStream: localScreenStream || null,
    mediaState: localMediaState
  };

  const allParticipants = [localParticipant, ...participants];
  const totalParticipants = allParticipants.length;

  const getGridLayout = (count: number, hasFullscreen: boolean) => {
    if (hasFullscreen) return { cols: 'grid-cols-1', rows: 'grid-rows-1' };
    
    if (count === 1) return { cols: 'grid-cols-1', rows: 'grid-rows-1' };
    if (count === 2) return { cols: 'grid-cols-2', rows: 'grid-rows-1' };
    if (count <= 4) return { cols: 'grid-cols-2', rows: 'grid-rows-2' };
    if (count <= 6) return { cols: 'grid-cols-3', rows: 'grid-rows-2' };
    if (count <= 9) return { cols: 'grid-cols-3', rows: 'grid-rows-3' };
    return { cols: 'grid-cols-4', rows: 'grid-rows-3' };
  };

  const toggleFullscreen = (participantId: string) => {
    setFullscreenParticipant(prev => prev === participantId ? null : participantId);
  };

  const handleParticipantVolumeChange = (participantId: string, volume: number) => {
    onParticipantVolumeChange?.(participantId, volume);
  };

  if (collapsed) {
    return <div className="w-full h-0 overflow-hidden" />;
  }

  const layout = getGridLayout(totalParticipants, !!fullscreenParticipant);
  const isFullscreenMode = !!fullscreenParticipant;

  return (
    <div className="w-full h-full bg-black relative">
      {/* Main Grid */}
      <div className={`grid ${layout.cols} ${layout.rows} gap-2 w-full h-full p-2`}>
        {allParticipants
          .filter(p => !isFullscreenMode || p.id === fullscreenParticipant)
          .map((participant) => (
            <ParticipantVideo
              key={participant.id}
              participant={participant}
              isLocal={participant.id === 'local'}
              isFullscreen={participant.id === fullscreenParticipant}
              onToggleFullscreen={() => toggleFullscreen(participant.id)}
              onVolumeChange={(volume) => handleParticipantVolumeChange(participant.id, volume)}
            />
          ))}
      </div>

      {/* Participant Count */}
      {!isFullscreenMode && totalParticipants > 1 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded px-3 py-1">
          <span className="text-white text-sm">
            {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Overflow Indicator */}
      {!isFullscreenMode && totalParticipants > 12 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded px-3 py-1">
          <span className="text-white text-sm">
            +{totalParticipants - 12} more
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoPanel;