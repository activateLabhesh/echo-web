// src/components/VoiceChannel.tsx

"use client";

import { useEffect, useRef, useState } from 'react';
import { MediaStreamManager, createAuthSocket } from '@/socket';
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
    socketId: string;
    userId: string;
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
    voiceState 
}: { 
    stream: MediaStream | null, 
    isMuted?: boolean, 
    isLocal?: boolean, 
    username?: string,
    voiceState?: VoiceState 
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasVideo, setHasVideo] = useState(true);
    
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            // Check if stream has video tracks
            const videoTracks = stream.getVideoTracks();
            setHasVideo(videoTracks.length > 0 && videoTracks.some(track => track.enabled));
        }
    }, [stream]);
    
    useEffect(() => {
        if (voiceState) {
            setHasVideo(voiceState.video);
        }
    }, [voiceState]);
    
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden relative aspect-video">
            {hasVideo && stream ? (
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted={isMuted} 
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
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [voiceMembers, setVoiceMembers] = useState<VoiceMember[]>([]);
    const [voiceStates, setVoiceStates] = useState<Map<string, VoiceState>>(new Map());
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [hasPermissions, setHasPermissions] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const socketRef = useRef<ReturnType<typeof createAuthSocket> | null>(null);
    const managerRef = useRef<MediaStreamManager | null>(null);
    const isManagerInitialized = useRef(false);

    // This effect creates the single socket and manager instance once.
    useEffect(() => {
        let isMounted = true;
        
        if (!socketRef.current) {
            const socket = createAuthSocket(userId);
            const manager = new MediaStreamManager(userId, socket);
            socketRef.current = socket;
            managerRef.current = manager;
            
            // Monitor socket connection status
            socket.on('connect', () => {
                if (isMounted) {
                    setIsConnected(true);
                    setConnectionError(null);
                    console.log('✅ VoiceChannel: Socket connected');
                }
            });
            
            socket.on('disconnect', () => {
                if (isMounted) {
                    setIsConnected(false);
                    console.warn('⚠️ VoiceChannel: Socket disconnected');
                }
            });
            
            socket.on('connect_error', (error: any) => {
                if (isMounted) {
                    setIsConnected(false);
                    setConnectionError(`Connection failed: ${error.message || 'Unknown error'}`);
                    console.error('❌ VoiceChannel: Connection error:', error);
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
                        setHasPermissions(true);
                        setIsInitializing(false);
                    }
                    isManagerInitialized.current = true;
                } catch (error: any) {
                    console.error("Failed to initialize media manager:", error);
                    if (isMounted) {
                        setIsInitializing(false);
                        
                        if (error.name === 'NotAllowedError') {
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
            
            manager.onStream((stream: MediaStream, socketId: string) => {
                if (isMounted) {
                    setRemoteStreams(prev => new Map(prev).set(socketId, stream));
                    onRemoteStreamAdded?.(socketId, stream);
                }
            });
            manager.onUserLeft((socketId: string) => {
                if (isMounted) {
                    setRemoteStreams(prev => {
                        const newStreams = new Map(prev);
                        newStreams.delete(socketId);
                        return newStreams;
                    });
                    onRemoteStreamRemoved?.(socketId);
                }
            });
            manager.onVoiceRoster((members: any[]) => {
                if (isMounted) {
                    const voiceMembers: VoiceMember[] = members.map(member => ({
                        socketId: member.socketId || member.id,
                        userId: member.userId || member.user_id,
                        username: member.username || member.name || `User ${member.userId}`,
                        muted: member.muted || false,
                        speaking: member.speaking || false,
                        video: member.video || false
                    }));
                    setVoiceMembers(voiceMembers);
                    onVoiceRoster?.(members);
                }
            });
            manager.onUserJoined((socketId: string, userId: string) => {
                console.log("User joined voice channel:", { socketId, userId });
                // Add new member to voice states
                if (isMounted) {
                    setVoiceStates(prev => new Map(prev).set(socketId, {
                        muted: false,
                        speaking: false,
                        video: true
                    }));
                }
            });
            manager.onVoiceState((socketId: string, userId: string, state: any) => {
                console.log("Voice state update:", { socketId, userId, state });
                if (isMounted) {
                    setVoiceStates(prev => new Map(prev).set(socketId, {
                        muted: state.muted || false,
                        speaking: state.speaking || false,
                        video: state.video || false
                    }));
                    
                    // Update voice members with new state
                    setVoiceMembers(prev => prev.map(member => 
                        member.socketId === socketId 
                            ? { ...member, ...state }
                            : member
                    ));
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
            if (socketRef.current?.connected) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // This effect handles joining/leaving channels based on channelId changes
    useEffect(() => {
        const manager = managerRef.current;
        if (!manager || !isManagerInitialized.current) return;

        const joinChannel = async () => {
            try {
                manager.leaveVoiceChannel();
                await manager.joinVoiceChannel(channelId);
                
                setLocalStream(manager.getLocalStream());
                onLocalStreamChange?.(manager.getLocalStream());
            } catch (error) {
                console.error('Failed to join voice channel:', error);
                setPermissionError('Failed to connect to voice channel. Please check your connection and try again.');
            }
        };

        joinChannel();

        return () => {
            manager.leaveVoiceChannel();
        };
    }, [channelId, onLocalStreamChange]);


    const handleToggleMute = () => {
        const newMutedState = !isMuted;
        managerRef.current?.toggleAudio(!newMutedState);
        setIsMuted(newMutedState);
        
        // Update local voice state
        setVoiceStates(prev => {
            const newStates = new Map(prev);
            const currentSocketId = socketRef.current?.id;
            if (currentSocketId) {
                newStates.set(currentSocketId, {
                    muted: newMutedState,
                    speaking: false,
                    video: isCameraOn
                });
            }
            return newStates;
        });
    };

    const handleToggleCamera = () => {
        const newCameraState = !isCameraOn;
        managerRef.current?.toggleVideo(newCameraState);
        setIsCameraOn(newCameraState);
        
        // Update local voice state
        setVoiceStates(prev => {
            const newStates = new Map(prev);
            const currentSocketId = socketRef.current?.id;
            if (currentSocketId) {
                newStates.set(currentSocketId, {
                    muted: isMuted,
                    speaking: false,
                    video: newCameraState
                });
            }
            return newStates;
        });
    };

    useEffect(() => {
        if (managerRef.current) {
            managerRef.current.toggleVideo(isCameraOn);
        }
    }, [isCameraOn]);
    
    const retryMediaAccess = async () => {
        if (managerRef.current) {
            const manager = managerRef.current;
            isManagerInitialized.current = false;
            
            try {
                setIsInitializing(true);
                setPermissionError(null);
                
                await manager.initialize(true, true);
                setLocalStream(manager.getLocalStream());
                setHasPermissions(true);
                setIsInitializing(false);
                isManagerInitialized.current = true;
            } catch (error: any) {
                setIsInitializing(false);
                
                if (error.name === 'NotAllowedError') {
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
- Chrome: Settings → Privacy and Security → Site Settings → Camera/Microphone
- Firefox: Settings → Privacy & Security → Permissions
- Safari: Preferences → Websites → Camera/Microphone

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
        speaking: false, // We could implement speaking detection later
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
            {!isConnected && !connectionError && hasPermissions && (
                <div className="mb-2 p-2 bg-yellow-600 rounded text-center text-white text-sm">
                    Connecting to voice server...
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
                />
                
                {/* Remote Streams */}
                {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
                    const member = voiceMembers.find(m => m.socketId === socketId);
                    const voiceState = voiceStates.get(socketId);
                    return (
                        <VideoPlayer 
                            key={socketId} 
                            stream={stream}
                            username={member?.username || `User ${socketId.slice(0, 8)}`}
                            voiceState={voiceState}
                        />
                    );
                })}
                
                {/* Members without video streams (audio-only) */}
                {voiceMembers
                    .filter(member => !remoteStreams.has(member.socketId) && member.socketId !== socketRef.current?.id)
                    .map(member => {
                        const voiceState = voiceStates.get(member.socketId);
                        return (
                            <VideoPlayer 
                                key={member.socketId}
                                stream={null}
                                username={member.username}
                                voiceState={voiceState || { muted: true, speaking: false, video: false }}
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
                
                {/* Connection status indicator */}
                {hasPermissions && !isConnected && (
                    <button 
                        onClick={async () => {
                            try {
                                if (socketRef.current) {
                                    setConnectionError(null);
                                    socketRef.current.connect();
                                }
                            } catch (error) {
                                console.error('Reconnection failed:', error);
                            }
                        }}
                        className="p-3 rounded-full bg-red-600 hover:bg-red-500 transition"
                        title="Connection lost - Click to reconnect"
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
                            const voiceState = voiceStates.get(member.socketId);
                            return (
                                <div 
                                    key={member.socketId}
                                    className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1"
                                >
                                    <span className="text-xs text-white">{member.username}</span>
                                    {voiceState?.muted && (
                                        <FaMicrophoneSlash size={10} className="text-red-400" />
                                    )}
                                    {voiceState?.speaking && !voiceState?.muted && (
                                        <FaMicrophone size={10} className="text-green-400" />
                                    )}
                                    {!voiceState?.video && (
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