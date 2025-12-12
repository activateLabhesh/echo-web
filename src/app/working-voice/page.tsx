// src/app/working-voice/page.tsx

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { VoiceVideoManager } from '@/lib/VoiceVideoManager';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';

const WorkingVoicePage = () => {
  const [isInCall, setIsInCall] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [channelId, setChannelId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  
  const managerRef = useRef<VoiceVideoManager | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Use a fixed channel ID so all tabs join the same channel
  useEffect(() => {
    setChannelId('working-demo-fixed-channel');
    setUserId('user-' + Math.random().toString(36).substr(2, 9));
  }, []);

  const startCall = async () => {
    try {
      console.log("Starting call with Chime SDK...");
      
      // Create manager (no socket needed for Chime)
      const manager = new VoiceVideoManager(userId);
      managerRef.current = manager;
      
      // Set up event listeners
      manager.onStream((stream, peerId, type) => {
        console.log("Received stream from", peerId, type);
        setParticipants(prev => {
          const existing = prev.findIndex(p => p.id === peerId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], stream, type };
            return updated;
          } else {
            return [...prev, { id: peerId, stream, type, username: `User ${peerId.substr(0, 6)}` }];
          }
        });
      });
      
      manager.onUserJoined((attendeeId, externalUserId) => {
        console.log("User joined channel:", attendeeId, externalUserId);
      });
      
      manager.onUserLeft((peerId) => {
        console.log("User left:", peerId);
        setParticipants(prev => prev.filter(p => p.id !== peerId));
      });
      
      manager.onVoiceRoster((members) => {
        console.log("Voice roster updated:", members);
      });
      
      // Initialize media
      await manager.initialize(true, true);
      const stream = manager.getLocalStream();
      setLocalStream(stream);
      
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Join channel (calls backend /api/chime/join)
      await manager.joinVoiceChannel(channelId);
      
      setIsConnected(true);
      setIsInCall(true);
      console.log("Call started successfully via Chime!");
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Failed to start call:", error);
      alert(`Failed to start call: ${errorMessage}\n\nMake sure your backend implements POST /api/chime/join`);
    }
  };
  
  const endCall = () => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
    
    setIsInCall(false);
    setIsConnected(false);
    setLocalStream(null);
    setParticipants([]);
    managerRef.current = null;
  };
  
  const toggleMute = () => {
    if (managerRef.current) {
      const newMuted = !isMuted;
      managerRef.current.toggleAudio(!newMuted);
      setIsMuted(newMuted);
    }
  };
  
  const toggleVideo = () => {
    if (managerRef.current) {
      const newVideo = !isVideoOn;
      managerRef.current.toggleVideo(newVideo);
      setIsVideoOn(newVideo);
    }
  };

  if (!isInCall) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Working Voice Demo (Chime SDK)</h1>
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-gray-300 mb-2">
              Channel ID: <code className="bg-gray-700 px-2 py-1 rounded">
                {channelId || 'Loading...'}
              </code>
            </p>
            <p className="text-sm text-gray-400">Open this page in multiple tabs to test with other participants</p>
          </div>
          <button
            onClick={startCall}
            disabled={!channelId || !userId}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-4 rounded-lg text-xl font-semibold transition-colors"
          >
            Start Call
          </button>
          
          <div className="mt-8 bg-gray-800 rounded-lg p-4 text-left max-w-md mx-auto">
            <h3 className="font-semibold mb-2">Backend Requirements:</h3>
            <p className="text-gray-400 text-sm">
              Your backend must implement <code className="bg-gray-700 px-1 rounded">POST /api/chime/join</code> 
              that returns Chime meeting and attendee credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Local Video */}
          <div className="bg-gray-800 rounded-lg overflow-hidden relative">
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl font-bold">You</span>
                  </div>
                  <p className="text-gray-300">Camera off</p>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 rounded px-2 py-1">
              <span className="text-white text-sm">You {isMuted && '(muted)'}</span>
            </div>
          </div>
          
          {/* Remote Participants */}
          {participants.map((participant) => (
            <div key={participant.id} className="bg-gray-800 rounded-lg overflow-hidden relative">
              {participant.stream ? (
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => {
                    if (el && participant.stream) {
                      el.srcObject = participant.stream;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                      <span className="text-2xl font-bold">{participant.username?.charAt(0) || 'U'}</span>
                    </div>
                    <p className="text-gray-300">{participant.username}</p>
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 rounded px-2 py-1">
                <span className="text-white text-sm">{participant.username}</span>
              </div>
            </div>
          ))}
          
          {/* Placeholder for more participants */}
          {participants.length === 0 && (
            <div className="bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
              <div className="text-center text-gray-400">
                <p className="text-lg">Waiting for participants...</p>
                <p className="text-sm mt-2">Open this page in another tab to test</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-6 bg-gray-800">
        <div className="flex justify-center items-center space-x-6">
          {/* Connection Status */}
          <div className="text-sm">
            Status: <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
              {isConnected ? 'Connected (Chime)' : 'Disconnected'}
            </span>
          </div>
          
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
          </button>
          
          {/* Video */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              !isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoOn ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
          </button>
          
          {/* Hang Up */}
          <button
            onClick={endCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          >
            <FaPhoneSlash size={20} />
          </button>
          
          {/* Participants Count */}
          <div className="text-sm">
            Participants: {participants.length + 1}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingVoicePage;
