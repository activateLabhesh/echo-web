// src/lib/VoiceVideoManager.ts

import { Socket } from 'socket.io-client';

interface MediaState {
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

interface DeviceInfo {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  activeAudioDevice?: string;
  activeVideoDevice?: string;
}

interface RecordingConfig {
  includeAudio: boolean;
  includeVideo: boolean;
  includeScreenShare: boolean;
  quality: 'low' | 'medium' | 'high';
}

interface NetworkStats {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  connectionType: string;
}

interface PeerConnection {
  connection: RTCPeerConnection;
  stream: MediaStream | null;
  type: 'video' | 'screen'; // Distinguish between regular video and screen share
}

const peerConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export class VoiceVideoManager {
  private socket: Socket;
  private userId: string;
  private currentChannelId: string | null = null;
  
  // Media streams
  private localStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private screenPeers: Map<string, PeerConnection> = new Map();
  
  // State management
  private mediaState: MediaState = {
    muted: false,
    speaking: false,
    video: false,
    screenSharing: false,
    recording: false,
    mediaQuality: 'auto',
    activeStreams: {
      audio: true,
      video: false,
      screen: false
    },
    availablePermissions: {
      audio: false,
      video: false
    }
  };
  
  private deviceInfo: DeviceInfo = {
    audioInputs: [],
    videoInputs: [],
    activeAudioDevice: undefined,
    activeVideoDevice: undefined
  };
  
  private currentRecordingId: string | null = null;
  private networkStats: NetworkStats | null = null;
  
  // ICE candidate queues
  private iceCandidateQueues: Map<string, RTCIceCandidate[]> = new Map();
  private screenIceCandidateQueues: Map<string, RTCIceCandidate[]> = new Map();
  
  // Callbacks
  private onStreamCallback: ((stream: MediaStream, peerId: string, type: 'video' | 'screen') => void) | null = null;
  private onUserLeftCallback: ((peerId: string) => void) | null = null;
  private onVoiceRosterCallback: ((members: any[]) => void) | null = null;
  private onUserJoinedCallback: ((socketId: string, userId: string) => void) | null = null;
  private onMediaStateCallback: ((socketId: string, userId: string, state: any) => void) | null = null;
  private onScreenSharingCallback: ((socketId: string, userId: string, isSharing: boolean) => void) | null = null;
  private onRecordingCallback: ((event: string, data: any) => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  private onNetworkQualityCallback: ((stats: NetworkStats) => void) | null = null;

  constructor(userId: string, socket: Socket) {
    this.userId = userId;
    this.socket = socket;
    this.setupSocketListeners();
    this.setupConnectionMonitoring();
  }

  // === INITIALIZATION ===
  async initialize(video: boolean = true, audio: boolean = true): Promise<void> {
    try {
      console.log("🎤 Requesting media permissions...", { video, audio });
      
      let finalStream: MediaStream | null = null;
      let audioPermission = false;
      let videoPermission = false;
      
      // Try to get both audio and video first
      try {
        finalStream = await navigator.mediaDevices.getUserMedia({ video, audio });
        audioPermission = audio && finalStream.getAudioTracks().length > 0;
        videoPermission = video && finalStream.getVideoTracks().length > 0;
        console.log("✅ Got both audio and video permissions:", { audioPermission, videoPermission });
      } catch (error: any) {
        console.warn("⚠️ Failed to get both permissions, trying separately:", error.name);
        
        // Try audio only
        if (audio) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioPermission = true;
            finalStream = audioStream;
            console.log("✅ Got audio permission");
          } catch (audioError: any) {
            console.warn("⚠️ Failed to get audio permission:", audioError.name);
          }
        }
        
        // Try video only
        if (video) {
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            videoPermission = true;
            
            if (finalStream) {
              // Combine audio and video streams
              const combinedStream = new MediaStream();
              finalStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
              videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
              
              // Stop old streams
              finalStream.getTracks().forEach(track => track.stop());
              videoStream.getTracks().forEach(track => track.stop());
              
              finalStream = combinedStream;
            } else {
              finalStream = videoStream;
            }
            console.log("✅ Got video permission");
          } catch (videoError: any) {
            console.warn("⚠️ Failed to get video permission:", videoError.name);
          }
        }
        
        // If we couldn't get any permissions, throw the original error
        if (!audioPermission && !videoPermission) {
          throw error;
        }
      }
      
      this.localStream = finalStream;
      console.log("✅ Media stream obtained:", this.localStream);
      
      // Initialize device info
      await this.updateDeviceInfo();
      
      // Update initial media state based on what we actually got
      console.log('🎥 AUTO-INIT: Setting initial video state to:', videoPermission, 'in initialize()');
      this.mediaState.video = videoPermission;
      this.mediaState.activeStreams.audio = audioPermission;
      this.mediaState.activeStreams.video = videoPermission;
      this.mediaState.availablePermissions.audio = audioPermission;
      this.mediaState.availablePermissions.video = videoPermission;
      
      console.log("✅ VoiceVideoManager initialized successfully with permissions:", {
        audio: audioPermission,
        video: videoPermission
      });
    } catch (error: any) {
      console.error("❌ Error initializing VoiceVideoManager:", error);
      console.error("❌ Error details:", error?.name, error?.message);
      throw error;
    }
  }

  async initializeAudioOnly(): Promise<void> {
    return this.initialize(false, true);
  }

  async initializeVideoOnly(): Promise<void> {
    return this.initialize(true, false);
  }

  // === SOCKET EVENT SETUP ===
  private setupSocketListeners(): void {
    // Legacy events (backward compatibility)
    this.socket.on('voice_roster', ({ channelId, members }) => {
      console.log('📋 [VoiceVideoManager] Voice roster update:', { channelId, members, currentChannel: this.currentChannelId });
      this.onVoiceRosterCallback?.(members);
    });

    this.socket.on('user-joined', ({ socketId, userId, channelId }) => {
      console.log('👋 [VoiceVideoManager] User joined:', { socketId, userId, channelId, currentChannel: this.currentChannelId });
      this.onUserJoinedCallback?.(socketId, userId);
      if (channelId === this.currentChannelId) {
        console.log('🤝 [VoiceVideoManager] Creating peer connection for user:', socketId);
        this.createPeerConnection(socketId, true, 'video').catch(err => {
          console.error('❌ [VoiceVideoManager] Failed to create peer connection:', err);
        });
      }
    });

    this.socket.on('user-disconnected', ({ socketId, userId, channelId }) => {
      this.handlePeerDisconnection(socketId);
    });

    // Legacy voice state event (backward compatibility with old backend)
    this.socket.on('user_voice_state', ({ socketId, userId, muted, speaking, video }) => {
      this.onMediaStateCallback?.(socketId, userId, { muted, speaking, video });
    });

    // Enhanced events
    this.socket.on('user_media_state', ({ socketId, userId, ...state }) => {
      this.onMediaStateCallback?.(socketId, userId, state);
    });

    // Screen sharing events
    this.socket.on('screen_sharing_update', ({ socketId, userId, action, isScreenSharing }) => {
      this.onScreenSharingCallback?.(socketId, userId, isScreenSharing);
      
      if (action === 'started') {
        this.createPeerConnection(socketId, false, 'screen');
      } else if (action === 'stopped') {
        this.handleScreenPeerDisconnection(socketId);
      }
    });

    // Recording events
    this.socket.on('recording_started', (data) => {
      this.currentRecordingId = data.recordingId;
      this.mediaState.recording = true;
      this.onRecordingCallback?.('started', data);
    });

    this.socket.on('recording_stopped', (data) => {
      this.currentRecordingId = null;
      this.mediaState.recording = false;
      this.onRecordingCallback?.('stopped', data);
    });

    this.socket.on('recording_started_confirmation', (data) => {
      console.log('✅ Recording started:', data);
      this.onRecordingCallback?.('started_confirmation', data);
    });

    this.socket.on('recording_stopped_confirmation', (data) => {
      console.log('✅ Recording stopped:', data);
      this.onRecordingCallback?.('stopped_confirmation', data);
    });

    this.socket.on('recording_chunk_ack', (data) => {
      this.onRecordingCallback?.('chunk_ack', data);
    });

    this.socket.on('recording_chunk_error', (data) => {
      this.onRecordingCallback?.('chunk_error', data);
      console.error('❌ Recording chunk error:', data);
    });

    // Network quality events
    this.socket.on('voice_quality_degraded', (data) => {
      console.warn('⚠️ Voice quality degraded:', data);
      this.onNetworkQualityCallback?.(data.networkStats);
      this.onErrorCallback?.({ 
        type: 'quality_degraded', 
        severity: data.severity,
        message: data.message,
        recommendations: data.recommendations
      });
    });

    this.socket.on('quality_auto_adjusted', (data) => {
      console.log('🔧 Quality auto-adjusted:', data);
      this.mediaState.mediaQuality = data.newQuality;
    });

    this.socket.on('quality_adjusted', (data) => {
      console.log('✅ Quality adjusted:', data);
    });

    this.socket.on('user_quality_changed', (data) => {
      console.log('👤 User quality changed:', data);
    });

    this.socket.on('optimal_bitrate_recommendation', (data) => {
      console.log('📊 Optimal bitrate:', data);
      this.applyBitrateSettings(data.recommendations);
    });

    this.socket.on('bandwidth_optimization_suggestions', (data) => {
      console.log('💡 Bandwidth optimization suggestions:', data);
      this.onErrorCallback?.({
        type: 'bandwidth_optimization',
        suggestions: data.suggestions,
        currentStats: data.currentStats,
        efficiency: data.efficiency
      });
    });

    // Device management events
    this.socket.on('user_device_update', (data) => {
      console.log('🎛️ User device update:', data);
    });

    // WebRTC signaling for regular video
    this.socket.on('webrtc-offer', async ({ from, sdp, channelId }) => {
      console.log('📧 [VoiceVideoManager] Received WebRTC offer from:', from, 'channel:', channelId);
      if (channelId === this.currentChannelId) {
        try {
          const pc = await this.createPeerConnection(from, false, 'video');
          await pc.connection.setRemoteDescription(sdp);
          
          // Process any queued ICE candidates
          await this.processQueuedIceCandidates(from, 'video');
          
          const answer = await pc.connection.createAnswer();
          await pc.connection.setLocalDescription(answer);
          this.socket.emit('webrtc-answer', { to: from, sdp: answer, channelId });
          console.log('✅ [VoiceVideoManager] WebRTC answer sent to:', from);
        } catch (error) {
          console.error('❌ [VoiceVideoManager] Error handling WebRTC offer:', error);
        }
      }
    });

    this.socket.on('webrtc-answer', async ({ from, sdp, channelId }) => {
      console.log('📨 [VoiceVideoManager] Received WebRTC answer from:', from, 'channel:', channelId);
      if (channelId === this.currentChannelId) {
        const peer = this.peers.get(from);
        if (peer) {
          try {
            await peer.connection.setRemoteDescription(sdp);
            
            // Process any queued ICE candidates
            await this.processQueuedIceCandidates(from, 'video');
            
            console.log('✅ [VoiceVideoManager] WebRTC answer processed for:', from);
          } catch (error) {
            console.error('❌ [VoiceVideoManager] Error processing WebRTC answer:', error);
          }
        } else {
          console.warn('⚠️ [VoiceVideoManager] No peer found for answer from:', from);
        }
      }
    });

    this.socket.on('webrtc-ice-candidate', async ({ from, candidate, channelId }) => {
      console.log('🧊 [VoiceVideoManager] Received ICE candidate from:', from, 'channel:', channelId);
      if (channelId === this.currentChannelId) {
        await this.handleIceCandidate(from, candidate, 'video');
      }
    });

    // WebRTC signaling for screen sharing
    this.socket.on('screen-share-offer', async ({ from, sdp, channelId }) => {
      if (channelId === this.currentChannelId) {
        const pc = await this.createPeerConnection(from, false, 'screen');
        await pc.connection.setRemoteDescription(sdp);
        
        // Process any queued ICE candidates
        await this.processQueuedIceCandidates(from, 'screen');
        
        const answer = await pc.connection.createAnswer();
        await pc.connection.setLocalDescription(answer);
        this.socket.emit('screen-share-answer', { to: from, sdp: answer, channelId });
      }
    });

    this.socket.on('screen-share-answer', async ({ from, sdp, channelId }) => {
      if (channelId === this.currentChannelId) {
        const peer = this.screenPeers.get(from);
        if (peer) {
          await peer.connection.setRemoteDescription(sdp);
          
          // Process any queued ICE candidates
          await this.processQueuedIceCandidates(from, 'screen');
        }
      }
    });

    this.socket.on('screen-share-ice-candidate', async ({ from, candidate, channelId }) => {
      if (channelId === this.currentChannelId) {
        await this.handleIceCandidate(from, candidate, 'screen');
      }
    });

    // Error handling
    this.socket.on('voice_error', (error) => {
      console.error('🔴 Voice error:', error);
      this.onErrorCallback?.(error);
    });

    this.socket.on('signaling_error', (error) => {
      console.error('🔴 Signaling error:', error);
      this.onErrorCallback?.(error);
    });

    this.socket.on('voice_reconnection_failed', (data) => {
      console.error('🔴 Reconnection failed:', data);
      this.onErrorCallback?.({ code: 'RECONNECTION_FAILED', ...data });
    });
  }

  // === CONNECTION MONITORING ===
  private setupConnectionMonitoring(): void {
    this.socket.on('connect', () => {
      console.log('✅ VoiceVideoManager: Socket connected');
      if (this.currentChannelId) {
        console.log('🔄 VoiceVideoManager: Re-joining voice channel', this.currentChannelId);
        this.socket.emit('join_voice_channel', this.currentChannelId);
      }
    });
    
    this.socket.on('disconnect', () => {
      console.warn('⚠️ VoiceVideoManager: Socket disconnected');
      this.cleanupConnections();
    });
  }

  // === ICE CANDIDATE MANAGEMENT ===
  private async handleIceCandidate(from: string, candidate: RTCIceCandidate, type: 'video' | 'screen'): Promise<void> {
    const peers = type === 'video' ? this.peers : this.screenPeers;
    const queues = type === 'video' ? this.iceCandidateQueues : this.screenIceCandidateQueues;
    
    const peer = peers.get(from);
    
    if (peer) {
      // Check if remote description is set
      if (peer.connection.remoteDescription) {
        try {
          await peer.connection.addIceCandidate(candidate);
          console.log(`✅ [VoiceVideoManager] ${type} ICE candidate added for:`, from);
        } catch (error) {
          console.error(`❌ [VoiceVideoManager] Error adding ${type} ICE candidate:`, error);
        }
      } else {
        // Queue the candidate until remote description is set
        console.log(`🔄 [VoiceVideoManager] Queueing ${type} ICE candidate for:`, from);
        if (!queues.has(from)) {
          queues.set(from, []);
        }
        queues.get(from)!.push(candidate);
      }
    } else {
      console.warn(`⚠️ [VoiceVideoManager] No ${type} peer found for ICE candidate from:`, from);
    }
  }

  private async processQueuedIceCandidates(peerId: string, type: 'video' | 'screen'): Promise<void> {
    const queues = type === 'video' ? this.iceCandidateQueues : this.screenIceCandidateQueues;
    const peers = type === 'video' ? this.peers : this.screenPeers;
    
    const queuedCandidates = queues.get(peerId);
    const peer = peers.get(peerId);
    
    if (queuedCandidates && queuedCandidates.length > 0 && peer) {
      console.log(`🚀 [VoiceVideoManager] Processing ${queuedCandidates.length} queued ${type} ICE candidates for:`, peerId);
      
      for (const candidate of queuedCandidates) {
        try {
          await peer.connection.addIceCandidate(candidate);
          console.log(`✅ [VoiceVideoManager] Queued ${type} ICE candidate added for:`, peerId);
        } catch (error) {
          console.error(`❌ [VoiceVideoManager] Error adding queued ${type} ICE candidate:`, error);
        }
      }
      
      // Clear the queue
      queues.delete(peerId);
    }
  }

  // === PEER CONNECTION MANAGEMENT ===
  private async createPeerConnection(peerId: string, isInitiator: boolean, type: 'video' | 'screen'): Promise<PeerConnection> {
    console.log(`🔧 [VoiceVideoManager] Creating ${type} peer connection for:`, peerId, 'isInitiator:', isInitiator);
    
    const pc = new RTCPeerConnection(peerConfig);
    const peerConnection: PeerConnection = { connection: pc, stream: null, type };
    
    // Add to appropriate map
    if (type === 'screen') {
      this.screenPeers.set(peerId, peerConnection);
      console.log(`📺 [VoiceVideoManager] Added screen peer:`, peerId, 'Total screen peers:', this.screenPeers.size);
    } else {
      this.peers.set(peerId, peerConnection);
      console.log(`🎥 [VoiceVideoManager] Added video peer:`, peerId, 'Total peers:', this.peers.size);
    }

    // Add local stream tracks
    const stream = type === 'screen' ? this.localScreenStream : this.localStream;
    if (stream) {
      console.log(`🎬 [VoiceVideoManager] Adding ${stream.getTracks().length} tracks to peer:`, peerId);
      stream.getTracks().forEach(track => {
        console.log(`🎵 [VoiceVideoManager] Adding ${track.kind} track:`, track.label, 'enabled:', track.enabled);
        pc.addTrack(track, stream);
      });
    } else {
      console.warn(`⚠️ [VoiceVideoManager] No ${type} stream available for peer:`, peerId);
    }

    // Handle incoming streams
    pc.ontrack = (event) => {
      console.log(`🎯 [VoiceVideoManager] Received ${type} stream from:`, peerId, 'tracks:', event.streams[0].getTracks().length);
      peerConnection.stream = event.streams[0];
      this.onStreamCallback?.(event.streams[0], peerId, type);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentChannelId) {
        console.log(`🧊 [VoiceVideoManager] Sending ICE candidate to:`, peerId, 'for channel:', this.currentChannelId);
        const eventName = type === 'screen' ? 'screen-share-ice-candidate' : 'webrtc-ice-candidate';
        this.socket.emit(eventName, {
          to: peerId,
          candidate: event.candidate,
          channelId: this.currentChannelId
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 [VoiceVideoManager] Connection state for ${peerId}:`, pc.connectionState);
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 [VoiceVideoManager] ICE connection state for ${peerId}:`, pc.iceConnectionState);
    };

    // Create offer for initiator
    if (isInitiator && this.currentChannelId) {
      console.log(`📤 [VoiceVideoManager] Creating ${type} offer for:`, peerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        const eventName = type === 'screen' ? 'screen-share-offer' : 'webrtc-offer';
        this.socket.emit(eventName, {
          to: peerId,
          sdp: offer,
          channelId: this.currentChannelId
        });
        console.log(`✅ [VoiceVideoManager] ${type} offer sent to:`, peerId);
      } catch (error) {
        console.error(`❌ [VoiceVideoManager] Failed to create ${type} offer for:`, peerId, error);
      }
    }

    // Setup connection quality monitoring
    this.setupConnectionQualityMonitoring(pc);

    return peerConnection;
  }

  private handlePeerDisconnection(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(peerId);
      
      // Clean up ICE candidate queue
      this.iceCandidateQueues.delete(peerId);
      
      this.onUserLeftCallback?.(peerId);
    }
  }

  private handleScreenPeerDisconnection(peerId: string): void {
    const peer = this.screenPeers.get(peerId);
    if (peer) {
      peer.connection.close();
      this.screenPeers.delete(peerId);
      
      // Clean up screen ICE candidate queue
      this.screenIceCandidateQueues.delete(peerId);
    }
  }

  private cleanupConnections(): void {
    this.peers.forEach(peer => peer.connection.close());
    this.screenPeers.forEach(peer => peer.connection.close());
    this.peers.clear();
    this.screenPeers.clear();
    
    // Clear ICE candidate queues
    this.iceCandidateQueues.clear();
    this.screenIceCandidateQueues.clear();
  }

  // === MEDIA STATE MANAGEMENT ===
  public updateMediaState(updates: Partial<MediaState>): void {
    console.log('🎥 STEP 5: updateMediaState called with:', updates);
    this.mediaState = { ...this.mediaState, ...updates };
    console.log('🎥 STEP 6: New media state:', this.mediaState);
    
    if (this.currentChannelId) {
      console.log('🎥 STEP 7: Emitting media_state_update to channel:', this.currentChannelId);
      this.socket.emit('media_state_update', {
        channelId: this.currentChannelId,
        ...updates
      });
    }
  }

  // === VOICE/VIDEO CONTROLS ===
  public async joinVoiceChannel(channelId: string): Promise<void> {
    try {
      await this.ensureConnection();
      this.currentChannelId = channelId;
      console.log('🎙️ [VoiceVideoManager] Joining voice channel:', channelId);
      console.log('🎙️ [VoiceVideoManager] Local stream status:', {
        hasStream: !!this.localStream,
        tracks: this.localStream?.getTracks().length || 0,
        audioTracks: this.localStream?.getAudioTracks().length || 0,
        videoTracks: this.localStream?.getVideoTracks().length || 0
      });
      this.socket.emit('join_voice_channel', channelId);
      console.log('✅ [VoiceVideoManager] Join voice channel event emitted');
    } catch (error) {
      console.error('❌ [VoiceVideoManager] Failed to join voice channel:', error);
      throw error;
    }
  }

  public leaveVoiceChannel(): void {
    if (this.currentChannelId) {
      this.socket.emit('leave_voice_channel', this.currentChannelId);
      this.cleanupConnections();
      this.currentChannelId = null;
      
      // Stop screen sharing if active
      if (this.mediaState.screenSharing) {
        this.stopScreenShare();
      }
      
      // Stop recording if active
      if (this.mediaState.recording && this.currentRecordingId) {
        this.stopRecording();
      }
    }
  }

  public toggleAudio(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach(track => track.enabled = enabled);
    this.updateMediaState({ 
      muted: !enabled,
      activeStreams: { ...this.mediaState.activeStreams, audio: enabled }
    });
  }

  public toggleVideo(bool: boolean): void {
    console.log('🎥 STEP 2: toggleVideo called, setting video to:', bool);
    console.log('🎥 STEP 3: Video tracks found:', this.localStream?.getVideoTracks().length || 0);
    
    if (bool && this.localStream?.getVideoTracks().length === 0) {
      console.log('🎥 ERROR: Trying to enable video but no video tracks exist!');
      console.log('🎥 Need to create new video stream...');
      // TODO: Re-create video stream
      return;
    }
    
    this.localStream?.getVideoTracks().forEach((track, index) => {
      console.log(`🎥 STEP 4.${index + 1}: Track "${track.label}" - enabled: ${track.enabled} -> ${bool}`);
      track.enabled = bool;
    });
    console.log('🎥 STEP 4: Video tracks enabled/disabled, calling updateMediaState');
    this.updateMediaState({ 
      video: bool,
      activeStreams: { ...this.mediaState.activeStreams, video: bool }
    });
  }

  // === ADVANCED FEATURES ===

  // Screen Sharing
  public async startScreenShare(): Promise<void> {
    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Update state
      this.updateMediaState({ 
        screenSharing: true,
        activeStreams: { ...this.mediaState.activeStreams, screen: true }
      });

      // Create screen sharing peer connections for all current peers
      this.peers.forEach(async (_, peerId) => {
        await this.createPeerConnection(peerId, true, 'screen');
      });

      // Handle screen share ending
      this.localScreenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      console.log('✅ Screen sharing started');
    } catch (error) {
      console.error('❌ Screen sharing failed:', error);
      throw error;
    }
  }

  public stopScreenShare(): void {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => track.stop());
      this.localScreenStream = null;
    }

    // Close all screen sharing peer connections
    this.screenPeers.forEach(peer => peer.connection.close());
    this.screenPeers.clear();

    this.updateMediaState({ 
      screenSharing: false,
      activeStreams: { ...this.mediaState.activeStreams, screen: false }
    });

    console.log('✅ Screen sharing stopped');
  }

  // Recording
  public startRecording(config: Partial<RecordingConfig> = {}): void {
    const recordingConfig: RecordingConfig = {
      includeAudio: true,
      includeVideo: true,
      includeScreenShare: true,
      quality: 'high',
      ...config
    };

    this.socket.emit('start_recording', {
      channelId: this.currentChannelId,
      recordingConfig
    });
  }

  public stopRecording(): void {
    if (this.currentRecordingId) {
      this.socket.emit('stop_recording', {
        channelId: this.currentChannelId,
        recordingId: this.currentRecordingId
      });
    }
  }

  // Device Management
  public async updateDeviceInfo(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.deviceInfo = {
        audioInputs: devices.filter(d => d.kind === 'audioinput'),
        videoInputs: devices.filter(d => d.kind === 'videoinput'),
        activeAudioDevice: this.deviceInfo.activeAudioDevice,
        activeVideoDevice: this.deviceInfo.activeVideoDevice
      };

      // Send device info to server
      if (this.currentChannelId) {
        this.socket.emit('update_device_info', {
          channelId: this.currentChannelId,
          deviceInfo: {
            audioInputs: this.deviceInfo.audioInputs.length,
            videoInputs: this.deviceInfo.videoInputs.length,
            activeAudioDevice: this.deviceInfo.activeAudioDevice,
            activeVideoDevice: this.deviceInfo.activeVideoDevice
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to update device info:', error);
    }
  }

  public async switchCamera(deviceId: string): Promise<void> {
    try {
      const constraints = {
        video: { deviceId: { exact: deviceId } },
        audio: true
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = newStream.getVideoTracks()[0];

      // Replace track in all peer connections
      this.peers.forEach(async (peer, peerId) => {
        const sender = peer.connection.getSenders().find((s: RTCRtpSender) => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      if (this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          this.localStream.removeTrack(oldVideoTrack);
        }
        this.localStream.addTrack(videoTrack);
      }

      this.deviceInfo.activeVideoDevice = deviceId;
      console.log('✅ Camera switched to:', deviceId);
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
      throw error;
    }
  }

  public async switchMicrophone(deviceId: string): Promise<void> {
    try {
      const constraints = {
        audio: { deviceId: { exact: deviceId } },
        video: true
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioTrack = newStream.getAudioTracks()[0];

      // Replace track in all peer connections
      this.peers.forEach(async (peer, peerId) => {
        const sender = peer.connection.getSenders().find((s: RTCRtpSender) => 
          s.track && s.track.kind === 'audio'
        );
        if (sender) {
          await sender.replaceTrack(audioTrack);
        }
      });

      // Update local stream
      if (this.localStream) {
        const oldAudioTrack = this.localStream.getAudioTracks()[0];
        if (oldAudioTrack) {
          oldAudioTrack.stop();
          this.localStream.removeTrack(oldAudioTrack);
        }
        this.localStream.addTrack(audioTrack);
      }

      this.deviceInfo.activeAudioDevice = deviceId;
      console.log('✅ Microphone switched to:', deviceId);
    } catch (error) {
      console.error('❌ Failed to switch microphone:', error);
      throw error;
    }
  }

  // Quality Control
  public adjustQuality(quality: 'low' | 'medium' | 'high' | 'auto'): void {
    this.mediaState.mediaQuality = quality;
    
    if (this.currentChannelId) {
      this.socket.emit('adjust_quality', {
        channelId: this.currentChannelId,
        targetQuality: quality,
        reason: 'User preference'
      });
    }
  }

  public requestOptimalBitrate(): void {
    if (this.currentChannelId) {
      this.socket.emit('request_optimal_bitrate', { 
        channelId: this.currentChannelId 
      });
    }
  }

  private applyBitrateSettings(recommendations: { audioBitrate: number; videoBitrate: number }): void {
    // Apply bitrate settings to peer connections
    this.peers.forEach((peer, peerId) => {
      const senders = peer.connection.getSenders();
      senders.forEach(async (sender: RTCRtpSender) => {
        if (sender.track) {
          const params = sender.getParameters();
          if (!params.encodings) {
            params.encodings = [{}];
          }
          
          if (sender.track.kind === 'audio') {
            params.encodings[0].maxBitrate = recommendations.audioBitrate * 1000; // Convert to bps
          } else if (sender.track.kind === 'video') {
            params.encodings[0].maxBitrate = recommendations.videoBitrate * 1000; // Convert to bps
          }
          
          await sender.setParameters(params);
        }
      });
    });
  }

  private setupConnectionQualityMonitoring(peerConnection: RTCPeerConnection): void {
    const interval = setInterval(async () => {
      if (peerConnection.connectionState === 'closed') {
        clearInterval(interval);
        return;
      }

      try {
        const stats = await peerConnection.getStats();
        const report = this.parseConnectionStats(stats);
        
        this.networkStats = {
          latency: report.rtt || 0,
          packetLoss: report.packetsLost / Math.max(report.packetsSent, 1),
          bandwidth: report.availableBandwidth || 0,
          connectionType: this.determineConnectionType(report)
        };

        // Send to server for analysis
        if (this.currentChannelId) {
          this.socket.emit('network_quality_update', this.networkStats);
        }
      } catch (error) {
        console.error('❌ Failed to get connection stats:', error);
      }
    }, 5000);
  }

  private parseConnectionStats(stats: RTCStatsReport): any {
    const report: any = {
      rtt: 0,
      packetsLost: 0,
      packetsSent: 0,
      availableBandwidth: 0
    };

    stats.forEach((stat) => {
      if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        report.rtt = stat.currentRoundTripTime * 1000; // Convert to ms
      } else if (stat.type === 'outbound-rtp') {
        report.packetsSent += stat.packetsSent || 0;
      } else if (stat.type === 'inbound-rtp') {
        report.packetsLost += stat.packetsLost || 0;
      }
    });

    return report;
  }

  private determineConnectionType(report: any): string {
    if (report.rtt > 200) return 'poor';
    if (report.rtt > 100) return 'fair';
    return 'good';
  }

  // === EVENT LISTENERS ===
  public onStream(callback: (stream: MediaStream, peerId: string, type: 'video' | 'screen') => void): void {
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

  public onMediaState(callback: (socketId: string, userId: string, state: any) => void): void {
    this.onMediaStateCallback = callback;
  }

  public onScreenSharing(callback: (socketId: string, userId: string, isSharing: boolean) => void): void {
    this.onScreenSharingCallback = callback;
  }

  public onRecording(callback: (event: string, data: any) => void): void {
    this.onRecordingCallback = callback;
  }

  public onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback;
  }

  public onNetworkQuality(callback: (stats: NetworkStats) => void): void {
    this.onNetworkQualityCallback = callback;
  }

  // === UTILITY METHODS ===
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  public getMediaState(): MediaState {
    return { ...this.mediaState };
  }

  public getAvailablePermissions(): { audio: boolean; video: boolean } {
    return { ...this.mediaState.availablePermissions };
  }

  public hasAnyPermissions(): boolean {
    return this.mediaState.availablePermissions.audio || this.mediaState.availablePermissions.video;
  }

  public getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  public getNetworkStats(): NetworkStats | null {
    return this.networkStats;
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
        console.error("❌ Connection timeout");
        reject(new Error('Connection timeout'));
      }, 15000);

      const onConnect = () => {
        clearTimeout(timeout);
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onError);
        resolve();
      };

      const onError = (error: any) => {
        console.error("❌ Connection error:", error);
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
    this.cleanupConnections();
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localScreenStream?.getTracks().forEach(track => track.stop());
    this.socket.off();
  }
}