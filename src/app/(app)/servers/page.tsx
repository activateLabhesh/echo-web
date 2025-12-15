"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  FaHashtag,
  FaCog,
  FaVolumeUp,
  FaMicrophoneSlash,
  FaMicrophone,
  FaVideoSlash,
  FaLock,
  FaShieldAlt,
  FaAngleLeft,
  FaAngleRight,
} from "react-icons/fa";
import VoiceChannel from "@/components/EnhancedVoiceChannel";
import { fetchServers, fetchChannelsByServer } from "@/app/api/API";
import { getSelfAssignableRoles, getMyRoles, selfAssignRole, selfUnassignRole, type Role } from "@/app/api";
import Chatwindow from "@/components/ChatWindow";
import { useSearchParams } from "next/navigation";
import { useVoiceCall } from "@/contexts/VoiceCallContext";
import { supabase } from '@/lib/supabaseClient';
import Loader from "@/components/Loader";

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

const ServersPageContent: React.FC = () => {
   const [isChannelSidebarCollapsed, setIsChannelSidebarCollapsed] =
     useState(false); 
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");
  const serverIdFromQuery = searchParams.get("serverId");
  const viewModeFromQuery = searchParams.get("view");

  const [showAddMenu, setShowAddMenu] = useState(false);

  const router = useRouter();
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedServerName, setSelectedServerName] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Self-assignable roles state
  const [selfAssignableRoles, setSelfAssignableRoles] = useState<Role[]>([]);
  const [myRoles, setMyRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  // View mode: 'voice' shows full voice UI, 'chat' shows text chat (with floating window if in voice)
  const [viewMode, setViewMode] = useState<"voice" | "chat">("chat");

  // Store viewMode in localStorage for FloatingVoiceWindow to read
  useEffect(() => {
    localStorage.setItem("currentViewMode", viewMode);
    return () => {
      localStorage.removeItem("currentViewMode");
    };
  }, [viewMode]);

  // Use the global voice call context
  const {
    activeCall,
    isConnected,
    isConnecting,
    participants,
    localMediaState,
    localVideoTileId,
    videoTiles,
    manager,
    joinCall,
    leaveCall,
    permissionError,
    connectionError,
  } = useVoiceCall();

  // Check if this server's voice channel is active
  const isVoiceActiveForCurrentServer =
    activeCall?.serverId === selectedServerId;
  const activeVoiceChannelName = isVoiceActiveForCurrentServer
    ? activeCall?.channelName
    : null;

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  // Should show voice UI: only when in voice view mode AND connected to this server's voice
const showVoiceUI =
  voiceEnabled &&
  viewMode === "voice" &&
  isVoiceActiveForCurrentServer &&
  activeCall;

  // Debug logging for voice UI visibility
  useEffect(() => {
    console.log("[ServersPage] Voice UI Debug:", {
      viewMode,
      selectedServerId,
      activeCallServerId: activeCall?.serverId,
      isVoiceActiveForCurrentServer,
      showVoiceUI:
        viewMode === "voice" && isVoiceActiveForCurrentServer && !!activeCall,
      activeCall: activeCall
        ? {
            channelId: activeCall.channelId,
            channelName: activeCall.channelName,
            serverId: activeCall.serverId,
          }
        : null,
    });
  }, [viewMode, selectedServerId, activeCall, isVoiceActiveForCurrentServer]);

  // Voice members derived from context participants
  interface VoiceMember {
    id: string;
    username: string;
    avatar_url?: string | null;
    status?: "online" | "offline" | "idle" | "dnd";
    muted?: boolean;
    video?: boolean;
    speaking?: boolean;
  }

  // Map context participants to VoiceMember format
  const uniqueParticipantsMap = new Map<string, any>();

  participants.forEach((p) => {
    const id = p.attendeeId || p.oduserId;
    if (!uniqueParticipantsMap.has(id)) {
      uniqueParticipantsMap.set(id, p);
    }
  });

  const voiceMembers: VoiceMember[] = Array.from(
    uniqueParticipantsMap.values()
  ).map((p) => ({
    id: p.attendeeId || p.oduserId,
    username: p.name || `User ${p.oduserId.slice(0, 8)}`,
    avatar_url: null,
    status: "online",
    muted: p.muted,
    video: p.video,
    speaking: p.speaking,
  }));

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
        console.log("[ServersPage] Loaded servers:", data);
        console.log("[ServersPage] serverIdFromQuery:", serverIdFromQuery);
        console.log("[ServersPage] viewModeFromQuery:", viewModeFromQuery);
        setServers(data);
        if (data.length > 0) {
          // If serverId is in query params, select that server
          if (serverIdFromQuery) {
            const targetServer = data.find(
              (s: any) => s.id === serverIdFromQuery
            );
            if (targetServer) {
              console.log(
                "[ServersPage] Selecting server from query:",
                targetServer.name
              );
              setSelectedServerId(targetServer.id);
              setSelectedServerName(targetServer.name);
            } else {
              // Fallback to first server if not found
              console.log(
                "[ServersPage] Server not found, selecting first server"
              );
              setSelectedServerId(data[0].id);
              setSelectedServerName(data[0].name);
            }
          } else {
            console.log(
              "[ServersPage] No serverId in query, selecting first server"
            );
            setSelectedServerId(data[0].id);
            setSelectedServerName(data[0].name);
          }
        }
      } catch (err) {
        console.error("Error fetching servers", err);
        setError("Failed to load servers.");
      } finally {
        setLoading(false);
      }
    };
    loadServers();
  }, [serverIdFromQuery]);

  // Handle view mode from query params (when navigating from expand button)
  useEffect(() => {
    if (viewModeFromQuery === "voice") {
      console.log("[ServersPage] Setting viewMode to voice from query param");
      setViewMode("voice");
    }
  }, [viewModeFromQuery]);

  // Also set view mode to voice when activeCall server matches selected server and view=voice was requested
  useEffect(() => {
    if (
      viewModeFromQuery === "voice" &&
      activeCall &&
      selectedServerId === activeCall.serverId
    ) {
      console.log(
        "[ServersPage] activeCall matches selected server, ensuring voice mode"
      );
      setViewMode("voice");
    }
  }, [viewModeFromQuery, activeCall, selectedServerId]);

  // Listen for expandVoiceView custom event from FloatingVoiceWindow
  useEffect(() => {
    const handleExpandVoiceView = (
      event: CustomEvent<{ serverId: string }>
    ) => {
      console.log(
        "[ServersPage] Received expandVoiceView event:",
        event.detail
      );
      const { serverId } = event.detail;

      // If the server matches current selection or the active call, switch to voice view
      if (serverId === selectedServerId || serverId === activeCall?.serverId) {
        setViewMode("voice");

        // Also ensure the correct server is selected
        if (serverId !== selectedServerId) {
          const targetServer = servers.find((s) => s.id === serverId);
          if (targetServer) {
            setSelectedServerId(targetServer.id);
            setSelectedServerName(targetServer.name);
          }
        }
      }
    };

    window.addEventListener(
      "expandVoiceView",
      handleExpandVoiceView as EventListener
    );
    return () => {
      window.removeEventListener(
        "expandVoiceView",
        handleExpandVoiceView as EventListener
      );
    };
  }, [selectedServerId, activeCall, servers]);

  useEffect(() => {
    if (!selectedServerId) return;
    const loadChannels = async () => {
      try {
        
      const { data: controls } = await supabase
        .from('admin_controls')
        .select('voice_enabled')
        .single();
      
      const isVoiceEnabled = controls?.voice_enabled ?? true;
      setVoiceEnabled(isVoiceEnabled);
      
      const data: Channel[] = await fetchChannelsByServer(selectedServerId);
      console.log(data);
      
      const normalized = (data || []).map((c) => ({
        ...c,
        type: (c.type || "").toLowerCase(),
      }));
      
      const filteredChannels = isVoiceEnabled
        ? normalized
        : normalized.filter((c) => c.type === "text");
      
      setChannels(filteredChannels);
      
      const firstTextChannel = filteredChannels.find((c) => c.type === "text");
      setActiveChannel(firstTextChannel || null);
    } catch (err) {
        console.error("Error fetching channels", err);
        setError("Failed to load channels");
        setChannels([]);
      }
    };
    loadChannels();
  }, [selectedServerId, myRoles]);

  // Load self-assignable roles when server is selected
  useEffect(() => {
    const loadRoles = async () => {
      if (!selectedServerId) return;
      
      setRolesLoading(true);
      try {
        const [assignableRoles, userRoles] = await Promise.all([
          getSelfAssignableRoles(selectedServerId),
          getMyRoles(selectedServerId)
        ]);
        setSelfAssignableRoles(assignableRoles);
        setMyRoles(userRoles);
      } catch (err) {
        console.error("Error loading roles:", err);
      } finally {
        setRolesLoading(false);
      }
    };
    loadRoles();
  }, [selectedServerId]);

  // Update localStorage with current viewed server ID (for FloatingVoiceWindow)
  useEffect(() => {
    if (selectedServerId) {
      localStorage.setItem("currentViewedServerId", selectedServerId);
    }
    return () => {
      // Clean up when leaving the page
      localStorage.removeItem("currentViewedServerId");
    };
  }, [selectedServerId]);

  // Reload servers when refresh param changes (e.g., after creating a new server)
  useEffect(() => {
    if (!refresh) return; // Only reload if refresh param is actually set
    const reloadServers = async () => {
      try {
        setLoading(true);
        const data = await fetchServers();
        console.log("[ServersPage] Refreshing servers:", data);
        setServers(data);
        // Don't reset server selection on refresh - keep current or use query param
      } catch (err) {
        console.error("Error fetching servers", err);
        setError("Failed to load servers.");
      } finally {
        setLoading(false);
      }
    };
    reloadServers();
  }, [refresh]);

  // Derived channel lists
  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  // When joining a voice channel, use the context's joinCall
  const handleJoinVoiceChannel = async (channel: Channel) => {
    setViewMode("voice"); // Switch to voice view when joining
    await joinCall(
      channel.id,
      channel.name,
      selectedServerId,
      selectedServerName
    );
  };

  // Handle hang up
  const handleHangUp = () => {
    leaveCall();
    setViewMode("chat"); // Switch back to chat view after hanging up
  };

  // Handle role toggle (assign/unassign)
  const handleRoleToggle = async (roleId: string) => {
    if (!selectedServerId) return;
    
    try {
      const hasRole = myRoles.some(r => r.id === roleId);
      
      if (hasRole) {
        await selfUnassignRole(selectedServerId, roleId);
        setMyRoles(prev => prev.filter(r => r.id !== roleId));
      } else {
        await selfAssignRole(selectedServerId, roleId);
        // Refresh my roles to get the updated list
        const updatedRoles = await getMyRoles(selectedServerId);
        setMyRoles(updatedRoles);
      }
    } catch (err: any) {
      console.error("Error toggling role:", err);
      alert(err?.response?.data?.error || "Failed to toggle role");
    }
  };

  // Build external state for EnhancedVoiceChannel
  const externalState = {
    participants,
    localMediaState,
    localVideoTileId,
    videoTiles,
    isConnected,
    isConnecting,
    permissionError,
    connectionError,
  };

  return (
    <div className="relative flex h-screen bg-black select-none">
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

        {/*  Add Server Button */}
        <div className="relative bottom-0">
          <div className="relative group">
            {/* <button
              className="w-12 h-12 px-1  flex items-center justify-center rounded-full bg-gray-800 text-yellow-300 hover:bg-yellow-500 hover:text-white transition-all text-3xl font-bold"
              onClick={() => setShowAddMenu((prev) => !prev)}
            >
              +
            </button> */}

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
        <div className="flex-1">
          <Loader text="Loading servers…" />
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
                className="px-4 py-2 rounded bg-yellow-300 hover:bg-green-700"
              >
                Create Server
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Channel List */}
          {!isChannelSidebarCollapsed && (
            <div className="w-72  h-auto overflow-y-auto text-white px-2 py-4 space-y-4 border-r border-gray-800 bg-black scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="flex items-center justify-between px-2 mb-2">
                <h2 className="text-xl font-bold">{selectedServerName}</h2>
                <button
                  className="p-2 rounded-full hover:bg-[#23272a] transition"
                  title="Server Settings"
                  onClick={() => {
                    if (selectedServerId) {
                      localStorage.setItem("currentServerId", selectedServerId);
                      router.push(
                        `/server-settings?serverId=${selectedServerId}`
                      );
                    } else {
                      alert("Please select a server first");
                    }
                  }}
                >
                  <FaCog className="w-5 h-5 text-[#b5bac1] hover:text-white" />
                </button>
              </div>
{selfAssignableRoles.length > 0 && (
              <div className="px-2 mt-4">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-[#2f3136] rounded-md p-2 transition-all"
                  onClick={() => setShowRoles(!showRoles)}
                >
                  <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                    <FaShieldAlt size={12} />
                    Self-Assign Roles
                  </h3>
                  <span className="text-gray-400 text-xs">
                    {showRoles ? "▼" : "▶"}
                  </span>
                </div>
                
                {showRoles && (
                  <div className="mt-2 space-y-2">
                    {rolesLoading ? (
                      <div className="text-xs text-gray-400 text-center py-2">Loading...</div>
                    ) : (
                      <>
                        {/* My Active Roles Section */}
                        {myRoles.filter(r => selfAssignableRoles.some(sr => sr.id === r.id)).length > 0 && (
                          <div className="mb-3">
                            <div className="text-[10px] font-semibold uppercase text-gray-500 mb-1 px-1">
                              Your Roles ({myRoles.filter(r => selfAssignableRoles.some(sr => sr.id === r.id)).length})
                            </div>
                            <div className="space-y-1">
                              {selfAssignableRoles
                                .filter(role => myRoles.some(r => r.id === role.id))
                                .map((role) => (
                                  <div
                                    key={role.id}
                                    className="flex items-center justify-between p-2 rounded-md cursor-pointer transition-all bg-[#2f3136] hover:bg-[#36393f] border border-green-500/20"
                                    onClick={() => handleRoleToggle(role.id)}
                                  >
                                    <span className="flex items-center gap-2 flex-1 min-w-0">
                                      <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: role.color || '#5865f2' }}
                                      />
                                      <span className="text-sm text-white truncate">{role.name}</span>
                                    </span>
                                    <span className="text-green-400 text-lg ml-2 flex-shrink-0">✓</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Available Roles Section */}
                        {selfAssignableRoles.filter(role => !myRoles.some(r => r.id === role.id)).length > 0 && (
                          <div>
                            <div className="text-[10px] font-semibold uppercase text-gray-500 mb-1 px-1">
                              Available to Join ({selfAssignableRoles.filter(role => !myRoles.some(r => r.id === role.id)).length})
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                              {selfAssignableRoles
                                .filter(role => !myRoles.some(r => r.id === role.id))
                                .map((role) => (
                                  <div
                                    key={role.id}
                                    className="flex items-center justify-between p-2 rounded-md cursor-pointer transition-all text-gray-400 hover:bg-[#2f3136] hover:text-white border border-transparent hover:border-gray-600"
                                    onClick={() => handleRoleToggle(role.id)}
                                  >
                                    <span className="flex items-center gap-2 flex-1 min-w-0">
                                      <div
                                        className="w-3 h-3 rounded-full flex-shrink-0 opacity-60"
                                        style={{ backgroundColor: role.color || '#5865f2' }}
                                      />
                                      <span className="text-sm truncate">{role.name}</span>
                                    </span>
                                    <span className="text-gray-600 text-xs ml-2 flex-shrink-0">Click to join</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Help text */}
                        <div className="text-[10px] text-gray-500 px-1 pt-2 border-t border-gray-700">
                          Click any role to add or remove it
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
              <div className="px-2">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">
                  Text Channels
                </h3>
                {textChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${
                      activeChannel?.id === channel.id && viewMode === "chat"
                        ? "bg-[#2f3136] text-white"
                        : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
                    }`}
                    onClick={() => {
                      setActiveChannel(channel);
                      setViewMode("chat");
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {channel.is_private ? (
                        <div className="relative w-4 h-4">
                          <FaHashtag size={12} className="absolute inset-0" />
                          <FaLock
                            size={12}
                            className="absolute -top-1 -right-1 text-gray-400 bg-[#111214] rounded-full"
                          />
                        </div>
                      ) : (
                        <FaHashtag size={12} />
                      )}
                      {channel.name}
                    </span>
                    {activeChannel?.id === channel.id &&
                      viewMode === "chat" && <FaCog size={12} />}
                  </div>
                ))}
              </div>

              <div className="px-2">
                <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">
                  Voice Channels
                </h3>
                {voiceChannels.map((channel) => {
                  const isActive = activeVoiceChannelName === channel.name;

                  return (
                    <div key={channel.id} className="space-y-1">
                      {/* Voice channel row */}
                      <div
                        className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${
                          isActive && viewMode === "voice"
                            ? "bg-[#2f3136] text-white"
                            : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
                        }`}
                        onClick={() => handleJoinVoiceChannel(channel)}
                      >
                        <span className="flex items-center gap-2">
                          <FaVolumeUp size={12} />
                          {channel.name}

                          {isActive && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isConnected
                                  ? "bg-green-500"
                                  : "bg-yellow-500 animate-pulse"
                              }`}
                            />
                          )}
                        </span>
                      </div>

                      {/*  Voice members  */}
                      {isActive && (
                        <div className="ml-6 space-y-1">
                          {voiceMembers.length === 0 ? (
                            <div className="text-xs text-gray-500 px-2">
                              {isConnecting ? "Connecting…" : "No one here"}
                            </div>
                          ) : (
                            voiceMembers.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#2f3136]"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs ${
                                      m.speaking ? "ring-2 ring-green-500" : ""
                                    }`}
                                  >
                                    {m.username?.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-xs text-gray-300 truncate">
                                    {m.username}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {m.muted ? (
                                    <FaMicrophoneSlash className="w-3 h-3 text-red-500" />
                                  ) : (
                                    <FaMicrophone className="w-3 h-3 text-gray-400" />
                                  )}
                                  {!m.video && (
                                    <FaVideoSlash className="w-3 h-3 text-gray-500" />
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Self-Assignable Roles Section */}
              {selfAssignableRoles.length > 0 && (
                <div className="px-2 mt-4">
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-[#2f3136] rounded-md p-2 transition-all"
                    onClick={() => setShowRoles(!showRoles)}
                  >
                    <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                      <FaShieldAlt size={12} />
                      Roles ({selfAssignableRoles.length})
                    </h3>
                    <span className="text-gray-400 text-xs">
                      {showRoles ? "▼" : "▶"}
                    </span>
                  </div>

                  {showRoles && (
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                      {rolesLoading ? (
                        <div className="text-xs text-gray-400 text-center py-2">
                          Loading...
                        </div>
                      ) : (
                        selfAssignableRoles.map((role) => {
                          const hasRole = myRoles.some((r) => r.id === role.id);
                          return (
                            <div
                              key={role.id}
                              className={`flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all ${
                                hasRole
                                  ? "bg-[#2f3136] text-white"
                                  : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
                              }`}
                              onClick={() => handleRoleToggle(role.id)}
                            >
                              <span className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: role.color || "#5865f2",
                                  }}
                                />
                                <span className="truncate">{role.name}</span>
                              </span>
                              {hasRole && (
                                <span className="text-green-400 text-xs ml-2 flex-shrink-0">
                                  ✓
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Show voice status in sidebar when connected to this server */}
              {isVoiceActiveForCurrentServer && activeCall && (
                <div className="mt-auto p-2">
                  {/* Compact hangup bar so users can leave the call from sidebar */}
                  <div className="flex items-center justify-between bg-gray-900 rounded-md p-2 mt-2">
                    <div className="text-xs text-gray-300 truncate mr-2">
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isConnected
                              ? "bg-green-500"
                              : "bg-yellow-500 animate-pulse"
                          }`}
                        />
                        <span>In voice: {activeCall.channelName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {viewMode === "chat" && (
                        <button
                          onClick={() => setViewMode("voice")}
                          className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600"
                        >
                          Open
                        </button>
                      )}
                      <button
                        onClick={handleHangUp}
                        className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-500"
                      >
                        Hang up
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 relative text-white bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.15)_0%,rgba(0,0,0,1)_85%)] flex flex-col">
            <button
              onClick={() => setIsChannelSidebarCollapsed((prev) => !prev)}
              className={`absolute top-4 ${
                isChannelSidebarCollapsed ? "left-4" : "left-[-1.5rem]"
              } z-20 p-1 rounded-full bg-black border border-gray-800 text-gray-400 hover:text-white hover:bg-[#1e1f22] transition-all`}
              title={
                isChannelSidebarCollapsed
                  ? "Expand Channel List"
                  : "Collapse Channel List"
              }
            >
              {isChannelSidebarCollapsed ? (
                <FaAngleRight className="w-6 h-6" />
              ) : (
                <FaAngleLeft className="w-6 h-6" />
              )}
            </button>

            {/* Show voice UI when in voice view mode AND connected to this server's voice channel */}
            {showVoiceUI ? (
              // Voice layout: main VoiceChannel area + right-side member list (Discord-like)
              <div className="flex-1 w-full h-full">
                <div className="flex h-full">
                  {/* Main voice area */}
                  <div className="flex-1 p-4">
                    <VoiceChannel
                      channelId={activeCall.channelId}
                      userId={user.id}
                      onHangUp={handleHangUp}
                      debug={process.env.NODE_ENV === "development"}
                      currentUser={{ username: user.username }}
                      // Pass external manager from context
                      externalManager={manager}
                      externalState={externalState}
                      useExternalManager={true}
                    />
                  </div>

             
                </div>
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
                    localStream={null}
                    remoteStreams={[]}
                    serverId={selectedServerId}
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

const ServersPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-black items-center justify-center">
          <div className="text-white text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ServersPageContent />
    </Suspense>
  );
};

export default ServersPage;



      
          

                 