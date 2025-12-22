"use client";

import React, { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Socket } from "socket.io-client";
import MessageInput from "./MessageInput";
import MessageInputWithMentions from "./MessageInputWithMentions";
import MessageContentWithMentions from "./MessageContentWithMentions";
import MessageAttachment from "./MessageAttachment";
import { fetchMessages, uploadMessage, getUserAvatar } from "@/app/api/API";
import { getUser } from "@/app/api";
import { createAuthSocket } from "@/socket";
import VideoPanel from "./VideoPanel";
import MessageBubble from "./MessageBubble";
import UserProfileModal from "./UserProfileModal";
import Toast from "@/components/Toast";
import { ChevronDown } from "lucide-react";
import { apiClient } from "@/utils/apiClient";
interface Message {
  id: string | number;
  content: string;
  senderId: string;
  timestamp: string;
  avatarUrl?: string;
  username?: string;
  file?: string;
  mediaUrl?: string;
  replyTo?: string | number;
}

interface ChatWindowProps {
  channelId: string;
  isDM: boolean;
  currentUserId: string;
  localStream?: MediaStream | null;
  remoteStreams?: { id: string; stream: MediaStream }[];
  serverId?: string;
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
  const [offset, setOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const usernamesRef = useRef<Record<string, string>>({});
  const avatarCacheRef = useRef<Record<string, string>>({});
  const [micOn, setMicOn] = useState<boolean>(true);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] =
    useState<string>("/User_profil.png");
  const isLoadingMoreRef = useRef(false);
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

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  // Load current user's avatar, username, and roles on mount
  useEffect(() => {
    const loadCurrentUserData = async () => {
      try {
        const user = await getUser();
        if (user) {
          if (user.avatar_url) {
            setCurrentUserAvatar(user.avatar_url);
            // Important: Also cache it immediately
            avatarCacheRef.current[currentUserId] = user.avatar_url;

            // Force update messages with the new avatar
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.senderId === currentUserId
                  ? { ...msg, avatarUrl: user.avatar_url || undefined }
                  : msg
              )
            );
          }
          // Set username
          if (user.username) {
            setCurrentUsername(user.username);
          }
        }

        // Load user roles if serverId is available
        if (serverId) {
          try {
            const token = localStorage.getItem("access_token");
            if (token) {
              const url = `${process.env.NEXT_PUBLIC_API_URL}/api/newserver/${serverId}/members/${currentUserId}`;
              const response = await fetch(url, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const memberData = await response.json();
                const roles =
                  memberData.roles?.map((role: any) => role.name) || [];
                setCurrentUserRoles(roles);
              }
            }
          } catch (error) {
            console.error("Failed to load user roles:", error);
          }
        }
      } catch (error) {
        console.error("Failed to load current user's data:", error);
      }
    };

    loadCurrentUserData();
  }, [currentUserId, serverId]);
  // Function to get user avatar with caching
  const getAvatarUrl = async (userId: string): Promise<string> => {
    // Check cache first for all users (including current user)
    if (avatarCacheRef.current[userId]) {
      return avatarCacheRef.current[userId];
    }

    try {
      const avatarUrl = await getUserAvatar(userId);
      if (avatarUrl) {
        avatarCacheRef.current[userId] = avatarUrl;
        return avatarUrl;
      }
      // If no avatar URL returned, use fallback
      const fallbackAvatar = "/User_profil.png";
      avatarCacheRef.current[userId] = fallbackAvatar;
      return fallbackAvatar;
    } catch (error) {
      console.error(`Failed to get avatar for user ${userId}:`, error);
      const fallbackAvatar = "/User_profil.png";
      avatarCacheRef.current[userId] = fallbackAvatar;
      return fallbackAvatar;
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

  const handleUsernameClick = async (userId: string, username: string) => {
    // console.log("handleUsernameClick called with:", { userId, username });

    // First, try to find the user in existing messages to get more info
    const existingMessage = messages.find(
      (msg) => msg.senderId === userId || msg.username === username
    );

    let mockMessage: Message;
    if (existingMessage) {
      // Use data from existing message if found
      mockMessage = existingMessage;
    } else {
      // Create a mock message object for the openProfile function
      mockMessage = {
        id: `temp-${userId}`,
        content: "",
        senderId: userId,
        timestamp: new Date().toISOString(),
        username: username,
        avatarUrl: avatarCacheRef.current[userId] || "/User_profil.png",
      };
    }

    // console.log("Opening profile for mock message:", mockMessage);
    await openProfile(mockMessage);
  };

  const openProfile = async (msg: Message) => {
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
        console.error("Missing token or serverId:", {
          token: !!token,
          serverId,
        });
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

      if (response.ok) {
        const memberData = await response.json();
        // console.log("Member data received:", memberData);

        // Update with full user details including roles
        setSelectedUser({
          id: msg.senderId,
          username: msg.username || "Unknown",
          avatarUrl: msg.avatarUrl || "/User_profil.png",
          about: memberData.user.bio || "No bio yet...",
          roles: memberData.roles?.map((role: any) => role.name) || [],
        });
      } else {
        console.error(
          "Failed to fetch member data:",
          response.status,
          await response.text()
        );
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  useEffect(() => {
    const newSocket = createAuthSocket(currentUserId);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId]);

  const loadMessages = useCallback(
    async (loadMore: boolean = false) => {
      try {
        if (loadMore) {
          setLoadingMore(true);
          isLoadingMoreRef.current = true;
        } else {
          setLoadingMessages(true);
          setOffset(0);
          isLoadingMoreRef.current = false;
        }

        const currentOffset = loadMore ? offset : 0;
        const res = await fetchMessages(channelId, currentOffset);

        const formattedMessages: Message[] = await Promise.all(
          res.data.map(async (msg: any) => {
            const senderId = msg.sender_id || msg.senderId;
            const avatarUrl = await getAvatarUrl(senderId);

            // Add debugging

            return {
              id: msg.id,
              content: msg.content || msg.message,
              senderId,
              timestamp: msg.timestamp || new Date().toISOString(),
              avatarUrl, // This should now have the correct value
              username:
                senderId === currentUserId
                  ? "You"
                  : msg.username ||
                    msg.sender?.username ||
                    msg.sender?.fullname ||
                    msg.sender_name ||
                    "Unknown",
              mediaUrl: msg.media_url || msg.mediaUrl,
            };
          })
        );

        const sorted = formattedMessages.reverse();

        if (loadMore) {
          setMessages((prev) => [...sorted, ...prev]);
          setOffset((prev) => prev + res.data.length);
        } else {
          setMessages(sorted);
          setOffset(res.data.length);
        }

        setHasMore(res.hasMore ?? false);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoadingMessages(false);
        setLoadingMore(false);
      }
    },
    [channelId, currentUserId, offset]
  ); // Removed currentUserAvatar from dependencies

  useEffect(() => {
    if (channelId) {
      hasScrolledForChannelRef.current = null; // Reset on channel change
      loadMessages(false);
    }
  }, [channelId]);

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

    // Don't load more if we're currently scrolling to a mention
    if (isScrollingToMentionRef.current) return;

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
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [localStream, micOn]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [localStream, camOn]);

  // Helper function to check if message mentions current user
  const checkIfMentioned = useCallback(
    (content: string): boolean => {
      if (!content || (!currentUsername && currentUserRoles.length === 0))
        return false;

      // Check for @everyone or @here mentions
      const everyoneMentionRegex = /@(everyone|here)\b/g;
      if (everyoneMentionRegex.test(content)) {
        return true;
      }

      // Check for role mentions (@&rolename) - must start with letter/underscore
      if (currentUserRoles.length > 0) {
        const roleMentionRegex = /@&([a-zA-Z_][a-zA-Z0-9_\s]*)\b/g;
        const roleMatches = Array.from(content.matchAll(roleMentionRegex));
        for (const match of roleMatches) {
          const mentionedRole = match[1].trim();
          if (
            currentUserRoles.some(
              (role) => role.toLowerCase() === mentionedRole.toLowerCase()
            )
          ) {
            return true;
          }
        }
      }

      // Check for user mentions (@username) - must match exact username
      if (currentUsername) {
        // Use word boundary to ensure exact match, not partial
        const escapedUsername = currentUsername.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        const userMentionRegex = new RegExp(`@${escapedUsername}\\b`, "gi");
        if (userMentionRegex.test(content)) {
          return true;
        }
      }

      return false;
    },
    [currentUsername, currentUserRoles]
  );

  // Handle scroll visibility
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial state

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [messages]);

  // Scroll to mention ONLY when a NEW message arrives (not on initial load or pagination)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages.length) return;

    // ❌ Skip initial load - don't scroll on history load
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      // Track the last message so we know what's "new" next time
      lastProcessedMessageIdRef.current = messages[messages.length - 1].id;
      return;
    }

    // ❌ Skip if already scrolling to a mention
    if (isScrollingToMentionRef.current) {
      return;
    }

    // ❌ Skip when loading older messages (pagination)
    if (isLoadingMoreRef.current) {
      isLoadingMoreRef.current = false;
      return;
    }

    // ✅ Only check the LAST message (newest one) - this is the new message that just arrived
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Check if this new message mentions the user
    const isMentioned = checkIfMentioned(lastMessage.content);

    if (isMentioned) {
      // Prevent multiple scrolls
      isScrollingToMentionRef.current = true;

      // Scroll to the mentioned message
      const scrollToMention = (attempts = 0) => {
        const messageElement = document.querySelector(
          `[data-message-id="${lastMessage.id}"]`
        );

        if (messageElement) {
          // Smooth scroll directly to the mentioned message
          messageElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });

          // Reset scroll flag after scroll completes
          setTimeout(() => {
            isScrollingToMentionRef.current = false;
          }, 1200);
        } else if (attempts < 3) {
          // Retry if element not found yet (DOM might still be updating)
          setTimeout(() => scrollToMention(attempts + 1), 200);
        } else {
          // Fallback: scroll to bottom if element not found after retries
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          setTimeout(() => {
            isScrollingToMentionRef.current = false;
          }, 1000);
        }
      };

      requestAnimationFrame(() => {
        setTimeout(() => scrollToMention(), 150);
      });
    }

    // Update last processed message ID
    lastProcessedMessageIdRef.current = lastMessage.id;
  }, [messages, checkIfMentioned]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("connect", () => {
      socket.emit("join_room", channelId);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("💔 Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    const pingInterval = setInterval(() => {
      if (!socket.connected) {
        socket.connect();
      }
    }, 5000);

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      clearInterval(pingInterval);
    };
  }, [socket, channelId]);

  useEffect(() => {
    if (!socket) return;
    const receivedMessageIds = new Set<string | number>();

    const handleIncomingMessage = async (saved: any) => {
      const messageId = saved?.id || saved?.messageId || Date.now();
      if (saved?.channel_id && saved.channel_id !== channelId) return;

      if (receivedMessageIds.has(messageId)) {
        return;
      }

      const senderId = saved?.sender_id || saved?.senderId || "";
      const resolvedUsername =
        senderId === currentUserId
          ? "You"
          : saved?.username ||
            (saved?.sender &&
              (saved.sender.username ||
                saved.sender.fullname ||
                saved.sender.name)) ||
            saved?.sender_name ||
            saved?.senderName ||
            saved?.name ||
            usernamesRef.current[senderId] ||
            "Unknown";

      // Get actual avatar URL
      const avatarUrl = await getAvatarUrl(senderId);

      const newMessage: Message = {
        id: messageId,
        content: saved?.content || saved?.message || "",
        senderId,
        timestamp: saved?.timestamp || new Date().toISOString(),
        avatarUrl,
        username: resolvedUsername,
        mediaUrl: saved?.media_url || saved?.mediaUrl,
      };

      if (senderId && resolvedUsername && resolvedUsername !== "Unknown") {
        usernamesRef.current[senderId] = resolvedUsername;
      }

      setMessages((prev) => {
        const filtered = prev.filter(
          (msg) =>
            !(
              msg.senderId === currentUserId &&
              msg.content === (saved?.content || saved?.message || "") &&
              Date.now() - new Date(msg.timestamp).getTime() < 30000
            )
        );

        const updated = [...filtered, newMessage].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return updated;
      });

      receivedMessageIds.add(messageId);

      setTimeout(() => {
        receivedMessageIds.delete(messageId);
      }, 5 * 60 * 1000);
    };

    socket.on("new_message", handleIncomingMessage);
    socket.on("reconnect", async () => {
      await loadMessages();
    });

    return () => {
      socket.off("new_message");
      socket.off("reconnect");
    };
  }, [socket, currentUserId, loadMessages, channelId, currentUserAvatar]);

  const handleSend = async (text: string, file: File | null) => {
    if (text.trim() === "" && !file) return;

    setIsSending(true);
    // Get avatar from cache or use fallback
    const userAvatar =
      avatarCacheRef.current[currentUserId] ||
      currentUserAvatar ||
      "/User_profil.png";

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: file ? `${text} 📎 Uploading ${file.name}...` : text,
      senderId: currentUserId,
      timestamp: new Date().toISOString(),
      avatarUrl: userAvatar,
      username: "You",
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await uploadMessage({
        content: text.trim(),
        channel_id: channelId,
        sender_id: currentUserId,
        reply_to: replyingTo?.id,
        file: file || undefined,
      });
      setReplyingTo(null);
      console.log("[Upload Message] Response:", response);
    } catch (err: any) {
      console.error("Failed to upload message:", err);
      alert(`Upload failed: ${err.message || "Unknown error"}`);
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );
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
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
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
                <div key={msg.id} data-message-id={msg.id}>
                  <MessageBubble
                    name={msg.username}
                    message={{
                      content: msg.content,
                      replyTo: msg.replyTo
                        ? {
                            id: msg.replyTo,
                            content:
                              messages.find((m) => m.id === msg.replyTo)
                                ?.content || "Message not found",
                            author: messages.find((m) => m.id === msg.replyTo)
                              ?.username,
                          }
                        : null,
                    }}
                    avatarUrl={msg.avatarUrl}
                    isSender={msg.senderId === currentUserId}
                    timestamp={new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    onReply={() => handleReply(msg)}
                    messageRenderer={(content: string) => (
                      <MessageContentWithMentions
                        content={content}
                        currentUserId={currentUserId}
                        currentUsername={currentUsername}
                        onMentionClick={handleUsernameClick}
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

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 z-20 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex-shrink-0 px-6 pb-6">
        {serverId ? (
          <MessageInputWithMentions
            sendMessage={handleSend}
            isSending={isSending}
            serverId={serverId}
          />
        ) : (
          <>
            {replyingTo && (
              <div className="mx-6 mb-2 px-4 py-2 bg-slate-800 rounded-lg flex items-center justify-between border-l-4 border-blue-500">
                <div className="text-sm text-slate-300 truncate">
                  Replying to{" "}
                  <span className="font-semibold">
                    {replyingTo.username || "User"}
                  </span>
                  : <span className="italic">{replyingTo.content}</span>
                </div>

                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-3 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            <MessageInput sendMessage={handleSend} isSending={isSending} />
          </>
        )}
      </div>
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
        currentUserId={currentUserId}
      />
    </div>
  );
});
