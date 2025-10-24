// src/components/VoiceVideoControls.tsx

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
  FaVolumeUp,
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
  activeAudioDevice?: string;
  activeVideoDevice?: string;
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
    activeAudioDevice: undefined,
    activeVideoDevice: undefined
  });

  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Update states when manager changes
  useEffect(() => {
    if (!manager) return;

    // Get initial states
    setMediaState(manager.getMediaState());
    setDeviceInfo(manager.getDeviceInfo());
    setNetworkStats(manager.getNetworkStats());

    // Update device info
    manager.updateDeviceInfo();

    const interval = setInterval(() => {
      setMediaState(manager.getMediaState());
      setNetworkStats(manager.getNetworkStats());
    }, 1000);

    return () => clearInterval(interval);
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
    const newMuted = !mediaState.muted;
    manager.toggleAudio(!newMuted);
  };

  const handleToggleVideo = () => {
    console.log('🎮 STEP 0: Camera button clicked, current video state:', mediaState.video);
    if (!manager) return;
    if(mediaState.video == true){
      console.log('🎮 STEP 1: Turning video OFF');
      return manager.toggleVideo(false);  
    }
    else{
      console.log('🎮 STEP 1: Turning video ON');
      return manager.toggleVideo(true);
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
    } catch (error) {
      console.error('Screen share toggle failed:', error);
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

  const handleDeviceChange = async (deviceId: string, type: 'audio' | 'video') => {
    if (!manager) return;

    try {
      if (type === 'audio') {
        await manager.switchMicrophone(deviceId);
      } else {
        await manager.switchCamera(deviceId);
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
          disabled={!isConnected}
          className={`p-3 rounded-full transition-all duration-200 ${
            mediaState.muted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={mediaState.muted ? 'Unmute' : 'Mute'}
        >
          {mediaState.muted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
        </button>

        {/* Video */}
        <button
          onClick={handleToggleVideo}
          disabled={!isConnected}
          className={`p-3 rounded-full transition-all duration-200 ${
            !mediaState.video
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={mediaState.video==false ? 'Turn off camera' : 'Turn on camera'}
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
              onClick={() => setShowDeviceSelector(!showDeviceSelector)}
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
                    {deviceInfo.audioInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
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
                    {deviceInfo.videoInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
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
        </div>
      )}
    </div>
  );
};

export default VoiceVideoControls;