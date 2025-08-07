"use client";
import React, { useEffect, useState } from 'react';
import { VideoVoiceService } from '../../lib/voiceservice';

const voice = new VideoVoiceService(`${process.env.NEXT_PUBLIC_API_URL}`);

export default function VoiceTest() {
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    voice.onRemoteStream((stream, socketId) => {
      const audio = document.createElement("audio");
      audio.srcObject = stream;
      audio.autoplay = true;
      document.body.appendChild(audio);
      console.log("Remote audio playing from:", socketId);
    });

    voice.onUserDisconnected((id) => {
      console.log("User left:", id);
    });
  }, []);

  const connectToVoice = async () => {
    await voice.connect();
    voice.joinChannel("test-room");
    setConnected(true);
  };

  return (
    <div>
      <button onClick={connectToVoice} disabled={connected}>
        {connected ? "Connected" : "Join Voice"}
      </button>
    </div>
  );
}
