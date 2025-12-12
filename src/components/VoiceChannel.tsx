// src/components/VoiceChannel.tsx
// Voice channel component using Amazon Chime SDK

"use client";

import { useEffect, useRef, useState } from 'react';
import { VoiceVideoManager } from '@/lib/VoiceVideoManager';
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaVideo, FaVideoSlash, FaRedo } from 'react-icons/fa';

interface VoiceChannelProps {
    channelId: string;
    userId: string;
    onHangUp: () => void;
    headless?: boolean;
    onLocalStreamChange?: (stream: MediaStream | null) => void;
    onRemoteStreamAdded?: (id: string, stream: MediaStream) => void;
    onRemoteStreamRemoved?: (id: string) => void;
    onVoiceRoster?: (members: any[]) => void;
}

interface VoiceMember {
    odattendeeId: string;
    oduserId: string;
    username?: string;
    muted: boolean;
    speaking: boolean;
    video: boolean;
}

interface VoiceState {
    muted: boolean;
    speaking: boolean;
    video: boolean;
}

const VideoPlayer = ({ 
    stream, 
    isMuted = false, 
    isLocal = false, 
    username = 'Unknown', 
    voiceState,
    manager,
    tileId
}: { 
    stream?: MediaStream | null, 
    isMuted?: boolean, 
    isLocal?: boolean, 
    username?: string,
    voiceState?: VoiceState,
    manager?: VoiceVideoManager | null,
    tileId?: number | null
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasVideo, setHasVideo] = useState(false);
    
    useEffect(() => {
        // Bind video element to Chime tile if available
        if (videoRef.current && manager && tileId !== undefined && tileId !== null) {
            manager.bindVideoElement(tileId, videoRef.current);
            setHasVideo(true);
            
            return () => {
                if (manager && tileId !== undefined && tileId !== null) {
                    manager.unbindVideoElement(tileId);
                }
            };
        }
    }, [manager, tileId]);

    // Fallback to direct stream assignment if no tile
    useEffect(() => {
        if (videoRef.current && stream && !tileId) {
            videoRef.current.srcObject = stream;
            const videoTracks = stream.getVideoTracks();
            const hasVideoTracks = videoTracks.length > 0 && videoTracks.some(track => track.enabled);
            setHasVideo(hasVideoTracks);
        }
    }, [stream, tileId]);
    
    useEffect(() => {
        if (voiceState) {
            setHasVideo(voiceState.video);
        }
    }, [voiceState]);
    
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden relative aspect-video">
            {(hasVideo || tileId) ? (
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted={isMuted || isLocal} 
                    className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`} 
                />
            ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <span className="text-2xl font-bold text-white">
                                {username.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-300">{username}</p>
                    </div>
                </div>
            )}
            
            {/* Voice state indicators */}
            <div className="absolute bottom-2 left-2 flex space-x-1">
                {voiceState?.muted && (
                    <div className="bg-red-600 rounded-full p-1">
                        <FaMicrophoneSlash size={12} className="text-white" />
                    </div>
                )}
                {voiceState?.speaking && !voiceState?.muted && (
                    <div className="bg-green-600 rounded-full p-1 animate-pulse">
                        <FaMicrophone size={12} className="text-white" />
                    </div>
                )}
                {!voiceState?.video && (
                    <div className="bg-gray-600 rounded-full p-1">
                        <FaVideoSlash size={12} className="text-white" />
                    </div>
                )}
            </div>
            
            {/* Username overlay */}
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1">
                <span className="text-xs text-white">{username}</span>
            </div>
        </div>
    );
};

const VoiceChannel = ({ channelId, userId, onHangUp, headless = false, onLocalStreamChange, onRemoteStreamAdded, onRemoteStreamRemoved, onVoiceRoster }: VoiceChannelProps) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false); // Camera off by default
    const [voiceMembers, setVoiceMembers] = useState<VoiceMember[]>([]);
    const [voiceStates, setVoiceStates] = useState<Map<string, VoiceState>>(new Map());
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [hasPermissions, setHasPermissions] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isVoiceChannelConnected, setIsVoiceChannelConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const managerRef = useRef<VoiceVideoManager | null>(null);
    const isManagerInitialized = useRef(false);

    // Initialize manager
    useEffect(() => {
        let isMounted = true;
        
        if (!managerRef.current) {
            console.log('Creating VoiceVideoManager (Chime) for user:', userId);
            const manager = new VoiceVideoManager(userId);
            managerRef.current = manager;
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
                        const stream = manager.getLocalStream();
                        setLocalStream(stream);
                        setHasPermissions(manager.hasAnyPermissions());
                        setIsInitializing(false);
                        setIsConnected(true);
                    }
                    isManagerInitialized.current = true;
                } catch (error: any) {
                    console.error("Failed to initialize media manager:", error);
                    if (isMounted) {
                        setIsInitializing(false);
                        
                        if (error.name === 'NotAllowedError' || error.message?.includes('permission')) {
                            setPermissionError('Camera and microphone access denied. Please allow permissions and try again.');
                        } else if (error.name === 'NotFoundError') {
                            setPermissionError('No camera or microphone found. Please connect a device and try again.');
                        } else if (error.name === 'NotReadableError') {
                            setPermissionError('Camera or microphone is already in use by another application.');
                        } else {
                            setPermissionError(`Media access error: ${error.message || 'Unknown error'}`);
                        }
                    }
                    return;
                }
            }
            
            // Set up event listeners
            manager.onStream((stream: MediaStream, peerId: string) => {
                if (isMounted) {
                    setRemoteStreams(prev => new Map(prev).set(peerId, stream));
                    onRemoteStreamAdded?.(peerId, stream);
                }
            });

            manager.onUserLeft((peerId: string) => {
                if (isMounted) {
                    setRemoteStreams(prev => {
                        const newStreams = new Map(prev);
                        newStreams.delete(peerId);
                        return newStreams;
                    });
                    setVoiceStates(prev => {
                        const newStates = new Map(prev);
                        newStates.delete(peerId);
                        return newStates;
                    });
                    onRemoteStreamRemoved?.(peerId);
                }
            });

            manager.onVoiceRoster((members: any[]) => {
                if (isMounted) {
                    const voiceMembers: VoiceMember[] = members.map(member => ({
                        odattendeeId: member.odattendeeId || member.attendeeId || member.id,
                        oduserId: member.oduserId || member.userId || member.user_id,
                        username: member.odName || member.username || member.name || `User ${(member.oduserId || member.userId || '').slice(0, 8)}`,
                        muted: member.muted || false,
                        speaking: member.speaking || false,
                        video: member.video || false
                    }));
                    setVoiceMembers(voiceMembers);
                    onVoiceRoster?.(members);
                    
                    // Voice channel is connected when we receive roster
                    setIsVoiceChannelConnected(true);
                }
            });

            manager.onUserJoined((odattendeeId: string, oduserId: string) => {
                console.log("User joined voice channel:", { odattendeeId, oduserId });
                if (isMounted) {
                    setVoiceStates(prev => new Map(prev).set(odattendeeId, {
                        muted: false,
                        speaking: false,
                        video: false
                    }));
                }
            });

            // onMediaState now has 2 params: (attendeeId, state)
            manager.onMediaState((attendeeId: string, state: any) => {
                console.log("Media state update:", { attendeeId, state });
                if (isMounted) {
                    setVoiceStates(prev => new Map(prev).set(attendeeId, {
                        muted: state.muted || false,
                        speaking: state.speaking || false,
                        video: state.video || false
                    }));
                    
                    // Update voice members with new state
                    setVoiceMembers(prev => prev.map(member => 
                        member.odattendeeId === attendeeId 
                            ? { ...member, ...state }
                            : member
                    ));
                }
            });

            manager.onError((error: any) => {
                console.error("Voice channel error:", error);
                if (isMounted) {
                    setConnectionError(error.message || 'An error occurred');
                }
            });
        };

        setupManagerAndListeners();
        
        // Get current user info
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user');
            if (userData) {
                setCurrentUser(JSON.parse(userData));
            }
        }
        
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
        
        if (!manager || !isManagerInitialized.current) {
            return;
        }
        
        if (!hasPermissions) {
            return;
        }

        const joinChannel = async () => {
            try {
                console.log('Joining voice channel:', channelId);
                setIsVoiceChannelConnected(false);
                await manager.joinVoiceChannel(channelId);
                
                setLocalStream(manager.getLocalStream());
                onLocalStreamChange?.(manager.getLocalStream());
                setIsVoiceChannelConnected(true);
            } catch (error: any) {
                console.error('Failed to join voice channel:', error);
                setPermissionError('Failed to connect to voice channel. Please check your connection and try again.');
            }
        };

        joinChannel();

        return () => {
            console.log('Leaving voice channel:', channelId);
            manager.leaveVoiceChannel();
            setIsVoiceChannelConnected(false);
        };
    }, [channelId, onLocalStreamChange, hasPermissions]);


    const handleToggleMute = () => {
        const newMutedState = !isMuted;
        managerRef.current?.toggleAudio(!newMutedState);
        setIsMuted(newMutedState);
    };

    const handleToggleCamera = async () => {
        const newCameraState = !isCameraOn;
        await managerRef.current?.toggleVideo(newCameraState);
        setIsCameraOn(newCameraState);
    };
    
    const retryMediaAccess = async () => {
        if (managerRef.current) {
            const manager = managerRef.current;
            isManagerInitialized.current = false;
            
            try {
                setIsInitializing(true);
                setPermissionError(null);
                
                await manager.initialize(true, true);
                setLocalStream(manager.getLocalStream());
                setHasPermissions(manager.hasAnyPermissions());
                setIsInitializing(false);
                isManagerInitialized.current = true;
            } catch (error: any) {
                setIsInitializing(false);
                
                if (error.name === 'NotAllowedError' || error.message?.includes('permission')) {
                    setPermissionError('Camera and microphone access denied. Please allow permissions and try again.');
                } else if (error.name === 'NotFoundError') {
                    setPermissionError('No camera or microphone found. Please connect a device and try again.');
                } else if (error.name === 'NotReadableError') {
                    setPermissionError('Camera or microphone is already in use by another application.');
                } else {
                    setPermissionError(`Media access error: ${error.message || 'Unknown error'}`);
                }
            }
        }
    };
    
    const openPermissionSettings = () => {
        const instructions = `
To enable camera and microphone:

1. Look for the camera/microphone icon in your browser's address bar
2. Click on it and select "Allow"
3. Refresh the page and try again

Or go to:
- Chrome: Settings -> Privacy and Security -> Site Settings -> Camera/Microphone
- Firefox: Settings -> Privacy & Security -> Permissions
- Safari: Preferences -> Websites -> Camera/Microphone

Find this site (${window.location.origin}) and set permissions to "Allow"`;
        
        alert(instructions);
    };

    if (headless) {
        return null;
    }
    
    // Show permission error state
    if (permissionError && !hasPermissions) {
        return (
            <div className="p-6 bg-gray-900 rounded-lg flex flex-col items-center justify-center h-full text-center">
                <div className="mb-4 text-red-400">
                    <FaVideoSlash size={48} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Media Access Required</h3>
                <p className="text-gray-300 mb-4 max-w-md">{permissionError}</p>
                <div className="flex space-x-3">
                    <button 
                        onClick={retryMediaAccess}
                        disabled={isInitializing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        {isInitializing ? 'Requesting...' : 'Try Again'}
                    </button>
                    <button 
                        onClick={openPermissionSettings}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                    >
                        Help
                    </button>
                    <button 
                        onClick={onHangUp}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                    >
                        Leave
                    </button>
                </div>
            </div>
        );
    }
    
    // Show loading state while initializing
    if (isInitializing) {
        return (
            <div className="p-6 bg-gray-900 rounded-lg flex flex-col items-center justify-center h-full">
                <div className="mb-4 animate-spin">
                    <FaVideo size={48} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Connecting...</h3>
                <p className="text-gray-300">Requesting camera and microphone access</p>
            </div>
        );
    }

    const getCurrentUserVoiceState = (): VoiceState => ({
        muted: isMuted,
        speaking: false,
        video: isCameraOn
    });
    
    const getCurrentUsername = () => {
        return currentUser?.username || currentUser?.fullname || 'You';
    };
    
    return (
        <div className="p-2 bg-gray-900 rounded-lg flex flex-col h-full">
            {/* Connection Status Bar */}
            {connectionError && (
                <div className="mb-2 p-2 bg-red-600 rounded text-center text-white text-sm">
                    {connectionError} - Click the reconnect button below
                </div>
            )}
            {(!isConnected || !isVoiceChannelConnected) && !connectionError && hasPermissions && (
                <div className="mb-2 p-2 bg-yellow-600 rounded text-center text-white text-sm">
                    {!isConnected ? 'Reconnecting to server...' : 'Connecting to voice channel...'}
                </div>
            )}
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                {/* Local Stream */}
                <VideoPlayer 
                    stream={localStream} 
                    isMuted={true} 
                    isLocal={true}
                    username={getCurrentUsername()}
                    voiceState={getCurrentUserVoiceState()}
                    manager={managerRef.current}
                    tileId={managerRef.current?.getLocalVideoTileId()}
                />
                
                {/* Remote Streams */}
                {Array.from(remoteStreams.entries()).map(([odattendeeId, stream]) => {
                    const member = voiceMembers.find(m => m.odattendeeId === odattendeeId);
                    const voiceState = voiceStates.get(odattendeeId);
                    return (
                        <VideoPlayer 
                            key={odattendeeId} 
                            stream={stream}
                            username={member?.username || `User ${odattendeeId.slice(0, 8)}`}
                            voiceState={voiceState}
                            manager={managerRef.current}
                        />
                    );
                })}
                
                {/* Members without video streams (audio-only) */}
                {voiceMembers
                    .filter(member => !remoteStreams.has(member.odattendeeId))
                    .map(member => {
                        const voiceState = voiceStates.get(member.odattendeeId);
                        return (
                            <VideoPlayer 
                                key={member.odattendeeId}
                                username={member.username}
                                voiceState={voiceState || { muted: member.muted, speaking: member.speaking, video: member.video }}
                                manager={managerRef.current}
                            />
                        );
                    })}
            </div>
            
            {/* Control Bar */}
            <div className="flex items-center justify-center space-x-4 mt-4 p-3 bg-gray-800 rounded-md">
                <button 
                    onClick={handleToggleMute} 
                    className={`p-3 rounded-full transition ${
                        isMuted 
                            ? 'bg-red-600 hover:bg-red-500' 
                            : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                >
                    {isMuted ? (
                        <FaMicrophoneSlash size={20} className="text-white" />
                    ) : (
                        <FaMicrophone size={20} className="text-white" />
                    )}
                </button>
                
                <button 
                    onClick={handleToggleCamera} 
                    className={`p-3 rounded-full transition ${
                        !isCameraOn 
                            ? 'bg-red-600 hover:bg-red-500' 
                            : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
                >
                    {isCameraOn ? (
                        <FaVideo size={20} className="text-white" />
                    ) : (
                        <FaVideoSlash size={20} className="text-white" />
                    )}
                </button>
                
                <button 
                    onClick={onHangUp} 
                    className="p-3 rounded-full bg-red-600 hover:bg-red-500 transition"
                    title="Leave voice channel"
                >
                    <FaPhoneSlash size={20} className="text-white" />
                </button>
                
                {/* Permission status indicator */}
                {!hasPermissions && (
                    <button 
                        onClick={retryMediaAccess}
                        className="p-3 rounded-full bg-yellow-600 hover:bg-yellow-500 transition"
                        title="Retry media access"
                    >
                        <FaRedo size={20} className="text-white" />
                    </button>
                )}
            </div>
            
            {/* Voice Members List */}
            {voiceMembers.length > 0 && (
                <div className="mt-2 p-2 bg-gray-800 rounded-md">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Voice Members ({voiceMembers.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                        {voiceMembers.map(member => {
                            const voiceState = voiceStates.get(member.odattendeeId);
                            return (
                                <div 
                                    key={member.odattendeeId}
                                    className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1"
                                >
                                    <span className="text-xs text-white">{member.username}</span>
                                    {(voiceState?.muted ?? member.muted) && (
                                        <FaMicrophoneSlash size={10} className="text-red-400" />
                                    )}
                                    {(voiceState?.speaking ?? member.speaking) && !(voiceState?.muted ?? member.muted) && (
                                        <FaMicrophone size={10} className="text-green-400" />
                                    )}
                                    {!(voiceState?.video ?? member.video) && (
                                        <FaVideoSlash size={10} className="text-gray-400" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceChannel;
