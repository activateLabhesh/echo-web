// src/components/VoiceVideoControls.tsx
// Voice/Video controls component for Amazon Chime SDK

"use client";

import React, { useState, useEffect } from 'react';
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash, 
  FaDesktop,
  FaStop,
  FaRecordVinyl,
  FaCog,
  FaPhoneSlash,
  FaSignal,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { VoiceVideoManager } from '@/lib/VoiceVideoManager';

interface MediaState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
  recording: boolean;
  mediaQuality: 'low' | 'medium' | 'high' | 'auto';
}

interface DeviceInfo {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs?: MediaDeviceInfo[];
  activeAudioDevice?: string;
  activeVideoDevice?: string;
  activeAudioOutputDevice?: string;
}

interface NetworkStats {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  connectionType: string;
}

interface VoiceVideoControlsProps {
  manager: VoiceVideoManager | null;
  onHangUp: () => void;
  isConnected: boolean;
  className?: string;
}

const VoiceVideoControls: React.FC<VoiceVideoControlsProps> = ({
  manager,
  onHangUp,
  isConnected,
  className = ""
}) => {
  const [mediaState, setMediaState] = useState<MediaState>({
    muted: false,
    speaking: false,
    video: false,
    screenSharing: false,
    recording: false,
    mediaQuality: 'auto'
  });

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
    activeAudioDevice: undefined,
    activeVideoDevice: undefined,
    activeAudioOutputDevice: undefined
  });

  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasVideoPerm, setHasVideoPerm] = useState(false);
  const [hasAudioPerm, setHasAudioPerm] = useState(false);

  // Update states when manager changes
  useEffect(() => {
    if (!manager) return;
    
    // Initial permissions check
    const perms = manager.getAvailablePermissions?.();
    if (perms) {
      setHasAudioPerm(!!perms.audio);
      setHasVideoPerm(!!perms.video);
    }
    
    const id = setInterval(() => {
      setMediaState(manager.getMediaState());
      setNetworkStats(manager.getNetworkStats());
      setDeviceInfo(manager.getDeviceInfo());
      
      // Update permissions
      const currentPerms = manager.getAvailablePermissions?.();
      if (currentPerms) {
        setHasAudioPerm(!!currentPerms.audio);
        setHasVideoPerm(!!currentPerms.video);
      }
    }, 1000);
    
    return () => clearInterval(id);
  }, [manager]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mediaState.recording) {
      setIsRecording(true);
      setRecordingDuration(0);
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setIsRecording(false);
      setRecordingDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mediaState.recording]);

  const handleToggleAudio = () => {
    if (!manager) return;
    try {
      const newMuted = !mediaState.muted;
      manager.toggleAudio(!newMuted);
    } catch (e) {
      console.error('Toggle audio failed:', e);
    }
  };

  const toggleDeviceSelector = async () => {
    const next = !showDeviceSelector;
    setShowDeviceSelector(next);
    if (next && manager) {
      await manager.updateDeviceInfo();
      setDeviceInfo(manager.getDeviceInfo());
    }
  };

  const handleToggleVideo = async () => {
    if (!manager) return;
    try {
      if (mediaState.video) {
        await manager.toggleVideo(false);
      } else {
        if (!hasVideoPerm) {
          console.warn('No camera permission');
          return;
        }
        await manager.toggleVideo(true);
      }
    } catch (e) {
      console.error('Toggle video failed:', e);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!manager) return;
    try {
      if (mediaState.screenSharing) {
        manager.stopScreenShare();
      } else {
        await manager.startScreenShare();
      }
    } catch (e: any) {
      // Only show error for non-cancellation errors
      // NotAllowedError (user cancelled) is handled silently in VoiceVideoManager
      console.error('Screen share toggle failed:', e);
      if (e?.name !== 'NotAllowedError' && !e?.message?.includes('Permission denied')) {
        // Only alert for genuine errors, not user cancellation
        alert('Screen sharing failed. Please try again.');
      }
    }
  };

  const handleToggleRecording = () => {
    if (!manager) return;

    if (mediaState.recording) {
      manager.stopRecording();
    } else {
      manager.startRecording({
        includeAudio: true,
        includeVideo: mediaState.video,
        includeScreenShare: mediaState.screenSharing,
        quality: 'high'
      });
    }
  };

  const handleDeviceChange = async (deviceId: string, type: 'audio' | 'video' | 'speaker') => {
    if (!manager) return;

    try {
      if (type === 'audio') {
        await manager.switchMicrophone(deviceId);
      } else if (type === 'video') {
        await manager.switchCamera(deviceId);
      } else if (type === 'speaker') {
        await manager.switchSpeaker(deviceId);
      }
      // Refresh device info
      await manager.updateDeviceInfo();
      setDeviceInfo(manager.getDeviceInfo());
    } catch (error) {
      console.error(`Failed to switch ${type} device:`, error);
    }
  };

  const handleQualityChange = (quality: 'low' | 'medium' | 'high' | 'auto') => {
    if (!manager) return;
    manager.adjustQuality(quality);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getConnectionQualityColor = (stats: NetworkStats | null): string => {
    if (!stats) return 'text-gray-400';
    
    switch (stats.connectionType) {
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConnectionQualityIcon = (stats: NetworkStats | null) => {
    if (!stats) return <FaSignal className="opacity-50" />;
    
    const quality = stats.connectionType;
    return (
      <div className="flex items-center space-x-1">
        <FaSignal className={getConnectionQualityColor(stats)} />
        <span className={`text-xs ${getConnectionQualityColor(stats)}`}>
          {quality === 'good' ? '●●●' : quality === 'fair' ? '●●○' : '●○○'}
        </span>
      </div>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* Recording Indicator */}
      {isRecording && (
        <div className="mb-4 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-medium">Recording</span>
            </div>
            <span className="text-red-400 font-mono">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        {/* Microphone */}
        <button
          onClick={handleToggleAudio}
          disabled={!isConnected || !hasAudioPerm}
          className={`p-3 rounded-full transition-all duration-200 ${
            mediaState.muted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          } ${(!isConnected || !hasAudioPerm) ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={mediaState.muted ? 'Unmute' : 'Mute'}
        >
          {mediaState.muted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
        </button>

        {/* Video */}
        <button
          onClick={handleToggleVideo}
          disabled={!isConnected || !hasVideoPerm}
          className={`p-3 rounded-full transition-all duration-200 ${
            !mediaState.video
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          } ${(!isConnected || !hasVideoPerm) ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={mediaState.video ? 'Turn off camera' : 'Turn on camera'}
        >
          {mediaState.video ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
        </button>

        {/* Screen Share */}
        <button
          onClick={handleToggleScreenShare}
          disabled={!isConnected}
          className={`p-3 rounded-full transition-all duration-200 ${
            mediaState.screenSharing
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={mediaState.screenSharing ? 'Stop screen share' : 'Share screen'}
        >
          {mediaState.screenSharing ? <FaStop size={20} /> : <FaDesktop size={20} />}
        </button>

        {/* Recording */}
        <button
          onClick={handleToggleRecording}
          disabled={!isConnected}
          className={`p-3 rounded-full transition-all duration-200 ${
            mediaState.recording
              ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={mediaState.recording ? 'Stop recording' : 'Start recording'}
        >
          <FaRecordVinyl size={20} />
        </button>

        {/* Hang Up */}
        <button
          onClick={onHangUp}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
          title="Leave call"
        >
          <FaPhoneSlash size={20} />
        </button>
      </div>

      {/* Connection Quality & Advanced Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getConnectionQualityIcon(networkStats)}
          {networkStats && (
            <span className="text-xs text-gray-400">
              {networkStats.latency.toFixed(0)}ms
            </span>
          )}
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
        >
          <FaCog size={14} />
          <span className="text-xs">Advanced</span>
          {showAdvanced ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </button>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="space-y-4 border-t border-gray-700 pt-4">
          {/* Device Selection */}
          <div>
            <button
              onClick={toggleDeviceSelector}
              className="flex items-center justify-between w-full text-left text-sm text-gray-300 hover:text-white transition-colors"
            >
              <span>Device Settings</span>
              {showDeviceSelector ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </button>

            {showDeviceSelector && (
              <div className="mt-2 space-y-2">
                {/* Microphone Selection */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Microphone</label>
                  <select
                    value={deviceInfo.activeAudioDevice || ''}
                    onChange={(e) => handleDeviceChange(e.target.value, 'audio')}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="">Default</option>
                    {deviceInfo.audioInputs.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${i+1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Camera Selection */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Camera</label>
                  <select
                    value={deviceInfo.activeVideoDevice || ''}
                    onChange={(e) => handleDeviceChange(e.target.value, 'video')}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="">Default</option>
                    {deviceInfo.videoInputs.map((device, i) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${i+1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speaker Selection (Chime supports this) */}
                {deviceInfo.audioOutputs && deviceInfo.audioOutputs.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Speaker</label>
                    <select
                      value={deviceInfo.activeAudioOutputDevice || ''}
                      onChange={(e) => handleDeviceChange(e.target.value, 'speaker')}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                    >
                      <option value="">Default</option>
                      {deviceInfo.audioOutputs.map((device, i) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Speaker ${i+1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quality Control */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Media Quality</label>
            <select
              value={mediaState.mediaQuality}
              onChange={(e) => handleQualityChange(e.target.value as 'low' | 'medium' | 'high' | 'auto')}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            >
              <option value="auto">Auto</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Network Stats */}
          {networkStats && (
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className={getConnectionQualityColor(networkStats)}>
                  {networkStats.latency.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>Packet Loss:</span>
                <span className={networkStats.packetLoss > 0.05 ? 'text-red-400' : 'text-green-400'}>
                  {(networkStats.packetLoss * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Quality:</span>
                <span className={getConnectionQualityColor(networkStats)}>
                  {networkStats.connectionType}
                </span>
              </div>
            </div>
          )}

          {/* Chime SDK Info */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
            Powered by Amazon Chime SDK
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceVideoControls;
