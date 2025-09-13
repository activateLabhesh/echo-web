import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const URL = process.env.PUBLIC_URL;

interface PeerConnection {
    connection: RTCPeerConnection;
    stream: MediaStream | null;
}

// Base socket configuration
const baseConfig = {
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
};

// ICE Server configuration
const peerConfig: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

// Create a socket instance with user authentication for chat
export const createAuthSocket = (userId: string): Socket => {
    const socket = io(API_URL, {
        ...baseConfig,
        auth: { userId }
    });

    socket.on("connect", () => {
        console.log("✅ Connected to chat socket with id:", socket.id);
    });

    socket.on("connect_error", (err) => {
        console.error("❌ Chat socket connection error:", err);
    });
    return socket;
};

// Media Stream Manager for handling voice/video
export class MediaStreamManager {
    private localStream: MediaStream |  null = null;
    private socket: Socket | null = null;
    private peers: Map<string, PeerConnection> = new Map();
    private userId: string;
    private onStreamCallback: ((stream: MediaStream, peerId: string) => void) | null = null;
    private onUserLeftCallback: ((peerId: string) => void) | null = null;

    constructor(userId: string) {
        this.userId = userId;
    }

    async initialize(video: boolean = true, audio: boolean = true): Promise<void> {
        try {
            // Get local media stream
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video,
                audio
            });

            // Initialize socket connection
            this.socket = io(API_URL, {
                ...baseConfig,
                path: '/media'
            });

            this.setupSocketListeners();
            console.log("✅ Media stream initialized");
        } catch (error) {
            console.error("❌ Error initializing media stream:", error);
            throw error;
        }
    }

    private setupSocketListeners(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log("✅ Connected to media socket with id:", this.socket?.id);
        });

        this.socket.on('user-joined', async ({ userId: peerId }) => {
            console.log("👤 User joined:", peerId);
            await this.createPeerConnection(peerId, true);
        });

        this.socket.on('user-left', (peerId: string) => {
            console.log("👋 User left:", peerId);
            this.handlePeerDisconnection(peerId);
        });

        this.socket.on('offer', async ({ from, description }: { from: string; description: RTCSessionDescription }) => {
            console.log("📨 Received offer from:", from);
            const pc = await this.createPeerConnection(from, false);
            await pc.connection.setRemoteDescription(description);
            const answer = await pc.connection.createAnswer();
            await pc.connection.setLocalDescription(answer);
            this.socket?.emit('answer', { to: from, description: answer });
        });

        this.socket.on('answer', async ({ from, description }: { from: string; description: RTCSessionDescription }) => {
            console.log("📨 Received answer from:", from);
            const peer = this.peers.get(from);
            if (peer) {
                await peer.connection.setRemoteDescription(description);
            }
        });

        this.socket.on('ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidate }) => {
            console.log("❄️ Received ICE candidate from:", from);
            const peer = this.peers.get(from);
            if (peer) {
                await peer.connection.addIceCandidate(candidate);
            }
        });
    }

    private async createPeerConnection(peerId: string, isInitiator: boolean): Promise<PeerConnection> {
        const pc = new RTCPeerConnection(peerConfig);
        const peerConnection: PeerConnection = { connection: pc, stream: null };
        this.peers.set(peerId, peerConnection);

        // Add local tracks to the connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                if (this.localStream) {
                    pc.addTrack(track, this.localStream);
                }
            });
        }

        // Handle incoming streams
        pc.ontrack = (event) => {
            peerConnection.stream = event.streams[0];
            this.onStreamCallback?.(event.streams[0], peerId);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket?.emit('ice-candidate', {
                    to: peerId,
                    candidate: event.candidate
                });
            }
        };

        // Create and send offer if we're the initiator
        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket?.emit('offer', {
                to: peerId,
                description: offer
            });
        }

        return peerConnection;
    }

    joinRoom(roomId: string): void {
        this.socket?.emit('join-room', { roomId, userId: this.userId });
    }

    private handlePeerDisconnection(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.connection.close();
            this.peers.delete(peerId);
            this.onUserLeftCallback?.(peerId);
        }
    }

    // Media control methods
    toggleAudio(enabled: boolean): void {
        this.localStream?.getAudioTracks().forEach(track => track.enabled = enabled);
    }

    toggleVideo(enabled: boolean): void {
        this.localStream?.getVideoTracks().forEach(track => track.enabled = enabled);
    }

    // Event handler setters
    onStream(callback: (stream: MediaStream, peerId: string) => void): void {
        this.onStreamCallback = callback;
    }

    onUserLeft(callback: (peerId: string) => void): void {
        this.onUserLeftCallback = callback;
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    getPeerStream(peerId: string): MediaStream | null {
        return this.peers.get(peerId)?.stream || null;
    }

    // Cleanup
    disconnect(): void {
        this.localStream?.getTracks().forEach(track => track.stop());
        this.peers.forEach(peer => peer.connection.close());
        this.peers.clear();
        this.socket?.disconnect();
        this.socket = null;
        this.localStream = null;
    }
}