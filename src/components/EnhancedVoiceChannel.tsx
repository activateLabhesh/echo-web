// src/components/EnhancedVoiceChannel.tsx
// Enhanced voice channel component using Amazon Chime SDK

"use client";

import { useEffect, useRef, useState } from 'react';
import { VoiceVideoManager, VideoTileInfo } from '@/lib/VoiceVideoManager';
import VoiceVideoControls from './VoiceVideoControls';
import EnhancedVideoPanel from './EnhancedVideoPanel';
import { FaMicrophone, FaMicrophoneSlash, FaRedo, FaVideoSlash } from 'react-icons/fa';

interface Participant {
  id: string;
  oduserId: string;
  username?: string;
  stream: MediaStream | null;
  screenStream?: MediaStream | null;
  tileId?: number; // Chime video tile ID for binding
  screenTileId?: number; // Chime screen share tile ID for binding
  isLocal?: boolean;
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
  debug?: boolean;
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
  // Debug logging utility
  const debugLog = (message: string, data?: any) => {
    if (debug) {
      console.log(`[EnhancedVoiceChannel] ${message}`, data || '');
    }
  };

  const debugError = (message: string, error?: any) => {
    if (debug) {
      console.error(`[EnhancedVoiceChannel] ${message}`, error || '');
    } else {
      console.error(message, error);
    }
  };

  const debugWarn = (message: string, data?: any) => {
    if (debug) {
      console.warn(`[EnhancedVoiceChannel] ${message}`, data || '');
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
  
  // Video tiles tracking for Chime SDK
  const [videoTiles, setVideoTiles] = useState<Map<number, VideoTileInfo>>(new Map());
  const [localVideoTileId, setLocalVideoTileId] = useState<number | null>(null);

  // Refs
  const managerRef = useRef<VoiceVideoManager | null>(null);
  const isManagerInitialized = useRef(false);

  // Initialize manager
  useEffect(() => {
    let isMounted = true;
    
    if (!managerRef.current) {
      const username = currentUser?.username || userId;
      debugLog('Creating VoiceVideoManager (Chime) for user:', { userId, username });
      const manager = new VoiceVideoManager(userId, username);
      managerRef.current = manager;
    }

    const manager = managerRef.current;
    if (!manager) return;

    // Initialize the manager and set up all event listeners
    const setupManagerAndListeners = async () => {
      if (!isManagerInitialized.current) {
        try {
          setIsInitializing(true);
          setPermissionError(null);
          setDebugStatus('Requesting media permissions...');
          
          // Try to initialize with graceful degradation
          try {
            await manager.initialize(true, true);
            setDebugStatus('Media permissions granted');
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
                throw fullError;
              }
            }
          }
          
          if (isMounted) {
            const hasAnyPerms = manager.hasAnyPermissions();
            setLocalStream(manager.getLocalStream());
            setHasAnyPermissions(hasAnyPerms);
            setLocalMediaState(manager.getMediaState());
            setIsInitializing(false);
            setIsConnected(true);
            
            if (hasAnyPerms) {
              setDebugStatus('Media ready, waiting for voice channel...');
              setConnectionStatus('Connected');
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
            }
          }
          isManagerInitialized.current = true;
        } catch (error: any) {
          debugError("Failed to initialize enhanced media manager:", error);
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
              // No permissions at all - provide helpful error messages
              if (error?.name === 'NotAllowedError' || error?.message?.includes('permission')) {
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
                oduserId: peerId,
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

          // Get local attendee ID to filter out local user from roster
          const localAttendeeId = manager.getLocalAttendeeId();
          debugLog("Local attendee ID:", localAttendeeId);

          // Filter out local user from the roster to avoid duplicates
          // (local user is handled separately via localVideoTileId)
          const remoteMembers = members.filter(member => {
            const attendeeId = String(member.attendeeId || member.odattendeeId || member.id || '');
            return attendeeId !== localAttendeeId;
          });

          debugLog("Remote members after filtering:", remoteMembers.length);

          const voiceParticipants: Participant[] = remoteMembers.map(member => {
            const odattendeeId = String(member.odattendeeId || member.attendeeId || member.id || '');
            const oduserId = String(member.oduserId || member.userId || member.user_id || member.name || '');
            return {
              id: odattendeeId,
              oduserId: oduserId,
              username: member.odName || member.username || member.name || `User ${oduserId.slice(0, 8)}`,
              stream: null,
              screenStream: undefined,
              isLocal: false,
              mediaState: {
                muted: !!member.muted,
                speaking: !!member.speaking,
                video: !!member.video,
                screenSharing: !!member.screenSharing
              }
            };
          });

          // Merge roster with existing participants, preserving video tile IDs and video state
          setParticipants(prev => {
            const prevById = new Map(prev.map(p => [p.id, p]));
            const merged = voiceParticipants.map(vp => {
              const existing = prevById.get(vp.id);
              if (existing) {
                // IMPORTANT: Preserve video/screen state if we have tile IDs OR if roster says they're on
                // This prevents race conditions where roster update overwrites video tile state
                return {
                  ...vp,
                  stream: existing.stream,
                  screenStream: existing.screenStream,
                  tileId: existing.tileId,
                  screenTileId: existing.screenTileId,
                  mediaState: {
                    ...vp.mediaState,
                    // Use roster video state but preserve if we have a tileId (tile is source of truth)
                    video: existing.tileId !== undefined ? (vp.mediaState.video || existing.mediaState.video) : vp.mediaState.video,
                    // Same for screen sharing
                    screenSharing: existing.screenTileId !== undefined ? (vp.mediaState.screenSharing || existing.mediaState.screenSharing) : vp.mediaState.screenSharing,
                  }
                };
              }
              return vp;
            });
            return merged;
          });

          onVoiceRoster?.(members);
          setIsVoiceChannelConnected(true);
        }
      });

      manager.onUserJoined((odattendeeId: string, oduserId: string) => {
        debugLog("User joined enhanced voice channel:", { odattendeeId, oduserId });
        setDebugStatus(`User joined: ${oduserId.substring(0, 8)}`);
        if (isMounted) {
          setVoiceMembers(prev => {
            const exists = prev.find(m => m.odattendeeId === odattendeeId);
            if (!exists) {
              return [...prev, {
                odattendeeId,
                oduserId,
                username: `User ${oduserId.substring(0, 8)}`,
                muted: false,
                speaking: false,
                video: false
              }];
            }
            return prev;
          });
        }
      });

      // onMediaState now has 2 params: (attendeeId, state)
      manager.onMediaState((attendeeId: string, state: any) => {
        console.log("Enhanced media state update:", { attendeeId, state });
        if (isMounted) {
          // Update participants
          setParticipants(prev => prev.map(p => 
            p.id === attendeeId 
              ? { ...p, mediaState: { ...p.mediaState, ...state } }
              : p
          ));
          
          // Update voice members
          setVoiceMembers(prev => prev.map(member => 
            member.odattendeeId === attendeeId 
              ? { ...member, ...state }
              : member
          ));
        }
      });

      // onScreenSharing now has 2 params: (attendeeId, isSharing)
      manager.onScreenSharing((attendeeId: string, isSharing: boolean) => {
        console.log("Screen sharing update:", { attendeeId, isSharing });
        if (isMounted) {
          setParticipants(prev => prev.map(p => 
            p.id === attendeeId 
              ? { ...p, mediaState: { ...p.mediaState, screenSharing: isSharing } }
              : p
          ));
        }
      });

      manager.onRecording((event) => {
        setLocalMediaState(prev => ({
          ...prev,
          recording: event === 'started' || event === 'started_confirmation'
        }));
      });

      manager.onError((error: any) => {
        console.error("Enhanced voice error:", error);
        if (isMounted) {
          switch (error.code) {
            case 'VOICE_AUTH_FAILED':
              setConnectionError('Authentication failed. Please log in again.');
              break;
            case 'VOICE_JOIN_FAILED':
              setConnectionError('Failed to join voice channel. Please try again.');
              break;
            case 'VOICE_NETWORK_ERROR':
              setConnectionError('Network error. Please check your connection.');
              break;
            default:
              setConnectionError(error.message || 'An unknown error occurred.');
          }
        }
      });

      // VIDEO TILE HANDLERS (Chime SDK)
      // When a video tile is created/updated, track it
      manager.onVideoTileUpdated((tile: VideoTileInfo) => {
        if (isMounted) {
          debugLog('Video tile updated:', tile);
          setDebugStatus(`Video tile ${tile.tileId} updated (local: ${tile.isLocal}, active: ${tile.active})`);
          
          // Track the tile
          setVideoTiles(prev => {
            const newMap = new Map(prev);
            newMap.set(tile.tileId, tile);
            return newMap;
          });

          // Track local video tile ID
          if (tile.isLocal) {
            setLocalVideoTileId(tile.tileId);
          }

          // Update participants with tile info (for remote participants only)
          // IMPORTANT: Don't wait for tile.active - assign tileId immediately so UI can bind
          // The tile may not be "active" yet but we need the tileId for binding
          // Screen share tiles (isContent=true) have attendeeId like "abc123#content-share"
          // We need to extract the base attendeeId for matching
          if (tile.attendeeId && !tile.isLocal) {
            // For content share tiles, the attendeeId is "baseId#content-share"
            // Extract the base ID for participant matching
            const baseAttendeeId = tile.isContent 
              ? tile.attendeeId.split('#')[0] 
              : tile.attendeeId;
            
            setParticipants(prev => {
              const existingIndex = prev.findIndex(p => p.id === baseAttendeeId || p.id === tile.attendeeId);
              
              if (existingIndex >= 0) {
                // Update existing participant with tile ID
                const updated = [...prev];
                
                if (tile.isContent) {
                  // This is a screen share tile - store in screenTileId
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    screenTileId: tile.tileId,
                    mediaState: {
                      ...updated[existingIndex].mediaState,
                      screenSharing: true
                    }
                  };
                  debugLog(`Updated participant ${baseAttendeeId} with screenTileId ${tile.tileId} (active: ${tile.active})`);
                } else {
                  // This is a camera video tile - store in tileId
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    tileId: tile.tileId,
                    isLocal: tile.isLocal,
                    mediaState: {
                      ...updated[existingIndex].mediaState,
                      video: tile.active ? true : updated[existingIndex].mediaState.video,
                    }
                  };
                  debugLog(`Updated participant ${tile.attendeeId} with tileId ${tile.tileId} (active: ${tile.active})`);
                }
                return updated;
              } else {
                // IMPORTANT: Video tile arrived before roster - create placeholder participant
                debugLog(`Creating placeholder participant for ${baseAttendeeId} (tile arrived before roster, active: ${tile.active}, isContent: ${tile.isContent})`);
                const newParticipant: Participant = {
                  id: baseAttendeeId,
                  oduserId: baseAttendeeId,
                  username: `User ${baseAttendeeId.slice(0, 8)}`,
                  stream: null,
                  screenStream: undefined,
                  tileId: tile.isContent ? undefined : tile.tileId,
                  screenTileId: tile.isContent ? tile.tileId : undefined,
                  isLocal: false,
                  mediaState: {
                    muted: false,
                    speaking: false,
                    video: !tile.isContent && tile.active,
                    screenSharing: tile.isContent
                  }
                };
                return [...prev, newParticipant];
              }
            });
          }
        }
      });

      // When a video tile is removed, clean it up
      manager.onVideoTileRemoved((tileId: number) => {
        if (isMounted) {
          debugLog('Video tile removed:', tileId);
          setDebugStatus(`Video tile ${tileId} removed`);
          
          // Get tile info before removing
          setVideoTiles(prev => {
            const tile = prev.get(tileId);
            const newMap = new Map(prev);
            newMap.delete(tileId);
            
            // Update participant to remove video/screen state
            if (tile?.attendeeId) {
              // For content share tiles, extract base attendeeId
              const baseAttendeeId = tile.isContent 
                ? tile.attendeeId.split('#')[0] 
                : tile.attendeeId;
              
              setParticipants(prevParts => prevParts.map(p => {
                if (p.id === baseAttendeeId || p.id === tile.attendeeId) {
                  if (tile.isContent) {
                    // Screen share tile removed
                    return { 
                      ...p, 
                      screenTileId: undefined, 
                      mediaState: { ...p.mediaState, screenSharing: false } 
                    };
                  } else {
                    // Video tile removed
                    return { 
                      ...p, 
                      tileId: undefined, 
                      mediaState: { ...p.mediaState, video: false } 
                    };
                  }
                }
                return p;
              }));
            }
            
            return newMap;
          });

          // Clear local tile ID if it was the local tile
          setLocalVideoTileId(prev => prev === tileId ? null : prev);
        }
      });
    };

    setupManagerAndListeners();
    
    return () => {
      isMounted = false;
      if (managerRef.current) {
        managerRef.current.disconnect();
      }
    };
  }, [userId]);

  // Handle channel changes - join the voice channel
  useEffect(() => {
    const manager = managerRef.current;
    
    if (!manager || !isManagerInitialized.current) return;
    
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
        await manager.joinVoiceChannel(channelId);
        
        setDebugStatus('Voice channel join request sent');
        
        // Update local streams
        setLocalStream(manager.getLocalStream());
        setLocalScreenStream(manager.getLocalScreenStream());
        setLocalMediaState(manager.getMediaState());
        
        onLocalStreamChange?.(manager.getLocalStream());
      
      } catch (error: any) {
        debugError('Failed to join voice channel:', error);
        setDebugStatus(`Failed to join voice channel: ${error.message}`);
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
  }, [channelId, onLocalStreamChange, hasAnyPermissions]);

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
    const manager = managerRef.current;
    if (!manager) return;
    
    setConnectionError(null);
    setDebugStatus('Manual reconnection...');
    
    try {
      await manager.joinVoiceChannel(channelId);
      setIsConnected(true);
      setConnectionStatus('Connected');
    } catch (error: any) {
      setConnectionError(`Reconnection failed: ${error.message}`);
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

  // Convert Participant[] to expected format for EnhancedVideoPanel
  // Include tile IDs for proper Chime video binding
  const panelParticipants = participants.map(p => ({
    id: p.id,
    oduserId: p.oduserId,
    username: p.username,
    stream: p.stream,
    screenStream: p.screenStream,
    tileId: p.tileId,
    screenTileId: p.screenTileId,
    isLocal: p.isLocal || false,
    mediaState: p.mediaState
  }));

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
          manager={managerRef.current}
          participants={panelParticipants}
          localVideoTileId={localVideoTileId}
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
          </div>
          <div className="flex items-center space-x-4 mt-1">
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
                key={member.odattendeeId || member.id}
                className="flex items-center space-x-2 bg-gray-700 rounded-full px-3 py-1"
              >
                <span className="text-xs text-white truncate max-w-20">
                  {member.username || member.odName || `User ${(member.oduserId || member.id || '').substring(0, 8)}`}
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
