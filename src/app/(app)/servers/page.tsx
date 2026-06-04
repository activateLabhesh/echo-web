"use client";

export const dynamic = 'force-dynamic';

import React, {
  useState,
  useEffect,
  Suspense,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { usePageReady } from "@/components/RouteChangeLoader";
import FocusLock from "react-focus-lock";
import {
  FaHashtag,
  FaCog,
  FaLock,
  FaShieldAlt,
  FaChevronDown,
  FaChevronRight,
  FaCheckCircle,
  FaPlusCircle,
  FaAngleLeft,
  FaAngleRight,
  FaTrash,
  FaTimes,
  FaVolumeUp,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideoSlash,
} from "react-icons/fa";
import VoiceChannel from "@/components/EnhancedVoiceChannel";
import {
  fetchServers,
  fetchChannelsByServer,
  updateChannel,
  deleteChannel,
} from "@/api";
import {
  getSelfAssignableRoles,
  getMyRoles,
  selfAssignRole,
  selfUnassignRole,
} from "@/api";
import { type Role } from "@/api/types/roles.types";
import Chatwindow from "@/components/ChatWindow";
import NotificationBell from '@/components/NotificationBell';
import { useSearchParams } from "next/navigation";
import { useVoiceCall } from "@/contexts/VoiceCallContext";
import { supabase } from '@/lib/supabaseClient';
import Loader from "@/components/Loader";
import Toast from "@/components/Toast";


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
  const pageReady = usePageReady();
   const [isChannelSidebarCollapsed, setIsChannelSidebarCollapsed] =
     useState(false); 
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");
  const serverIdFromQuery = searchParams.get("serverId");
  const viewModeFromQuery = searchParams.get("view");

  const [showAddMenu, setShowAddMenu] = useState(false);

  const router = useRouter();
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedServerName, setSelectedServerName] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const chatWindowRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Self-assignable roles state
  const [selfAssignableRoles, setSelfAssignableRoles] = useState<Role[]>([]);
  const [myRoles, setMyRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  // View mode: 'voice' shows full voice UI, 'chat' shows text chat (with floating window if in voice)
  const [viewMode, setViewMode] = useState<"voice" | "chat">("chat");
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);
  const [channelSettings, setChannelSettings] = useState<{
    channel: Channel;
    name: string;
  } | null>(null);
  const [isSavingChannel, setIsSavingChannel] = useState(false);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);


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

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  // Should show voice UI: only when in voice view mode AND connected to this server's voice
const showVoiceUI =
  voiceEnabled &&
  viewMode === "voice" &&
  isVoiceActiveForCurrentServer &&
  activeCall;


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

  const user: User = useMemo(() => {
    if (typeof window === "undefined") {
      return {
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
    }

    try {
      const stored = localStorage.getItem("user");
      const defaults: User = {
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
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed && typeof parsed === "object"
        ? { ...defaults, ...parsed }
        : defaults;
    } catch {
      return {
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
    }
  }, []);

 useEffect(() => {
   const loadServers = async () => {
     try {
       setLoading(true);
       

       const data = await fetchServers();
       setServers(data);

       if (data.length > 0) {
         const cachedServerId = localStorage.getItem("currentServerId");

         const preferredServer =
           (serverIdFromQuery
             ? data.find((s: any) => s.id === serverIdFromQuery)
             : null) ||
           (cachedServerId
             ? data.find((s: any) => s.id === cachedServerId)
             : null) ||
           data[0];

         setSelectedServerId(preferredServer.id);
         setSelectedServerName(preferredServer.name);
       }

       setToast(null);
     } catch (err) {
       console.error("Error fetching servers", err);
       setError("Failed to load servers.");
       setToast({ message: "Failed to load servers", type: "error" });
     } finally {
       setLoading(false);
       pageReady();
     }
   };

   loadServers();
 }, [serverIdFromQuery, pageReady]);

  // Handle view mode from query params (when navigating from expand button)
  useEffect(() => {
    if (viewModeFromQuery === "voice") {
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
      setViewMode("voice");
    }
  }, [viewModeFromQuery, activeCall, selectedServerId]);

  // Listen for expandVoiceView custom event from FloatingVoiceWindow
  useEffect(() => {
    const handleExpandVoiceView = (
      event: CustomEvent<{ serverId: string }>
    ) => {
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

  const loadChannelsForServer = useCallback(async (serverId: string) => {
    const { data: controls } = await supabase
      .from("admin_controls")
      .select("voice_enabled")
      .single();

    const isVoiceEnabled = controls?.voice_enabled ?? true;
    setVoiceEnabled(isVoiceEnabled);

    const data: Channel[] = await fetchChannelsByServer(serverId);

    const normalized = (data || []).map((c) => ({
      ...c,
      type: (c.type || "").toLowerCase(),
    }));

    const filteredChannels = isVoiceEnabled
      ? normalized
      : normalized.filter((c) => c.type === "text");

    setChannels(filteredChannels);

    const firstTextChannel = filteredChannels.find((c) => c.type === "text");
    setActiveChannel((prev) => {
      if (prev && filteredChannels.some((c) => c.id === prev.id)) {
        return prev;
      }
      return firstTextChannel || null;
    });

    return filteredChannels;
  }, []);

  useEffect(() => {
    if (!selectedServerId) return;
    const loadChannels = async () => {
      try {
        await loadChannelsForServer(selectedServerId);
      } catch (err) {
        console.error("Error fetching channels", err);
        setError("Failed to load channels");
        setChannels([]);
        setToast({ message: "Failed to load channels", type: "error" });
      }
    };
    loadChannels();
  }, [selectedServerId, myRoles, loadChannelsForServer]);

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
      localStorage.setItem("currentServerId", selectedServerId);
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
  const textChannels = useMemo(
    () => channels.filter((c) => c.type === "text"),
    [channels]
  );

  const voiceChannels = useMemo(
    () => channels.filter((c) => c.type === "voice"),
    [channels]
  );

  const voiceMembers = useMemo(
    () =>
      participants.map((member) => ({
        id: member.attendeeId,
        username:
          member.name ||
          member.oduserId ||
          `User ${member.attendeeId.slice(0, 8)}`,
        muted: member.muted,
        video: member.video,
      })),
    [participants]
  );

  // Handle hang up
  const handleHangUp = () => {
    leaveCall();
    setViewMode("chat"); // Switch back to chat view after hanging up
  };

  const handleJoinVoiceChannel = async (channel: Channel) => {
    if (!selectedServerId) return;

    try {
      setActiveChannel(channel);
      setViewMode("voice");
      await joinCall(
        channel.id,
        channel.name,
        selectedServerId,
        selectedServerName || "Server"
      );
    } catch (err: any) {
      console.error("Error joining voice channel:", err);
      setViewMode("chat");
      setToast({
        message:
          err?.message || "Failed to join voice channel. Please try again.",
        type: "error",
      });
    }
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
      setToast({
        message: err?.response?.data?.error || "Failed to toggle role",
        type: "error",
      });


    }
  };

  const closeChannelSettings = () => {
    if (isSavingChannel || isDeletingChannel) return;
    setChannelSettings(null);
  };

  const handleSaveChannel = async () => {
    if (!selectedServerId || !channelSettings) return;

    const nextName = channelSettings.name.trim();
    if (!nextName) {
      setToast({ message: "Channel name cannot be empty", type: "error" });
      return;
    }
        
    if (nextName.length > 20) {
      setToast({
        message: "Channel name cannot exceed 20 characters",
        type: "error",
      });
      return;
    }

    setIsSavingChannel(true);
    try {
      await updateChannel(selectedServerId, channelSettings.channel.id, {
        name: nextName,
      });

      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelSettings.channel.id
            ? { ...channel, name: nextName }
            : channel
        )
      );
      setActiveChannel((prev) =>
        prev?.id === channelSettings.channel.id
          ? { ...prev, name: nextName }
          : prev
      );
      setChannelSettings(null);
      setToast({ message: "Channel updated", type: "success" });
    } catch (err: any) {
      console.error("Error updating channel:", err);
      setToast({
        message:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to update channel",
        type: "error",
      });
    } finally {
      setIsSavingChannel(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!selectedServerId || !channelSettings) return;

    setIsDeletingChannel(true);
    try {
      await deleteChannel(selectedServerId, channelSettings.channel.id);

      const remainingChannels = channels.filter(
        (channel) => channel.id !== channelSettings.channel.id
      );
      setChannels(remainingChannels);
      setActiveChannel((prev) => {
        if (prev?.id !== channelSettings.channel.id) return prev;
        return (
          remainingChannels.find((channel) => channel.type === "text") || null
        );
      });
      setChannelSettings(null);
      setToast({ message: "Channel deleted", type: "success" });
    } catch (err: any) {
      console.error("Error deleting channel:", err);
      setToast({
        message:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to delete channel",
        type: "error",
      });
    } finally {
      setIsDeletingChannel(false);
    }
  };

  // Build external state for EnhancedVoiceChannel
  const externalState = useMemo(
    () => ({
      participants,
      localMediaState,
      localVideoTileId,
      videoTiles,
      isConnected,
      isConnecting,
      permissionError,
      connectionError,
    }),
    [
      participants,
      localMediaState,
      localVideoTileId,
      videoTiles,
      isConnected,
      isConnecting,
      permissionError,
      connectionError,
    ]
  );

  return (
    <>
      {toast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={3000}
            onClose={() => setToast(null)}
          />
        </div>
      )}
      {channelSettings && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 px-4"
          onClick={closeChannelSettings}
        >
          <FocusLock>
          <div
            className="w-full max-w-md rounded-lg border border-gray-800 bg-[#1e1f22] p-5 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Channel Settings</h2>
                <p className="text-xs text-gray-400">
                  #{channelSettings.channel.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeChannelSettings}
                className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-[#2f3136] hover:text-white"
                aria-label="Close channel settings"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-xs font-bold uppercase text-gray-400">
              Channel Name
            </label>
            <input
              value={channelSettings.name}
              onChange={(event) =>
                setChannelSettings((prev) =>
                  prev ? { ...prev, name: event.target.value } : prev
                )
              }
              className="mt-2 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500"
              placeholder="channel-name"
              disabled={isSavingChannel || isDeletingChannel}
            />

            <div className="mt-6 border-t border-gray-800 pt-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-red-300">
                  Delete Channel
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  This removes the channel from this server.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteChannel}
                disabled={isSavingChannel || isDeletingChannel}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaTrash className="h-3.5 w-3.5" />
                {isDeletingChannel ? "Deleting..." : "Delete Channel"}
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeChannelSettings}
                disabled={isSavingChannel || isDeletingChannel}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-[#2f3136] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChannel}
                disabled={isSavingChannel || isDeletingChannel}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingChannel ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
          </FocusLock>
        </div>
      )}
      <div className="relative flex h-screen z-0 bg-black select-none">
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
                className={`w-12 h-12 rounded-full hover:scale-105 transition-transform cursor-pointer shadow-[0_0_18px_rgba(0,0,0,0.4)] ${
                  selectedServerId === server.id ? "ring-2 ring-white" : ""
                }`}
                onClick={() => {
                  setSelectedServerId(server.id);
                  setSelectedServerName(server.name);
                }}
              />
            ))
          )}

          <div className="relative bottom-0">
            <div className="relative group">
              {/* Add Server button hidden for now
              <button
                className="w-12 h-12 px-1 flex items-center justify-center rounded-full bg-gray-900 text-yellow-300 hover:bg-yellow-500 hover:text-white transition-all text-3xl font-bold"
                onClick={() => setShowAddMenu((prev) => !prev)}
                aria-label="Add server"
              >
                +
              </button>
              */}

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
                  {/*  <button
                    onClick={() => {
                      router.push("/create-server");
                      setShowAddMenu(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded hover:bg-[#2f3136] transition"
                  >
                    Create Server
                  </button> */}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="relative flex-1 flex">
            {/* Channel sidebar skeleton */}
            <div className="w-60 shrink-0 flex flex-col border-r border-slate-800/50 p-3 bg-black">
              <div className="h-5 w-32 rounded bg-slate-800/70 animate-pulse mb-4" />
              <div className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-slate-800/50 animate-pulse mb-2" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 rounded-md bg-slate-800/40 animate-pulse"
                  />
                ))}
                <div className="h-3 w-24 rounded bg-slate-800/50 animate-pulse mt-4 mb-2" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 rounded-md bg-slate-800/40 animate-pulse"
                  />
                ))}
              </div>
            </div>
            {/* Chat area skeleton */}
            <div className="flex-1 flex flex-col bg-black">
              <div className="h-14 border-b border-slate-800/50 flex items-center px-4 gap-3">
                <div className="h-4 w-4 rounded bg-slate-800/50 animate-pulse" />
                <div className="h-4 w-28 rounded bg-slate-800/60 animate-pulse" />
              </div>
              <div className="flex-1 p-4 space-y-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-800/50 animate-pulse shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-24 rounded bg-slate-800/60 animate-pulse" />
                        <div className="h-3 w-12 rounded bg-slate-800/30 animate-pulse" />
                      </div>
                      <div className="h-3.5 rounded bg-slate-800/40 animate-pulse w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-16 border-t border-slate-800/50 px-4 flex items-center">
                <div className="flex-1 h-10 rounded-lg bg-slate-800/40 animate-pulse" />
              </div>
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
            <div
              className={`h-auto shrink-0 overflow-y-auto text-white border-r border-gray-800 bg-black/95 backdrop-blur-[2px] scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-800 overflow-hidden transition-all duration-500 ease-in-out ${
                isChannelSidebarCollapsed ? "w-0" : "w-72"
              }`}
            >
              <div
                className={`px-2 py-4 space-y-4 transition-opacity duration-200 ${
                  isChannelSidebarCollapsed
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                }`}
              >
                <div className="flex items-center justify-between px-2 mb-2">
                  <h2 className="text-xl font-bold">{selectedServerName}</h2>
                  <div className="flex items-center gap-2">
                    <NotificationBell
                      onNavigateToMessage={async (channelId, messageId) => {
                        // Parent-level navigation handler
                        // If target channel is different, switch to it
                        const targetChannel = channels.find(
                          (c) => c.id === channelId
                        );
                        if (targetChannel) {
                          setActiveChannel(targetChannel);
                          setViewMode("chat");
                        }

                        // Wait a tick for chat window to mount and load initial messages
                        await new Promise((r) => setTimeout(r, 250));

                        // Try to scroll to message; if not found, paginate older messages up to a limit
                        const MAX_PAGES = 8;
                        let found = false;
                        for (let i = 0; i <= MAX_PAGES && !found; i++) {
                          // Attempt to scroll
                          if (chatWindowRef.current) {
                            const scrolled =
                              await chatWindowRef.current.scrollToMessage(
                                messageId
                              );
                            if (scrolled) {
                              found = true;
                              break;
                            }
                          }

                          // If not found, load older messages if available
                          if (chatWindowRef.current) {
                            const loaded =
                              await chatWindowRef.current.loadOlderPages(1);
                            if (!loaded) break; // no more pages
                          } else {
                            break;
                          }

                          // small delay to allow DOM update
                          await new Promise((r) => setTimeout(r, 200));
                        }

                        if (!found) {
                          // fallback: open channel and scroll to bottom
                          // ensure chat window is visible
                          setViewMode("chat");
                          setTimeout(() => {
                            if (chatWindowRef.current)
                              chatWindowRef.current.scrollToMessage("last");
                          }, 300);
                        }
                      }}
                    />
                    <button
                      className={`p-2 rounded-full transition ${
                        !selectedServerId ? "opacity-50" : "hover:bg-[#23272a]"
                      }`}
                      title="Server Settings"
                      onClick={() => {
                        
                        const targetId =
                          selectedServerId ||
                          searchParams.get("serverId") ||
                          (servers.length > 0 ? servers[0].id : null);

                        if (targetId) {
                          localStorage.setItem("currentServerId", targetId);
                          router.push(`/server-settings?serverId=${targetId}`);
                        } else {
                          // This will now only show if the 'servers' array is literally empty
                          alert("Please select a server first");
                        }
                      }}
                    >
                      <FaCog className="w-5 h-5 text-[#b5bac1] hover:text-white" />
                    </button>
                  </div>
                </div>
                {selfAssignableRoles.length > 0 && (
                  <div className="px-2 mt-4 transition-all duration-300 ease-out">
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-[#2f3136] rounded-md p-2 transition-all duration-500 ease-out"
                      onClick={() => setShowRoles(!showRoles)}
                    >
                      <h3 className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                        <FaShieldAlt size={12} />
                        Self Assign Roles
                      </h3>
                      <span className="text-gray-400 text-xs flex items-center gap-1 transition-all duration-500 ease-out">
                        {showRoles ? (
                          <FaChevronDown className="w-3 h-3" />
                        ) : (
                          <FaChevronRight className="w-3 h-3" />
                        )}
                      </span>
                    </div>

                    <div
                      className={`mt-2 space-y-2 overflow-hidden transition-all duration-500 ease-in-out ${
                        showRoles
                          ? "max-h-96 opacity-100"
                          : "max-h-0 opacity-0 pointer-events-none"
                      }`}
                    >
                      {rolesLoading ? (
                        <div className="text-xs text-gray-400 text-center py-2">
                          Loading...
                        </div>
                      ) : (
                        <>
                          {/* My Active Roles Section */}
                          {myRoles.filter((r) =>
                            selfAssignableRoles.some((sr) => sr.id === r.id)
                          ).length > 0 && (
                            <div className="mb-3">
                              <div className="text-[10px] font-semibold uppercase text-gray-500 mb-1 px-1 flex items-center gap-1">
                                <FaCheckCircle className="w-3 h-3 text-green-400" />
                                Your Roles (
                                {
                                  myRoles.filter((r) =>
                                    selfAssignableRoles.some(
                                      (sr) => sr.id === r.id
                                    )
                                  ).length
                                }
                                )
                              </div>
                              <div className="space-y-1">
                                {selfAssignableRoles
                                  .filter((role) =>
                                    myRoles.some((r) => r.id === role.id)
                                  )
                                  .map((role) => (
                                    <div
                                      key={role.id}
                                      className="flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200 ease-out bg-[#2f3136] hover:bg-[#36393f] border border-green-500/20 hover:translate-x-0.5"
                                      onClick={() => handleRoleToggle(role.id)}
                                    >
                                      <span className="flex items-center gap-2 flex-1 min-w-0">
                                        <div
                                          className="w-3 h-3 rounded-full flex-shrink-0"
                                          style={{
                                            backgroundColor:
                                              role.color || "#5865f2",
                                          }}
                                        />
                                        <span className="text-sm text-white truncate">
                                          {role.name}
                                        </span>
                                      </span>
                                      <FaCheckCircle className="text-green-400 w-4 h-4 ml-2 flex-shrink-0" />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Available Roles Section */}
                          {selfAssignableRoles.filter(
                            (role) => !myRoles.some((r) => r.id === role.id)
                          ).length > 0 && (
                            <div>
                              <div className="text-[10px] font-semibold uppercase text-gray-500 mb-1 px-1 flex items-center gap-1">
                                <FaPlusCircle className="w-3 h-3 text-blue-400" />
                                Available to Join (
                                {
                                  selfAssignableRoles.filter(
                                    (role) =>
                                      !myRoles.some((r) => r.id === role.id)
                                  ).length
                                }
                                )
                              </div>
                              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                {selfAssignableRoles
                                  .filter(
                                    (role) =>
                                      !myRoles.some((r) => r.id === role.id)
                                  )
                                  .map((role) => (
                                    <div
                                      key={role.id}
                                      className="flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200 ease-out text-gray-400 hover:bg-[#2f3136] hover:text-white border border-transparent hover:border-gray-600 hover:translate-x-0.5"
                                      onClick={() => handleRoleToggle(role.id)}
                                    >
                                      <span className="flex items-center gap-2 flex-1 min-w-0">
                                        <div
                                          className="w-3 h-3 rounded-full flex-shrink-0 opacity-60"
                                          style={{
                                            backgroundColor:
                                              role.color || "#5865f2",
                                          }}
                                        />
                                        <span className="text-sm truncate">
                                          {role.name}
                                        </span>
                                      </span>
                                      <FaPlusCircle className="text-blue-400 w-4 h-4 ml-2 flex-shrink-0" />
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
                  </div>
                )}
                <div className="px-2">
                  <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">
                    Text Channels
                  </h3>
                  {textChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className={`group/channel flex items-center justify-between p-2 text-sm rounded-md cursor-pointer transition-all min-w-0 ${
                        activeChannel?.id === channel.id && viewMode === "chat"
                          ? "bg-[#2f3136] text-white"
                          : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
                      }`}
                      onClick={() => {
                        setActiveChannel(channel);
                        setViewMode("chat");
                      }}
                    >
                      <span className="flex items-center gap-2 flex-1 min-w-0">
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
                        <span className="block min-w-0 break-all whitespace-pre-wrap [overflow-wrap:anywhere] leading-tight">
                          {channel.name}
                        </span>
                      </span>
                      <button
                        type="button"
                        title="Channel Settings"
                        aria-label={`Settings for ${channel.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setChannelSettings({
                            channel,
                            name: channel.name,
                          });
                        }}
                        className={`ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-gray-400 transition hover:bg-[#1e1f22] hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          activeChannel?.id === channel.id &&
                          viewMode === "chat"
                            ? "opacity-100"
                            : "opacity-0 group-hover/channel:opacity-100"
                        }`}
                      >
                        <FaCog className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                  <div className="px-2">
                <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">
                  Voice Channels
                </h3>
{voiceChannels.map((channel) => {
  const isActive = activeCall?.channelId === channel.id;

  return (
    <div key={channel.id} className="space-y-1">
      <div
        className={`flex items-center justify-between p-2 text-sm rounded-md transition-all ${
          isActive && viewMode === "voice"
            ? "bg-[#2f3136] text-white"
            : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
        } ${isActive ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        onClick={() => {
          if (isActive) return;
          handleJoinVoiceChannel(channel);
        }}
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


                {isVoiceActiveForCurrentServer && activeCall && (
                  <div className="mt-auto p-2">
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
            </div>

            <div className="flex-1 min-w-0 relative text-white bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12)_0%,rgba(0,0,0,1)_65%)] flex flex-col">
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
                  <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 rounded-lg">
                    <Chatwindow
                      ref={chatWindowRef}
                      channelId={activeChannel.id}
                      isDM={false}
                      currentUserId={user.id}
                      localStream={null}
                      remoteStreams={[]}
                      serverId={selectedServerId ?? undefined}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <h2 className="text-2xl text-gray-400"></h2>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

const ServersPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-black items-center justify-center">
          <div className="text-white text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            
          </div>
        </div>
      }
    >
      <ServersPageContent />
    </Suspense>
    
  );
};

export default ServersPage;



      
          

                 
