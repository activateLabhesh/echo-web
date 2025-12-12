// src/app/simple-voice/page.tsx

"use client";

import React, { useState, useRef } from 'react';
import { VoiceVideoManager } from '@/lib/VoiceVideoManager';

const SimpleVoicePage = () => {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('Ready to start');
  const [logs, setLogs] = useState<string[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const managerRef = useRef<VoiceVideoManager | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const step1_CreateManager = async () => {
    setStep(1);
    setStatus('Creating VoiceVideoManager...');
    addLog("🎤 Step 1: Creating VoiceVideoManager (Chime SDK)");

    try {
      const userId = 'test-user-' + Math.random().toString(36).substr(2, 9);
      const manager = new VoiceVideoManager(userId);
      managerRef.current = manager;
      
      setStatus('VoiceVideoManager created successfully!');
      addLog(`✅ Step 1 completed - Manager created for user: ${userId}`);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Manager creation failed: ${errorMessage}`);
      addLog(`❌ Step 1 failed: ${errorMessage}`);
    }
  };

  const step2_GetMedia = async () => {
    if (!managerRef.current) {
      addLog("❌ No manager available");
      return;
    }

    setStep(2);
    setStatus('Requesting camera and microphone...');
    addLog("📷 Step 2: Requesting media permissions");

    try {
      await managerRef.current.initialize(true, true);
      const stream = managerRef.current.getLocalStream();
      
      if (stream) {
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        addLog(`✅ Media stream obtained with ${stream.getTracks().length} tracks`);
      }
      
      setStatus('Media access granted!');
      addLog("✅ Step 2 completed - Media working");
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : '';
      setStatus(`Media access failed: ${errorMessage}`);
      addLog(`❌ Step 2 failed: ${errorMessage}`);
      
      if (errorName === 'NotAllowedError') {
        addLog("💡 Please allow camera/microphone permissions and try again");
      }
    }
  };

  const step3_JoinChannel = async () => {
    if (!managerRef.current) {
      addLog("❌ No manager available");
      return;
    }

    setStep(3);
    setStatus('Joining voice channel via Chime...');
    addLog("🏠 Step 3: Joining voice channel (calls backend /api/chime/join)");

    try {
      await managerRef.current.joinVoiceChannel('test-channel-123');
      
      setStatus('Successfully joined voice channel!');
      addLog("✅ Step 3 completed - Joined Chime meeting");
      addLog("🎉 All steps completed! Voice system is working!");
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Channel join failed: ${errorMessage}`);
      addLog(`❌ Step 3 failed: ${errorMessage}`);
      addLog("💡 Make sure your backend implements POST /api/chime/join");
    }
  };

  const reset = () => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
    
    setStep(0);
    setStatus('Ready to start');
    setLocalStream(null);
    setLogs([]);
    managerRef.current = null;
  };

  const getStepColor = (stepNum: number) => {
    if (step > stepNum) return 'bg-green-600';
    if (step === stepNum) return 'bg-yellow-600';
    return 'bg-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Simple Voice System Test (Chime SDK)</h1>
        
        {/* Status */}
        <div className="mb-8 text-center">
          <div className="inline-block px-6 py-3 rounded-lg text-lg font-semibold bg-blue-600">
            {status}
          </div>
        </div>

        {/* Video Preview */}
        {localStream && (
          <div className="mb-8 flex justify-center">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-center">Your Camera</h3>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-64 h-48 bg-black rounded transform -scale-x-100"
              />
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${getStepColor(1)}`}>
            <div className="text-center">
              <div className="text-2xl mb-2">1</div>
              <div className="font-semibold">Create Manager</div>
              <div className="text-sm mt-2">Initialize Chime SDK</div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${getStepColor(2)}`}>
            <div className="text-center">
              <div className="text-2xl mb-2">2</div>
              <div className="font-semibold">Get Media</div>
              <div className="text-sm mt-2">Access camera/microphone</div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${getStepColor(3)}`}>
            <div className="text-center">
              <div className="text-2xl mb-2">3</div>
              <div className="font-semibold">Join Channel</div>
              <div className="text-sm mt-2">Connect to Chime meeting</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4 mb-8">
          {step === 0 && (
            <button
              onClick={step1_CreateManager}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Start Step 1: Create Manager
            </button>
          )}
          
          {step === 1 && (
            <button
              onClick={step2_GetMedia}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Step 2: Get Media Access
            </button>
          )}
          
          {step === 2 && (
            <button
              onClick={step3_JoinChannel}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Step 3: Join Voice Channel
            </button>
          )}
          
          <button
            onClick={reset}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Debug Logs</h2>
          <div className="bg-black rounded p-3 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Start the test to see what happens.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold mb-2">Backend Requirements</h2>
          <p className="text-gray-400 text-sm">
            This test page requires your backend to implement the following Chime endpoints:
          </p>
          <ul className="list-disc list-inside text-gray-400 text-sm mt-2">
            <li><code>POST /api/chime/join</code> - Returns meeting and attendee credentials</li>
            <li><code>POST /api/chime/leave</code> - Cleanup when leaving (optional)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleVoicePage;
