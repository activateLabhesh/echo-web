import { MediaStreamManager } from '@/socket';

export class VideoVoiceService {
    private mediaManager: MediaStreamManager | null = null;
    private onRemoteStreamCallback: ((stream: MediaStream, socketId: string) => void) | null = null;
    private onUserDisconnectedCallback: ((socketId: string) => void) | null = null;

    constructor(private userId: string) {}

    public async connect(video: boolean = true): Promise<void> {
        try {
            // Create new instance of MediaStreamManager
            this.mediaManager = new MediaStreamManager(this.userId);

            // Set up callbacks before initialization
            if (this.onRemoteStreamCallback) {
                this.mediaManager.onStream(this.onRemoteStreamCallback);
            }
            
            if (this.onUserDisconnectedCallback) {
                this.mediaManager.onUserLeft(this.onUserDisconnectedCallback);
            }

            // Initialize after callbacks are set
            await this.mediaManager.initialize(video, true);
            
            console.log('✅ Voice/Video connection initialized successfully');
        } catch (error) {
            console.error('❌ Error connecting to voice/video:', error);
            // Clean up on error
            this.mediaManager?.disconnect();
            this.mediaManager = null;
            throw error;
        }
    }

    public joinChannel(channelId: string): void {
        this.mediaManager?.joinRoom(channelId);
    }

    public getLocalStream(): MediaStream | null {
        return this.mediaManager?.getLocalStream() || null;
    }

    public toggleAudio(enabled: boolean): void {
        this.mediaManager?.toggleAudio(enabled);
    }

    public toggleVideo(enabled: boolean): void {
        this.mediaManager?.toggleVideo(enabled);
    }

    public onRemoteStream(cb: (stream: MediaStream, socketId: string) => void): void {
        this.onRemoteStreamCallback = cb;
        // If MediaStreamManager already exists, set the callback immediately
        if (this.mediaManager) {
            this.mediaManager.onStream(cb);
        }
    }

    public onUserDisconnected(cb: (socketId: string) => void): void {
        this.onUserDisconnectedCallback = cb;
        // If MediaStreamManager already exists, set the callback immediately
        if (this.mediaManager) {
            this.mediaManager.onUserLeft(cb);
        }
    }

    public disconnect(): void {
        if (this.mediaManager) {
            this.mediaManager.disconnect();
            this.mediaManager = null;
        }
    }
}
    