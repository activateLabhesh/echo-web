"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import MessageInput from "./MessageInput"; // This import is now correct
import MessageInputWithMentions from "./MessageInputWithMentions"; // Import new mention-enabled input
import MessageContentWithMentions from "./MessageContentWithMentions"; // Import mention content renderer
import MessageAttachment from "./MessageAttachment"; // Import the new component
import { fetchMessages, uploadMessage, getUserAvatar } from "@/app/api/API";
import { getUser } from "@/app/api";
import { createAuthSocket } from "@/socket";
import VideoPanel from "./VideoPanel";
import MessageBubble from "./MessageBubble";
import UserProfileModal from "./UserProfileModal";


interface Message {
  id: string | number;
  content: string;
  senderId: string;
  timestamp: string;
  avatarUrl?: string;
  username?: string;
  file?: string;
  mediaUrl?: string; // Add support for media_url from backend
}

interface ChatWindowProps {
  channelId: string;
  isDM: boolean;
  currentUserId: string;
  localStream?: MediaStream | null;
  remoteStreams?: { id: string; stream: MediaStream }[];
  serverId?: string; // Add serverId for mentions
}

export default function ChatWindow({ channelId, currentUserId, localStream = null, remoteStreams = [], serverId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const usernamesRef = useRef<Record<string, string>>({});
  const avatarCacheRef = useRef<Record<string, string>>({});
  const [micOn, setMicOn] = useState<boolean>(true);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);

  // Function to get user avatar with caching
  const getAvatarUrl = async (userId: string): Promise<string> => {
    if (userId === currentUserId) {
      // Get current user's avatar from their profile
      try {
        const user = await getUser();
        if (user?.avatar_url) {
          return user.avatar_url;
        }
      } catch (error) {
        console.error("Failed to get current user's avatar:", error);
      }
      return "/User_profil.png"; // Fallback for current user
    }
    
    // Check cache first for other users
    if (avatarCacheRef.current[userId]) {
      return avatarCacheRef.current[userId];
    }
    
    try {
      const avatarUrl = await getUserAvatar(userId);
      avatarCacheRef.current[userId] = avatarUrl;
      return avatarUrl;
    } catch (error) {
      console.error(`Failed to get avatar for user ${userId}:`, error);
      const fallbackAvatar = "https://avatars.dicebear.com/api/bottts/user.svg";
      avatarCacheRef.current[userId] = fallbackAvatar;
      return fallbackAvatar;
    }
  };
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
  } | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const openProfile = (msg: Message) => {
    if (!msg.senderId) return;
    setSelectedUser({
      id: msg.senderId,
      username: msg.username || "Unknown",
      avatarUrl: msg.avatarUrl || "/User_profil.png",
      about: "No bio yet...",
    });
    setIsProfileOpen(true);
  };


  useEffect(() => {
    const newSocket = createAuthSocket(currentUserId);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetchMessages(channelId);
      const formattedMessages: Message[] = await Promise.all(
        res.data.map(async (msg: any) => {
          const senderId = msg.sender_id || msg.senderId;
          const avatarUrl = await getAvatarUrl(senderId);
          
          return {
            id: msg.id,
            content: msg.content || msg.message,
            senderId,
            timestamp: msg.timestamp || new Date().toISOString(),
            avatarUrl,
            username:
              (senderId === currentUserId ? "You" :
                (msg.username ||
                 (msg.sender && (msg.sender.username || msg.sender.fullname || msg.sender.name)) ||
                 msg.sender_name || msg.senderName || msg.username ||
                 "Unknown")),
            mediaUrl: msg.media_url || msg.mediaUrl // Handle backend's snake_case media_url
          };
        })
      );
      
      const sortedMessages = formattedMessages.sort((a: Message, b: Message) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      const map: Record<string, string> = { ...usernamesRef.current };
      for (const m of sortedMessages) {
        if (m.senderId && m.username && m.username !== 'Unknown') {
          map[m.senderId] = m.username;
        } else if (m.senderId === currentUserId) {
          map[m.senderId] = 'You';
        }
      }
      usernamesRef.current = map;
      setMessages(sortedMessages);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  }, [channelId, currentUserId]);

  useEffect(() => {
    if (channelId) loadMessages();
  }, [channelId, loadMessages]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => (t.enabled = micOn));
  }, [localStream, micOn]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => (t.enabled = camOn));
  }, [localStream, camOn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => {
      socket.emit("join_room", channelId);
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
    const receivedMessageIds = new Set<string | number>();

    const handleIncomingMessage = async (saved: any) => {
      console.log('[Socket new_message] Received:', saved); // Debug log
      
      const messageId = saved?.id || saved?.messageId || Date.now();
      if (saved?.channel_id && saved.channel_id !== channelId) return;

      if (receivedMessageIds.has(messageId)) {
        return;
      }

      // Log media_url specifically
      if (saved?.media_url) {
        console.log('[Socket new_message] Message has media_url:', saved.media_url);
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

      const newMessage: Message = {
        id: messageId,
        content: saved?.content || saved?.message || "",
        senderId,
        timestamp: saved?.timestamp || new Date().toISOString(),
        avatarUrl,
        username: resolvedUsername,
        mediaUrl: saved?.media_url || saved?.mediaUrl // Handle backend's snake_case media_url
      };

      if (senderId && resolvedUsername && resolvedUsername !== 'Unknown') {
        usernamesRef.current[senderId] = resolvedUsername;
      }

      setMessages(prev => {
        const filtered = prev.filter(msg => 
          !(msg.senderId === currentUserId && 
            msg.content === (saved?.content || saved?.message || "") && 
            Date.now() - new Date(msg.timestamp).getTime() < 30000)
        );

        const updated = [...filtered, newMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return updated;
      });

      receivedMessageIds.add(messageId);

      setTimeout(() => {
        receivedMessageIds.delete(messageId);
      }, 5 * 60 * 1000);
    };

    socket.on("new_message", handleIncomingMessage);
    socket.on('reconnect', async () => {
      await loadMessages();
    });

    return () => {
      socket.off("new_message");
      socket.off("reconnect");
    };
  }, [socket, currentUserId, loadMessages, channelId]);

  const handleSend = async (text: string, file: File | null) => {
    if (text.trim() === "" && !file) return;

    setIsSending(true);

    // Show upload progress for files
    if (file) {
      console.log(`Uploading file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: file ? `${text} 📎 Uploading ${file.name}...` : text,
      senderId: currentUserId,
      timestamp: new Date().toISOString(),
      avatarUrl: "/User_profil.png",
      username: "You"
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await uploadMessage({
        content: text.trim(),
        channel_id: channelId,
        sender_id: currentUserId,
        file: file || undefined,
      });
      
      console.log('[Upload Message] Response:', response); // Debug log
      if (response.media_url) {
        console.log('[Upload Message] Response has media_url:', response.media_url);
      }

    } catch (err: any) {
      console.error('💔 Failed to upload message:', err);
      
      // Handle specific error types based on backend specification
      let errorMessage = 'Upload failed';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Show user-friendly error message
      // You can integrate with your toast/notification system here
      alert(`Upload failed: ${errorMessage}`);
      
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
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
      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            name={msg.username}
            message={msg.content}
            avatarUrl={msg.avatarUrl}
            isSender={msg.senderId === currentUserId}
            timestamp={new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            onProfileClick={() => openProfile(msg)}
            messageRenderer={(content: string) => (
              <MessageContentWithMentions 
                content={content}
                currentUserId={currentUserId}
              />
            )}
          >
            {msg.mediaUrl && <MessageAttachment media_url={msg.mediaUrl} />}
          </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 px-6 pb-6">
        {serverId ? (
          <MessageInputWithMentions 
            sendMessage={handleSend} 
            isSending={isSending}
            serverId={serverId}
          />
        ) : (
          <MessageInput sendMessage={handleSend} isSending={isSending} />
        )}
      </div>
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
      />
    </div>
  );

}