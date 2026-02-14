"use client";

import { useEffect, useState } from "react";
import { getUserDMs } from "@/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

const ClientOnlyTimestamp = ({ time }: { time: string }) => {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    setFormatted(`${hours}:${minutes}`);
  }, [time]);

  return <span>{formatted}</span>;
};

const ChatItem = ({
  chat,
  isSelected,
  onClick,
}: {
  chat: any;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className={`cursor-pointer px-4 py-2 rounded-lg ${
      isSelected ? "bg-gray-800" : "hover:bg-gray-800"
    }`}
  >
    <div className="flex justify-between items-center">
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{chat.recipientName || "Unknown"}</p>
        <p className="text-sm text-blue-400 truncate">{chat.lastMessage}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="text-xs text-gray-400">
          <ClientOnlyTimestamp time={chat.updatedAt} />
        </div>
        {chat.unread_count > 0 && (
          <span className="bg-green-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 font-bold">
            {chat.unread_count > 99 ? '99+' : chat.unread_count}
          </span>
        )}
      </div>
    </div>
  </div>
);

export default function ChatList() {
  const [dms, setDms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const selected = searchParams.get("dm");

  useEffect(() => {
    const fetchDMs = async () => {
      try {
        setLoading(true);
        if (typeof window === "undefined") return;

        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("No token found in localStorage");
          return;
        }

        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub;

        if (!userId) {
          console.error("User ID not found in token");
          return;
        }

        const response = await getUserDMs();
        const data = response?.data || response;
        
        // Transform threads to DM format with unread counts
        const threads = data?.threads || [];
        const transformedDMs = threads.map((thread: any) => {
          const otherUser = thread.other_user;
          const messages = thread.messages || [];
          const lastMsg = messages[messages.length - 1];
          
          return {
            _id: thread.thread_id,
            recipientId: thread.recipient_id || otherUser?.id,
            recipientName: otherUser?.username || otherUser?.fullname || "Unknown",
            lastMessage: lastMsg?.content || "No messages yet",
            updatedAt: lastMsg?.timestamp || new Date().toISOString(),
            unread_count: thread.unread_count || 0
          };
        });
        
        setDms(transformedDMs);
      } catch (err) {
        console.error("Failed to load DMs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDMs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/messages/new?username=${encodeURIComponent(searchTerm)}`);
    setSearchTerm("");
    setSearchOpen(false);
  };

  return (
    <div className="w-72 bg-black text-white p-4 flex flex-col gap-4 border-r border-gray-800 overflow-y-auto">
      {/* Header row */}

      <div className="flex items-center justify-between">
        
          <>
            <h2 className="text-xl font-semibold">Messages</h2>
           
          </>
        
        
        
      </div>
      {/* DM list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg bg-gray-800/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-gray-700" />
                  <div className="h-3 w-3/4 rounded bg-gray-700/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : dms.length === 0 ? (
        <p className="text-gray-400 text-sm">No DMs yet</p>
      ) : (
        dms.map((dm, idx) => (
          <ChatItem
            key={dm._id || idx}
            chat={dm}
            isSelected={selected === dm.recipientId}
            onClick={() => router.push(`/messages?dm=${dm.recipientId}`)}
          />
        ))
      )}
    </div>
  );
}
