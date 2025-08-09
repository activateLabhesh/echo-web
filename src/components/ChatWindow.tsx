"use client";

import { useEffect, useRef, useState } from "react";
//import { Video, Phone, Plus } from "lucide-react";
import {socket} from "@/socket";


const channelId="room123"; //change this to userid for dms and channelid for channels
const senderId= "SENDER"; //this will be the display name of user 

import MessageInput from "./MessageInput";
import { fetchMessages, uploadMessage } from "@/app/api/API";

interface ChatWindowProps {
  channelId: string;
  isDM: boolean;
}

export default function ChatWindow({ channelId, isDM }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const res = await fetchMessages(channelId, isDM);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  useEffect(() => {
    if (channelId) loadMessages();
  }, [channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    console.log('Socket initialized:', socket.connected);
  
    if (!socket.connected) {
      console.log('Connecting socket...');
      socket.connect();
    }
  
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });
  
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
  
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  useEffect(() => {
    // Join the room
    socket.emit("join_room", channelId);
  
    // Listen for messages
    const handleIncomingMessage = (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          name: data.senderId,
          isSender: data.senderId === senderId,
          message: data.content,
          avatarUrl: data.senderId === senderId ? "/User_profil.png" : "https://avatars.dicebear.com/api/bottts/pranav.svg",
          timestamp: new Date().toISOString(),
        },
      ]);
    };
  
    socket.on("chat_message", handleIncomingMessage);
  
    return () => {
      socket.off("chat_message", handleIncomingMessage);
    };
  }, []);
  
  const sendMessage = (text: string) => {
    console.log("Message sent");
    if (!text.trim()) return;
  
    socket.emit("chat_message", {
      channelId,
      senderId,
      content: text,
    });
  const handleSend = async (msg: string) => {
    try {
      const newMsg = await uploadMessage({
        message: msg,
        senderId: "yourUserId", // Replace with actual user ID
        channelId,
        isDM,
      });
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="bg-white/10 backdrop-blur-md p-2 rounded-lg text-white max-w-lg"
          >
            {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput sendMessage={handleSend} />
    </div>
  );
  }
}

