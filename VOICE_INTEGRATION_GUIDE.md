# 🎯 Enhanced Voice/Video System Integration Guide

## Overview

Your Echo Web application now includes a comprehensive voice and video communication system with advanced features including screen sharing, recording, device management, and adaptive quality control.

## 🚀 Quick Start

### 1. Using the Enhanced Voice Channel

Replace your existing `VoiceChannel` component with the new `EnhancedVoiceChannel`:

```tsx
import EnhancedVoiceChannel from "@/components/EnhancedVoiceChannel";
import VoiceNotifications from "@/components/VoiceNotifications";

function App() {
  return (
    <div>
      <EnhancedVoiceChannel
        channelId="your-channel-id"
        userId="user-123"
        onHangUp={() => console.log("Call ended")}
        currentUser={{ username: "John Doe" }}
      />
      <VoiceNotifications />
    </div>
  );
}
```

### 2. Using Individual Components

For more control, use the components separately:

```tsx
import { VoiceVideoManager, createAuthSocket } from "@/socket";
import VoiceVideoControls from "@/components/VoiceVideoControls";
import EnhancedVideoPanel from "@/components/EnhancedVideoPanel";

function CustomVoiceChat() {
  const [manager, setManager] = useState(null);

  useEffect(() => {
    const socket = createAuthSocket(userId);
    const voiceManager = new VoiceVideoManager(userId, socket);
    setManager(voiceManager);
  }, []);

  return (
    <div>
      <EnhancedVideoPanel
        localStream={localStream}
        participants={participants}
      />
      <VoiceVideoControls
        manager={manager}
        onHangUp={handleHangUp}
        isConnected={true}
      />
    </div>
  );
}
```

## 🎨 Components

### EnhancedVoiceChannel

Main component that handles complete voice/video functionality.

**Props:**

- `channelId: string` - Voice channel ID
- `userId: string` - Current user ID
- `onHangUp: () => void` - Callback when user leaves
- `currentUser?: { username: string }` - Current user info
- `headless?: boolean` - Show only controls, no video panel

### VoiceVideoControls

Control panel with all voice/video controls.

**Features:**

- Mute/unmute microphone
- Enable/disable camera
- Screen sharing toggle
- Recording controls
- Device switching
- Quality adjustment
- Network statistics

### EnhancedVideoPanel

Video display panel with advanced layout.

**Features:**

- Responsive grid layout
- Screen sharing with picture-in-picture
- Fullscreen support
- Volume controls per participant
- Voice activity indicators

### VoiceNotifications

Toast notification system for voice events.

**Features:**

- Error notifications with retry options
- Success/warning/info messages
- Auto-dismiss with configurable duration
- Global notification API

## 🔧 VoiceVideoManager API

### Basic Usage

```tsx
import { VoiceVideoManager, createAuthSocket } from "@/socket";

const socket = createAuthSocket(userId);
const manager = new VoiceVideoManager(userId, socket);

// Initialize with camera and microphone
await manager.initialize(true, true);

// Join voice channel
await manager.joinVoiceChannel("channel-123");
```

### Media Controls

```tsx
// Audio controls
manager.toggleAudio(false); // Mute
manager.toggleAudio(true); // Unmute

// Video controls
manager.toggleVideo(true); // Enable camera
manager.toggleVideo(false); // Disable camera
```

### Screen Sharing

```tsx
// Start screen sharing
try {
  await manager.startScreenShare();
} catch (error) {
  console.error("Screen sharing failed:", error);
}

// Stop screen sharing
manager.stopScreenShare();
```

### Recording

```tsx
// Start recording
manager.startRecording({
  includeAudio: true,
  includeVideo: true,
  includeScreenShare: true,
  quality: "high",
});

// Stop recording
manager.stopRecording();
```

### Device Management

```tsx
// Get available devices
await manager.updateDeviceInfo();
const devices = manager.getDeviceInfo();

// Switch camera
await manager.switchCamera(deviceId);

// Switch microphone
await manager.switchMicrophone(deviceId);
```

### Quality Control

```tsx
// Set quality manually
manager.adjustQuality("high"); // 'low' | 'medium' | 'high' | 'auto'

// Request optimal bitrate
manager.requestOptimalBitrate();
```

### Event Listeners

```tsx
// Stream events
manager.onStream((stream, peerId, type) => {
  console.log("New stream:", type, "from", peerId);
});

// User events
manager.onUserJoined((socketId, userId) => {
  console.log("User joined:", userId);
});

manager.onUserLeft((peerId) => {
  console.log("User left:", peerId);
});

// Media state changes
manager.onMediaState((socketId, userId, state) => {
  console.log("Media state changed:", state);
});

// Screen sharing events
manager.onScreenSharing((socketId, userId, isSharing) => {
  console.log("Screen sharing:", isSharing);
});

// Recording events
manager.onRecording((event, data) => {
  console.log("Recording event:", event, data);
});

// Error handling
manager.onError((error) => {
  console.error("Voice error:", error);
});

// Network quality
manager.onNetworkQuality((stats) => {
  console.log("Network stats:", stats);
});
```

## 🔥 Advanced Features

### Error Handling

The system includes comprehensive error handling:

```tsx
import { handleVoiceError, VoiceErrorHandler } from "@/lib/voiceErrorHandler";

manager.onError((error) => {
  const processedError = handleVoiceError(error);

  if (VoiceErrorHandler.isRetryable(processedError)) {
    // Show retry option
    setTimeout(() => {
      // Retry logic
    }, VoiceErrorHandler.getRetryDelay(processedError));
  }
});
```

### Notification System

```tsx
import { useVoiceNotifications } from "@/components/VoiceNotifications";

function MyComponent() {
  const { showError, showSuccess, showWarning, showInfo } =
    useVoiceNotifications();

  const handleSomething = () => {
    showSuccess("Screen sharing started!");
    showWarning("Network quality is poor");
    showError(error, () => retryFunction());
  };
}
```

### Backward Compatibility

The new system is backward compatible with your existing code:

```tsx
// Old MediaStreamManager still works
import { MediaStreamManager } from "@/socket";

// New VoiceVideoManager extends functionality
import { VoiceVideoManager } from "@/socket";
```

## 🎛️ Backend Integration

Your backend should handle these socket events:

### Required Events

```javascript
// Basic events (already implemented)
socket.on("join_voice_channel", handleJoinVoiceChannel);
socket.on("leave_voice_channel", handleLeaveVoiceChannel);
socket.on("voice_state_update", handleVoiceStateUpdate);

// Enhanced events (new)
socket.on("media_state_update", handleMediaStateUpdate);
socket.on("start_recording", handleStartRecording);
socket.on("stop_recording", handleStopRecording);
socket.on("update_device_info", handleDeviceInfoUpdate);
socket.on("adjust_quality", handleQualityAdjustment);
socket.on("network_quality_update", handleNetworkQualityUpdate);

// Screen sharing events
socket.on("screen-share-offer", handleScreenShareOffer);
socket.on("screen-share-answer", handleScreenShareAnswer);
socket.on("screen-share-ice-candidate", handleScreenShareIceCandidate);
```

### Event Examples

```javascript
// Enhanced media state
socket.on("media_state_update", (data) => {
  // data: { channelId, muted, video, screenSharing, mediaQuality, activeStreams }
  broadcastToChannel(data.channelId, "user_media_state", {
    socketId: socket.id,
    userId: socket.userId,
    ...data,
  });
});

// Recording events
socket.on("start_recording", (data) => {
  // data: { channelId, recordingConfig }
  const recordingId = generateRecordingId();

  socket.emit("recording_started", {
    recordingId,
    startedBy: { socketId: socket.id, userId: socket.userId },
    config: data.recordingConfig,
  });
});

// Network quality monitoring
socket.on("network_quality_update", (stats) => {
  // Analyze network quality and provide recommendations
  if (stats.packetLoss > 0.05) {
    socket.emit("voice_quality_degraded", {
      severity: "medium",
      message: "High packet loss detected",
      recommendations: ["Lower video quality", "Check network connection"],
      networkStats: stats,
    });
  }
});
```

## 📱 Testing

1. **Demo Page**: Visit `/voice-demo` to test all features
2. **Multiple Tabs**: Open multiple tabs with the same channel ID
3. **Device Testing**: Try switching cameras/microphones
4. **Network Testing**: Throttle network to test quality adaptation
5. **Error Testing**: Deny permissions to test error handling

## 🎯 Migration Guide

### From Old VoiceChannel to EnhancedVoiceChannel

1. **Replace Component**:

   ```tsx
   // Before
   import VoiceChannel from "@/components/VoiceChannel";

   // After
   import EnhancedVoiceChannel from "@/components/EnhancedVoiceChannel";
   ```

2. **Add Notifications**:

   ```tsx
   import VoiceNotifications from "@/components/VoiceNotifications";

   // Add to your layout
   <VoiceNotifications />;
   ```

3. **Update Props** (optional):
   ```tsx
   <EnhancedVoiceChannel
     // Same props as before
     channelId={channelId}
     userId={userId}
     onHangUp={onHangUp}
     // New optional props
     currentUser={{ username: "User Name" }}
     headless={false}
   />
   ```

### From MediaStreamManager to VoiceVideoManager

```tsx
// Before
import { MediaStreamManager } from "@/socket";
const manager = new MediaStreamManager(userId, socket);

// After
import { VoiceVideoManager } from "@/socket";
const manager = new VoiceVideoManager(userId, socket);

// All old methods still work + new features available
```

## 🔧 Troubleshooting

### Common Issues

1. **Permissions Denied**: Ensure HTTPS and grant camera/microphone access
2. **No Video**: Check if camera is being used by another application
3. **Connection Issues**: Verify WebRTC STUN/TURN server configuration
4. **Screen Share Fails**: Some browsers require user gesture to start screen share

### Debug Mode

Enable debug logging:

```tsx
// In your component
useEffect(() => {
  if (process.env.NODE_ENV === "development") {
    window.VOICE_DEBUG = true;
  }
}, []);
```

## 🎉 Success!

You now have a state-of-the-art voice and video communication system integrated into your Echo Web application! The system supports:

- ✅ Voice and video calling
- ✅ Screen sharing with picture-in-picture
- ✅ Call recording
- ✅ Device switching
- ✅ Adaptive quality control
- ✅ Network monitoring
- ✅ Comprehensive error handling
- ✅ Modern UI with notifications
- ✅ Backward compatibility

Happy coding! 🚀
