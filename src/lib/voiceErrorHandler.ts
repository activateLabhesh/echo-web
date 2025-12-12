// src/lib/voiceErrorHandler.ts
// Error handling for Amazon Chime SDK voice/video operations
//
// HOW IT WORKS:
// =============
// 1. Maps error codes to user-friendly messages and actions
// 2. Handles both Chime SDK errors and native browser errors
// 3. Provides retry logic based on error severity
// 4. Categorizes errors by type for better UX

export interface VoiceError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
  retryable?: boolean;
}

export class VoiceErrorHandler {
  private static errorMap: Record<string, VoiceError> = {
    // ==================== CHIME SDK ERRORS ====================
    
    // Initialization Errors
    'INIT_FAILED': {
      code: 'INIT_FAILED',
      message: 'Failed to initialize voice/video. Please refresh and try again.',
      severity: 'high',
      action: 'refresh_page',
      retryable: true
    },
    
    // Meeting/Session Errors
    'JOIN_FAILED': {
      code: 'JOIN_FAILED',
      message: 'Failed to join voice channel. Please try again.',
      severity: 'high',
      action: 'retry_connection',
      retryable: true
    },
    
    'MEETING_NOT_FOUND': {
      code: 'MEETING_NOT_FOUND',
      message: 'Voice channel not found or has ended.',
      severity: 'high',
      action: 'refresh_page',
      retryable: false
    },
    
    'MEETING_ENDED': {
      code: 'MEETING_ENDED',
      message: 'The voice channel has ended.',
      severity: 'medium',
      action: 'none',
      retryable: false
    },
    
    'ATTENDEE_NOT_FOUND': {
      code: 'ATTENDEE_NOT_FOUND',
      message: 'Failed to join as participant. Please try again.',
      severity: 'high',
      action: 'retry_connection',
      retryable: true
    },
    
    // Chime Session Status Codes (from MeetingSessionStatusCode)
    'AUDIO_CALL_ENDED': {
      code: 'AUDIO_CALL_ENDED',
      message: 'Voice session has ended.',
      severity: 'medium',
      action: 'none',
      retryable: false
    },
    
    'AUDIO_DISCONNECTED_POOR_CONNECTION': {
      code: 'AUDIO_DISCONNECTED_POOR_CONNECTION',
      message: 'Disconnected due to poor network connection.',
      severity: 'high',
      action: 'check_network',
      retryable: true
    },
    
    'VIDEO_CALL_AT_CAPACITY': {
      code: 'VIDEO_CALL_AT_CAPACITY',
      message: 'Voice channel is at capacity. Please try again later.',
      severity: 'medium',
      action: 'wait_and_retry',
      retryable: true
    },
    
    'SIGNALING_BAD_REQUEST': {
      code: 'SIGNALING_BAD_REQUEST',
      message: 'Invalid request. Please refresh and try again.',
      severity: 'high',
      action: 'refresh_page',
      retryable: false
    },
    
    'SIGNALING_INTERNAL_SERVER_ERROR': {
      code: 'SIGNALING_INTERNAL_SERVER_ERROR',
      message: 'Server error. Please try again later.',
      severity: 'high',
      action: 'retry_later',
      retryable: true
    },
    
    'ICE_GATHERING_TIMED_OUT': {
      code: 'ICE_GATHERING_TIMED_OUT',
      message: 'Connection timed out. Check your network/firewall.',
      severity: 'high',
      action: 'check_network',
      retryable: true
    },
    
    'CONNECTION_HEALTH_RECONNECT': {
      code: 'CONNECTION_HEALTH_RECONNECT',
      message: 'Reconnecting to voice channel...',
      severity: 'low',
      action: 'none',
      retryable: true
    },
    
    // ==================== LEGACY/GENERIC ERRORS ====================
    
    // Authentication Errors
    'VOICE_AUTH_FAILED': {
      code: 'VOICE_AUTH_FAILED',
      message: 'Authentication failed. Please log in again.',
      severity: 'high',
      action: 'redirect_login',
      retryable: false
    },

    // WebRTC Errors (handled by Chime SDK internally, but kept for reference)
    'VOICE_WEBRTC_SIGNALING_FAILED': {
      code: 'VOICE_WEBRTC_SIGNALING_FAILED',
      message: 'Connection failed. Retrying...',
      severity: 'medium',
      action: 'retry_connection',
      retryable: true
    },

    'WEBRTC_CONNECTION_FAILED': {
      code: 'WEBRTC_CONNECTION_FAILED',
      message: 'Failed to establish connection with other participants.',
      severity: 'high',
      action: 'check_network',
      retryable: true
    },

    'ICE_CONNECTION_FAILED': {
      code: 'ICE_CONNECTION_FAILED',
      message: 'Network connectivity issue. Check your internet connection.',
      severity: 'high',
      action: 'check_network',
      retryable: true
    },

    // Network Errors
    'VOICE_NETWORK_ERROR': {
      code: 'VOICE_NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
      severity: 'medium',
      action: 'check_network',
      retryable: true
    },

    'NETWORK_QUALITY_POOR': {
      code: 'NETWORK_QUALITY_POOR',
      message: 'Poor network quality detected. Consider lowering video quality.',
      severity: 'low',
      action: 'suggest_quality_reduction',
      retryable: false
    },

    // Media Device Errors
    'MEDIA_DEVICE_ERROR': {
      code: 'MEDIA_DEVICE_ERROR',
      message: 'Media device error. Please check your camera and microphone.',
      severity: 'high',
      action: 'check_devices',
      retryable: true
    },

    'DEVICE_NOT_FOUND': {
      code: 'DEVICE_NOT_FOUND',
      message: 'Camera or microphone not found. Please connect a device.',
      severity: 'high',
      action: 'connect_device',
      retryable: true
    },

    'DEVICE_ACCESS_DENIED': {
      code: 'DEVICE_ACCESS_DENIED',
      message: 'Camera and microphone access denied. Please grant permissions.',
      severity: 'high',
      action: 'grant_permissions',
      retryable: true
    },

    'DEVICE_IN_USE': {
      code: 'DEVICE_IN_USE',
      message: 'Camera or microphone is being used by another application.',
      severity: 'medium',
      action: 'close_other_apps',
      retryable: true
    },

    // Screen Sharing Errors
    'SCREEN_SHARE_DENIED': {
      code: 'SCREEN_SHARE_DENIED',
      message: 'Screen sharing permission denied.',
      severity: 'low',
      action: 'none',
      retryable: false
    },

    'SCREEN_SHARE_FAILED': {
      code: 'SCREEN_SHARE_FAILED',
      message: 'Failed to start screen sharing. Please try again.',
      severity: 'medium',
      action: 'retry_screen_share',
      retryable: true
    },

    // Recording Errors
    'RECORDING_FAILED': {
      code: 'RECORDING_FAILED',
      message: 'Failed to start recording. Please try again.',
      severity: 'medium',
      action: 'retry_recording',
      retryable: true
    },

    'RECORDING_PERMISSION_DENIED': {
      code: 'RECORDING_PERMISSION_DENIED',
      message: 'Recording permission denied.',
      severity: 'medium',
      action: 'grant_recording_permission',
      retryable: false
    },

    // Connection Errors
    'RECONNECTION_FAILED': {
      code: 'RECONNECTION_FAILED',
      message: 'Failed to reconnect. Please refresh the page.',
      severity: 'critical',
      action: 'refresh_page',
      retryable: false
    },

    'CONNECTION_TIMEOUT': {
      code: 'CONNECTION_TIMEOUT',
      message: 'Connection timed out. Please try again.',
      severity: 'medium',
      action: 'retry_connection',
      retryable: true
    },

    // Server Errors
    'SERVER_ERROR': {
      code: 'SERVER_ERROR',
      message: 'Server error. Please try again later.',
      severity: 'high',
      action: 'retry_later',
      retryable: true
    },

    'CHANNEL_FULL': {
      code: 'CHANNEL_FULL',
      message: 'Voice channel is full. Please try again later.',
      severity: 'medium',
      action: 'wait_and_retry',
      retryable: true
    },

    // Browser Compatibility
    'BROWSER_NOT_SUPPORTED': {
      code: 'BROWSER_NOT_SUPPORTED',
      message: 'Your browser does not support voice/video calls. Please use a modern browser.',
      severity: 'critical',
      action: 'update_browser',
      retryable: false
    },

    'WEBRTC_NOT_SUPPORTED': {
      code: 'WEBRTC_NOT_SUPPORTED',
      message: 'WebRTC is not supported in your browser.',
      severity: 'critical',
      action: 'update_browser',
      retryable: false
    }
  };

  static handleError(error: any): VoiceError {
    // Handle native errors
    if (error instanceof DOMException) {
      return this.handleDOMException(error);
    }

    // Handle custom errors
    if (typeof error === 'object' && error.code) {
      const mappedError = this.errorMap[error.code];
      if (mappedError) {
        return {
          ...mappedError,
          message: error.message || mappedError.message
        };
      }
    }

    // Handle string errors
    if (typeof error === 'string') {
      const mappedError = this.errorMap[error];
      if (mappedError) {
        return mappedError;
      }
    }

    // Default error
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'An unknown error occurred',
      severity: 'medium',
      action: 'retry',
      retryable: true
    };
  }

  private static handleDOMException(error: DOMException): VoiceError {
    switch (error.name) {
      case 'NotAllowedError':
        return this.errorMap['DEVICE_ACCESS_DENIED'];
      
      case 'NotFoundError':
        return this.errorMap['DEVICE_NOT_FOUND'];
      
      case 'NotReadableError':
        return this.errorMap['DEVICE_IN_USE'];
      
      case 'OverconstrainedError':
        return {
          code: 'DEVICE_CONSTRAINT_ERROR',
          message: 'Device constraints could not be satisfied. Please check your camera/microphone settings.',
          severity: 'medium',
          action: 'check_device_settings',
          retryable: true
        };
      
      case 'SecurityError':
        return {
          code: 'SECURITY_ERROR',
          message: 'Security error. Please ensure you are using HTTPS.',
          severity: 'high',
          action: 'use_https',
          retryable: false
        };
      
      default:
        return {
          code: 'MEDIA_ERROR',
          message: `Media error: ${error.message}`,
          severity: 'medium',
          action: 'retry',
          retryable: true
        };
    }
  }

  static getActionMessage(action: string): string {
    const actionMessages: Record<string, string> = {
      'redirect_login': 'Please log in again to continue.',
      'retry_connection': 'Retrying connection...',
      'check_network': 'Please check your internet connection and try again.',
      'suggest_quality_reduction': 'Try reducing video quality in settings.',
      'check_devices': 'Please check that your camera and microphone are connected and working.',
      'connect_device': 'Please connect a camera and microphone to continue.',
      'grant_permissions': 'Please allow camera and microphone access in your browser settings.',
      'close_other_apps': 'Please close other applications using your camera or microphone.',
      'retry_screen_share': 'Click the screen share button to try again.',
      'retry_recording': 'Click the record button to try again.',
      'grant_recording_permission': 'Please allow recording permissions in your browser.',
      'refresh_page': 'Please refresh the page to reconnect.',
      'retry_later': 'Please try again in a few minutes.',
      'wait_and_retry': 'Please wait for someone to leave the channel and try again.',
      'update_browser': 'Please update to the latest version of Chrome, Firefox, or Safari.',
      'use_https': 'Please ensure you are accessing the site via HTTPS.',
      'check_device_settings': 'Please check your camera and microphone settings.',
      'retry': 'Please try again.',
      'none': ''
    };

    return actionMessages[action] || 'Please try again.';
  }

  static isRetryable(error: VoiceError): boolean {
    return error.retryable === true;
  }

  static shouldShowNotification(error: VoiceError): boolean {
    return error.severity === 'medium' || error.severity === 'high' || error.severity === 'critical';
  }

  static getRetryDelay(error: VoiceError): number {
    // Return retry delay in milliseconds
    switch (error.severity) {
      case 'low': return 1000;
      case 'medium': return 3000;
      case 'high': return 5000;
      case 'critical': return 10000;
      default: return 3000;
    }
  }
}

// Utility function for components
export const handleVoiceError = (error: any, onError?: (error: VoiceError) => void) => {
  const processedError = VoiceErrorHandler.handleError(error);
  console.error(`Voice Error [${processedError.code}]:`, processedError.message);
  
  if (onError) {
    onError(processedError);
  }
  
  return processedError;
};