"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation"; // 1. IMPORT useRouter
import { FaHashtag, FaCog, FaVolumeUp } from "react-icons/fa";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import VoiceChannel from "@/components/VoiceChannel"; // Import the VoiceChannel component
import {
  fetchServers,
  fetchChannelsByServer,
  fetchMessages,
  uploadMessage,
} from "@/app/api/API";
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_API_URL);

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY!;

// Helper array for server icons
const serverIcons: string[] = [
  "/hackbattle.png", "/image_6.png", "/image_7.png",
  "/image_9.png", "/image_6.png", "/hackbattle.png",
];

// Define interfaces for our data structures
interface Channel {
  id: string;
  name: string;
  type: string; // e.g., 'text' or 'voice'
  is_private: boolean;
}

interface Message {
  id: string;
  message: string;
  senderId: string;
  name: string; // sender's name
  seed: string; // for avatar
  color: string;
  timestamp: string;
}

const ServersPage: React.FC = () => {
  const router = useRouter(); // 1. INITIALIZE useRouter

  // State Management
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedServerName, setSelectedServerName] = useState<string>("");
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null); // 2. FIX activeChannel state
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]); // 3. ADD messages state
  const [message, setMessage] = useState("");

  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifResults, setGifResults] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  
  
  interface User {
    id: string;
    email: string;
    fullname: string;
    username: string;
    avatar_url: string | null;
    bio: string;
    created_at: string;
    date_of_birth: string;
    status: "online" | "offline" | "idle" | "dnd";
  }

  const userItem = typeof window !== "undefined"? localStorage.getItem("user") : null;
  const user:  User=   userItem && userItem !== "undefined" ? JSON.parse(userItem) :
  {
      id: "guest",
      email: "guest@example.com",
      fullname: "Guest",
      username: "guest",
      avatar_url: null,
      bio: "",
      created_at: "",
      date_of_birth: "",
      status: "offline"
    };

  
  // Effect to load servers on initial render
  useEffect(() => {
    const loadServers = async () => {
      try {
        setLoading(true);
        const data = await fetchServers();
        
        setServers(data);
        if (data.length > 0) {
          setSelectedServerId(data[0].id);
          setSelectedServerName(data[0].name);
        }
      } catch (err: any) {
        console.error("Error fetching servers", err);
        setError("Failed to load servers.");
      } finally {
        setLoading(false);
      }
    };
    loadServers();
  }, []);

  // Effect to load channels when server changes
  useEffect(() => {
    if (!selectedServerId || !user) return;

    const loadChannels = async () => {
      try {
        // Assuming fetchChannelsByServer could take a serverId in the future
        const data: Channel[] = await fetchChannelsByServer(selectedServerId);
        console.log("data ", data);
        setChannels(data);
        // Set the first text channel as active by default
        const firstTextChannel = data.find(c => c.type === "TEXT");
        setActiveChannel(firstTextChannel || null);
      } catch (err) {
        console.error("Error fetching channels for server:", selectedServerId, err);
        setError("Failed to load channels");
        setChannels([]);
      }
    };
    loadChannels();
  }, [selectedServerId]);

  // Effect to load messages when active channel changes
  useEffect(() => {
    if (!activeChannel) return;
  
    socket.emit("join_text_channel", activeChannel.id);
  
    socket.off("receive_message"); // clean up old listener
    socket.on("receive_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });
  
    return () => {
      socket.off("receive_message");
    };
  }, [activeChannel]);
  

  // Effect to scroll to the bottom of the chat on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
    
  // Effect to fetch GIFs when the GIF panel is opened
  useEffect(() => {
    const fetchTenorGifs = async () => {
      try {
        const res = await fetch(`https://tenor.googleapis.com/v2/search?q=trending&key=${TENOR_API_KEY}&limit=12`);
        const data = await res.json();
        setGifResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setGifResults([]);
      }
    };
    if (showGifs) fetchTenorGifs();
  }, [showGifs]);

  // --- Handlers ---
  const handleSend = async (content: string = message) => {
    if (!content.trim() || !activeChannel) return;
  
    try {
      const newMessage = {
        id: crypto.randomUUID(), // Generate a unique ID for the message
        channelId: activeChannel.id,
        message: content,
        name: user.fullname,
        senderId: user.id,
        seed: "user",
        color: "text-blue-400",
        timestamp: new Date().toISOString(),
      };
      
      
  
      socket.emit("send_message", newMessage);
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
      setShowEmoji(false);
      setShowGifs(false);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };
  

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };
  
  const handleGifClick = (gifUrl: string) => {
    handleSend(gifUrl); // Reuse handleSend logic for sending GIFs
  };
  
  const handleJoinVoiceChannel = (channelName: string) => {
    setActiveVoiceChannel(channelName);
  };

  // --- Render Functions ---
  
  // 4. REMOVE duplicate function
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true,
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  // --- Loading and Error States ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading servers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-black">
      {/* Server Sidebar */}
      <div className="w-16 p-2 flex flex-col items-center bg-black space-y-3">
        {servers.map((server, idx) => (
          <img
            key={server.id}
            src={server.iconUrl || serverIcons[idx % serverIcons.length]}
            alt={server.name}
            className={`w-12 h-12 rounded-full hover:scale-105 transition-transform cursor-pointer ${selectedServerId === server.id ? "ring-2 ring-white" : ""}`}
            onClick={() => {
              setSelectedServerId(server.id);
              setSelectedServerName(server.name);
            }}
          />
        ))}
      </div>

      {/* 5. FIX Channel List UI */}
      <div className="w-72 h-screen overflow-y-auto text-white px-2 py-4 space-y-4 border-r border-gray-800 bg-gradient-to-b from-black via-black to-[#0f172a] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xl font-bold">{selectedServerName}</h2>
            <button className="p-2 rounded-full hover:bg-[#23272a] transition" title="Server Settings" onClick={() => router.push("/server-settings")}>
                <FaCog className="w-5 h-5 text-[#b5bac1] hover:text-white" />
            </button>
        </div>

        {/* Text Channels */}
        <div className="px-2">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Text Channels</h3>
            {textChannels.map((channel) => (
                <div
                    key={channel.id}
                    className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${activeChannel?.id === channel.id ? "bg-[#2f3136] text-white" : "text-gray-400 hover:bg-[#2f3136] hover:text-white"}`}
                    onClick={() => setActiveChannel(channel)}
                >
                    <span className="flex items-center gap-2"><FaHashtag size={12} />{channel.name}</span>
                    {activeChannel?.id === channel.id && <FaCog size={12} />}
                </div>
            ))}
        </div>

        {/*    Channels */}
        <div className="px-2">
            <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">Voice Channels</h3>
            {voiceChannels.map((channel) => (
                <div
                    key={channel.id}
                    className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${activeVoiceChannel === channel.name ? "bg-[#2f3136] text-white" : "text-gray-400 hover:bg-[#2f3136] hover:text-white"}`}
                    onClick={() => handleJoinVoiceChannel(channel.name)}
                >
                    <span className="flex items-center gap-2"><FaVolumeUp size={12} />{channel.name}</span>
                    {activeVoiceChannel === channel.name && <FaCog size={12} />}
                </div>
            ))}
        </div>

        {activeVoiceChannel && (
          <div className="mt-auto p-2">
            <VoiceChannel channelId={activeVoiceChannel} onHangUp={() => setActiveVoiceChannel(null)} />
          </div>
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 relative text-white px-6 pt-6 pb-6 overflow-hidden bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.15)_0%,rgba(0,0,0,1)_85%)] flex flex-col">
        {activeChannel ? (
            <>
                <h1 className="text-2xl font-bold mb-4 text-center">Welcome to #{activeChannel.name}</h1>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {messages.map((msg) => (
                    <div className="flex items-start gap-4" key={msg.id}>
                        <img src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.seed || "user"}`} alt="avatar" className="w-10 h-10 rounded-full"/>
                        <div>
                        <div className="flex items-center gap-2">
                            <span className={`font-semibold ${msg.color || "text-white"}`}>{msg.name}</span>
                            <span className="text-xs text-gray-400">{formatTimestamp(msg.timestamp)}</span>
                        </div>
                        {msg.message.startsWith("http") && (msg.message.endsWith(".gif") || msg.message.includes("tenor.com")) ? (
                            <img src={msg.message} alt="gif" className="rounded-lg mt-2 max-w-xs cursor-pointer" onClick={() => window.open(msg.message, "_blank")}/>
                        ) : (
                            <p className="text-gray-200">{msg.message}</p>
                        )}
                        </div>
                    </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
                {/* Input Box */}
                <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl flex items-center p-4 ring-2 ring-white/10 shadow-lg w-[90%] max-w-2xl mx-auto">
                    <button className="px-3 text-white text-xl" onClick={() => setShowEmoji((p) => !p)}>😊</button>
                    <button className="px-3 text-white text-xl font-semibold" onClick={() => setShowGifs((p) => !p)}>GIF</button>
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-white placeholder-gray-300 px-4 py-3 text-base"
                        placeholder={`Message #${activeChannel.name}`}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <button className="px-3 text-white font-semibold hover:text-blue-400" onClick={() => handleSend()}>Send</button>

                    {showEmoji && (<div className="absolute bottom-20 left-4 z-50"><EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.DARK} /></div>)}
                    {showGifs && (
                        <div className="absolute bottom-20 right-4 z-50 w-[300px] h-[300px] bg-black rounded-xl overflow-auto p-2 space-y-2">
                        {gifResults.map((gif, idx) => {
                            const gifUrl = gif.media_formats?.gif?.url;
                            if (!gifUrl) return null;
                            return <img key={idx} src={gifUrl} alt="gif" className="w-full rounded cursor-pointer" onClick={() => handleGifClick(gifUrl)}/>;
                        })}
                        </div>
                    )}
                </div>
            </>
        ) : (
             <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl text-gray-400">Select a channel to start chatting</h2>
             </div>
        )}
      </div>
    </div>
  );
};

export default ServersPage;