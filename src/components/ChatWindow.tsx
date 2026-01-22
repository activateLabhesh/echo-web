"use client";

import React, { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import MessageInput from "./MessageInput";
import MessageInputWithMentions from "./MessageInputWithMentions";
import MessageContentWithMentions from "./MessageContentWithMentions";
import MessageAttachment from "./MessageAttachment";
import { fetchMessages, uploadMessage } from "@/api/message.api";
import { getUserAvatar, getUser } from "@/api/profile.api";
import { getChannelPermissions } from "@/api/channel.api";
import { createAuthSocket } from "@/socket";
import MessageBubble from "./MessageBubble";
import Toast from "@/components/Toast";
import { ChevronDown } from "lucide-react";
import { apiClient } from "@/utils/apiClient";

// Dynamic imports for heavy components that are conditionally rendered
const VideoPanel = dynamic(() => import("./VideoPanel"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full" />
    </div>
  ),
});

const UserProfileModal = dynamic(() => import("./UserProfileModal"), {
  ssr: false,
});

interface Message {
  id: string | number;
  content: string;
  senderId: string;
  timestamp: string;
  avatarUrl?: string;
  username?: string;
  file?: string;
  mediaUrl?: string;
  replyTo?: {
    id: string | number;
    content: string;
    author: string;
    avatarUrl?: string;
  } | null;
}

interface ChatWindowProps {
  channelId: string;
  isDM: boolean;
  currentUserId: string;
  localStream?: MediaStream | null;
  remoteStreams?: { id: string; stream: MediaStream }[];
  serverId?: string;
}

interface ChannelPermissions {
  channelType: string;
  canView: boolean;
  canSend: boolean;
  isAdmin: boolean;
  isModerator: boolean;
}

export default forwardRef(function ChatWindow(
  {
    channelId,
    currentUserId,
    localStream = null,
    remoteStreams = [],
    serverId,
  }: ChatWindowProps,
  ref
) {
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const validUsernamesRef = useRef<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const usernamesRef = useRef<Record<string, string>>({});
 const avatarCacheRef = useRef<
   Record<string, { url: string; updatedAt: number }>
 >({});

  const [micOn, setMicOn] = useState<boolean>(true);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>("/User_profil.png");
  const isLoadingMoreRef = useRef(false);
  const channelIdRef = useRef(channelId); // Add ref to track current channel
  const receivedMessageIdsRef = useRef<Set<string | number>>(new Set()); // Persistent message ID tracking
  const offsetRef = useRef(0); // Track offset in ref to prevent unnecessary callback recreation
  const [serverRoles, setServerRoles] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [channelPermissions, setChannelPermissions] = useState<ChannelPermissions | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<{
    open: boolean;
    role: string;
    users: { id: string; username: string; avatarUrl: string }[];
  }>({
    open: false,
    role: "",
    users: [],
  });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isInitialLoadRef = useRef(true);
  const lastProcessedMessageIdRef = useRef<string | number | null>(null);
  const isScrollingToMentionRef = useRef(false);
  const hasMountedRef = useRef(false);
  const hasScrolledForChannelRef = useRef<string | null>(null);

  // Fetch unread mentions for a specific channel
  const fetchChannelUnreadMentions = async (chId: string, userId: string) => {
    const response = await apiClient.get(
      `/api/mentions?userId=${userId}&unreadOnly=true&channelId=${chId}`
    );
    return response.data || [];
  };

  // Mark all mentions as read for a channel
  const markAllChannelMentionsAsRead = async (mentionIds: string[]) => {
    await Promise.all(
      mentionIds.map((id) => apiClient.patch(`/api/mentions/${id}/read`))
    );
  };

  // Expose imperative methods to parent via ref
  useImperativeHandle(ref, () => ({
    async scrollToMessage(messageId: string, options: { highlightDuration?: number } = { highlightDuration: 1500 }) {
      isScrollingToMentionRef.current = true;

      const tryFindAndScroll = (attempt: number): Promise<boolean> => {
        return new Promise((resolve) => {
          const el = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null;
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("mention-highlight");
            setTimeout(() => el.classList.remove("mention-highlight"), options.highlightDuration || 1500);
            setTimeout(() => {
              isScrollingToMentionRef.current = false;
              resolve(true);
            }, 500);
          } else if (attempt < 6) {
            const delay = 100 * Math.pow(2, attempt);
            setTimeout(() => resolve(tryFindAndScroll(attempt + 1)), delay);
          } else {
            isScrollingToMentionRef.current = false;
            resolve(false);
          }
        });
      };

      return tryFindAndScroll(0);
    },

    async loadOlderPages(limitPages = 1) {
      if (!hasMore) return false;
      for (let i = 0; i < limitPages; i++) {
        const previousScrollHeight = messagesContainerRef.current?.scrollHeight || 0;
        await loadMessages(true);
        await new Promise((r) => setTimeout(r, 60));
        if (!hasMore) break;
      }
      return true;
    },

    scrollToBottom() {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return true;
    }
  }));

  // Update ref whenever channelId changes
  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  const handleReply = (message: Message) => {
    console.log("Reply clicked for:", message);
    setReplyingTo(message);
  };
const [currentUserRoleIds, setCurrentUserRoleIds] = useState<string[]>([]);
const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>({});

const isMessageMentioningMe = useCallback(
  (content: string) => {
    if (!content) return false;

    const lower = content.toLowerCase();


    if (/@(everyone|here)\b/.test(lower)) {
      return true;
    }

   
    if (currentUsername) {
      const userRegex = new RegExp(`@${currentUsername}\\b`, "i");
      if (userRegex.test(content)) return true;
    }

    
    for (const roleId of currentUserRoleIds) {
      const role = serverRoles.find((r) => r.id === roleId);
      if (!role) continue;

      const roleRegex = new RegExp(`@&${role.name}\\b`, "i");
      if (roleRegex.test(content)) return true;
    }

    return false;
  },
  [currentUsername, currentUserRoleIds, serverRoles]
);
const hasMentionInHistoryRef = useRef(false);
const hasScrolledToMentionRef = useRef(false);
const userHasScrolledRef = useRef(false);
const isValidUsernameMention = (mention: string) => {
  const name = mention.replace("@", "").toLowerCase();

  if (name === "everyone" || name === "here") return true;

  return validUsernamesRef.current.has(name);
};

useEffect(() => {
  const set = new Set<string>();

  messages.forEach((m) => {
    if (m.username && m.username !== "You") {
      set.add(m.username.toLowerCase());
    }
  });

  if (currentUsername) {
    set.add(currentUsername.toLowerCase());
  }

  validUsernamesRef.current = set;
}, [messages, currentUsername]);

useEffect(() => {
  const mentionExists = messages.some(
    (m) => m.senderId !== currentUserId && isMessageMentioningMe(m.content)
  );

  hasMentionInHistoryRef.current = mentionExists;

 
  if (!mentionExists) {
    hasScrolledToMentionRef.current = false;
    userHasScrolledRef.current = false;
  }
}, [messages, currentUserId, isMessageMentioningMe]);



  // Fetch channel permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!channelId || !serverId) return;
      
      try {
        const permissions = await getChannelPermissions(channelId);
        setChannelPermissions(permissions);
        setPermissionError(null);
      } catch (err: any) {
        console.error("Error fetching channel permissions:", err);
        // If error, assume normal permissions
        setChannelPermissions({
          channelType: "normal",
          canView: true,
          canSend: true,
          isAdmin: false,
          isModerator: false,
        });
      }
    };
    
    fetchPermissions();
  }, [channelId, serverId]);

  useEffect(() => {
  if (!serverId) return;
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/newserver/${serverId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setServerRoles(data.roles || []);
    } catch (err) {
      setServerRoles([]);
    }
  };
  fetchRoles();
}, [serverId]);

 
useEffect(() => {
  const loadCurrentUserAvatar = async () => {
    try {
      const user = await getUser();
      if (!user?.avatar_url) return;

      const freshUrl = `${user.avatar_url}?t=${Date.now()}`;

      setCurrentUserAvatar(freshUrl);

     
      avatarCacheRef.current[currentUserId] = {
        url: freshUrl,
        updatedAt: Date.now(),
      };

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.senderId === currentUserId ? { ...msg, avatarUrl: freshUrl } : msg
        )
      );
    } catch (error) {
      console.error("Failed to load current user's avatar:", error);
    }
  };

  if (currentUserId) {
    loadCurrentUserAvatar();
  }
}, [currentUserId]);

useEffect(() => {
  if (!currentUserId) return;

  const syncMyAvatar = async () => {
    try {
      const user = await getUser();
      if (!user?.avatar_url) return;

      const freshUrl = `${user.avatar_url}?t=${Date.now()}`;

      avatarCacheRef.current[currentUserId] = {
        url: freshUrl,
        updatedAt: Date.now(),
      };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === currentUserId ? { ...msg, avatarUrl: freshUrl } : msg
        )
      );
    } catch (err) {
      console.error("Failed to sync avatar", err);
    }
  };

  syncMyAvatar();
}, [currentUserId]);

  // Function to get user avatar with caching
  const getAvatarUrl = async (userId: string): Promise<string> => {
    const cached = avatarCacheRef.current[userId];

    // cache valid for 5 minutes only
    if (cached && Date.now() - cached.updatedAt < 5 * 60 * 1000) {
      return cached.url;
    }

    try {
      const avatarUrl = await getUserAvatar(userId);
      const finalUrl = avatarUrl || "/User_profil.png";

      avatarCacheRef.current[userId] = {
        url: `${finalUrl}?t=${Date.now()}`, // 🔥 cache bust
        updatedAt: Date.now(),
      };

      return avatarCacheRef.current[userId].url;
    } catch {
      return "/User_profil.png";
    }
  };

  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
    roles?: string[];
  } | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const openProfile = useCallback(async (msg: Message) => {
    if (!msg.senderId) return;

    // console.log("Opening profile for user:", msg.senderId, "in server:", serverId);

    // Set basic user info first
    setSelectedUser({
      id: msg.senderId,
      username: msg.username || "Unknown",
      avatarUrl: msg.avatarUrl || "/User_profil.png",
      about: "Loading bio...",
      roles: [],
    });
    setIsProfileOpen(true);

    // Fetch user details including roles
    try {
      const token = localStorage.getItem("access_token");
      if (!token || !serverId) {
        console.error("Missing token or serverId:", { token: !!token, serverId });
        return;
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/newserver/${serverId}/members/${msg.senderId}`;
      // console.log("Fetching member data from:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // console.log("Response status:", response.status);

     if (!response.ok) {
       // ⚠️ User not found in this server (normal case, non-blocking)
       console.warn("Member not found in server (non-blocking):", msg.senderId);
       return; // ⬅️ IMPORTANT: stop here, keep basic profile
     }

     const memberData = await response.json();

     // Update with full user details including roles
     setSelectedUser({
       id: msg.senderId,
       username: msg.username || "Unknown",
       avatarUrl: msg.avatarUrl || "/User_profil.png",
       about: memberData.user?.bio || "No bio yet...",
       roles: memberData.roles?.map((role: any) => role.name) || [],
     });

    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  }, [serverId]);

 const handleUsernameClick = useCallback(
   async (userId: string, username: string) => {
     // Try to find an existing message for richer data
     const existingMessage = messages.find(
       (msg) => msg.senderId === userId || msg.username === username
     );

     let mockMessage: Message;

     if (existingMessage) {
       mockMessage = existingMessage;
     } else {
       mockMessage = {
         id: `temp-${userId}`,
         content: "",
         senderId: userId,
         timestamp: new Date().toISOString(),
         username,
         avatarUrl: avatarCacheRef.current[userId]?.url || "/User_profil.png",
       };
     }

     await openProfile(mockMessage);
   },
   [messages, openProfile]
 );

  const handleRoleMentionClick = useCallback(async (roleName: string) => {
  if (!serverId) return;

  try {
    // Fetch all users with this role from your backend
    const token = localStorage.getItem("access_token");
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/newserver/${serverId}/roles/${encodeURIComponent(roleName.trim())}/members`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users for role: ${roleName}`);
    }

    const data = await response.json();
    // Assume data.users is an array of { id, username, avatarUrl }
    setRoleModal({
      open: true,
      role: roleName,
      users: data.users || [],
    });
  } catch (err) {
    console.error("Error fetching users for role:", err);
    setRoleModal({
      open: true,
      role: roleName,
      users: [],
    });
  }
}, [serverId]);
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getUser();

        if (user?.username) {
          setCurrentUsername(user.username);
        }
      } catch (err) {
        console.error("Failed to load current user", err);
      }
    };

    loadCurrentUser();
  }, []);
useEffect(() => {
  if (!serverId || !currentUserId) return;

  const loadMyServerRoles = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/newserver/${serverId}/members/${currentUserId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) return;

      const data = await res.json();

      
      setCurrentUserRoleIds(data.roles?.map((r: any) => r.id) || []);
    } catch (err) {
      console.error("Failed to load my server roles", err);
    }
  };

  loadMyServerRoles();
}, [serverId, currentUserId]);


  useEffect(() => {
    const newSocket = createAuthSocket(currentUserId);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId]);

const loadMessages = useCallback(async (loadMore: boolean = false, abortSignal?: AbortSignal) => {
  try {
    if (loadMore) {
      setLoadingMore(true);
      isLoadingMoreRef.current = true;
    } else {
      setLoadingMessages(true);
      offsetRef.current = 0; // Reset offset ref
      setOffset(0);
      isLoadingMoreRef.current = false;
    }

    const currentOffset = loadMore ? offsetRef.current : 0;
    
    // Check if request was cancelled
    if (abortSignal?.aborted) {
      return;
    }
    
    // Use channelIdRef.current to always get the latest channel ID
    const currentChannelId = channelIdRef.current;
    
    // Fetch messages for the CURRENT channel
    const res = await fetchMessages(currentChannelId, currentOffset);

    // Check again after async operation - verify we're still on the same channel
    if (abortSignal?.aborted || channelIdRef.current !== currentChannelId) {
      console.log(`Fetch completed for ${currentChannelId} but current channel is ${channelIdRef.current}, ignoring`);
      return;
    }

    const formattedMessages: Message[] = await Promise.all(
      res.data.map(async (msg: any) => {
        const senderId = msg.sender_id || msg.senderId;
        const avatarUrl = await getAvatarUrl(senderId);

        // Add replyTo using backend-provided reply_to_message
        let replyTo = null;
        if (msg.reply_to_message) {
          replyTo = {
            id: msg.reply_to_message.id,
            content: msg.reply_to_message.content,
            author: msg.reply_to_message.users?.username || "Unknown",
            avatarUrl: msg.reply_to_message.users?.avatar_url || "/User_profil.png",
          };
        }

        return {
          id: msg.id,
          content: msg.content || msg.message,
          senderId,
          timestamp: msg.timestamp || new Date().toISOString(),
          avatarUrl,
          username:
            senderId === currentUserId
              ? "You"
              : msg.username ||
                msg.sender?.username ||
                msg.sender?.fullname ||
                msg.sender_name ||
                "Unknown",
          mediaUrl: msg.media_url || msg.mediaUrl,
          replyTo, // <-- add this
        };
      })
    );

    // Final check before updating state - CRITICAL: verify channel hasn't changed
    if (abortSignal?.aborted || channelIdRef.current !== currentChannelId) {
      console.log(`Message processing completed for ${currentChannelId} but current channel is ${channelIdRef.current}, ignoring`);
      return;
    }

    const sorted = formattedMessages.reverse();

    if (loadMore) {
      // When loading more, deduplicate by message ID
      setMessages(prev => {
        const existingIds = new Set(prev.map(msg => msg.id));
        const newMessages = sorted.filter(msg => !existingIds.has(msg.id));
        return [...newMessages, ...prev];
      });
      const newOffset = offsetRef.current + res.data.length;
      offsetRef.current = newOffset;
      setOffset(newOffset);
    } else {
      // Initial load - just set the messages
      setMessages(sorted);
      offsetRef.current = res.data.length;
      setOffset(res.data.length);
      
      // Mark all loaded message IDs as received to prevent socket duplicates
      sorted.forEach(msg => {
        if (msg.id) {
          receivedMessageIdsRef.current.add(msg.id);
        }
      });
    }

    setHasMore(res.hasMore ?? false);
  } catch (err) {
    console.error("Failed to fetch messages", err);
  } finally {
    setLoadingMessages(false);
    setLoadingMore(false);
  }
}, [currentUserId]); // REMOVED both channelId and offset - using refs instead!

  useEffect(() => {
    // Reset scroll tracking on channel change
    hasScrolledForChannelRef.current = null;
    
    // Immediately clear messages when channel changes to prevent showing old messages
    setMessages([]);
    setOffset(0);
    offsetRef.current = 0; // Reset offset ref
    setHasMore(true);
    receivedMessageIdsRef.current.clear(); // Clear received IDs for new channel
    
    // Create abort controller for this channel's fetch
    const abortController = new AbortController();
    
    if (channelId) {
      loadMessages(false, abortController.signal);
    }
    
    // Cleanup: abort fetch if channel changes before completion
    return () => {
      abortController.abort();
    };
  }, [channelId, loadMessages]);

  // Auto-scroll to first unread mention when channel loads
  useEffect(() => {
    // Skip if still loading messages
    if (loadingMessages) return;
    // Skip if no channel or user
    if (!channelId || !currentUserId) return;
    // Skip if we already scrolled for this channel
    if (hasScrolledForChannelRef.current === channelId) return;

    const handleAutoScroll = async () => {
      try {
        // Mark that we're handling this channel
        hasScrolledForChannelRef.current = channelId;
        isScrollingToMentionRef.current = true;

        // Fetch unread mentions for this channel
        const mentions = await fetchChannelUnreadMentions(channelId, currentUserId);

        if (!mentions || mentions.length === 0) {
          // No unread mentions → scroll to bottom (last message)
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          isScrollingToMentionRef.current = false;
          return;
        }

        // Get the first (oldest) unread mention
        // API returns DESC order (newest first), so oldest is last
        const firstMention = mentions[mentions.length - 1];
        const messageId = firstMention.message_id;

        // Try to scroll to the message
        let scrolled = false;
        let el = document.querySelector(`[data-message-id="${messageId}"]`);

        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("mention-highlight");
          setTimeout(() => el?.classList.remove("mention-highlight"), 1500);
          scrolled = true;
        } else {
          // Message not in current view - load older pages
          for (let i = 0; i < 8 && !scrolled; i++) {
            await loadMessages(true);
            await new Promise((r) => setTimeout(r, 100));

            el = document.querySelector(`[data-message-id="${messageId}"]`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("mention-highlight");
              setTimeout(() => el?.classList.remove("mention-highlight"), 1500);
              scrolled = true;
            }
            if (!hasMore) break;
          }
        }

        // Fallback: scroll to bottom if message still not found
        if (!scrolled) {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }

        // Mark ALL unread mentions in this channel as read
        const mentionIds = mentions.map((m: any) => m.id);
        await markAllChannelMentionsAsRead(mentionIds);
      } catch (error) {
        console.error("Failed to auto-scroll to mention:", error);
        // Fallback to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      } finally {
        isScrollingToMentionRef.current = false;
      }
    };

    handleAutoScroll();
  }, [loadingMessages, channelId, currentUserId, hasMore]);

  // Handle scroll to load more messages when scrolling to top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;

    // Mark that user has manually scrolled
    userHasScrolledRef.current = true;

    // Check if user scrolled to bottom (within 50px)
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;

    // If user scrolled to bottom, mark mentions as read
    if (isAtBottom) {
      hasScrolledToMentionRef.current = true;
    }

    // Load more when scrolled near the top (within 100px)
    if (container.scrollTop < 100) {
      const previousScrollHeight = container.scrollHeight;
      loadMessages(true).then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop =
              newScrollHeight - previousScrollHeight;
          }
        });
      });
    }
  }, [loadingMore, hasMore, loadMessages]);
 useEffect(() => {
   // Wait until username is known
   if (!currentUsername) return;

   const container = messagesContainerRef.current;
   if (!container) return;

   // If no mentions exist, scroll to bottom
   if (!hasMentionInHistoryRef.current) {
     messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
     hasScrolledToMentionRef.current = false;
     userHasScrolledRef.current = false;
     return;
   }

   // If user has manually scrolled OR we've already auto-scrolled to mention, don't auto-scroll again
   if (hasScrolledToMentionRef.current || userHasScrolledRef.current) {
     return;
   }

   // Find the first mention
   const target = messages.find(
     (m) => m.senderId !== currentUserId && isMessageMentioningMe(m.content)
   );

   if (!target) {
     messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
     return;
   }

   const el = messageRefs.current[target.id];
   if (el) {
     el.scrollIntoView({
       behavior: "smooth",
       block: "center",
     });
     // Mark that we've auto-scrolled to mention
     hasScrolledToMentionRef.current = true;
   }
 }, [messages, currentUsername, currentUserId, isMessageMentioningMe]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => (t.enabled = micOn));
  }, [localStream, micOn]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => (t.enabled = camOn));
  }, [localStream, camOn]);

  
useEffect(() => {
 
  const hasUnreadMentions =
    hasMentionInHistoryRef.current &&
    !hasScrolledToMentionRef.current &&
    !userHasScrolledRef.current;

  if (!isLoadingMoreRef.current && !hasUnreadMentions) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  isLoadingMoreRef.current = false;
}, [messages]);
hasScrolledToMentionRef.current = false;
userHasScrolledRef.current = false;

  useEffect(() => {
    if (!socket || !channelId) return;
    
    // Join the new room
    socket.emit("join_room", channelId);
    console.log(`Joined room: ${channelId}`);
    
    // Cleanup: leave the room when channelId changes or component unmounts
    return () => {
      socket.emit("leave_room", channelId);
      console.log(`Left room: ${channelId}`);
    };
  }, [socket, channelId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => {
      // Re-join current room on reconnect
      if (channelId) {
        socket.emit("join_room", channelId);
        console.log(`Reconnected and joined room: ${channelId}`);
      }
    });
    
    socket.on('connect_error', (error: Error) => {
      console.error('💔 Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    const pingInterval = setInterval(() => {
      if (!socket.connected) {
        socket.connect();
      }
    }, 5000);

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      clearInterval(pingInterval);
    };
  }, [socket, channelId]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = async (saved: any) => {
      
      const messageId = saved?.id || saved?.messageId;
      
      // Reject messages without proper ID (don't use Date.now() as fallback)
      if (!messageId) {
        console.warn("Received message without ID, ignoring:", saved);
        return;
      }
      
      // Use ref to check current channel, not the stale closure value
      if (saved?.channel_id && saved.channel_id !== channelIdRef.current) {
        console.log(`Ignoring message from channel ${saved.channel_id}, current channel is ${channelIdRef.current}`);
        return;
      }

      // Check if we already processed this message ID
      if (receivedMessageIdsRef.current.has(messageId)) {
        console.log(`Duplicate message detected (ID: ${messageId}), ignoring`);
        return;
      }


      const isMentioned = 
          saved?.content?.includes(`@${currentUsername}`) ||
          saved?.mentions?.includes(`currentUserId`);

      if(isMentioned){
        setTimeout(()=>{
          const el = document.querySelector(
            `[data-message-id="${messageId}"]`
          );
          el?.classList.add("mention-highlight");
          setTimeout(()=>el?.classList.remove("mention-highlight"),2000);
        },100);
      }


      const senderId = saved?.sender_id || saved?.senderId || "";
      const resolvedUsername = (senderId === currentUserId) ? 'You' : (
        saved?.username ||
        (saved?.sender && (saved.sender.username || saved.sender.fullname || saved.sender.name)) ||
        saved?.sender_name || saved?.senderName || saved?.name ||
        usernamesRef.current[senderId] || 'Unknown'
      );

      // Get actual avatar URL
      const avatarUrl = await getAvatarUrl(senderId);

      // Add replyTo using backend-provided reply_to_message (for replies)
      let replyTo = null;
      if (saved.reply_to_message) {
        replyTo = {
          id: saved.reply_to_message.id,
          content: saved.reply_to_message.content,
          author: saved.reply_to_message.users?.username || "Unknown",
          avatarUrl: saved.reply_to_message.users?.avatar_url || "/User_profil.png",
        };
      }

      const newMessage: Message = {
        id: messageId,
        content: saved?.content || saved?.message || "",
        senderId,
        timestamp: saved?.timestamp || new Date().toISOString(),
        avatarUrl,
        username: resolvedUsername,
        mediaUrl: saved?.media_url || saved?.mediaUrl,
        replyTo // <-- add this
      };

      if (senderId && resolvedUsername && resolvedUsername !== 'Unknown') {
        usernamesRef.current[senderId] = resolvedUsername;
      }

      setMessages(prev => {
        // Check if message already exists in state (by ID)
        const existsById = prev.some(msg => msg.id === messageId);
        if (existsById) {
          console.log(`Message ${messageId} already in state, skipping`);
          return prev;
        }

        // Additional check: remove optimistic duplicates from current user
        const filtered = prev.filter(msg => 
          !(msg.senderId === currentUserId && 
            msg.content === newMessage.content && 
            Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 5000)
        );

        const updated = [...filtered, newMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return updated;
      });

      // Mark this message ID as received
      receivedMessageIdsRef.current.add(messageId);

      // Clean up old message IDs after 10 minutes to prevent memory leak
      setTimeout(() => {
        receivedMessageIdsRef.current.delete(messageId);
      }, 10 * 60 * 1000);
    };

    socket.on("new_message", handleIncomingMessage);
    socket.on('reconnect', async () => {
      await loadMessages();
    });

    return () => {
      socket.off("new_message");
      socket.off("reconnect");
    };
  }, [socket, currentUserId, loadMessages, currentUserAvatar]);

  const validateUserMentions = (message: string) => {
    const userMentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;

    while ((match = userMentionRegex.exec(message)) !== null) {
      const mention = `@${match[1]}`;

      // Skip role mentions (@&role)
      if (message.includes(`@&${match[1]}`)) continue;

      if (!isValidUsernameMention(mention)) {
        return { valid: false, invalidUser: mention };
      }
    }

    return { valid: true };
  };

  const validateRoleMentions = (message: string) => {
    const roleMentionRegex = /@&([a-zA-Z0-9_ ]+?)(?=\s|$)/g;
    let match;
    while ((match = roleMentionRegex.exec(message)) !== null) {
      const roleName = match[1].trim();
      if (!serverRoles.some(r => r.name.toLowerCase() === roleName.toLowerCase())) {
        return { valid: false, invalidRole: roleName };
      }
    }
    return { valid: true };
  };

  const handleSend = async (text: string, file: File | null) => {
    if (text.trim() === "" && !file) return;

    // Check channel permissions before sending
    if (channelPermissions && !channelPermissions.canSend) {
      let errorMsg = "You don't have permission to send messages in this channel.";
      if (channelPermissions.channelType === "read_only") {
        errorMsg = "This is a read-only channel. Only admins and moderators can send messages.";
      } else if (channelPermissions.channelType === "role_restricted") {
        errorMsg = "You need specific roles to send messages in this channel.";
      }
      setPermissionError(errorMsg);
      setTimeout(() => setPermissionError(null), 5000);
      return;
    }

    const validation = validateRoleMentions(text);
    if (!validation.valid) {
      alert(`Role "${validation.invalidRole}" does not exist in this server.`);
      setIsSending(false);
      return;
    }
    const userValidation = validateUserMentions(text);

if (!userValidation.valid) {

}

    setIsSending(true);
  // Get avatar from cache or use fallback
  const userAvatar = avatarCacheRef.current[currentUserId] || currentUserAvatar || "/User_profil.png";

  // Create unique temp ID
  const tempId = `temp-${currentUserId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const optimisticMessage: Message = {
    id: tempId,
    content: file ? `${text} 📎 Uploading ${file.name}...` : text,
    senderId: currentUserId,
    timestamp: new Date().toISOString(),
    avatarUrl: userAvatar?.url || "/User_profil.png",

    username: "You",
    replyTo: replyingTo
      ? {
          id: replyingTo.id,
          content: replyingTo.content,
          author: (replyingTo as any).username || "User",
          avatarUrl: replyingTo.avatarUrl || "/User_profil.png",
        }
      : null,
  };
  
  // Add optimistic message only if it doesn't already exist
  setMessages(prev => {
    const hasSimilarRecent = prev.some(msg => 
      msg.senderId === currentUserId &&
      msg.content === optimisticMessage.content &&
      Math.abs(new Date(msg.timestamp).getTime() - new Date(optimisticMessage.timestamp).getTime()) < 2000
    );
    
    if (hasSimilarRecent) {
      console.log("Similar message already exists, not adding optimistic duplicate");
      return prev;
    }
    
    return [...prev, optimisticMessage];
  });

  try {
    const response = await uploadMessage({
      content: text.trim(),
      channel_id: channelId,
      sender_id: currentUserId,
      reply_to: replyingTo?.id,
      file: file || undefined,
    });
    setReplyingTo(null);
    console.log('[Upload Message] Response:', response);
    
    // Remove optimistic message after successful send
    // (the real message will come via socket)
    setMessages(prev => prev.filter((msg) => msg.id !== tempId));
  } catch (err: any) {
    console.error('💔 Failed to upload message:', err);
    const errorMessage = err?.response?.data?.error || err.message || 'Unknown error';
    
    // Check if it's a permission error
    if (err?.response?.status === 403) {
      setPermissionError(errorMessage);
      setTimeout(() => setPermissionError(null), 5000);
    } else {
      alert(`Upload failed: ${errorMessage}`);
    }
    
    // Remove optimistic message on error
    setMessages(prev => prev.filter((msg) => msg.id !== tempId));
  } finally {
    setIsSending(false);
  }
};

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
      {(localStream || (remoteStreams && remoteStreams.length > 0)) && (
        <div className="p-4 pb-0 h-96 flex-shrink-0">
          <div className="relative w-full h-full">
            <VideoPanel
              localStream={localStream || undefined}
              remotes={remoteStreams}
            />
            <div className="absolute bottom-3 right-3 flex gap-2 z-10">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={`px-3 py-1 rounded-md text-sm ${
                  micOn ? "bg-green-600/80" : "bg-red-600/80"
                }`}
                title={micOn ? "Mute mic" : "Unmute mic"}
              >
                {micOn ? "Mic On" : "Mic Off"}
              </button>
              <button
                onClick={() => setCamOn((v) => !v)}
                className={`px-3 py-1 rounded-md text-sm ${
                  camOn ? "bg-green-600/80" : "bg-red-600/80"
                }`}
                title={camOn ? "Turn camera off" : "Turn camera on"}
              >
                {camOn ? "Cam On" : "Cam Off"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
      >
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading messages…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 text-sm">
            No messages yet. Say hi 👋
          </div>
        ) : (
          <>
            {/* Loading indicator at top when fetching older messages */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-gray-400 text-sm">
                    Loading older messages...
                  </span>
                </div>
              </div>
            )}
            {/* Show message when no more messages to load */}
            {!hasMore && messages.length > 0 && (
              <div className="flex justify-center py-4">
                <span className="text-gray-500 text-xs">
                  Beginning of conversation
                </span>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                ref={(el) => {
                  messageRefs.current[msg.id] = el;
                }}
              >
                <MessageBubble
                  name={msg.username}
                  message={{
                    content: msg.content,
                    replyTo: msg.replyTo || null,
                  }}
                  avatarUrl={msg.avatarUrl}
                  isSender={msg.senderId === currentUserId}
                  timestamp={new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  onReply={() => handleReply(msg)}
                  onProfileClick={() => openProfile(msg)}
                  messageRenderer={(content: string) => (
                    <MessageContentWithMentions
                      content={content}
                      currentUserId={currentUserId}
                      currentUsername={currentUsername}
                      serverRoles={serverRoles}
                      isValidUsernameMention={isValidUsernameMention}
                      currentUserRoleIds={currentUserRoleIds}
                      onMentionClick={handleUsernameClick}
                      onRoleMentionClick={handleRoleMentionClick}
                    />
                  )}
                >
                  {msg.mediaUrl && (
                    <MessageAttachment media_url={msg.mediaUrl} />
                  )}
                </MessageBubble>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="flex-shrink-0 px-6 pb-6">
        {permissionError && (
          <div className="mx-6 mb-2 px-4 py-3 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-3">
            <span className="text-red-400 text-xl">🔒</span>
            <div className="text-sm text-red-200 flex-1">
              {permissionError}
            </div>
          </div>
        )}
        
        {replyingTo && (
          <div className="mx-6 mb-2 px-4 py-2 bg-slate-800 rounded-lg flex items-center justify-between border-l-4 border-blue-500">
            <div className="text-sm text-slate-300 truncate">
              Replying to{" "}
              <span className="font-semibold">
                {replyingTo.username || "User"}
              </span>
              :{" "}
              <span className="italic">
                {replyingTo.content}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="ml-3 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Show restricted channel notice if can't send */}
        {channelPermissions && !channelPermissions.canSend ? (
          <div className="mx-6 p-4 bg-slate-800/70 border-2 border-slate-700 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">
                {channelPermissions.channelType === "read_only" ? "📢" : "🔒"}
              </span>
              <span className="text-slate-300 font-semibold">
                {channelPermissions.channelType === "read_only" 
                  ? "Read-Only Channel" 
                  : "Restricted Channel"}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {channelPermissions.channelType === "read_only" 
                ? "Only admins and moderators can send messages in this channel."
                : "You need specific roles to send messages here."}
            </p>
          </div>
        ) : serverId ? (
          <MessageInputWithMentions
            sendMessage={handleSend}
            isSending={isSending}
            serverId={serverId}
            serverRoles={serverRoles}
          />
        ) : (
          <MessageInput sendMessage={handleSend} isSending={isSending} />
        )}
      </div>
      
      {roleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#232428] rounded-2xl shadow-2xl w-96 p-6 text-white relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
              onClick={() => setRoleModal({ ...roleModal, open: false })}
            >
              ✖
            </button>
            <h2 className="text-xl font-semibold mb-2">
              Role: <span className="text-indigo-400">@{roleModal.role}</span>
            </h2>
            <div className="mb-2 text-sm text-gray-400">
              {roleModal.users.length} member(s) with this role:
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {roleModal.users.length === 0 ? (
                <div className="text-gray-500 text-center">No users found.</div>
              ) : (
                roleModal.users.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition">
                    <img src={user.avatarUrl || "/User_profil.png"} alt={user.username} className="w-8 h-8 rounded-full" />
                    <span>{user.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
        currentUserId={currentUserId}
      />
    </div>
  );
});
