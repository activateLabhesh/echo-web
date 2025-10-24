// src/components/EnhancedVoiceChannel.tsx

"use client";

import { useEffect, useRef, useState } from 'react';
import { VoiceVideoManager, createAuthSocket } from '@/socket';
import VoiceVideoControls from './VoiceVideoControls';
import EnhancedVideoPanel from './EnhancedVideoPanel';

interface Participant {
  id: string;
  userId: string;
  username?: string;
  stream: MediaStream | null;
  screenStream?: MediaStream | null;
  mediaState: {
    muted: boolean;
    speaking: boolean;
    video: boolean;
    screenSharing: boolean;
  };
}

interface MediaState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
  recording: boolean;
  mediaQuality: 'low' | 'medium' | 'high' | 'auto';
  availablePermissions?: {
    audio: boolean;
    video: boolean;
  };
}

interface EnhancedVoiceChannelProps {
  channelId: string;
  userId: string;
  onHangUp: () => void;
  headless?: boolean;
  onLocalStreamChange?: (stream: MediaStream | null) => void;
  onRemoteStreamAdded?: (id: string, stream: MediaStream, type: 'video' | 'screen') => void;
  onRemoteStreamRemoved?: (id: string) => void;
  onVoiceRoster?: (members: any[]) => void;
  currentUser?: { username: string };
}

const EnhancedVoiceChannel: React.FC<EnhancedVoiceChannelProps> = ({
  channelId,
  userId,
  onHangUp,
  headless = false,
  onLocalStreamChange,
  onRemoteStreamAdded,
  onRemoteStreamRemoved,
  onVoiceRoster,
  currentUser
}) => {
  // State management
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localMediaState, setLocalMediaState] = useState<MediaState>({
    muted: false,
    speaking: false,
    video: false,
    screenSharing: false,
    recording: false,
    mediaQuality: 'auto',
    availablePermissions: {
      audio: false,
      video: false
    }
  });

  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasAnyPermissions, setHasAnyPermissions] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Refs
  const socketRef = useRef<ReturnType<typeof createAuthSocket> | null>(null);
  const managerRef = useRef<VoiceVideoManager | null>(null);
  const isManagerInitialized = useRef(false);

  // Initialize socket and manager
  useEffect(() => {
    let isMounted = true;
    
    if (!socketRef.current) {
      const socket = createAuthSocket(userId);
      const manager = new VoiceVideoManager(userId, socket);
      socketRef.current = socket;
      managerRef.current = manager;
      
      // Monitor socket connection status
      socket.on('connect', () => {
        if (isMounted) {
          setIsConnected(true);
          setConnectionError(null);
          console.log('✅ EnhancedVoiceChannel: Socket connected');
        }
      });
      
      socket.on('disconnect', () => {
        if (isMounted) {
          setIsConnected(false);
          console.warn('⚠️ EnhancedVoiceChannel: Socket disconnected');
        }
      });
      
      socket.on('connect_error', (error: any) => {
        if (isMounted) {
          setIsConnected(false);
          setConnectionError(`Connection failed: ${error.message || 'Unknown error'}`);
          console.error('❌ EnhancedVoiceChannel: Connection error:', error);
        }
      });
    }

    const manager = managerRef.current;
    if (!manager) return;

    // Initialize the manager and set up all event listeners once
    const setupManagerAndListeners = async () => {
      if (!isManagerInitialized.current) {
        try {
          setIsInitializing(true);
          setPermissionError(null);
          
          await manager.initialize(true, true);
          
          if (isMounted) {
            setLocalStream(manager.getLocalStream());
            setHasAnyPermissions(manager.hasAnyPermissions());
            setLocalMediaState(manager.getMediaState());
            setIsInitializing(false);
          }
          isManagerInitialized.current = true;
        } catch (error: any) {
          console.error("Failed to initialize enhanced media manager:", error);
          if (isMounted) {
            setIsInitializing(false);
            
            // Check if manager has any permissions despite the error
            if (manager && manager.hasAnyPermissions()) {
              setHasAnyPermissions(true);
              setLocalStream(manager.getLocalStream());
              setLocalMediaState(manager.getMediaState());
              
              const permissions = manager.getAvailablePermissions();
              if (!permissions.audio && !permissions.video) {
                setPermissionError('No audio or video permissions available. Please allow access and try again.');
              } else if (!permissions.audio) {
                setPermissionError('Video-only mode: Microphone access denied. You can still use video features.');
              } else if (!permissions.video) {
                setPermissionError('Audio-only mode: Camera access denied. You can still use voice features.');
              }
            } else {
              // No permissions at all
              if (error?.name === 'NotAllowedError') {
                setPermissionError('Camera and microphone access denied. Please allow permissions and try again.');
              } else if (error?.name === 'NotFoundError') {
                setPermissionError('No camera or microphone found. Please connect a device and try again.');
              } else if (error?.name === 'NotReadableError') {
                setPermissionError('Camera or microphone is already in use by another application.');
              } else if (error?.name === 'OverconstrainedError') {
                setPermissionError('Camera/microphone constraints could not be satisfied. Try refreshing the page.');
              } else {
                setPermissionError(`Media access error: ${error?.message || 'Unknown error'}`);
              }
            }
          }
          return;
        }
      }
      
      // Set up event listeners
      manager.onStream((stream: MediaStream, peerId: string, type: 'video' | 'screen') => {
        if (isMounted) {
          setParticipants(prev => {
            const existingIndex = prev.findIndex(p => p.id === peerId);
            
            if (existingIndex >= 0) {
              // Update existing participant
              const updated = [...prev];
              if (type === 'screen') {
                updated[existingIndex] = { ...updated[existingIndex], screenStream: stream };
              } else {
                updated[existingIndex] = { ...updated[existingIndex], stream };
              }
              return updated;
            } else {
              // Add new participant
              const newParticipant: Participant = {
                id: peerId,
                userId: peerId,
                username: `User ${peerId.substring(0, 8)}`,
                stream: type === 'video' ? stream : null,
                screenStream: type === 'screen' ? stream : undefined,
                mediaState: {
                  muted: false,
                  speaking: false,
                  video: type === 'video',
                  screenSharing: type === 'screen'
                }
              };
              return [...prev, newParticipant];
            }
          });
          
          onRemoteStreamAdded?.(peerId, stream, type);
        }
      });

      manager.onUserLeft((peerId: string) => {
        if (isMounted) {
          setParticipants(prev => prev.filter(p => p.id !== peerId));
          onRemoteStreamRemoved?.(peerId);
        }
      });

      manager.onVoiceRoster((members: any[]) => {
        if (isMounted) {
          const voiceParticipants: Participant[] = members.map(member => ({
            id: member.socketId || member.id,
            userId: member.userId || member.user_id,
            username: member.username || member.name || `User ${member.userId}`,
            stream: null, // Will be set when stream arrives
            mediaState: {
              muted: member.muted || false,
              speaking: member.speaking || false,
              video: member.video || false,
              screenSharing: member.screenSharing || false
            }
          }));
          
          setParticipants(prev => {
            // Merge with existing participants to preserve streams
            return voiceParticipants.map(newP => {
              const existing = prev.find(p => p.id === newP.id);
              return existing ? { ...existing, ...newP, stream: existing.stream, screenStream: existing.screenStream } : newP;
            });
          });
          
          onVoiceRoster?.(members);
        }
      });

      manager.onUserJoined((socketId: string, userId: string) => {
        console.log("User joined enhanced voice channel:", { socketId, userId });
      });

      manager.onMediaState((socketId: string, userId: string, state: any) => {
        console.log("Enhanced media state update:", { socketId, userId, state });
        if (isMounted) {
          setParticipants(prev => prev.map(p => 
            p.id === socketId 
              ? { ...p, mediaState: { ...p.mediaState, ...state } }
              : p
          ));
        }
      });

      manager.onScreenSharing((socketId: string, userId: string, isSharing: boolean) => {
        console.log("Screen sharing update:", { socketId, userId, isSharing });
        if (isMounted) {
          setParticipants(prev => prev.map(p => 
            p.id === socketId 
              ? { ...p, mediaState: { ...p.mediaState, screenSharing: isSharing } }
              : p
          ));
        }
      });

      manager.onRecording((event: string, data: any) => {
        console.log("Recording event:", event, data);
        if (isMounted) {
          setLocalMediaState(prev => ({
            ...prev,
            recording: event === 'started'
          }));
        }
      });

      manager.onError((error: any) => {
        console.error("Enhanced voice error:", error);
        if (isMounted) {
          switch (error.code) {
            case 'VOICE_AUTH_FAILED':
              setConnectionError('Authentication failed. Please log in again.');
              break;
            case 'VOICE_WEBRTC_SIGNALING_FAILED':
              setConnectionError('Connection failed. Retrying...');
              break;
            case 'VOICE_NETWORK_ERROR':
              setConnectionError('Network error. Please check your connection.');
              break;
            case 'RECONNECTION_FAILED':
              setConnectionError('Failed to reconnect. Please refresh the page.');
              break;
            default:
              setConnectionError(error.message || 'An unknown error occurred.');
          }
        }
      });

      manager.onNetworkQuality((stats) => {
        // Network quality updates can be handled here for UI indicators
      });
    };

    setupManagerAndListeners();
    
    return () => {
      isMounted = false;
      if (managerRef.current) {
        managerRef.current.disconnect();
      }
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };
  }, [userId]);

  // Handle channel changes
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !isManagerInitialized.current) return;

    const joinChannel = async () => {
      try {
        manager.leaveVoiceChannel();
        await manager.joinVoiceChannel(channelId);
        
        // Update local streams
        setLocalStream(manager.getLocalStream());
        setLocalScreenStream(manager.getLocalScreenStream());
        setLocalMediaState(manager.getMediaState());
        
        onLocalStreamChange?.(manager.getLocalStream());
      } catch (error) {
        console.error('Failed to join enhanced voice channel:', error);
        setPermissionError('Failed to connect to voice channel. Please check your connection and try again.');
      }
    };

    joinChannel();

    return () => {
      if (manager) {
        manager.leaveVoiceChannel();
      }
    };
  }, [channelId, onLocalStreamChange]);

  // Update local media state periodically
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const interval = setInterval(() => {
      setLocalMediaState(manager.getMediaState());
      setLocalStream(manager.getLocalStream());
      setLocalScreenStream(manager.getLocalScreenStream());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRetryPermissions = async () => {
    const manager = managerRef.current;
    if (!manager) return;

    try {
      setIsInitializing(true);
      setPermissionError(null);
      await manager.initialize(true, true);
      setLocalStream(manager.getLocalStream());
      setHasAnyPermissions(manager.hasAnyPermissions());
      setLocalMediaState(manager.getMediaState());
      setIsInitializing(false);
      isManagerInitialized.current = true;
    } catch (error: any) {
      console.error("Failed to retry permissions:", error);
      setIsInitializing(false);
      
      // Check if we got partial permissions
      if (manager && manager.hasAnyPermissions()) {
        setHasAnyPermissions(true);
        setLocalStream(manager.getLocalStream());
        setLocalMediaState(manager.getMediaState());
        
        const permissions = manager.getAvailablePermissions();
        if (!permissions.audio) {
          setPermissionError('Video-only mode: Microphone access denied. You can still use video features.');
        } else if (!permissions.video) {
          setPermissionError('Audio-only mode: Camera access denied. You can still use voice features.');
        }
      } else {
        setPermissionError(`Media access error: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleRetryAudioOnly = async () => {
    const manager = managerRef.current;
    if (!manager) return;

    try {
      setIsInitializing(true);
      setPermissionError(null);
      await manager.initializeAudioOnly();
      setLocalStream(manager.getLocalStream());
      setHasAnyPermissions(manager.hasAnyPermissions());
      setLocalMediaState(manager.getMediaState());
      setIsInitializing(false);
      isManagerInitialized.current = true;
    } catch (error: any) {
      console.error("Failed to get audio permission:", error);
      setIsInitializing(false);
      setPermissionError(`Audio access error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRetryVideoOnly = async () => {
    const manager = managerRef.current;
    if (!manager) return;

    try {
      setIsInitializing(true);
      setPermissionError(null);
      await manager.initializeVideoOnly();
      setLocalStream(manager.getLocalStream());
      setHasAnyPermissions(manager.hasAnyPermissions());
      setLocalMediaState(manager.getMediaState());
      setIsInitializing(false);
      isManagerInitialized.current = true;
    } catch (error: any) {
      console.error("Failed to get video permission:", error);
      setIsInitializing(false);
      setPermissionError(`Video access error: ${error.message || 'Unknown error'}`);
    }
  };

  // Render states
  if (permissionError && !hasAnyPermissions) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center p-8">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Media Access Required</h3>
          <p className="text-gray-400 mb-6 max-w-md">{permissionError}</p>
          
          <div className="space-y-3">
            <button
              onClick={handleRetryPermissions}
              disabled={isInitializing}
              className="block w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {isInitializing ? 'Requesting Access...' : 'Grant All Permissions'}
            </button>
            
            <div className="text-sm text-gray-400 mb-2">Or try specific permissions:</div>
            
            <div className="flex gap-3">
              <button
                onClick={handleRetryAudioOnly}
                disabled={isInitializing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Audio Only
              </button>
              <button
                onClick={handleRetryVideoOnly}
                disabled={isInitializing}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Video Only
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center p-8">
          <div className="text-yellow-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Connection Error</h3>
          <p className="text-gray-400 mb-4 max-w-md">{connectionError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing media devices...</p>
        </div>
      </div>
    );
  }

  if (headless) {
    return (
      <VoiceVideoControls
        manager={managerRef.current}
        onHangUp={onHangUp}
        isConnected={isConnected}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Partial permissions warning */}
      {permissionError && hasAnyPermissions && (
        <div className="bg-yellow-900/50 border-l-4 border-yellow-400 p-4 text-yellow-100">
          <div className="flex items-center">
            <div className="text-yellow-400 mr-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm">{permissionError}</p>
            </div>
            <button
              onClick={handleRetryPermissions}
              disabled={isInitializing}
              className="ml-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              {isInitializing ? 'Retrying...' : 'Retry Permissions'}
            </button>
          </div>
        </div>
      )}

      {/* Video Panel */}
      <div className="flex-1">
        <EnhancedVideoPanel
          localStream={localStream}
          localScreenStream={localScreenStream}
          participants={participants}
          localMediaState={localMediaState}
          currentUser={currentUser}
          collapsed={false}
        />
      </div>

      {/* Controls */}
      <div className="p-4">
        <VoiceVideoControls
          manager={managerRef.current}
          onHangUp={onHangUp}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
};

export default EnhancedVoiceChannel;