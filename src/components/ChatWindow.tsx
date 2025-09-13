"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import MessageInput from "./MessageInput";
import { fetchMessages, uploadMessage } from "@/app/api/API";
import { createAuthSocket } from "@/socket";

interface Message {
  id: string | number;
  content: string;
  senderId: string;
  timestamp: string;
  avatarUrl?: string;
}

interface ChatWindowProps {
  channelId: string;
  isDM: boolean;
  currentUserId: string;
}

export default function ChatWindow({ channelId, isDM, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket when component mounts
  useEffect(() => {
    const newSocket = createAuthSocket(currentUserId);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId]);

  const loadMessages = async () => {
    try {
      const res = await fetchMessages(channelId, isDM);
      // Transform the messages to match our Message interface
      const formattedMessages: Message[] = res.data.map((msg: any) => ({
        id: msg.id,
        content: msg.content || msg.message,
        senderId: msg.sender_id || msg.senderId,
        timestamp: msg.timestamp || new Date().toISOString(),
        avatarUrl: msg.sender_id === currentUserId ? "/User_profil.png" : "https://avatars.dicebear.com/api/bottts/user.svg"
      }));
      setMessages(formattedMessages);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  // Load initial messages
  useEffect(() => {
    if (channelId) loadMessages();
  }, [channelId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket connection monitoring and health checks
  useEffect(() => {
    if (!socket) return;

    console.log('Socket initialized:', socket.connected);

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      // Join the room after connection
      socket.emit("join_room", channelId);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    // Health monitoring
    const pingInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('🔄 Socket disconnected, attempting to reconnect...');
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

  // Message handling with duplicate detection and ordering
  useEffect(() => {
    if (!socket) return;

    // Keep track of received message IDs to prevent duplicates
    const receivedMessageIds = new Set<string | number>();

    const handleIncomingMessage = (data: { 
      senderId: string; 
      content: string; 
      messageId?: string | number;
      timestamp?: string;
    }) => {
      const messageId = data.messageId || Date.now();

      // Prevent duplicate messages
      if (receivedMessageIds.has(messageId)) {
        console.log('🔄 Duplicate message received, ignoring:', messageId);
        return;
      }

      const newMessage: Message = {
        id: messageId,
        content: data.content,
        senderId: data.senderId,
        timestamp: data.timestamp || new Date().toISOString(),
        avatarUrl: data.senderId === currentUserId 
          ? "/User_profil.png" 
          : "https://avatars.dicebear.com/api/bottts/user.svg"
      };

      setMessages(prev => {
        // Remove any optimistic message with the same content if it exists
        const filtered = prev.filter(msg => 
          !(msg.senderId === currentUserId && 
            msg.content === data.content && 
            Date.now() - new Date(msg.timestamp).getTime() < 30000)
        );

        // Add new message and sort by timestamp
        const updated = [...filtered, newMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return updated;
      });

      // Add to received messages set
      receivedMessageIds.add(messageId);

      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        receivedMessageIds.delete(messageId);
      }, 5 * 60 * 1000);
    };

    socket.on("chat_message", handleIncomingMessage);

    // Handle missed messages during disconnection
    socket.on('reconnect', async () => {
      console.log('🔄 Reconnected, fetching missed messages...');
      await loadMessages();
    });

    return () => {
      socket.off("chat_message");
      socket.off("reconnect");
    };
  }, [socket, currentUserId, loadMessages]);

  const tryEmitMessage = async (socket: Socket, messageData: { channelId: string; senderId: string; content: string }, maxRetries: number = 3): Promise<void> => {
    let retryCount = 0;

    const emitWithTimeout = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket message timeout'));
        }, 5000);

        socket.emit("chat_message", messageData, (acknowledgment: any) => {
          clearTimeout(timeout);
          if (acknowledgment?.error) {
            reject(new Error(acknowledgment.error));
          } else {
            console.log('✅ Message delivered successfully');
            resolve();
          }
        });
      });
    };

    while (retryCount < maxRetries) {
      try {
        await emitWithTimeout();
        return; // Success, exit the function
      } catch (error) {
        retryCount++;
        console.log(`❌ Message delivery attempt ${retryCount} failed:`, error);
        if (retryCount < maxRetries) {
          const delay = 1000 * retryCount; // Exponential backoff
          console.log(`🔄 Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw new Error(`Failed to deliver message after ${maxRetries} attempts`);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || !socket) return;

    const messageData = {
      channelId,
      senderId: currentUserId,
      content: text,
    };

    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: Date.now(),
      content: text,
      senderId: currentUserId,
      timestamp: new Date().toISOString(),
      avatarUrl: "/User_profil.png"
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Try to send via socket with retries
      await tryEmitMessage(socket, messageData);

      // If socket succeeds, store in database
      await uploadMessage({
        message: text,
        channelId,
        isDM,
      });

    } catch (err) {
      console.error("💔 Failed to send message:", err);
      // Show error to user
      alert('Failed to send message. Please check your connection and try again.');
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`bg-white/10 backdrop-blur-md p-2 rounded-lg text-white max-w-lg
              ${msg.senderId === currentUserId ? 'bg-blue-600/50' : 'bg-gray-600/50'}`}
            >
              <div className="text-sm">{msg.content}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput sendMessage={handleSend} />
    </div>
  );
  );
}