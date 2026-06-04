// src/lib/CallStateManager.ts
// Manages call state globally to allow minimizing calls and navigating between channels

import {
  VoiceVideoManager,
  VoiceRosterMember,
  VideoTileInfo,
} from "./VoiceVideoManager";

/**
 * Represents the state of an active call
 */
export interface ActiveCallState {
  isMinimized: boolean;
  channelId: string;
  serverId: string;
  channelName: string;
  startTime: Date;
  callType: "voice" | "video";
}

/**
 * CallStateManager - Singleton that manages the global call state
 *
 * This allows users to:
 * - Minimize a call and navigate to other channels
 * - Keep the call active in the background
 * - Return to the call from anywhere in the app
 * - See a floating call bar when minimized
 */
class CallStateManager {
  private static instance: CallStateManager;

  // The single VoiceVideoManager instance for the active call
  private voiceManager: VoiceVideoManager | null = null;
  private callState: ActiveCallState | null = null;
  private listeners: Set<(state: ActiveCallState | null) => void> = new Set();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): CallStateManager {
    if (!CallStateManager.instance) {
      CallStateManager.instance = new CallStateManager();
    }
    return CallStateManager.instance;
  }

  /**
   * Get or create the VoiceVideoManager for a call
   * This ensures we reuse the same instance across navigation
   */
  getOrCreateManager(userId: string, username: string): VoiceVideoManager {
    if (!this.voiceManager) {
      this.voiceManager = new VoiceVideoManager(userId, username);
    }
    return this.voiceManager;
  }

  /**
   * Get the current VoiceVideoManager (if in a call)
   */
  getManager(): VoiceVideoManager | null {
    return this.voiceManager;
  }

  /**
   * Set an existing manager (for cases where manager is created externally)
   */
  setManager(manager: VoiceVideoManager): void {
    this.voiceManager = manager;
  }

  /**
   * Start tracking a new call
   */
  startCall(
    channelId: string,
    serverId: string,
    channelName: string,
    callType: "voice" | "video" = "voice"
  ): void {
    this.callState = {
      isMinimized: false,
      channelId,
      serverId,
      channelName,
      startTime: new Date(),
      callType,
    };
    this.notifyListeners();
    console.log("[CallStateManager] Call started:", this.callState);
  }

  /**
   * Minimize the call - allows navigation to other channels
   * The call continues in the background
   */
  minimizeCall(): void {
    if (this.callState) {
      this.callState = { ...this.callState, isMinimized: true };
      this.notifyListeners();
      console.log("[CallStateManager] Call minimized");
    }
  }

  /**
   * Maximize/restore the call view
   */
  maximizeCall(): void {
    if (this.callState) {
      this.callState = { ...this.callState, isMinimized: false };
      this.notifyListeners();
      console.log("[CallStateManager] Call maximized");
    }
  }

  /**
   * End the call completely
   */
  endCall(): void {
    if (this.voiceManager) {
      try {
        this.voiceManager.leaveVoiceChannel();
        this.voiceManager.disconnect();
      } catch (error) {
        console.error("[CallStateManager] Error ending call:", error);
      }
      this.voiceManager = null;
    }
    this.callState = null;
    this.notifyListeners();
    console.log("[CallStateManager] Call ended");
  }

  /**
   * Check if there's an active call
   */
  hasActiveCall(): boolean {
    return this.callState !== null && this.voiceManager?.isConnected() === true;
  }

  /**
   * Check if the current call is for a specific channel
   */
  isInChannel(channelId: string): boolean {
    return this.callState?.channelId === channelId && this.hasActiveCall();
  }

  /**
   * Get current call state
   */
  getCallState(): ActiveCallState | null {
    return this.callState ? { ...this.callState } : null;
  }

  /**
   * Subscribe to state changes
   * Returns an unsubscribe function
   */
  subscribe(listener: (state: ActiveCallState | null) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.callState ? { ...this.callState } : null);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get call duration in seconds
   */
  getCallDuration(): number {
    if (!this.callState) return 0;
    return Math.floor((Date.now() - this.callState.startTime.getTime()) / 1000);
  }

  /**
   * Update the call type (e.g., when user enables video)
   */
  updateCallType(callType: "voice" | "video"): void {
    if (this.callState) {
      this.callState = { ...this.callState, callType };
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    const state = this.callState ? { ...this.callState } : null;
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error("[CallStateManager] Error in listener:", error);
      }
    });
  }
}

// Export singleton instance
export const callStateManager = CallStateManager.getInstance();
