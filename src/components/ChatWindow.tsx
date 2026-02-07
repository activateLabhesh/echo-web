"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from "react";
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
import { getServerMembers } from "@/api/server.api";

import { apiClient } from "@/utils/apiClient";


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
  
  status?: 'pending' | 'sent' | 'failed';
  tempId?: string;
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
  const validRoleNamesRef = useRef<Set<string>>(new Set());

  const [socket, setSocket] = useState<Socket | null>(null);
  const usernamesRef = useRef<Record<string, string>>({});
  const avatarCacheRef = useRef<
    Record<string, { url: string; updatedAt: number }>
  >({});

  const [micOn, setMicOn] = useState<boolean>(true);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] =
    useState<string>("/User_profil.png");
  const isLoadingMoreRef = useRef(false);
  const channelIdRef = useRef(channelId); 
  const receivedMessageIdsRef = useRef<Set<string | number>>(new Set()); 
  const offsetRef = useRef(0); 
  const [serverRoles, setServerRoles] = useState<
    { id: string; name: string; color?: string }[]
  >([]);
  const [channelPermissions, setChannelPermissions] =
    useState<ChannelPermissions | null>(null);
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

  const initialScrollDoneRef = useRef<string | null>(null);
  const isAutoScrollingRef = useRef(false);

  const hasMountedRef = useRef(false);
  const hasScrolledForChannelRef = useRef<string | null>(null);

  const [unreadMentionCount, setUnreadMentionCount] = useState(0);
  const [currentMentionIndex, setCurrentMentionIndex] = useState(0);

  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(
    null
  );

  const isManuallyScrollingRef = useRef(false);

 
  const fetchChannelUnreadMentions = async (chId: string, userId: string) => {
    const response = await apiClient.get(
      `/api/mentions?userId=${userId}&unreadOnly=true&channelId=${chId}`
    );
    return response.data || [];
  };

 
  const markAllChannelMentionsAsRead = async (mentionIds: string[]) => {
    await Promise.all(
      mentionIds.map((id) => apiClient.patch(`/api/mentions/${id}/read`))
    );
  };

  

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  const handleReply = (message: Message) => {
    console.log("Reply clicked for:", message);
    setReplyingTo(message);
  };
  const [currentUserRoleIds, setCurrentUserRoleIds] = useState<string[]>([]);
  const messageRefs = useRef<Record<string | number, HTMLDivElement | null>>(
    {}
  );

  const isMessageMentioningMe = useCallback(
    (content: string) => {
      if (!content) return false;

      if (/@(everyone|here)\b/i.test(content)) {
        return true;
      }

      if (currentUsername) {
        const escapedUsername = currentUsername.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        const usernamePattern = new RegExp(`@${escapedUsername}\\b`, "i");
        if (usernamePattern.test(content)) {
          return true;
        }
      }

    
      for (const roleId of currentUserRoleIds) {
        const role = serverRoles.find((r) => r.id === roleId);
        if (!role) continue;

        const escapedRole = role.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rolePattern = new RegExp(`@&${escapedRole}\\b`, "i");
        if (rolePattern.test(content)) {
          return true;
        }
      }

      return false;
    },
    [currentUsername, currentUserRoleIds, serverRoles]
  );

  const isValidUsernameMention = (mention: string) => {
    const name = mention.replace("@", "").toLowerCase();

    
    if (name === "everyone") return true;

    return validUsernamesRef.current.has(name);
  };

  const normalizeUsername = (name: string) => name.trim();

  const normalizeRoleName = (name: string) =>
    name.trim().toLowerCase().replace(/\s+/g, " ");


  useEffect(() => {
    if (!channelId || !currentUserId) {
      setLastReadTimestamp(null);
      return;
    }

    try {
      const key = `channel_last_read_${channelId}_${currentUserId}`;
      const stored = localStorage.getItem(key);
      setLastReadTimestamp(stored || null);
    } catch (err) {
      console.error("Failed to load channel last-read timestamp", err);
      setLastReadTimestamp(null);
    }
  }, [channelId, currentUserId]);

  
  useEffect(() => {

    if (
      loadingMessages ||
      isAutoScrollingRef.current ||
      isManuallyScrollingRef.current || 
      messages.length === 0
    ) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) return;

  
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;


    if (isNearBottom) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, loadingMessages]);

 
  useEffect(() => {
    if (!serverId) return;

    let cancelled = false;

    const seedMentionableUsernames = async () => {
      try {
        const members = await getServerMembers(serverId);

        const set = new Set<string>();

        for (const member of members ?? []) {
          const username = member?.users?.username;
          if (!username) continue;

          set.add(normalizeUsername(username));
        }

      
        if (currentUsername) {
          set.add(normalizeUsername(currentUsername));
        }

        if (!cancelled) {
          validUsernamesRef.current = set;
        }
      } catch (err) {
        console.error("Failed to seed mention usernames", err);
      }
    };

    seedMentionableUsernames();

    return () => {
      cancelled = true;
    };
  }, [serverId, currentUsername]);

 
  useEffect(() => {
    if (!serverRoles.length) return;

    const set = new Set<string>();

    for (const role of serverRoles) {
      if (!role?.name) continue;
      set.add(normalizeRoleName(role.name));
    }

    validRoleNamesRef.current = set;

    console.log("MENTIONABLE ROLES:", Array.from(set));
  }, [serverRoles]);


  useEffect(() => {
    const fetchPermissions = async () => {
      if (!channelId || !serverId) return;

      try {
        const permissions = await getChannelPermissions(channelId);
        setChannelPermissions(permissions);
        setPermissionError(null);
      } catch (err: any) {
        console.error("Error fetching channel permissions:", err);
       
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
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/newserver/${serverId}/roles`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
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
            msg.senderId === currentUserId
              ? { ...msg, avatarUrl: freshUrl }
              : msg
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
            msg.senderId === currentUserId
              ? { ...msg, avatarUrl: freshUrl }
              : msg
          )
        );
      } catch (err) {
        console.error("Failed to sync avatar", err);
      }
    };

    syncMyAvatar();
  }, [currentUserId]);

 
  const getAvatarUrl = async (userId: string): Promise<string> => {
    const cached = avatarCacheRef.current[userId];

   
    if (cached && Date.now() - cached.updatedAt < 5 * 60 * 1000) {
      return cached.url;
    }

    try {
      const avatarUrl = await getUserAvatar(userId);
      const finalUrl = avatarUrl || "/User_profil.png";

      avatarCacheRef.current[userId] = {
        url: `${finalUrl}?t=${Date.now()}`,
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

  const openProfile = useCallback(
    async (msg: Message) => {
      if (!msg.senderId) return;

      // console.log("Opening profile for user:", msg.senderId, "in server:", serverId);

  
      setSelectedUser({
        id: msg.senderId,
        username: msg.username || "Unknown",
        avatarUrl: msg.avatarUrl || "/User_profil.png",
        about: "Loading bio...",
        roles: [],
      });
      setIsProfileOpen(true);


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
      

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // console.log("Response status:", response.status);

        if (!response.ok) {
        
          console.warn(
            "Member not found in server (non-blocking):",
            msg.senderId
          );
          return; 
        }

        const memberData = await response.json();

       
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
    },
    [serverId]
  );

  const handleUsernameClick = useCallback(
    async (userId: string, username: string) => {
     
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

  const handleRoleMentionClick = useCallback(
    async (roleName: string) => {
      if (!serverId) return;

      try {
      
        const token = localStorage.getItem("access_token");
        const url = `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/newserver/${serverId}/roles/${encodeURIComponent(
          roleName.trim()
        )}/members`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch users for role: ${roleName}`);
        }

        const data = await response.json();
      
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
    },
    [serverId]
  );
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

  const loadMessages = useCallback(
    async (loadMore: boolean = false, abortSignal?: AbortSignal) => {
      try {
        if (loadMore) {
          setLoadingMore(true);
          isLoadingMoreRef.current = true;
        } else {
          setLoadingMessages(true);
          offsetRef.current = 0; 
          setOffset(0);
          isLoadingMoreRef.current = false;
        }

        const currentOffset = loadMore ? offsetRef.current : 0;

       
        if (abortSignal?.aborted) {
          return;
        }


        const currentChannelId = channelIdRef.current;

     
        const res = await fetchMessages(currentChannelId, currentOffset);

        
        if (abortSignal?.aborted || channelIdRef.current !== currentChannelId) {
          console.log(
            `Fetch completed for ${currentChannelId} but current channel is ${channelIdRef.current}, ignoring`
          );
          return;
        }

        const formattedMessages: Message[] = await Promise.all(
          res.data.map(async (msg: any) => {
            const senderId = msg.sender_id || msg.senderId;
            const avatarUrl = await getAvatarUrl(senderId);

           
            let replyTo = null;
            if (msg.reply_to_message) {
              replyTo = {
                id: msg.reply_to_message.id,
                content: msg.reply_to_message.content,
                author: msg.reply_to_message.users?.username || "Unknown",
                avatarUrl:
                  msg.reply_to_message.users?.avatar_url || "/User_profil.png",
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
              replyTo, 
            };
          })
        );


        if (abortSignal?.aborted || channelIdRef.current !== currentChannelId) {
          console.log(
            `Message processing completed for ${currentChannelId} but current channel is ${channelIdRef.current}, ignoring`
          );
          return;
        }

        const sorted = formattedMessages.reverse();

        if (loadMore) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((msg) => msg.id));
            const newMessages = sorted.filter(
              (msg) => !existingIds.has(msg.id)
            );
            return [...newMessages, ...prev];
          });
          const newOffset = offsetRef.current + res.data.length;
          offsetRef.current = newOffset;
          setOffset(newOffset);
        } else {
          setMessages(sorted);
          offsetRef.current = res.data.length;
          setOffset(res.data.length);

          sorted.forEach((msg) => {
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
    },
    [currentUserId]
  );
  const scrollToMention = useCallback(
    async (messageId: string, retries = 5): Promise<boolean> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        const el = document.querySelector(
          `[data-message-id="${messageId}"]`
        ) as HTMLElement | null;

        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("mention-highlight");
          setTimeout(() => el.classList.remove("mention-highlight"), 1500);
          return true;
        }

     
        if (hasMore && attempt < retries - 1) {
          await loadMessages(true);
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, attempt))
          );
        }
      }

      return false;
    },
    [hasMore, loadMessages]
  );

  useEffect(() => {
 
    if (
      loadingMessages ||
      messages.length === 0 ||
      initialScrollDoneRef.current === channelId
    ) {
      return;
    }

    initialScrollDoneRef.current = channelId;
    isAutoScrollingRef.current = true;

    const performInitialScroll = () => {
      try {
        const lastReadMs = lastReadTimestamp
          ? new Date(lastReadTimestamp).getTime()
          : 0;

        if (!lastReadMs) {
          
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          isAutoScrollingRef.current = false;
          return;
        }

      
        const firstUnreadIndex = messages.findIndex((msg) => {
          const msgTime = new Date(msg.timestamp).getTime();
          return msgTime > lastReadMs && msg.senderId !== currentUserId;
        });

        if (firstUnreadIndex === -1) {
          
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        } else {
       
          const firstUnread = messages[firstUnreadIndex];
          const el = messageRefs.current[firstUnread.id];

          if (el) {
            el.scrollIntoView({ behavior: "auto", block: "start" });
          } else {
           
            requestAnimationFrame(() => {
              const retryEl = messageRefs.current[firstUnread.id];
              if (retryEl) {
                retryEl.scrollIntoView({ behavior: "auto", block: "start" });
              } else {
                messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
              }
            });
          }
        }

        isAutoScrollingRef.current = false;
      } catch (error) {
        console.error("Error during initial scroll:", error);
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        isAutoScrollingRef.current = false;
      }
    };

  
    requestAnimationFrame(performInitialScroll);
  }, [loadingMessages, channelId, currentUserId, messages, lastReadTimestamp]);
  useEffect(() => {
    initialScrollDoneRef.current = null;
    hasScrolledForChannelRef.current = null;

    setMessages([]);
    setOffset(0);
    offsetRef.current = 0;
    setHasMore(true);
    receivedMessageIdsRef.current.clear();

    const abortController = new AbortController();

    if (channelId) {
      loadMessages(false, abortController.signal);
    }

    return () => {
      abortController.abort();
    };
  }, [channelId, loadMessages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;
    isManuallyScrollingRef.current = false;

    
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;

 
    if (isAtBottom && messages.length > 0 && channelId && currentUserId) {
      const last = messages[messages.length - 1];
      const ts = last.timestamp;
      setLastReadTimestamp(ts);
      try {
        const key = `channel_last_read_${channelId}_${currentUserId}`;
        localStorage.setItem(key, ts);
      } catch (err) {
        console.error("Failed to persist last read timestamp", err);
      }
    }

 
    if (messages.length > 0 && channelId && currentUserId && !isAtBottom) {
      const viewportBottom = container.scrollTop + container.clientHeight;

      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const el = messageRefs.current[msg.id];
        if (!el) continue;

        const elTop = el.offsetTop;
        if (elTop <= viewportBottom) {
          const ts = msg.timestamp;
          const existing = lastReadTimestamp
            ? new Date(lastReadTimestamp).getTime()
            : 0;
          const next = new Date(ts).getTime();

          if (next > existing) {
            setLastReadTimestamp(ts);
            try {
              const key = `channel_last_read_${channelId}_${currentUserId}`;
              localStorage.setItem(key, ts);
            } catch (err) {
              console.error("Failed to persist last read timestamp", err);
            }
          }
          break;
        }
      }
    }

  
    if (container.scrollTop < 100) {
      const previousScrollHeight = container.scrollHeight;
      const previousScrollTop = container.scrollTop;

      loadMessages(true).then(() => {
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop =
              previousScrollTop + (newScrollHeight - previousScrollHeight);
          }
        });
      });
    }
  }, [
    loadingMore,
    hasMore,
    loadMessages,
    messages,
    channelId,
    currentUserId,
    lastReadTimestamp,
  ]);

  useEffect(() => {
    if (!lastReadTimestamp) {
      setUnreadMentionCount(0);
      return;
    }

    const lastReadMs = new Date(lastReadTimestamp).getTime();

    const unreadMentions = messages.filter((msg) => {
      if (msg.senderId === currentUserId) return false;
      if (!isMessageMentioningMe(msg.content)) return false;
      const msgTime = new Date(msg.timestamp).getTime();
      return msgTime > lastReadMs;
    });

    setUnreadMentionCount(unreadMentions.length);
  }, [messages, lastReadTimestamp, currentUserId, isMessageMentioningMe]);
 
  const jumpToNextMention = useCallback(() => {
    if (!lastReadTimestamp) return;

    const lastReadMs = new Date(lastReadTimestamp).getTime();

    const unreadMentions = messages.filter((msg) => {
      if (msg.senderId === currentUserId) return false;
      if (!isMessageMentioningMe(msg.content)) return false;
      const msgTime = new Date(msg.timestamp).getTime();
      return msgTime > lastReadMs;
    });

    if (unreadMentions.length === 0) return;

    const targetMention =
      unreadMentions[currentMentionIndex % unreadMentions.length];
    const el = messageRefs.current[targetMention.id];

    if (el) {
      
      isManuallyScrollingRef.current = true;

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("mention-highlight");
      setTimeout(() => el.classList.remove("mention-highlight"), 2000);


      setTimeout(() => {
        isManuallyScrollingRef.current = false;
      }, 1000);
    }

    setCurrentMentionIndex((prev) => prev + 1);
  }, [
    messages,
    lastReadTimestamp,
    currentUserId,
    isMessageMentioningMe,
    currentMentionIndex,
  ]);
  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [localStream, micOn]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [localStream, camOn]);

  useEffect(() => {
    if (!socket || !channelId) return;

    socket.emit("join_room", channelId);
    console.log(`Joined room: ${channelId}`);

    return () => {
      socket.emit("leave_room", channelId);
      console.log(`Left room: ${channelId}`);
    };
  }, [socket, channelId]);
  useImperativeHandle(
    ref,
    () => ({
      async scrollToMessage(
        messageId: string,
        options: { highlightDuration?: number } = { highlightDuration: 1500 }
      ) {
        isAutoScrollingRef.current = true;
        isManuallyScrollingRef.current = true;

        try {
          const success = await scrollToMention(messageId, 6);

          if (success) {
            const el = document.querySelector(
              `[data-message-id="${messageId}"]`
            ) as HTMLElement;
            if (el && options.highlightDuration) {
              el.classList.add("mention-highlight");
              setTimeout(
                () => el.classList.remove("mention-highlight"),
                options.highlightDuration
              );
            }
          }

          return success;
        } finally {
          setTimeout(() => {
            isAutoScrollingRef.current = false;
            isManuallyScrollingRef.current = false;
          }, 1000);
        }
      },

      async loadOlderPages(limitPages = 1) {
        if (!hasMore) return false;
        for (let i = 0; i < limitPages; i++) {
          await loadMessages(true);
          await new Promise((r) => setTimeout(r, 60));
          if (!hasMore) break;
        }
        return true;
      },

      scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        return true;
      },
    }),
    [scrollToMention, hasMore, loadMessages] 
  );

  useEffect(() => {
    if (!socket) return;
    socket.on("connect", () => {
      if (channelId) {
        socket.emit("join_room", channelId);
        console.log(`Reconnected and joined room: ${channelId}`);
      }
    });

    socket.on("connect_error", (error: Error) => {
      console.error(" Socket connection error:", error);
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

    const handleIncomingMessage = async (saved: any) => {
      const messageId = saved?.id || saved?.messageId;

      if (!messageId) {
        console.warn("Received message without ID, ignoring:", saved);
        return;
      }

      if (saved?.channel_id && saved.channel_id !== channelIdRef.current) {
        console.log(
          `Ignoring message from channel ${saved.channel_id}, current channel is ${channelIdRef.current}`
        );
        return;
      }

      if (receivedMessageIdsRef.current.has(messageId)) {
        console.log(`Duplicate message detected (ID: ${messageId}), ignoring`);
        return;
      }

      const isMentioned =
        saved?.content?.includes(`@${currentUsername}`) ||
        saved?.mentions?.includes(`currentUserId`);

      if (isMentioned) {
        setTimeout(() => {
          const el = document.querySelector(`[data-message-id="${messageId}"]`);
          el?.classList.add("mention-highlight");
          setTimeout(() => el?.classList.remove("mention-highlight"), 2000);
        }, 100);
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

      const avatarUrl = await getAvatarUrl(senderId);

      let replyTo = null;
      if (saved.reply_to_message) {
        replyTo = {
          id: saved.reply_to_message.id,
          content: saved.reply_to_message.content,
          author: saved.reply_to_message.users?.username || "Unknown",
          avatarUrl:
            saved.reply_to_message.users?.avatar_url || "/User_profil.png",
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
        replyTo,
      };

      if (senderId && resolvedUsername && resolvedUsername !== "Unknown") {
        usernamesRef.current[senderId] = resolvedUsername;
      }

      setMessages((prev) => {
        const existsById = prev.some((msg) => msg.id === messageId);
        if (existsById) {
          console.log(`Message ${messageId} already in state, skipping`);
          return prev;
        }

        const filtered = prev.filter(
          (msg) =>
            !(
              msg.senderId === currentUserId &&
              msg.content === newMessage.content &&
              Math.abs(
                new Date(msg.timestamp).getTime() -
                  new Date(newMessage.timestamp).getTime()
              ) < 5000
            )
        );

        const updated = [...filtered, newMessage].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return updated;
      });

      receivedMessageIdsRef.current.add(messageId);

      setTimeout(() => {
        receivedMessageIdsRef.current.delete(messageId);
      }, 10 * 60 * 1000);
    };

   
    const handleMessageConfirmed = async (saved: any) => {
      const tempId = saved?.tempId;
      const realId = saved?.id;

      if (!tempId || !realId) {
        console.warn("message_confirmed missing tempId or id:", saved);
        return;
      }

      const senderId = saved?.sender_id || saved?.senderId || currentUserId;
      const avatarUrl = await getAvatarUrl(senderId);

     
      setMessages((prev) => {
        const optimisticIndex = prev.findIndex((msg) => msg.tempId === tempId);

        if (optimisticIndex === -1) {
          console.log(`No optimistic message found for tempId ${tempId}`);
          return prev;
        }

        const confirmedMessage: Message = {
          id: realId,
          content: saved?.content || prev[optimisticIndex].content,
          senderId,
          timestamp: saved?.timestamp || new Date().toISOString(),
          avatarUrl,
          username: "You",
          mediaUrl: saved?.media_url || saved?.mediaUrl,
          replyTo: prev[optimisticIndex].replyTo,
          status: "sent",
        };

        const updated = [...prev];
        updated[optimisticIndex] = confirmedMessage;
        return updated;
      });

    
      receivedMessageIdsRef.current.add(realId);
    };

   
    const handleMessageError = (error: any) => {
      const tempId = error?.tempId;
      const errorMsg = error?.error || error;

      console.error("Message error:", errorMsg);

      if (tempId) {
       
        setMessages((prev) =>
          prev.map((msg) =>
            msg.tempId === tempId ? { ...msg, status: "failed" as const } : msg
          )
        );
      }
    };

    socket.on("new_message", handleIncomingMessage);
    socket.on("message_confirmed", handleMessageConfirmed);
    socket.on("message_error", handleMessageError);
    socket.on("reconnect", async () => {
      await loadMessages();
    });

    return () => {
      socket.off("new_message");
      socket.off("message_confirmed");
      socket.off("message_error");
      socket.off("reconnect");
    };
  }, [socket, currentUserId, loadMessages, currentUserAvatar]);

  const validateUserMentions = (message: string) => {
    const userMentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;

    while ((match = userMentionRegex.exec(message)) !== null) {
      const mention = `@${match[1]}`;

      if (message.includes(`@&${match[1]}`)) continue;
      const mentionLower = mention.toLowerCase();
      if (mentionLower === "@everyone") {
        continue;
      }

      if (!isValidUsernameMention(mention)) {
        return { valid: false, invalidUser: mention };
      }
    }

    return { valid: true };
  };

  const validateRoleMentions = (message: string) => {
    const roleMentionRegex = /@&([^\s@]+)/g;
    let match: RegExpExecArray | null;

    while ((match = roleMentionRegex.exec(message)) !== null) {
      const rawRole = match[1];
      const normalized = normalizeRoleName(rawRole);

      if (!validRoleNamesRef.current.has(normalized)) {
        return { valid: false, invalidRole: rawRole };
      }
    }

    return { valid: true };
  };

  const handleSend = async (text: string, file: File | null) => {
    if (text.trim() === "" && !file) return;

    if (channelPermissions && !channelPermissions.canSend) {
      let errorMsg =
        "You don't have permission to send messages in this channel.";
      if (channelPermissions.channelType === "read_only") {
        errorMsg =
          "This is a read-only channel. Only admins and moderators can send messages.";
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

    const userAvatar =
      avatarCacheRef.current[currentUserId] ||
      currentUserAvatar ||
      "/User_profil.png";

    const tempId = `temp-${currentUserId}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

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

    setMessages((prev) => {
      const hasSimilarRecent = prev.some(
        (msg) =>
          msg.senderId === currentUserId &&
          msg.content === optimisticMessage.content &&
          Math.abs(
            new Date(msg.timestamp).getTime() -
              new Date(optimisticMessage.timestamp).getTime()
          ) < 2000
      );

      if (hasSimilarRecent) {
        console.log(
          "Similar message already exists, not adding optimistic duplicate"
        );
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
      console.log("[Upload Message] Response:", response);

      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } catch (err: any) {
      console.error(" Failed to upload message:", err);
      const errorMessage =
        err?.response?.data?.error || err.message || "Unknown error";

      if (err?.response?.status === 403) {
        setPermissionError(errorMessage);
        setTimeout(() => setPermissionError(null), 5000);
      } else {
        alert(`Upload failed: ${errorMessage}`);
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
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

            {!hasMore && messages.length > 0 && (
              <div className="flex justify-center py-4">
                <span className="text-gray-500 text-xs">
                  Beginning of conversation
                </span>
              </div>
            )}
            {messages.map((msg, index) => {
              const lastReadTime = lastReadTimestamp
                ? new Date(lastReadTimestamp).getTime()
                : null;
              const isUnreadDividerHere =
                lastReadTime !== null &&
                msg.senderId !== currentUserId &&
                new Date(msg.timestamp).getTime() > lastReadTime &&
                (index === 0 ||
                  new Date(messages[index - 1].timestamp).getTime() <=
                    lastReadTime);
              return (
                <React.Fragment key={msg.id}>
                  {isUnreadDividerHere && (
                    <div className="flex items-center my-4">
                      <div className="flex-1 h-px bg-red-500" />
                      <span className="mx-3 text-xs font-semibold uppercase tracking-wide text-red-400">
                        New Messages
                      </span>
                      <div className="flex-1 h-px bg-red-500" />
                    </div>
                  )}
                  <div
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
                      timestamp={new Date(msg.timestamp).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
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
                </React.Fragment>
              );
            })}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="flex-shrink-0 px-6 pb-6">
        {permissionError && (
          <div className="mx-6 mb-2 px-4 py-3 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-3">
            <span className="text-red-400 text-xl">🔒</span>
            <div className="text-sm text-red-200 flex-1">{permissionError}</div>
          </div>
        )}

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
        {unreadMentionCount > 0 && (
          <div className="mb-2">
            <button
              onClick={jumpToNextMention}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <span className="text-lg">@</span>
              <span className="font-medium">
                {unreadMentionCount} unread mention
                {unreadMentionCount !== 1 ? "s" : ""}
              </span>
              <span className="text-xs opacity-75">Click to jump</span>
            </button>
          </div>
        )}

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
                roleModal.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition"
                  >
                    <img
                      src={user.avatarUrl || "/User_profil.png"}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
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
