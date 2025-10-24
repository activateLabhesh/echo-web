// src/components/EnhancedVoiceChannel.tsx

"use client";

import { useEffect, useRef, useState } from 'react';
import { VoiceVideoManager, createAuthSocket } from '@/socket';
import VoiceVideoControls from './VoiceVideoControls';
import EnhancedVideoPanel from './EnhancedVideoPanel';
import { FaMicrophone, FaMicrophoneSlash, FaRedo, FaVideo, FaVideoSlash } from 'react-icons/fa';

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
  debug?: boolean; // Enable detailed logging for debugging
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
  currentUser,
  debug = false
}) => {
  // Enhanced logging utility
  const debugLog = (message: string, data?: any) => {
    if (debug) {
      console.log(`🐛 [EnhancedVoiceChannel] ${message}`, data || '');
    }
  };

  const debugError = (message: string, error?: any) => {
    if (debug) {
      console.error(`❌ [EnhancedVoiceChannel] ${message}`, error || '');
    } else {
      console.error(message, error);
    }
  };

  const debugWarn = (message: string, data?: any) => {
    if (debug) {
      console.warn(`⚠️ [EnhancedVoiceChannel] ${message}`, data || '');
    }
  };
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
  const [isVoiceChannelConnected, setIsVoiceChannelConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [voiceMembers, setVoiceMembers] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [debugStatus, setDebugStatus] = useState<string>('Initializing...');

  // Refs
  const socketRef = useRef<ReturnType<typeof createAuthSocket> | null>(null);
  const managerRef = useRef<VoiceVideoManager | null>(null);
  const isManagerInitialized = useRef(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();
  const statusCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize socket and manager
  useEffect(() => {
    let isMounted = true;
    
    if (!socketRef.current) {
      debugLog('Creating socket for user:', userId);
      const socket = createAuthSocket(userId);
      const manager = new VoiceVideoManager(userId, socket);
      socketRef.current = socket;
      managerRef.current = manager;
      
      // Monitor socket connection status with enhanced handling
      socket.on('connect', () => {
        if (isMounted) {
          const actuallyConnected = socket.connected;
          debugLog(`Socket connect event fired. Actually connected: ${actuallyConnected}, Socket ID: ${socket.id}`);
          setIsConnected(actuallyConnected);
          setConnectionError(null);
          setConnectionStatus(actuallyConnected ? 'Connected' : 'Connection Event But Not Connected');
          setDebugStatus(actuallyConnected ? `Socket connected: ${socket.id}` : 'Connect event but socket not connected');
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
          }
        }
      });
      
      // Set initial connection status with detailed checking
      setTimeout(() => {
        if (socket && isMounted) {
          const actuallyConnected = socket.connected;
          debugLog(`Initial status check - Socket connected: ${actuallyConnected}, Socket ID: ${socket.id || 'none'}`);
          
          setIsConnected(actuallyConnected);
          
          if (actuallyConnected) {
            setConnectionError(null);
            setConnectionStatus('Connected');
            setDebugStatus(`Socket ready: ${socket.id}, initializing media...`);
          } else {
            setConnectionStatus('Connecting...');
            setDebugStatus('Waiting for socket connection...');
          }
        }
      }, 100);
      
      // Connection timeout with retry
      connectionTimeoutRef.current = setTimeout(() => {
        if (!socket.connected && isMounted) {
          debugWarn('Connection timeout, retrying...');
          socket.connect();
        }
      }, 5000);
      
      // Periodic status check with more detailed logging
      statusCheckIntervalRef.current = setInterval(() => {
        if (isMounted && socket) {
          const actuallyConnected = socket.connected;
          const currentState = isConnected;
          
          // Always update if there's a mismatch
          if (actuallyConnected !== currentState) {
            debugLog(`Socket state mismatch detected! Actual: ${actuallyConnected}, State: ${currentState}, Socket ID: ${socket.id || 'none'} - CORRECTING NOW`);
            setIsConnected(actuallyConnected);
            setConnectionStatus(actuallyConnected ? 'Connected' : 'Disconnected');
            setDebugStatus(actuallyConnected ? `Connected: ${socket.id}` : 'Socket disconnected');
            
            if (actuallyConnected) {
              setConnectionError(null);
            }
          }
          
          // Debug log every few seconds when debug is enabled
          if (debug && Date.now() % 5000 < 1000) {
            debugLog(`Health check - Socket: ${actuallyConnected}, State: ${currentState}, ID: ${socket.id || 'none'}`);
          }
        }
      }, 500); // Check more frequently
      
      socket.on('disconnect', (reason?: string) => {
        if (isMounted) {
          const actuallyConnected = socket.connected;
          debugLog(`Socket disconnect event fired. Actually connected: ${actuallyConnected}, Reason: ${reason || 'Unknown'}`);
          
          setIsConnected(actuallyConnected);
          setIsVoiceChannelConnected(false);
          setConnectionStatus(actuallyConnected ? 'Connected (Disconnect Event)' : 'Disconnected');
          setDebugStatus(`${actuallyConnected ? 'Disconnect event but still connected' : 'Disconnected'}: ${reason || 'Unknown reason'}`);
          debugWarn('Socket disconnected:', reason);
          
          // Auto-reconnect for certain disconnect reasons
          if (!actuallyConnected && (reason === 'io server disconnect' || reason === 'transport close')) {
            setTimeout(() => {
              if (!socket.connected && isMounted) {
                setDebugStatus('Auto-reconnecting...');
                debugLog('Auto-reconnecting...');
                socket.connect();
              }
            }, 2000);
          }
        }
      });
      
      socket.on('connect_error', (error: any) => {
        if (isMounted) {
          setIsConnected(false);
          setConnectionStatus('Connection Error');
          setDebugStatus(`Connection failed: ${error.message || 'Unknown error'}`);
          setConnectionError(`Connection failed: ${error.message || 'Unknown error'}`);
          debugError('Connection error:', error);
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
          setDebugStatus('Requesting media permissions...');
          
          // Try to initialize with graceful degradation
          try {
            await manager.initialize(true, true); // Get permissions for both audio and video
            // But turn video OFF by default - let user explicitly turn it ON
            manager.toggleVideo(false);
            setDebugStatus('Media permissions granted, video OFF by default');
          } catch (fullError: any) {
            debugWarn("Full permissions failed, trying graceful degradation:", fullError);
            setDebugStatus('Trying audio-only fallback...');
            
            // Try audio-only first
            try {
              await manager.initializeAudioOnly();
              debugLog("Fallback to audio-only mode successful");
              setDebugStatus('Audio-only mode active');
            } catch (audioError: any) {
              debugWarn("Audio-only failed, trying video-only:", audioError);
              setDebugStatus('Trying video-only fallback...');
              
              // Try video-only as last resort
              try {
                await manager.initializeVideoOnly();
                debugLog("Fallback to video-only mode successful");
                setDebugStatus('Video-only mode active');
              } catch (videoError: any) {
                debugError("All initialization attempts failed:", videoError);
                setDebugStatus('Media initialization failed');
                throw fullError; // Throw original error if all fail
              }
            }
          }
          
          if (isMounted) {
            const hasAnyPerms = manager.hasAnyPermissions();
            setLocalStream(manager.getLocalStream());
            setHasAnyPermissions(hasAnyPerms);
            setLocalMediaState(manager.getMediaState());
            setIsInitializing(false);
            
            if (hasAnyPerms) {
              setDebugStatus('Media ready, waiting for voice channel...');
            } else {
              setDebugStatus('No media permissions available');
            }
            
            // Show appropriate messages based on what we got
            const permissions = manager.getAvailablePermissions();
            if (hasAnyPerms) {
              if (!permissions.audio && permissions.video) {
                setPermissionError('Video-only mode: Microphone access denied. You can still use video features.');
              } else if (permissions.audio && !permissions.video) {
                setPermissionError('Audio-only mode: Camera access denied. You can still use voice features.');
              }
              // If we have both, don't show any error
            }
          }
          isManagerInitialized.current = true;
        } catch (error: any) {
          debugError("Failed to initialize enhanced media manager:", error);
          if (isMounted) {
            setIsInitializing(false);
            
            // Check if manager has any permissions despite the error
            if (manager && manager.hasAnyPermissions()) {
              const hasAnyPerms = manager.hasAnyPermissions();
              setHasAnyPermissions(hasAnyPerms);
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
              // No permissions at all - provide helpful error messages
              if (error?.name === 'NotAllowedError') {
                setPermissionError('Camera and microphone access denied. Please click the camera/microphone icon in your browser address bar and allow permissions, then refresh the page.');
              } else if (error?.name === 'NotFoundError') {
                setPermissionError('No camera or microphone found. Please connect a device and refresh the page.');
              } else if (error?.name === 'NotReadableError') {
                setPermissionError('Camera or microphone is already in use by another application. Please close other applications and try again.');
              } else if (error?.name === 'OverconstrainedError') {
                setPermissionError('Camera/microphone constraints could not be satisfied. Try refreshing the page.');
              } else if (error?.name === 'SecurityError') {
                setPermissionError('Access denied due to security restrictions. Please ensure you are on a secure (HTTPS) connection.');
              } else {
                setPermissionError(`Media access error: ${error?.message || 'Unknown error'}. Please refresh the page and try again.`);
              }
            }
          }
          return;
        }
      }
      
      // Set up event listeners
      manager.onStream((stream: MediaStream, peerId: string, type: 'video' | 'screen') => {
        if (isMounted) {
          debugLog(`Received ${type} stream from:`, peerId);
          setDebugStatus(`Stream received from: ${peerId.substring(0, 8)} (${type})`);
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
          debugLog("Voice roster update:", members);
          setDebugStatus(`Voice roster received: ${members.length} members`);
          setVoiceMembers(members);
          
          const voiceParticipants: Participant[] = members.map(member => ({
            id: member.socketId || member.id,
            userId: member.userId || member.user_id,
            username: member.username || member.name || `User ${(member.userId || member.id).substring(0, 8)}`,
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
        debugLog("User joined enhanced voice channel:", { socketId, userId });
        setDebugStatus(`User joined: ${userId.substring(0, 8)}`);
        if (isMounted) {
          // Add new member to voice states if not already present
          setVoiceMembers(prev => {
            const exists = prev.find(m => m.socketId === socketId);
            if (!exists) {
              return [...prev, {
                socketId,
                userId,
                username: `User ${userId.substring(0, 8)}`,
                muted: false,
                speaking: false,
                video: true
              }];
            }
            return prev;
          });
        }
      });

      manager.onMediaState((socketId: string, userId: string, state: any) => {
        console.log("🎤 Enhanced media state update:", { socketId, userId, state });
        if (isMounted) {
          // Update participants
          setParticipants(prev => prev.map(p => 
            p.id === socketId 
              ? { ...p, mediaState: { ...p.mediaState, ...state } }
              : p
          ));
          
          // Update voice members
          setVoiceMembers(prev => prev.map(member => 
            member.socketId === socketId 
              ? { ...member, ...state }
              : member
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
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      if (managerRef.current) {
        managerRef.current.disconnect();
      }
      if (socketRef.current) {
        // Remove all listeners to prevent memory leaks
        socketRef.current.removeAllListeners();
        if (socketRef.current.connected) {
          socketRef.current.disconnect();
        }
      }
    };
  }, [userId]);

  // Immediate state check effect - runs when socket ref changes
  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      const actuallyConnected = socket.connected;
      debugLog(`Immediate state check - Socket connected: ${actuallyConnected}, Current state: ${isConnected}, ID: ${socket.id || 'none'}`);
      
      if (actuallyConnected !== isConnected) {
        debugLog(`Immediate correction needed - Setting state to: ${actuallyConnected}`);
        setIsConnected(actuallyConnected);
        setConnectionStatus(actuallyConnected ? 'Connected' : 'Disconnected');
        setDebugStatus(actuallyConnected ? `Connected: ${socket.id}` : 'Socket disconnected');
        
        if (actuallyConnected) {
          setConnectionError(null);
        }
      }
    }
  }, [socketRef.current, isConnected]);

  // Handle channel changes
  useEffect(() => {
    const manager = managerRef.current;
    const socket = socketRef.current;
    
    if (!manager || !isManagerInitialized.current) return;
    
    if (!socket?.connected) {
      debugLog('Waiting for socket connection...');
      setDebugStatus('Waiting for socket connection...');
      return;
    }
    
    if (!hasAnyPermissions) {
      debugLog('Waiting for media permissions...');
      setDebugStatus('Waiting for media permissions...');
      return;
    }

    const joinChannel = async () => {
      try {
        debugLog('Joining voice channel:', channelId);
        setDebugStatus(`Joining voice channel: ${channelId}`);
        setIsVoiceChannelConnected(false);
        manager.leaveVoiceChannel();
        await manager.joinVoiceChannel(channelId);
        
        setDebugStatus('Voice channel join request sent');
        
        // Update local streams
        setLocalStream(manager.getLocalStream());
        setLocalScreenStream(manager.getLocalScreenStream());
        setLocalMediaState(manager.getMediaState());
        
        onLocalStreamChange?.(manager.getLocalStream());
        
        // Set connected state with slight delay
        setTimeout(() => {
          setIsVoiceChannelConnected(true);
          setDebugStatus(`Connected to voice channel: ${channelId}`);
        }, 2000);
      } catch (error) {
        debugError('Failed to join voice channel:', error);
        setDebugStatus(`Failed to join voice channel: ${error}`);
        setPermissionError('Failed to connect to voice channel. Please check your connection and try again.');
      }
    };

    joinChannel();

    return () => {
      debugLog('Leaving voice channel:', channelId);
      setDebugStatus('Leaving voice channel...');
      if (manager) {
        manager.leaveVoiceChannel();
      }
      setIsVoiceChannelConnected(false);
      setDebugStatus('Disconnected from voice channel');
    };
  }, [channelId, onLocalStreamChange, hasAnyPermissions, isConnected]);

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

  const handleManualReconnection = async () => {
    try {
      const socket = socketRef.current;
      if (socket) {
        debugLog(`Manual reconnection attempt. Current state - connected: ${socket.connected}, ID: ${socket.id || 'none'}`);
        setConnectionError(null);
        
        // Check if socket is actually connected despite UI showing disconnected
        if (socket.connected) {
          debugLog('Socket is actually connected, refreshing state...');
          setIsConnected(true);
          setConnectionStatus('Connected');
          setDebugStatus(`Connected: ${socket.id}`);
          return;
        }
        
        // Disconnect first if partially connected
        if (socket.connected) {
          debugLog('Disconnecting existing connection...');
          socket.disconnect();
        }
        
        setDebugStatus('Manual reconnection in progress...');
        
        // Wait a moment then reconnect
        setTimeout(() => {
          if (socket) {
            debugLog('Attempting to reconnect...');
            socket.connect();
          }
        }, 500);
      }
    } catch (error) {
      debugError('Manual reconnection failed:', error);
      setConnectionError(`Reconnection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to refresh connection state
  const refreshConnectionState = () => {
    const socket = socketRef.current;
    if (socket) {
      const actuallyConnected = socket.connected;
      debugLog(`MANUAL REFRESH - Socket connected: ${actuallyConnected}, Current state: ${isConnected}, ID: ${socket.id || 'none'}`);
      
      // Force update the state regardless
      setIsConnected(actuallyConnected);
      setConnectionStatus(actuallyConnected ? 'Connected' : 'Disconnected');
      setDebugStatus(actuallyConnected ? `Connected: ${socket.id}` : 'Socket disconnected');
      
      if (actuallyConnected) {
        setConnectionError(null);
      }
      
      debugLog(`MANUAL REFRESH COMPLETE - New state: ${actuallyConnected}`);
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
        
        {/* Additional Control Buttons */}
        <div className="flex items-center justify-center space-x-4 mt-3">
          {/* Connection status indicator and manual reconnection */}
          {hasAnyPermissions && !isConnected && (
            <button 
              onClick={handleManualReconnection}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
              title="Connection lost - Click to reconnect"
            >
              <FaRedo size={16} className="text-white" />
            </button>
          )}
          
          {/* Permission retry button */}
          {!hasAnyPermissions && (
            <button 
              onClick={handleRetryPermissions}
              disabled={isInitializing}
              className="p-3 rounded-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 transition-colors"
              title="Retry media access"
            >
              <FaRedo size={16} className="text-white" />
            </button>
          )}
          
          {/* Voice channel connection status */}
          {isConnected && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-800 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isVoiceChannelConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-xs text-gray-300">
                {isVoiceChannelConnected ? 'Voice Connected' : 'Voice Connecting...'}
              </span>
            </div>
          )}
          
          {/* Connection status */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded-full">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 
              connectionError ? 'bg-red-400' : 'bg-yellow-400'
            }`}></div>
            <span className="text-xs text-gray-300">{connectionStatus}</span>
          </div>
        </div>
      </div>

      {/* Debug Status Bar */}
      {debug && (
        <div className="mx-4 mb-2 p-2 bg-gray-800 rounded border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-blue-400">DEBUG:</span>
              <span className="text-xs font-mono text-gray-300">{debugStatus}</span>
            </div>
            <button
              onClick={refreshConnectionState}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
              title="Refresh connection state"
            >
              Refresh
            </button>
          </div>
          <div className="flex items-center space-x-4 mt-1">
            <div className="flex items-center space-x-1">
              <span className="text-xs font-mono text-green-400">SOCKET:</span>
              <span className="text-xs font-mono text-gray-300">
                {socketRef.current?.connected ? 'Connected' : 'Disconnected'}
              </span>
              <span className="text-xs font-mono text-gray-500">
                (ID: {socketRef.current?.id || 'none'})
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-mono text-purple-400">STATE:</span>
              <span className="text-xs font-mono text-gray-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-mono text-yellow-400">VOICE:</span>
              <span className="text-xs font-mono text-gray-300">
                {isVoiceChannelConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs font-mono text-cyan-400">MEDIA:</span>
              <span className="text-xs font-mono text-gray-300">
                {hasAnyPermissions ? 'Ready' : 'No Permissions'}
              </span>
            </div>
          </div>
          <div className="mt-1 text-xs font-mono text-gray-400">
            Status: {connectionStatus}
          </div>
        </div>
      )}

      {/* Voice Members List */}
      {voiceMembers.length > 0 && (
        <div className="mx-4 mb-4 p-3 bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            Voice Members ({voiceMembers.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {voiceMembers.map(member => (
              <div 
                key={member.socketId || member.id}
                className="flex items-center space-x-2 bg-gray-700 rounded-full px-3 py-1"
              >
                <span className="text-xs text-white truncate max-w-20">
                  {member.username || `User ${(member.userId || member.id).substring(0, 8)}`}
                </span>
                <div className="flex space-x-1">
                  {member.muted && (
                    <FaMicrophoneSlash size={10} className="text-red-400" />
                  )}
                  {member.speaking && !member.muted && (
                    <FaMicrophone size={10} className="text-green-400 animate-pulse" />
                  )}
                  {!member.video && (
                    <FaVideoSlash size={10} className="text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVoiceChannel;