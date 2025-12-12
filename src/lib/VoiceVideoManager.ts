// src/lib/VoiceVideoManager.ts
// Amazon Chime SDK Voice/Video Manager
//
// HOW IT WORKS:
// =============
// 1. The Amazon Chime SDK handles all the complex WebRTC, TURN/STUN, and signaling internally
// 2. To use it, you need credentials from your backend (meeting + attendee info)
// 3. The SDK creates a "MeetingSession" which manages all audio/video
// 4. You bind video tiles to HTML <video> elements to display video
// 5. Audio is handled automatically via a bound <audio> element
//
// FLOW:
// -----
// 1. initialize() - Request media permissions and set up device controller
// 2. joinVoiceChannel(channelId) - Call backend API to get Chime meeting credentials
// 3. Backend creates meeting via AWS SDK (CreateMeeting + CreateAttendee)
// 4. Create MeetingSessionConfiguration with the credentials
// 5. Create DefaultMeetingSession and start audio/video
// 6. Subscribe to events (attendee presence, volume indicators, video tiles)
// 7. User can now talk and see others

import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  AudioVideoFacade,
  AudioVideoObserver,
  VideoTileState,
  MeetingSessionStatusCode,
  DefaultActiveSpeakerPolicy,
  ContentShareObserver,
  MeetingSessionStatus,
  DeviceChangeObserver,
  VideoSource,
} from 'amazon-chime-sdk-js';

import axios from 'axios';

// Chime API client - separate from main API
const CHIME_API_URL = process.env.NEXT_PUBLIC_CHIME_API_URL;

const chimeApiClient = axios.create({
  baseURL: CHIME_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Note: withCredentials is false because API Gateway uses '*' for CORS
  // If your Chime API needs auth, pass tokens in headers instead
  withCredentials: false,
});

// ==================== TYPES ====================

/**
 * Current state of local media (mute, video on/off, etc.)
 */
export interface MediaState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
  recording: boolean;
  mediaQuality: 'low' | 'medium' | 'high' | 'auto';
  activeStreams: {
    audio: boolean;
    video: boolean;
    screen: boolean;
  };
  availablePermissions: {
    audio: boolean;
    video: boolean;
  };
}

/**
 * Available devices (microphones, cameras, speakers)
 */
export interface DeviceInfo {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  activeAudioDevice?: string;
  activeVideoDevice?: string;
  activeAudioOutputDevice?: string;
}

/**
 * Network quality metrics
 */
export interface NetworkStats {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  connectionType: 'good' | 'fair' | 'poor';
}

/**
 * Credentials returned from backend after calling CreateMeeting + CreateAttendee
 */
export interface ChimeMeetingInfo {
  meeting: {
    MeetingId: string;
    MediaPlacement: {
      AudioHostUrl: string;
      AudioFallbackUrl: string;
      SignalingUrl: string;
      TurnControlUrl: string;
      ScreenDataUrl?: string;
      ScreenViewingUrl?: string;
      ScreenSharingUrl?: string;
    };
    ExternalMeetingId?: string;
  };
  attendee: {
    AttendeeId: string;
    ExternalUserId: string;
    JoinToken: string;
  };
}

/**
 * Represents a member in the voice channel roster
 */
export interface VoiceRosterMember {
  name: string;
  attendeeId: string;
  oduserId: string;
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
  signalStrength: number;
}

/**
 * Video tile information for binding to UI
 */
export interface VideoTileInfo {
  tileId: number;
  attendeeId: string;
  isLocal: boolean;
  isContent: boolean;
  active: boolean;
}

// ==================== MAIN MANAGER CLASS ====================

/**
 * VoiceVideoManager - Manages all voice/video functionality using Amazon Chime SDK
 * 
 * Usage:
 * ```ts
 * const manager = new VoiceVideoManager(userId);
 * await manager.initialize();
 * await manager.joinVoiceChannel(channelId);
 * 
 * // Subscribe to events
 * manager.onVoiceRoster((members) => console.log('Roster:', members));
 * manager.onVideoTileUpdated((tile) => console.log('Video tile:', tile));
 * 
 * // Control audio/video
 * manager.toggleAudio(false); // mute
 * await manager.toggleVideo(true); // turn on camera
 * 
 * // Leave
 * manager.leaveVoiceChannel();
 * ```
 */
export class VoiceVideoManager implements AudioVideoObserver, ContentShareObserver, DeviceChangeObserver {
  private userId: string;
  private username: string;
  private currentChannelId: string | null = null;

  // Chime SDK Components
  private logger: ConsoleLogger;
  private deviceController: DefaultDeviceController | null = null;
  private meetingSession: DefaultMeetingSession | null = null;
  private audioVideo: AudioVideoFacade | null = null;

  // Audio element for playback (hidden in DOM)
  private audioElement: HTMLAudioElement | null = null;

  // Video tiles tracking
  private videoTiles: Map<number, VideoTileInfo> = new Map();
  private localVideoTileId: number | null = null;

  // Roster (list of participants)
  private roster: Map<string, VoiceRosterMember> = new Map();

  // State
  private mediaState: MediaState = {
    muted: true, // Start muted by default
    speaking: false,
    video: false,
    screenSharing: false,
    recording: false,
    mediaQuality: 'auto',
    activeStreams: { audio: false, video: false, screen: false },
    availablePermissions: { audio: false, video: false }
  };

  private deviceInfo: DeviceInfo = {
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  };

  private networkStats: NetworkStats = {
    latency: 0,
    packetLoss: 0,
    bandwidth: 0,
    connectionType: 'good'
  };

  // Event callbacks
  private callbacks = {
    onVideoTileUpdated: null as ((tile: VideoTileInfo) => void) | null,
    onVideoTileRemoved: null as ((tileId: number) => void) | null,
    onVoiceRoster: null as ((members: VoiceRosterMember[]) => void) | null,
    onUserJoined: null as ((attendeeId: string, externalUserId: string) => void) | null,
    onUserLeft: null as ((attendeeId: string) => void) | null,
    onMediaStateChange: null as ((attendeeId: string, state: Partial<VoiceRosterMember>) => void) | null,
    onScreenSharing: null as ((attendeeId: string, isSharing: boolean) => void) | null,
    onError: null as ((error: { code: string; message: string }) => void) | null,
    onConnectionStateChange: null as ((connected: boolean) => void) | null,
    onNetworkQuality: null as ((stats: NetworkStats) => void) | null,
  };

  constructor(userId: string, username?: string) {
    this.userId = userId;
    this.username = username || userId;
    this.logger = new ConsoleLogger('ChimeVoice', LogLevel.WARN);
    console.log('[VoiceVideoManager] Initialized for user:', userId, 'username:', this.username);
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize the manager - requests media permissions and sets up device controller
   * 
   * HOW IT WORKS:
   * 1. Creates a DefaultDeviceController (handles all device enumeration/selection)
   * 2. Tries to list audio/video devices (this triggers permission prompts)
   * 3. Stores available permissions and device lists
   */
  async initialize(requestVideo = true, requestAudio = true): Promise<void> {
    try {
      console.log('[VoiceVideoManager] Initializing with:', { requestVideo, requestAudio });

      // Create device controller if not exists
      if (!this.deviceController) {
        this.deviceController = new DefaultDeviceController(this.logger);
      }

      let audioGranted = false;
      let videoGranted = false;

      // Request audio permission by listing devices
      if (requestAudio) {
        try {
          const audioInputs = await this.deviceController.listAudioInputDevices();
          audioGranted = audioInputs.length > 0;
          console.log('[VoiceVideoManager] Audio devices found:', audioInputs.length);
        } catch (e: any) {
          console.warn('[VoiceVideoManager] Audio permission denied:', e.name);
        }
      }

      // Request video permission by listing devices
      if (requestVideo) {
        try {
          const videoInputs = await this.deviceController.listVideoInputDevices();
          videoGranted = videoInputs.length > 0;
          console.log('[VoiceVideoManager] Video devices found:', videoInputs.length);
        } catch (e: any) {
          console.warn('[VoiceVideoManager] Video permission denied:', e.name);
        }
      }

      // Update permissions state
      this.mediaState.availablePermissions = {
        audio: audioGranted,
        video: videoGranted
      };

      // Update device lists
      await this.updateDeviceInfo();

      if (!audioGranted && !videoGranted) {
        throw new Error('No media permissions granted');
      }

      console.log('[VoiceVideoManager] Initialization complete:', this.mediaState.availablePermissions);
    } catch (error: any) {
      console.error('[VoiceVideoManager] Initialization failed:', error);
      this.callbacks.onError?.({ code: 'INIT_FAILED', message: error.message });
      throw error;
    }
  }

  /** Initialize with audio only */
  async initializeAudioOnly(): Promise<void> {
    return this.initialize(false, true);
  }

  /** Initialize with video only */
  async initializeVideoOnly(): Promise<void> {
    return this.initialize(true, false);
  }

  // ==================== JOIN/LEAVE VOICE CHANNEL ====================

  /**
   * Join a voice channel
   * 
   * HOW IT WORKS:
   * 1. Call backend API to get Chime meeting credentials
   * 2. Backend uses AWS SDK to CreateMeeting (or get existing) + CreateAttendee
   * 3. Create MeetingSessionConfiguration with those credentials
   * 4. Create DefaultMeetingSession 
   * 5. Add observers for events (video tiles, roster, etc.)
   * 6. Start audio input and bind audio element
   * 7. Call audioVideo.start() to begin the session
   */
  async joinVoiceChannel(channelId: string): Promise<void> {
    try {
      console.log('[VoiceVideoManager] Joining channel:', channelId);
      this.currentChannelId = channelId;

      // Step 1: Get meeting credentials from backend
      const meetingInfo = await this.createOrJoinMeeting(channelId);
      
      if (!meetingInfo?.meeting || !meetingInfo?.attendee) {
        throw new Error('Invalid meeting info received from server');
      }

      console.log('[VoiceVideoManager] Got meeting info:', {
        meetingId: meetingInfo.meeting.MeetingId,
        attendeeId: meetingInfo.attendee.AttendeeId
      });

      // Step 2: Create meeting session configuration
      const configuration = new MeetingSessionConfiguration(
        meetingInfo.meeting,
        meetingInfo.attendee
      );

      // Step 3: Create meeting session
      this.meetingSession = new DefaultMeetingSession(
        configuration,
        this.logger,
        this.deviceController!
      );

      this.audioVideo = this.meetingSession.audioVideo;

      // Step 4: Add observers
      this.audioVideo.addObserver(this);
      this.audioVideo.addContentShareObserver(this);
      this.deviceController?.addDeviceChangeObserver(this);

      // Step 5: Subscribe to attendee presence (join/leave events)
      this.audioVideo.realtimeSubscribeToAttendeeIdPresence(
        (attendeeId: string, present: boolean, externalUserId?: string) => {
          this.handleAttendeePresence(attendeeId, present, externalUserId);
        }
      );

      // Step 6: Subscribe to local mute state changes
      this.audioVideo.realtimeSubscribeToMuteAndUnmuteLocalAudio((muted: boolean) => {
        this.mediaState.muted = muted;
        this.broadcastRoster();
      });

      // Step 7: Subscribe to active speaker detection
      this.audioVideo.subscribeToActiveSpeakerDetector(
        new DefaultActiveSpeakerPolicy(),
        (attendeeIds: string[]) => {
          this.handleActiveSpeakers(attendeeIds);
        }
      );

      // Step 8: Start audio/video session
      await this.startSession();

      this.callbacks.onConnectionStateChange?.(true);
      console.log('[VoiceVideoManager] Successfully joined channel:', channelId);

    } catch (error: any) {
      console.error('[VoiceVideoManager] Failed to join channel:', error);
      this.callbacks.onError?.({ code: 'JOIN_FAILED', message: error.message });
      throw error;
    }
  }

  /**
   * Start the audio/video session
   * 
   * HOW IT WORKS:
   * 1. Select first available audio input device and start it
   * 2. Select audio output device
   * 3. Create hidden <audio> element and bind it (for hearing others)
   * 4. Start the session with audioVideo.start()
   */
  private async startSession(): Promise<void> {
    if (!this.audioVideo || !this.deviceController) return;

    try {
      // Start with first available audio input
      const audioInputs = await this.deviceController.listAudioInputDevices();
      if (audioInputs.length > 0) {
        const deviceId = this.deviceInfo.activeAudioDevice || audioInputs[0].deviceId;
        await this.audioVideo.startAudioInput(deviceId);
        this.deviceInfo.activeAudioDevice = deviceId;
        this.mediaState.activeStreams.audio = true;
        console.log('[VoiceVideoManager] Started audio input:', deviceId);
      }

      // Set audio output
      const audioOutputs = await this.deviceController.listAudioOutputDevices();
      if (audioOutputs.length > 0) {
        const deviceId = this.deviceInfo.activeAudioOutputDevice || audioOutputs[0].deviceId;
        await this.audioVideo.chooseAudioOutput(deviceId);
        this.deviceInfo.activeAudioOutputDevice = deviceId;
      }

      // Create and bind audio element (required to hear remote participants)
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      this.audioElement.style.display = 'none';
      document.body.appendChild(this.audioElement);
      this.audioVideo.bindAudioElement(this.audioElement);

      // Start the session!
      this.audioVideo.start();

      // Start muted by default for privacy
      this.audioVideo.realtimeMuteLocalAudio();
      this.mediaState.muted = true;

    } catch (error) {
      console.error('[VoiceVideoManager] Failed to start session:', error);
      throw error;
    }
  }

  /**
   * Leave the current voice channel
   * 
   * HOW IT WORKS:
   * 1. Stop local video if on
   * 2. Stop screen share if active
   * 3. Stop the audio/video session
   * 4. Clean up audio element
   * 5. Clear all state
   */
  leaveVoiceChannel(): void {
    console.log('[VoiceVideoManager] Leaving channel:', this.currentChannelId);

    if (this.audioVideo) {
      // Stop local video
      if (this.mediaState.video) {
        this.audioVideo.stopVideoInput();
        this.audioVideo.stopLocalVideoTile();
      }

      // Stop screen share
      if (this.mediaState.screenSharing) {
        this.audioVideo.stopContentShare();
      }

      // Remove observers
      this.audioVideo.removeObserver(this);
      this.audioVideo.removeContentShareObserver(this);
      this.deviceController?.removeDeviceChangeObserver(this);

      // Stop the session
      this.audioVideo.stop();
    }

    // Clean up audio element
    if (this.audioElement) {
      this.audioElement.remove();
      this.audioElement = null;
    }

    // Clear state
    this.roster.clear();
    this.videoTiles.clear();
    this.localVideoTileId = null;
    this.currentChannelId = null;
    this.meetingSession = null;
    this.audioVideo = null;

    // Reset media state
    this.mediaState = {
      ...this.mediaState,
      video: false,
      screenSharing: false,
      speaking: false,
      activeStreams: { audio: false, video: false, screen: false }
    };

    this.callbacks.onConnectionStateChange?.(false);
  }

  // ==================== AUDIO/VIDEO CONTROLS ====================

  /**
   * Toggle local audio (mute/unmute)
   * 
   * HOW IT WORKS:
   * The Chime SDK provides realtime mute/unmute methods that immediately
   * stop/start sending audio to the server. No audio data leaves your
   * device when muted.
   */
  toggleAudio(enabled: boolean): void {
    if (!this.audioVideo) return;

    if (enabled) {
      const unmuted = this.audioVideo.realtimeUnmuteLocalAudio();
      this.mediaState.muted = !unmuted;
      console.log('[VoiceVideoManager] Unmuted audio:', unmuted);
    } else {
      this.audioVideo.realtimeMuteLocalAudio();
      this.mediaState.muted = true;
      console.log('[VoiceVideoManager] Muted audio');
    }

    this.broadcastLocalState();
  }

  /**
   * Toggle local video (camera on/off)
   * 
   * HOW IT WORKS:
   * 1. If turning on: Start video input with device, then start local video tile
   * 2. If turning off: Stop video input and stop local video tile
   * 3. The SDK automatically handles sending the video stream to others
   */
  async toggleVideo(enabled: boolean): Promise<void> {
    if (!this.audioVideo) return;

    try {
      if (enabled) {
        // Check permission
        if (!this.mediaState.availablePermissions.video) {
          console.warn('[VoiceVideoManager] No video permission');
          return;
        }

        // Get video device
        const videoInputs = await this.deviceController?.listVideoInputDevices();
        if (!videoInputs?.length) {
          console.warn('[VoiceVideoManager] No video devices available');
          return;
        }

        const deviceId = this.deviceInfo.activeVideoDevice || videoInputs[0].deviceId;
        
        // Start video input (this captures from camera)
        await this.audioVideo.startVideoInput(deviceId);
        this.deviceInfo.activeVideoDevice = deviceId;

        // Start local video tile (this sends to others)
        this.audioVideo.startLocalVideoTile();
        
        this.mediaState.video = true;
        this.mediaState.activeStreams.video = true;
        console.log('[VoiceVideoManager] Video started');

      } else {
        // Stop video
        await this.audioVideo.stopVideoInput();
        this.audioVideo.stopLocalVideoTile();
        
        this.mediaState.video = false;
        this.mediaState.activeStreams.video = false;
        console.log('[VoiceVideoManager] Video stopped');
      }

      this.broadcastLocalState();
    } catch (error) {
      console.error('[VoiceVideoManager] Toggle video failed:', error);
      throw error;
    }
  }

  // ==================== SCREEN SHARING ====================

  /**
   * Start screen sharing
   * 
   * HOW IT WORKS:
   * The SDK calls the browser's getDisplayMedia API to capture screen/window.
   * The captured stream is sent as a "content share" which appears as a
   * separate video tile for other participants.
   * 
   * NOTE: If the user cancels the screen share dialog, this will throw a
   * NotAllowedError which should be handled gracefully by the caller.
   */
  async startScreenShare(): Promise<void> {
    if (!this.audioVideo) return;

    try {
      await this.audioVideo.startContentShareFromScreenCapture();
      this.mediaState.screenSharing = true;
      this.mediaState.activeStreams.screen = true;
      this.broadcastLocalState();
      console.log('[VoiceVideoManager] Screen sharing started');
    } catch (error: any) {
      console.error('[VoiceVideoManager] Screen share failed:', error);
      
      // Handle user cancellation gracefully - don't treat as an error
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission denied')) {
        console.log('[VoiceVideoManager] Screen share was cancelled by user');
        // Don't set error state or throw - just silently return
        // The user intentionally cancelled, this is not an error condition
        return;
      }
      
      // For other errors, notify via callback but don't crash
      this.callbacks.onError?.({ 
        code: 'SCREEN_SHARE_FAILED', 
        message: error.message || 'Screen sharing failed' 
      });
      
      // Re-throw for other genuine errors so caller can handle
      throw error;
    }
  }

  /** Stop screen sharing */
  stopScreenShare(): void {
    if (!this.audioVideo) return;

    this.audioVideo.stopContentShare();
    this.mediaState.screenSharing = false;
    this.mediaState.activeStreams.screen = false;
    this.broadcastLocalState();
    console.log('[VoiceVideoManager] Screen sharing stopped');
  }

  // ContentShareObserver implementation
  contentShareDidStart(): void {
    console.log('[VoiceVideoManager] Content share did start');
  }

  contentShareDidStop(): void {
    console.log('[VoiceVideoManager] Content share did stop');
    this.mediaState.screenSharing = false;
    this.mediaState.activeStreams.screen = false;
    this.broadcastLocalState();
  }

  contentShareDidPause(): void {
    console.log('[VoiceVideoManager] Content share paused');
  }

  contentShareDidUnpause(): void {
    console.log('[VoiceVideoManager] Content share unpaused');
  }

  // ==================== DEVICE MANAGEMENT ====================

  /** Update the list of available devices */
  async updateDeviceInfo(): Promise<void> {
    if (!this.deviceController) return;

    try {
      const [audioInputs, videoInputs, audioOutputs] = await Promise.all([
        this.deviceController.listAudioInputDevices(),
        this.deviceController.listVideoInputDevices(),
        this.deviceController.listAudioOutputDevices()
      ]);

      this.deviceInfo = {
        audioInputs: audioInputs as unknown as MediaDeviceInfo[],
        videoInputs: videoInputs as unknown as MediaDeviceInfo[],
        audioOutputs: audioOutputs as unknown as MediaDeviceInfo[],
        activeAudioDevice: this.deviceInfo.activeAudioDevice,
        activeVideoDevice: this.deviceInfo.activeVideoDevice,
        activeAudioOutputDevice: this.deviceInfo.activeAudioOutputDevice
      };
    } catch (error) {
      console.error('[VoiceVideoManager] Failed to update devices:', error);
    }
  }

  /** Switch microphone to a different device */
  async switchMicrophone(deviceId: string): Promise<void> {
    if (!this.audioVideo) return;
    await this.audioVideo.startAudioInput(deviceId);
    this.deviceInfo.activeAudioDevice = deviceId;
    console.log('[VoiceVideoManager] Switched microphone to:', deviceId);
  }

  /** Switch camera to a different device */
  async switchCamera(deviceId: string): Promise<void> {
    if (!this.audioVideo) return;
    await this.audioVideo.startVideoInput(deviceId);
    this.deviceInfo.activeVideoDevice = deviceId;
    console.log('[VoiceVideoManager] Switched camera to:', deviceId);
  }

  /** Switch speaker/audio output to a different device */
  async switchSpeaker(deviceId: string): Promise<void> {
    if (!this.audioVideo) return;
    await this.audioVideo.chooseAudioOutput(deviceId);
    this.deviceInfo.activeAudioOutputDevice = deviceId;
    console.log('[VoiceVideoManager] Switched speaker to:', deviceId);
  }

  // DeviceChangeObserver implementation
  audioInputsChanged(freshAudioInputDeviceList: MediaDeviceInfo[]): void {
    this.deviceInfo.audioInputs = freshAudioInputDeviceList;
  }

  audioOutputsChanged(freshAudioOutputDeviceList: MediaDeviceInfo[]): void {
    this.deviceInfo.audioOutputs = freshAudioOutputDeviceList;
  }

  videoInputsChanged(freshVideoInputDeviceList: MediaDeviceInfo[]): void {
    this.deviceInfo.videoInputs = freshVideoInputDeviceList;
  }

  // ==================== AUDIO/VIDEO OBSERVER IMPLEMENTATION ====================

  /**
   * Called when the session starts
   */
  audioVideoDidStart(): void {
    console.log('[VoiceVideoManager] Audio/video session started');
    this.callbacks.onConnectionStateChange?.(true);
  }

  /**
   * Called when the session stops
   */
  audioVideoDidStop(sessionStatus: MeetingSessionStatus): void {
    const code = sessionStatus.statusCode();
    console.log('[VoiceVideoManager] Audio/video session stopped:', code);

    // Handle different stop reasons
    if (code === MeetingSessionStatusCode.Left) {
      console.log('[VoiceVideoManager] User left the meeting');
    } else if (code === MeetingSessionStatusCode.MeetingEnded) {
      console.log('[VoiceVideoManager] Meeting was ended');
    } else {
      console.warn('[VoiceVideoManager] Session stopped with code:', code);
    }

    this.callbacks.onConnectionStateChange?.(false);
  }

  /**
   * Called during connection attempts
   */
  audioVideoDidStartConnecting(reconnecting: boolean): void {
    console.log('[VoiceVideoManager] Connecting...', { reconnecting });
  }

  /**
   * Called when a video tile is created or updated
   * 
   * HOW VIDEO TILES WORK:
   * - Each participant's video (and screen share) is a "tile"
   * - You bind tiles to <video> elements using bindVideoElement(tileId, element)
   * - Local tile has localTile=true
   * - Content share tiles have isContent=true
   * 
   * NOTE: For REMOTE video state, we rely on remoteVideoSourcesDidChange() as the
   * authoritative source. This callback is only used for:
   * - Tracking local video state
   * - Notifying UI about tile creation for binding video elements
   */
  videoTileDidUpdate(tileState: VideoTileState): void {
    if (!tileState.tileId) return;

    const tileInfo: VideoTileInfo = {
      tileId: tileState.tileId,
      attendeeId: tileState.boundAttendeeId || '',
      isLocal: tileState.localTile || false,
      isContent: tileState.isContent || false,
      active: tileState.active || false
    };

    this.videoTiles.set(tileState.tileId, tileInfo);

    if (tileState.localTile) {
      this.localVideoTileId = tileState.tileId;
    }

    console.log('[VoiceVideoManager] Video tile updated:', tileInfo);

    // Only update video state for LOCAL tiles here
    // Remote video state is handled by remoteVideoSourcesDidChange() to avoid race conditions
    if (tileState.localTile && tileState.boundAttendeeId && !tileState.isContent) {
      const rosterMember = this.roster.get(tileState.boundAttendeeId);
      if (rosterMember) {
        const hadVideo = rosterMember.video;
        rosterMember.video = tileState.active || false;
        console.log(`[VoiceVideoManager] Updated LOCAL roster member ${tileState.boundAttendeeId} video state: ${hadVideo} -> ${rosterMember.video}`);
        this.broadcastRoster();
      }
    }

    this.callbacks.onVideoTileUpdated?.(tileInfo);

    // If this is a content share, update screen sharing state
    if (tileState.isContent && tileState.boundAttendeeId) {
      const baseAttendeeId = tileState.boundAttendeeId.split('#')[0];
      this.callbacks.onScreenSharing?.(baseAttendeeId, true);
    }
  }

  /**
   * Called when a video tile is removed
   * 
   * NOTE: For REMOTE video state, we rely on remoteVideoSourcesDidChange() as the
   * authoritative source. This callback only handles local tiles and screen sharing.
   */
  videoTileWasRemoved(tileId: number): void {
    const tileInfo = this.videoTiles.get(tileId);
    
    // Handle content share (screen sharing) removal
    if (tileInfo?.isContent && tileInfo.attendeeId) {
      const baseAttendeeId = tileInfo.attendeeId.split('#')[0];
      this.callbacks.onScreenSharing?.(baseAttendeeId, false);
    }

    // Only update video state for LOCAL tiles here
    // Remote video state is handled by remoteVideoSourcesDidChange() to avoid race conditions
    if (tileInfo?.isLocal && tileInfo?.attendeeId && !tileInfo.isContent) {
      const rosterMember = this.roster.get(tileInfo.attendeeId);
      if (rosterMember) {
        console.log(`[VoiceVideoManager] Setting LOCAL roster member ${tileInfo.attendeeId} video state to false (tile removed)`);
        rosterMember.video = false;
        this.broadcastRoster();
      }
    }

    this.videoTiles.delete(tileId);

    if (tileId === this.localVideoTileId) {
      this.localVideoTileId = null;
    }

    console.log('[VoiceVideoManager] Video tile removed:', tileId);
    this.callbacks.onVideoTileRemoved?.(tileId);
  }

  /**
   * Called when connection quality changes
   */
  connectionDidBecomePoor(): void {
    console.warn('[VoiceVideoManager] Connection became poor');
    this.networkStats.connectionType = 'poor';
    this.callbacks.onNetworkQuality?.(this.networkStats);
  }

  connectionDidSuggestStopVideo(): void {
    console.warn('[VoiceVideoManager] Suggestion to stop video due to poor connection');
  }

  /**
   * Called when remote video sources change (participants turn video on/off)
   * This is the PRIMARY callback for detecting remote video state changes!
   */
  remoteVideoSourcesDidChange(videoSources: VideoSource[]): void {
    console.log('[VoiceVideoManager] *** remoteVideoSourcesDidChange called ***');
    console.log('[VoiceVideoManager] Video sources count:', videoSources.length);
    console.log('[VoiceVideoManager] Video sources:', videoSources.map(vs => ({
      attendeeId: vs.attendee?.attendeeId,
      externalUserId: vs.attendee?.externalUserId
    })));

    // Get set of attendee IDs that currently have video
    const attendeesWithVideo = new Set(
      videoSources.map(source => source.attendee?.attendeeId).filter(Boolean)
    );

    console.log('[VoiceVideoManager] Attendees with video:', Array.from(attendeesWithVideo));

    // Update all roster members' video state
    let hasChanges = false;
    this.roster.forEach((member, attendeeId) => {
      const hasVideo = attendeesWithVideo.has(attendeeId);
      if (member.video !== hasVideo) {
        console.log(`[VoiceVideoManager] Updating ${attendeeId} video state: ${member.video} -> ${hasVideo}`);
        member.video = hasVideo;
        hasChanges = true;
      }
    });

    // Broadcast roster update if there were changes
    if (hasChanges) {
      console.log('[VoiceVideoManager] Broadcasting roster update after video source change');
      this.broadcastRoster();
    }
  }

  // ==================== ATTENDEE/ROSTER MANAGEMENT ====================

  /**
   * Handle attendee presence changes (join/leave)
   * 
   * HOW IT WORKS:
   * The SDK notifies us when attendees join or leave.
   * We maintain a roster map and subscribe to volume indicators
   * for each attendee to track mute/speaking state.
   * 
   * NOTE: Video state is handled by remoteVideoSourcesDidChange() - we always
   * start with video: false here and let that callback update it.
   */
  private handleAttendeePresence(attendeeId: string, present: boolean, externalUserId?: string): void {
    // Skip content share attendees for the main roster
    if (attendeeId.includes('#content')) return;

    const userId = externalUserId || attendeeId;

    if (present) {
      // Attendee joined - start with video: false
      // remoteVideoSourcesDidChange() will update this if they have video
      const member: VoiceRosterMember = {
        name: userId,
        attendeeId,
        oduserId: userId,
        muted: false,
        speaking: false,
        video: false,  // Always start false, remoteVideoSourcesDidChange handles video state
        screenSharing: false,
        signalStrength: 1
      };

      this.roster.set(attendeeId, member);
      this.callbacks.onUserJoined?.(attendeeId, userId);
      console.log('[VoiceVideoManager] Attendee joined:', { attendeeId, userId });

      // Subscribe to volume indicator for this attendee
      this.audioVideo?.realtimeSubscribeToVolumeIndicator(
        attendeeId,
        (aid: string, volume: number | null, muted: boolean | null, signalStrength: number | null) => {
          const rosterMember = this.roster.get(aid);
          if (rosterMember) {
            if (muted !== null) rosterMember.muted = muted;
            if (volume !== null) rosterMember.speaking = volume > 0;
            if (signalStrength !== null) rosterMember.signalStrength = signalStrength;
            
            this.callbacks.onMediaStateChange?.(aid, {
              muted: rosterMember.muted,
              speaking: rosterMember.speaking,
              signalStrength: rosterMember.signalStrength
            });
          }
        }
      );

      console.log('[VoiceVideoManager] Attendee joined:', { attendeeId, userId });
    } else {
      // Attendee left
      this.roster.delete(attendeeId);
      this.callbacks.onUserLeft?.(attendeeId);
      console.log('[VoiceVideoManager] Attendee left:', attendeeId);
    }

    this.broadcastRoster();
  }

  /**
   * Handle active speaker detection
   */
  private handleActiveSpeakers(attendeeIds: string[]): void {
    // Update speaking state for all roster members
    this.roster.forEach((member, aid) => {
      const wasSpeaking = member.speaking;
      member.speaking = attendeeIds.includes(aid);

      if (wasSpeaking !== member.speaking) {
        this.callbacks.onMediaStateChange?.(aid, { speaking: member.speaking });
      }
    });
  }

  /** Broadcast the current roster to listeners */
  private broadcastRoster(): void {
    const members = Array.from(this.roster.values());
    this.callbacks.onVoiceRoster?.(members);
  }

  /** Broadcast local user's state change */
  private broadcastLocalState(): void {
    const localAttendeeId = this.meetingSession?.configuration?.credentials?.attendeeId;
    if (localAttendeeId) {
      const localMember = this.roster.get(localAttendeeId);
      if (localMember) {
        localMember.muted = this.mediaState.muted;
        localMember.video = this.mediaState.video;
        localMember.screenSharing = this.mediaState.screenSharing;
      }
    }
    this.broadcastRoster();
  }

  // ==================== API CALLS ====================

  /**
   * Call backend to create or join a Chime meeting
   * 
   * API Endpoints:
   * - POST /meetings - Create meeting & attendee (returns { meeting, attendee })
   * - GET /meetings/{meetingId} - Get meeting info
   * - POST /meetings/{meetingId}/attendees - Join existing meeting (returns { meeting, attendee })
   * - DELETE /meetings/{meetingId} - End meeting
   */
  private async createOrJoinMeeting(channelId: string): Promise<ChimeMeetingInfo> {
    try {
      console.log('[VoiceVideoManager] Creating/joining meeting for channel:', channelId);

      let response: any;

      try {
        // Try to create a new meeting (this also creates the attendee)
        // Backend expects: attendeeName (required), channelId (required), externalUserId (optional)
        // Username will be used as both attendeeName and externalUserId for display in Chime roster
        response = await chimeApiClient.post('/meetings', {
          attendeeName: this.username,       // Required by backend - will be displayed
          channelId: channelId,              // Required by backend
          externalUserId: this.username      // Optional - used as Chime ExternalUserId
        });
        console.log('[VoiceVideoManager] Created new meeting');
      } catch (createError: any) {
        // If meeting already exists (409 Conflict), join it instead
        if (createError.response?.status === 409) {
          const existingMeetingId = createError.response?.data?.meetingId || createError.response?.data?.data?.meeting?.MeetingId || channelId;
          console.log('[VoiceVideoManager] Meeting exists, joining:', existingMeetingId);
          
          // Join the existing meeting
          // Backend expects: attendeeName (required), externalUserId (optional)
          response = await chimeApiClient.post(`/meetings/${existingMeetingId}/attendees`, {
            attendeeName: this.username,     // Required by backend
            externalUserId: this.username    // Optional - used as Chime ExternalUserId
          });
        } else {
          throw createError;
        }
      }

      // Handle response format: { success: true, data: { meeting, attendee } }
      const responseData = response.data?.data || response.data;
      const { meeting, attendee } = responseData;

      if (!meeting || !attendee) {
        throw new Error('Invalid response: missing meeting or attendee data');
      }

      console.log('[VoiceVideoManager] Got meeting:', meeting.MeetingId);
      console.log('[VoiceVideoManager] Got attendee:', attendee.AttendeeId);

      // Return in the expected ChimeMeetingInfo format
      return {
        meeting: {
          MeetingId: meeting.MeetingId,
          MediaPlacement: {
            AudioHostUrl: meeting.MediaPlacement?.AudioHostUrl,
            AudioFallbackUrl: meeting.MediaPlacement?.AudioFallbackUrl,
            SignalingUrl: meeting.MediaPlacement?.SignalingUrl,
            TurnControlUrl: meeting.MediaPlacement?.TurnControlUrl,
            ScreenDataUrl: meeting.MediaPlacement?.ScreenDataUrl,
            ScreenViewingUrl: meeting.MediaPlacement?.ScreenViewingUrl,
            ScreenSharingUrl: meeting.MediaPlacement?.ScreenSharingUrl,
          },
          ExternalMeetingId: meeting.ExternalMeetingId || channelId
        },
        attendee: {
          AttendeeId: attendee.AttendeeId,
          ExternalUserId: attendee.ExternalUserId || this.userId,
          JoinToken: attendee.JoinToken
        }
      };

    } catch (error: any) {
      console.error('[VoiceVideoManager] API call failed:', error);
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to join meeting';
      throw new Error(message);
    }
  }

  // ==================== VIDEO ELEMENT BINDING ====================

  /**
   * Bind a video tile to an HTML video element
   * 
   * HOW TO USE:
   * 1. Subscribe to onVideoTileUpdated to get tile info
   * 2. When you get a tile, call bindVideoElement(tileId, yourVideoElement)
   * 3. The video will automatically play in that element
   */
  bindVideoElement(tileId: number, element: HTMLVideoElement): void {
    if (this.audioVideo) {
      this.audioVideo.bindVideoElement(tileId, element);
    }
  }

  /** Unbind a video tile from its element */
  unbindVideoElement(tileId: number): void {
    if (this.audioVideo) {
      this.audioVideo.unbindVideoElement(tileId);
    }
  }

  // ==================== EVENT CALLBACKS ====================

  onVideoTileUpdated(callback: (tile: VideoTileInfo) => void): void {
    this.callbacks.onVideoTileUpdated = callback;
  }

  onVideoTileRemoved(callback: (tileId: number) => void): void {
    this.callbacks.onVideoTileRemoved = callback;
  }

  onVoiceRoster(callback: (members: VoiceRosterMember[]) => void): void {
    this.callbacks.onVoiceRoster = callback;
  }

  onUserJoined(callback: (attendeeId: string, externalUserId: string) => void): void {
    this.callbacks.onUserJoined = callback;
  }

  onUserLeft(callback: (attendeeId: string) => void): void {
    this.callbacks.onUserLeft = callback;
  }

  onMediaState(callback: (attendeeId: string, state: Partial<VoiceRosterMember>) => void): void {
    this.callbacks.onMediaStateChange = callback;
  }

  onScreenSharing(callback: (attendeeId: string, isSharing: boolean) => void): void {
    this.callbacks.onScreenSharing = callback;
  }

  onError(callback: (error: { code: string; message: string }) => void): void {
    this.callbacks.onError = callback;
  }

  onConnectionStateChange(callback: (connected: boolean) => void): void {
    this.callbacks.onConnectionStateChange = callback;
  }

  onNetworkQuality(callback: (stats: NetworkStats) => void): void {
    this.callbacks.onNetworkQuality = callback;
  }

  // Legacy callback aliases for backwards compatibility
  onStream(callback: (stream: MediaStream, peerId: string, type: 'video' | 'screen') => void): void {
    // This is now handled via video tiles instead of streams
    console.warn('[VoiceVideoManager] onStream is deprecated, use onVideoTileUpdated instead');
  }

  onRecording(callback: (event: string, data: any) => void): void {
    // Recording is handled server-side in Chime
    console.warn('[VoiceVideoManager] Recording is managed server-side via Chime Media Capture Pipeline');
  }

  // ==================== GETTERS ====================

  getMediaState(): MediaState {
    return { ...this.mediaState };
  }

  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  getNetworkStats(): NetworkStats | null {
    return this.networkStats;
  }

  getAvailablePermissions(): { audio: boolean; video: boolean } {
    return { ...this.mediaState.availablePermissions };
  }

  hasAnyPermissions(): boolean {
    return this.mediaState.availablePermissions.audio || this.mediaState.availablePermissions.video;
  }

  isConnected(): boolean {
    return this.audioVideo !== null;
  }

  getCurrentChannelId(): string | null {
    return this.currentChannelId;
  }

  getLocalVideoTileId(): number | null {
    return this.localVideoTileId;
  }

  getVideoTiles(): Map<number, VideoTileInfo> {
    return new Map(this.videoTiles);
  }

  getRoster(): VoiceRosterMember[] {
    return Array.from(this.roster.values());
  }

  getAudioVideo(): AudioVideoFacade | null {
    return this.audioVideo;
  }

  getLocalAttendeeId(): string | null {
    return this.meetingSession?.configuration?.credentials?.attendeeId || null;
  }

  getLocalExternalUserId(): string | null {
    return this.meetingSession?.configuration?.credentials?.externalUserId || null;
  }

  // ==================== UTILITY METHODS ====================

  /** Adjust video quality (Chime handles most of this automatically) */
  adjustQuality(quality: 'low' | 'medium' | 'high' | 'auto'): void {
    this.mediaState.mediaQuality = quality;
    // Chime SDK handles quality adaptation automatically based on network conditions
    console.log('[VoiceVideoManager] Quality preference set to:', quality);
  }

  /** Recording (managed server-side) */
  startRecording(config?: any): void {
    console.log('[VoiceVideoManager] Recording is managed via Chime Media Capture Pipeline on the server');
  }

  stopRecording(): void {
    console.log('[VoiceVideoManager] Stop recording via server');
  }

  /** Full disconnect */
  disconnect(): void {
    this.leaveVoiceChannel();
    this.deviceController = null;
    console.log('[VoiceVideoManager] Fully disconnected');
  }

  // Legacy getters for backwards compatibility
  getLocalStream(): MediaStream | null {
    // Chime SDK doesn't expose streams directly; use video tiles instead
    return null;
  }

  getLocalScreenStream(): MediaStream | null {
    return null;
  }

  async ensureConnection(): Promise<void> {
    // No-op for compatibility
  }
}
