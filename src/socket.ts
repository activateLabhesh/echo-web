// src/socket.ts

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const baseConfig = {
    withCredentials: true,
    transports: ["websocket", "polling"],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    maxReconnectionAttempts: 10,
    timeout: 20000,
    forceNew: true,
};

export const createAuthSocket = (userId: string): Socket => {
    const socket = io(API_URL, {
        ...baseConfig,
        auth: { userId }
    });

    socket.on("connect", () => {
        console.log("✅ Connected to main socket with id:", socket.id);
    });

    socket.on("connect_error", (err) => {
        console.error("❌ Main socket connection error:", err);
        console.log("🔄 Retrying connection...");
    });

    socket.on("disconnect", (reason) => {
        console.warn("⚠️ Socket disconnected:", reason);
        if (reason === "io server disconnect") {
            // The server forcefully disconnected the socket
            socket.connect();
        }
    });

    socket.on("reconnect", (attemptNumber) => {
        console.log("🔄 Reconnected after", attemptNumber, "attempts");
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
        console.log("🔄 Reconnection attempt", attemptNumber);
    });

    socket.on("reconnect_error", (err) => {
        console.error("❌ Reconnection failed:", err);
    });

    socket.on("reconnect_failed", () => {
        console.error("💀 Failed to reconnect after maximum attempts");
    });

    return socket;
};

// --- WEBRTC RELATED CODE ---

const peerConfig: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

interface PeerConnection {
    connection: RTCPeerConnection;
    stream: MediaStream | null;
}

export class MediaStreamManager {
    private localStream: MediaStream | null = null;
    private socket: Socket;
    private peers: Map<string, PeerConnection> = new Map();
    private userId: string;
    private currentChannelId: string | null = null;
    
    private onStreamCallback: ((stream: MediaStream, peerId: string) => void) | null = null;
    private onUserLeftCallback: ((peerId: string) => void) | null = null;
    private onVoiceRosterCallback: ((members: any[]) => void) | null = null;
    private onUserJoinedCallback: ((socketId: string, userId: string) => void) | null = null;
    private onVoiceStateCallback: ((socketId: string, userId: string, state: any) => void) | null = null;

    constructor(userId: string, socket: Socket) {
        this.userId = userId;
        this.socket = socket;
        
        // Add socket connection monitoring
        this.socket.on('connect', () => {
            console.log('✅ MediaStreamManager: Socket connected');
            // Re-join voice channel if we were in one
            if (this.currentChannelId) {
                console.log('🔄 MediaStreamManager: Re-joining voice channel', this.currentChannelId);
                this.socket.emit('join_voice_channel', this.currentChannelId);
            }
        });
        
        this.socket.on('disconnect', () => {
            console.warn('⚠️ MediaStreamManager: Socket disconnected');
            // Clean up peer connections on disconnect
            this.peers.forEach(peer => peer.connection.close());
            this.peers.clear();
        });
    }

    async initialize(video: boolean = true, audio: boolean = true): Promise<void> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video, audio });
            this.setupSocketListeners();
            console.log("✅ Media stream initialized");
        } catch (error) {
            console.error("❌ Error initializing media stream:", error);
            throw error;
        }
    }

    private setupSocketListeners(): void {
        console.log("Setting up voice listeners on main socket.");

        this.socket.on('voice_roster', ({ channelId, members }) => {
            this.onVoiceRosterCallback?.(members);
        });

        this.socket.on('user-joined', ({ socketId, userId, channelId }) => {
            this.onUserJoinedCallback?.(socketId, userId);
            if (channelId === this.currentChannelId) {
                this.createPeerConnection(socketId, true);
            }
        });

        this.socket.on('user-disconnected', ({ socketId, userId, channelId }) => {
            this.handlePeerDisconnection(socketId);
        });

        this.socket.on('user_voice_state', ({ socketId, userId, muted, speaking, video }) => {
            this.onVoiceStateCallback?.(socketId, userId, { muted, speaking, video });
        });

        this.socket.on('webrtc-offer', async ({ from, sdp, channelId }: { from: string; sdp: RTCSessionDescription, channelId: string }) => {
            if (channelId === this.currentChannelId) {
                const pc = await this.createPeerConnection(from, false);
                await pc.connection.setRemoteDescription(sdp);
                const answer = await pc.connection.createAnswer();
                await pc.connection.setLocalDescription(answer);
                this.socket?.emit('webrtc-answer', { to: from, sdp: answer, channelId });
            }
        });

        this.socket.on('webrtc-answer', async ({ from, sdp, channelId }: { from: string; sdp: RTCSessionDescription, channelId: string }) => {
            if (channelId === this.currentChannelId) {
                const peer = this.peers.get(from);
                if (peer) {
                    await peer.connection.setRemoteDescription(sdp);
                }
            }
        });

        this.socket.on('webrtc-ice-candidate', async ({ from, candidate, channelId }: { from: string; candidate: RTCIceCandidate, channelId: string }) => {
            if (channelId === this.currentChannelId) {
                const peer = this.peers.get(from);
                if (peer) {
                    await peer.connection.addIceCandidate(candidate);
                }
            }
        });

        this.socket.on('voice_error', (message) => {
            console.error("🔴 Voice error:", message);
        });

        this.socket.on('signaling_error', (message) => {
            console.error("🔴 Signaling error:", message);
        });

        this.socket.on('error', (error) => {
            console.error("🔴 Socket error:", error);
        });
    }

    private async createPeerConnection(peerId: string, isInitiator: boolean): Promise<PeerConnection> {
        const pc = new RTCPeerConnection(peerConfig);
        const peerConnection: PeerConnection = { connection: pc, stream: null };
        this.peers.set(peerId, peerConnection);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                if (this.localStream) {
                    pc.addTrack(track, this.localStream);
                }
            });
        }

        pc.ontrack = (event) => {
            peerConnection.stream = event.streams[0];
            this.onStreamCallback?.(event.streams[0], peerId);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && this.currentChannelId) {
                this.socket?.emit('webrtc-ice-candidate', {
                    to: peerId,
                    candidate: event.candidate,
                    channelId: this.currentChannelId
                });
            }
        };

        if (isInitiator && this.currentChannelId) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket?.emit('webrtc-offer', {
                to: peerId,
                sdp: offer,
                channelId: this.currentChannelId
            });
        }

        return peerConnection;
    }

    private handlePeerDisconnection(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.connection.close();
            this.peers.delete(peerId);
            this.onUserLeftCallback?.(peerId);
        }
    }

    public onStream(callback: (stream: MediaStream, peerId: string) => void): void {
        this.onStreamCallback = callback;
    }

    public onUserLeft(callback: (peerId: string) => void): void {
        this.onUserLeftCallback = callback;
    }

    public onVoiceRoster(callback: (members: any[]) => void): void {
        this.onVoiceRosterCallback = callback;
    }

    public onUserJoined(callback: (socketId: string, userId: string) => void): void {
        this.onUserJoinedCallback = callback;
    }

    public onVoiceState(callback: (socketId: string, userId: string, state: any) => void): void {
        this.onVoiceStateCallback = callback;
    }


    public async joinVoiceChannel(channelId: string): Promise<void> {
        try {
            await this.ensureConnection();
            this.currentChannelId = channelId;
            this.socket.emit('join_voice_channel', channelId);
            console.log('✅ Joined voice channel:', channelId);
        } catch (error) {
            console.error('❌ Failed to join voice channel:', error);
            throw error;
        }
    }

    public leaveVoiceChannel(): void {
        if (this.currentChannelId) {
            this.socket?.emit('leave_voice_channel', this.currentChannelId);
            this.peers.forEach(peer => peer.connection.close());
            this.peers.clear();
            this.currentChannelId = null;
        }
    }

    public toggleAudio(enabled: boolean): void {
        this.localStream?.getAudioTracks().forEach(track => track.enabled = enabled);
        this.updateVoiceState(!enabled, false, this.isVideoEnabled());
    }

    public toggleVideo(enabled: boolean): void {
        this.localStream?.getVideoTracks().forEach(track => track.enabled = enabled);
        this.updateVoiceState(this.isAudioMuted(), false, enabled);
    }

    private updateVoiceState(muted: boolean, speaking: boolean, video: boolean): void {
        if (this.currentChannelId) {
            this.socket?.emit('voice_state_update', {
                channelId: this.currentChannelId,
                muted,
                speaking,
                video
            });
        }
    }

    private isAudioMuted(): boolean {
        const audioTracks = this.localStream?.getAudioTracks() || [];
        return audioTracks.length === 0 || !audioTracks.some(track => track.enabled);
    }

    private isVideoEnabled(): boolean {
        const videoTracks = this.localStream?.getVideoTracks() || [];
        return videoTracks.length > 0 && videoTracks.some(track => track.enabled);
    }

    public getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    public isConnected(): boolean {
        return this.socket.connected;
    }

    public ensureConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket.connected) {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 10000);

            const onConnect = () => {
                clearTimeout(timeout);
                this.socket.off('connect', onConnect);
                this.socket.off('connect_error', onError);
                resolve();
            };

            const onError = (error: any) => {
                clearTimeout(timeout);
                this.socket.off('connect', onConnect);
                this.socket.off('connect_error', onError);
                reject(error);
            };

            this.socket.on('connect', onConnect);
            this.socket.on('connect_error', onError);

            if (!this.socket.connected) {
                this.socket.connect();
            }
        });
    }

    public disconnect(): void {
        this.leaveVoiceChannel();
        this.peers.forEach(peer => peer.connection.close());
        this.peers.clear();
        this.localStream?.getTracks().forEach(track => track.stop());
        this.socket.off();
    }
}