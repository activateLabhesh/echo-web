"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaHashtag, FaCog, FaVolumeUp } from "react-icons/fa";
import VoiceChannel from "@/components/VoiceChannel";
import { fetchServers, fetchChannelsByServer } from "@/app/api/API";
import Chatwindow from "@/components/ChatWindow";
import { useSearchParams } from "next/navigation";


const serverIcons: string[] = [
  "/hackbattle.png",
  "/image_6.png",
  "/image_7.png",
  "/image_9.png",
  "/image_6.png",
  "/hackbattle.png",
];

interface Channel {
  id: string;
  name: string;
  type: string;
  is_private: boolean;
}

const ServersPage: React.FC = () => {
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");

  const [showAddMenu, setShowAddMenu] = useState(false);

  const router = useRouter();
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [noServer, setNoServer] = useState<boolean>(false);
  const [selectedServerName, setSelectedServerName] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<string | null>(
    null
  );
  // Lifted media streams to pass into ChatWindow
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(
    null
  );
  const [remoteMediaStreams, setRemoteMediaStreams] = useState<
    { id: string; stream: MediaStream }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const user: User =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {
          id: "guest",
          email: "guest@example.com",
          fullname: "Guest",
          username: "guest",
          avatar_url: null,
          bio: "",
          created_at: "",
          date_of_birth: "",
          status: "offline",
        };

  useEffect(() => {
    const loadServers = async () => {
      try {
        setLoading(true);
        const data = await fetchServers();
        console.log(data);
        setServers(data);
        if (data.length > 0) {
          setSelectedServerId(data[0].id);
          setSelectedServerName(data[0].name);
        } else {
          setNoServer(true);
        }
      } catch (err) {
        console.error("Error fetching servers", err);
        setError("Failed to load servers.");
      } finally {
        setLoading(false);
      }
    };
    loadServers();
  }, []);

  useEffect(() => {
    if (!selectedServerId) return;
    const loadChannels = async () => {
      try {
        const data: Channel[] = await fetchChannelsByServer(selectedServerId);
        console.log(data);
        // Normalize channel types to lowercase to avoid casing mismatches
        const normalized = (data || []).map((c) => ({
          ...c,
          type: (c.type || "").toLowerCase(),
        }));
        setChannels(normalized);
        const firstTextChannel = normalized.find((c) => c.type === "text");
        setActiveChannel(firstTextChannel || null);
      } catch (err) {
        console.error("Error fetching channels", err);
        setError("Failed to load channels");
        setChannels([]);
      }
    };
    loadChannels();
  }, [selectedServerId]);

  useEffect(() => {
    const loadServers = async () => {
      try {
        setLoading(true);
        const data = await fetchServers();
        console.log(data);
        setServers(data);
        if (data.length > 0) {
          setSelectedServerId(data[0].id);
          setSelectedServerName(data[0].name);
        } else {
          setNoServer(true);
        }
      } catch (err) {
        console.error("Error fetching servers", err);
        setError("Failed to load servers.");
      } finally {
        setLoading(false);
      }
    };
    loadServers();
  }, [refresh]); 

  // Derived channel lists
  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  const handleJoinVoiceChannel = (channelName: string) => {
    setActiveVoiceChannel(channelName);
  };

  const handleRemoteAdded = (id: string, stream: MediaStream) => {
    setRemoteMediaStreams((prev) => {
      const exists = prev.find((p) => p.id === id);
      if (exists) {
        return prev.map((p) => (p.id === id ? { id, stream } : p));
      }
      return [...prev, { id, stream }];
    });
  };

  const handleRemoteRemoved = (id: string) => {
    setRemoteMediaStreams((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex h-screen bg-black select-none">
      {/* Server Sidebar */}

      <div className="w-16 p-2 flex flex-col items-center bg-black space-y-3 relative">
        {loading ? (
          <>
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
          </>
        ) : servers.length === 0 ? (
          <div className="text-white text-xs text-center px-2"></div>
        ) : (
          servers.map((server, idx) => (
            <img
              key={server.id}
              src={server.icon_url || serverIcons[idx % serverIcons.length]}
              alt={server.name}
              className={`w-12 h-12 rounded-full hover:scale-105 transition-transform cursor-pointer ${
                selectedServerId === server.id ? "ring-2 ring-white" : ""
              }`}
              onClick={() => {
                setSelectedServerId(server.id);
                setSelectedServerName(server.name);
              }}
            />
          ))
        )}

        {/* ➕ Add Server Button */}
        <div className="absolute bottom-4">
          <div className="relative group">
            <button
              className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 text-green-500 hover:bg-green-600 hover:text-white transition-all text-3xl font-bold"
              onClick={() => setShowAddMenu((prev) => !prev)}
            >
              +
            </button>

            {/* Popup Menu */}
            {showAddMenu && (
              <div className="absolute left-14 bottom-0 bg-[#1e1f22] text-white text-sm rounded-lg shadow-lg p-2 w-36 z-10">
                <button
                  onClick={() => {
                    router.push("/join-server");
                    setShowAddMenu(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-[#2f3136] transition"
                >
                  Join Server
                </button>
                <button
                  onClick={() => {
                    router.push("/create-server");
                    setShowAddMenu(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-[#2f3136] transition"
                >
                  Create Server
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        // Loading state for main content
        <div className="flex-1 flex items-center justify-center text-white text-center px-4">
          <div>
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400">Loading servers…</p>
          </div>
        </div>
      ) : error ? (
        // Error state
        <div className="flex-1 flex items-center justify-center text-white text-center px-4">
          <div>
            <h1 className="text-2xl font-semibold mb-2">
              Failed to load servers
            </h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : servers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white text-center px-4">
          <div>
            <h1 className="text-2xl font-semibold mb-2">
              You're not part of any servers.
            </h1>
            <p className="text-gray-400 mb-4">
              Join a server with an invite link or create your own!
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push("/join-server")}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
              >
                Join Server
              </button>
              <button
                onClick={() => router.push("/create-server")}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
              >
                Create Server
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Channel List */}
          <div className="w-72 h-screen overflow-y-auto text-white px-2 py-4 space-y-4 border-r border-gray-800 bg-gradient-to-b from-black via-black to-[#0f172a] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xl font-bold">{selectedServerName}</h2>
              <button
                className="p-2 rounded-full hover:bg-[#23272a] transition"
                title="Server Settings"
                onClick={() => router.push("/server-settings")}
              >
                <FaCog className="w-5 h-5 text-[#b5bac1] hover:text-white" />
              </button>
            </div>

            <div className="px-2">
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">
                Text Channels
              </h3>
              {textChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${
                    activeChannel?.id === channel.id
                      ? "bg-[#2f3136] text-white"
                      : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
                  }`}
                  onClick={() => setActiveChannel(channel)}
                >
                  <span className="flex items-center gap-2">
                    <FaHashtag size={12} />
                    {channel.name}
                  </span>
                  {activeChannel?.id === channel.id && <FaCog size={12} />}
                </div>
              ))}
            </div>

            <div className="px-2">
              <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">
                Voice Channels
              </h3>
              {voiceChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${
                    activeVoiceChannel === channel.name
                      ? "bg-[#2f3136] text-white"
                      : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
                  }`}
                  onClick={() => handleJoinVoiceChannel(channel.name)}
                >
                  <span className="flex items-center gap-2">
                    <FaVolumeUp size={12} />
                    {channel.name}
                  </span>
                  {activeVoiceChannel === channel.name && <FaCog size={12} />}
                </div>
              ))}
            </div>

            {activeVoiceChannel && (
              <div className="mt-auto p-2">
                {/* Compact hangup bar so users can leave the call from sidebar */}
                <div className="flex items-center justify-between bg-gray-900 rounded-md p-2 mt-2">
                  <div className="text-xs text-gray-300 truncate mr-2">
                    In voice: {activeVoiceChannel}
                  </div>
                  <button
                    onClick={() => {
                      setActiveVoiceChannel(null);
                      setLocalMediaStream(null);
                      setRemoteMediaStreams([]);
                    }}
                    className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-500"
                  >
                    Hang up
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Chat Window */}
          {/* Main Content Area */}
          <div className="flex-1 relative text-white bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.15)_0%,rgba(0,0,0,1)_85%)] flex flex-col">
            {activeVoiceChannel ? (
              <div className="flex-1 w-full h-full">
                <VoiceChannel
                  channelId={activeVoiceChannel}
                  userId={user.id}
                  onHangUp={() => {
                    setActiveVoiceChannel(null);
                  }}
                />
              </div>
            ) : activeChannel ? (
              <>
                <h1 className="text-2xl font-bold mb-4 text-center pt-6">
                  Welcome to #{activeChannel.name}
                </h1>
                <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 rounded-lg">
                  <Chatwindow
                    channelId={activeChannel.id}
                    isDM={false}
                    currentUserId={user.id}
                    localStream={localMediaStream}
                    remoteStreams={remoteMediaStreams}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl text-gray-400">
                  Select a channel to start chatting
                </h2>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ServersPage;
