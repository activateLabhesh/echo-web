// src/app/voice-demo/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import EnhancedVoiceChannel from "@/components/EnhancedVoiceChannel";
import VoiceNotifications from "@/components/VoiceNotifications";

const VoiceDemoPage = () => {
  const [isInCall, setIsInCall] = useState(false);
  const [channelId, setChannelId] = useState("demo-channel-123");
  const [userId, setUserId] = useState("");

  const handleStartCall = () => {
    setIsInCall(true);
  };

  const handleEndCall = () => {
    setIsInCall(false);
  };

  // Generate user ID on client side only
  useEffect(() => {
    setUserId("demo-user-" + Math.random().toString(36).substr(2, 9));
  }, []);

  const currentUser = {
    username: "Demo User",
  };

  if (isInCall) {
    return (
      <div className="h-screen w-screen bg-gray-900">
        <EnhancedVoiceChannel
          channelId={channelId}
          userId={userId}
          onHangUp={handleEndCall}
          currentUser={currentUser}
          onLocalStreamChange={(stream) => {
            console.log("Local stream changed:", stream);
          }}
          onRemoteStreamAdded={(id, stream, type) => {
            console.log("Remote stream added:", id, type);
          }}
          onRemoteStreamRemoved={(id) => {
            console.log("Remote stream removed:", id);
          }}
          onVoiceRoster={(members) => {
            console.log("Voice roster updated:", members);
          }}
        />
        <VoiceNotifications />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            🎯 Enhanced Voice/Video Demo
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Experience the full power of voice and video communication with
            advanced features
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-blue-400 mb-3">🎤</div>
            <h3 className="text-lg font-semibold mb-2">Voice Chat</h3>
            <p className="text-gray-400 text-sm">
              Crystal clear audio with noise suppression and adaptive quality
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-green-400 mb-3">📹</div>
            <h3 className="text-lg font-semibold mb-2">Video Calling</h3>
            <p className="text-gray-400 text-sm">
              HD video with multiple participants and smart grid layout
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-purple-400 mb-3">🖥️</div>
            <h3 className="text-lg font-semibold mb-2">Screen Sharing</h3>
            <p className="text-gray-400 text-sm">
              Share your screen with picture-in-picture video support
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-red-400 mb-3">⏺️</div>
            <h3 className="text-lg font-semibold mb-2">Recording</h3>
            <p className="text-gray-400 text-sm">
              Record calls with audio, video, and screen sharing
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-yellow-400 mb-3">🔧</div>
            <h3 className="text-lg font-semibold mb-2">Device Control</h3>
            <p className="text-gray-400 text-sm">
              Switch cameras and microphones on the fly
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-indigo-400 mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Quality Control</h3>
            <p className="text-gray-400 text-sm">
              Adaptive quality with network monitoring and optimization
            </p>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6">Start Demo</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Channel ID
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter channel ID..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Open this page in multiple tabs with the same channel ID to test
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your User ID
              </label>
              <input
                type="text"
                value={userId || "Loading..."}
                readOnly
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-400"
              />
            </div>
          </div>

          <button
            onClick={handleStartCall}
            disabled={!channelId.trim() || !userId}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          >
            🚀 Start Enhanced Voice Call
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">💡</span>
            How to Test
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Open this page in multiple browser tabs or windows</li>
            <li>Use the same Channel ID in all tabs</li>
            <li>Click "Start Enhanced Voice Call" in each tab</li>
            <li>Grant camera and microphone permissions when prompted</li>
            <li>Test voice, video, screen sharing, and recording features</li>
            <li>Try switching devices and adjusting quality settings</li>
          </ol>
        </div>

        {/* Technical Features */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">
              🔧 Technical Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• WebRTC peer-to-peer connections</li>
              <li>• Socket.io real-time signaling</li>
              <li>• Adaptive bitrate streaming</li>
              <li>• Network quality monitoring</li>
              <li>• Error handling & recovery</li>
              <li>• Device hot-swapping</li>
            </ul>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">🎨 UI Features</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Responsive video grid layout</li>
              <li>• Picture-in-picture screen share</li>
              <li>• Voice activity indicators</li>
              <li>• Recording status display</li>
              <li>• Connection quality indicators</li>
              <li>• Advanced settings panel</li>
            </ul>
          </div>
        </div>
      </div>

      <VoiceNotifications />
    </div>
  );
};

export default VoiceDemoPage;
