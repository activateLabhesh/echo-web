"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bell, MoreVertical, Paperclip, Search, Send, Smile, X } from 'lucide-react';
import { getUserDMs, uploaddm, markThreadAsRead } from '@/api/message.api'; 
import { fetchUserProfile } from '@/api/profile.api'; 
import { Socket } from "socket.io-client";
import { createAuthSocket } from '@/socket';
import MessageBubble from './MessageBubble';
import MessageAttachment from './MessageAttachment';
import Loader from "@/components/Loader";
import { useMessageNotifications } from '@/contexts/MessageNotificationContext';
import Toast from "@/components/Toast";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";


const EmojiPicker = dynamic(
  () => import("emoji-picker-react"),
  { ssr: false }
);


interface User {
    id: string;
    fullname: string; 
    avatar_url?: string;
}



interface DirectMessage {
    id: string;
    content: string;
    sender_id: string; 
    receiver_id: string; 
    timestamp: string;
    thread_id?: string;
    media_url?: string | null;
}

const getInitials = (name: string = "") => {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("")
        .slice(0, 2) || "?";
};

type GroupedSection = {
    dayLabel: string;
    groups: Array<{
        key: string;
        senderId: string;
        name: string;
        isSender: boolean;
        avatarUrl?: string;
        messages: Array<DirectMessage & { timeLabel: string }>;
    }>;
};

// 1. ChatList Component (Updated to show errors)

interface ChatListProps {
    conversations: { user: User, lastMessage: string, unreadCount: number }[];
    activeDmId: string | null;
    onSelectDm: (userId: string) => void;
    isLoading: boolean;
    error: string | null;
}

const ChatList: React.FC<ChatListProps> = ({ conversations, activeDmId, onSelectDm, isLoading, error }) => {
    const [query, setQuery] = useState("");

    const filteredConversations = useMemo(() => {
        if (!query.trim()) return conversations;
        const lowered = query.trim().toLowerCase();
        return conversations.filter(({ user, lastMessage }) =>
            user.fullname.toLowerCase().includes(lowered) ||
            lastMessage.toLowerCase().includes(lowered)
        );
    }, [conversations, query]);

    return (
        <aside className="hidden h-full w-80 flex-col border-r border-slate-800 bg-black p-4 backdrop-blur-lg lg:flex">
            <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-100">Direct Messages</h2>
                <p className="mt-1 text-xs text-slate-400">
                    Catch up with teammates and friends in real time.
                </p>
            </div>

            <label className="group mb-4 flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 focus-within:border-indigo-500/60 focus-within:text-indigo-300">
                <Search className="h-4 w-4" />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search conversations"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
            </label>

            <div className="chat-scroll flex-1 space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                    <ul className="space-y-2">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <li
                                key={idx}
                                className="animate-pulse rounded-xl border border-slate-800/60 bg-slate-900/50 p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-800/60" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-1/2 rounded-full bg-slate-800/70" />
                                        <div className="h-3 w-3/4 rounded-full bg-slate-800/50" />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : error ? (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                        {error}
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4 text-center text-sm text-slate-400">
                        No conversations found. Try another name.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {filteredConversations.map(({ user, lastMessage, unreadCount }) => {
                            const isActive = activeDmId === user.id;
                            return (
                                <li
                                    key={user.id}
                                    onClick={() => onSelectDm(user.id)}
                                    className={`group flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-indigo-500/40 hover:bg-slate-800/40 ${
                                        isActive ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]' : ''
                                    }`}
                                >
                                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-700/60 bg-slate-800/60">
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.fullname}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-300">
                                                {getInitials(user.fullname)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`truncate text-sm font-medium ${isActive ? 'text-slate-100' : 'text-slate-200'}`}>
                                                {user.fullname}
                                            </p>
                                            {unreadCount > 0 && !isActive && (
                                                <span className="flex-shrink-0 bg-green-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 font-bold">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate text-xs text-slate-400 group-hover:text-slate-300">
                                            {lastMessage || 'No messages yet.'}
                                        </p>
                                    </div>
                                    {isActive && <div className="h-2 w-2 rounded-full bg-indigo-400" />}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </aside>
    );
};

// 2. ChatWindow Component (No changes needed)

interface ChatWindowProps {
    activeUser: User | null;
    messages: DirectMessage[];
    currentUser: User | null;
    partnerId: string | null;
    allUsers: User[];
    onSendMessage: (message: string, file: File | null) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ activeUser, messages, currentUser, partnerId, allUsers, onSendMessage }) => {
    const [draft, setDraft] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const timeFormatter = useMemo(
        () => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }),
        []
    );
    const dayFormatter = useMemo(
        () => new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        []
    );

    const groupedMessages = useMemo<GroupedSection[]>(() => {
        if (!messages.length) return [];

        const sections: GroupedSection[] = [];
        const partner = partnerId ? allUsers.find(u => u.id === partnerId) || activeUser : activeUser;

        messages.forEach((message) => {
            const timestamp = new Date(message.timestamp);
            const dayLabel = Number.isNaN(timestamp.getTime()) ? 'Recent' : dayFormatter.format(timestamp);
            let section = sections[sections.length - 1];
            if (!section || section.dayLabel !== dayLabel) {
                section = { dayLabel, groups: [] };
                sections.push(section);
            }

            const senderId = message.sender_id;
            const isSender = senderId === currentUser?.id;
            const name = isSender ? 'You' : partner?.fullname ?? 'Unknown User';
           const avatarUrl = isSender
             ? currentUser?.avatar_url ?? "/User_profil.png"
             : partner?.avatar_url ?? "/User_profil.png";


            let group = section.groups[section.groups.length - 1];
            if (!group || group.senderId !== senderId) {
                group = {
                    key: `${dayLabel}-${partnerId}-${isSender ? 'me' : 'them'}-${message.id}`,
                    senderId,
                    name,
                    isSender,
                    avatarUrl,
                    messages: [],
                };
                section.groups.push(group);
            }

            group.messages.push({
                ...message,
                timeLabel: Number.isNaN(timestamp.getTime()) ? '' : timeFormatter.format(timestamp),
            });
        });

        return sections;
    }, [messages, currentUser?.id, partnerId, allUsers, dayFormatter, timeFormatter]);

    const handleSend = (value: string) => {
        if (value.length === 0 && !file) return; // ← NO trim
        onSendMessage(value, file);
        setDraft('');
        setFile(null);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!showEmojiPicker) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
            emojiPickerRef.current &&
            !emojiPickerRef.current.contains(event.target as Node)
            ) {
            setShowEmojiPicker(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showEmojiPicker]);


    if (!activeUser) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-black text-slate-400">
                <div className="rounded-full border border-slate-800/70 bg-slate-900/50 p-6">
                    <Paperclip className="h-8 w-8 text-slate-500" />
                </div>
                <div className="text-center">
                    <p className="font-medium text-slate-200">Select a conversation</p>
                    <p className="mt-1 text-sm text-slate-400">
                        Choose someone from the list to start chatting.
                    </p>
                </div>
            </div>
        );
    }

    const recipientFirstName = activeUser.fullname.split(' ')[0] || activeUser.fullname;

    return (
        <div className="flex h-full flex-1 flex-col bg-black backdrop-blur">
            <header className="flex items-center justify-between border-b border-slate-800/80 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-800/70 bg-slate-900/70">
                        {activeUser.avatar_url ? (
                            <img src={activeUser.avatar_url} alt={activeUser.fullname} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-slate-200">
                                {getInitials(activeUser.fullname)}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-100">{activeUser.fullname}</h3>
                        <p className="text-xs text-slate-400">Direct message • {messages.length} {messages.length === 1 ? 'message' : 'messages'}</p>
                    </div>
                </div>
                {/* <div className="flex items-center gap-2 text-slate-400">
                    <button className="rounded-full border border-slate-800/70 p-2 transition-colors hover:border-indigo-500/50 hover:text-slate-100" aria-label="Search in conversation">
                        <Search className="h-4 w-4" />
                    </button>
                    <button className="rounded-full border border-slate-800/70 p-2 transition-colors hover:border-indigo-500/50 hover:text-slate-100" aria-label="Notifications">
                        <Bell className="h-4 w-4" />
                    </button>
                    <button className="rounded-full border border-slate-800/70 p-2 transition-colors hover:border-indigo-500/50 hover:text-slate-100" aria-label="More options">
                        <MoreVertical className="h-4 w-4" />
                    </button>
                </div> */}
            </header>

            <div className="chat-scroll flex-1 space-y-8 overflow-y-auto px-6 py-8">
                {groupedMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                        <p>No messages yet.</p>
                        <p className="text-sm">Say hi to start the conversation!</p>
                    </div>
                ) : (
                    groupedMessages.map((section) => (
                        <div key={section.dayLabel} className="space-y-4">
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span className="flex-1 border-t border-slate-800/70" />
                                <span className="rounded-full border border-slate-800/60 bg-slate-900/60 px-3 py-1 uppercase tracking-wide text-slate-300">
                                    {section.dayLabel}
                                </span>
                                <span className="flex-1 border-t border-slate-800/70" />
                            </div>
                            <div className="space-y-5">
                                        {section.groups.map((group) => (
                                    <div key={group.key} className="space-y-2">
                                        {group.messages.map((msg, index) => (
                                            <MessageBubble
                                                key={msg.id}
                                                isSender={group.isSender}
                                                message={msg}
                                                timestamp={msg.timeLabel}
                                                name={!group.isSender && index === 0 ? group.name : undefined}
                                                avatarUrl={group.avatarUrl}
                                            >
                                                {msg.media_url && (
                                                    <MessageAttachment media_url={msg.media_url} />
                                                )}
                                            </MessageBubble>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            <footer className="relative border-t border-slate-800/80 bg-slate-900/70 px-6 py-5">
                {file && (
                    <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                        <div className="flex items-center gap-3">
                            <Paperclip className="h-4 w-4 text-indigo-300" />
                            <span className="truncate max-w-[220px]">{file.name}</span>
                            <span className="text-xs text-slate-400">{Math.round(file.size / 1024)} KB</span>
                        </div>
                        <button
                            onClick={() => setFile(null)}
                            className="rounded-full border border-slate-800/70 p-1 text-slate-400 transition-colors hover:border-rose-500/50 hover:text-rose-300"
                            aria-label="Remove attachment"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-4 py-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full border border-slate-800/70 p-2 text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
                        aria-label="Attach file"
                    >
                        <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Add reaction"
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className="rounded-full border border-slate-800/70 p-2 text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
                        >
                        <Smile className="h-4 w-4" />
                        </button>

                    <input
                        type="text"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                handleSend(draft);
                            }
                        }}
                        placeholder={`Message @${recipientFirstName}`}
                        className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    />
                    {showEmojiPicker && (
                        <div
                            ref={emojiPickerRef}
                            className="absolute bottom-20 left-6 z-50"
                        >
                            <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={(emojiData) => {
                                setDraft(prev => prev + emojiData.emoji);
                            }}
                            />
                        </div>
                    )}

                    <button
                        onClick={() => handleSend(draft)}
                        className="flex items-center gap-2 rounded-full bg-indigo-500/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                    >
                        <span>Send</span>
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </footer>
        </div>
    );
};

// =============================================================
// 3. Main Page Content (Parent Component with updated logic)
// =============================================================
function MessagesPageContentInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedDM = searchParams.get("dm");
    const { refreshCount: refreshMessageNotifications, unreadPerThread } = useMessageNotifications();

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [activeDmId, setActiveDmId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Map<string, DirectMessage[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

const socketRef = useRef<Socket | null>(null);

// Single socket setup and event wiring
useEffect(() => {
    if (!currentUser?.id) return;

    // Create socket once
    if (!socketRef.current) {
        const newSocket = createAuthSocket(currentUser.id);
        socketRef.current = newSocket;
    }

    const socket = socketRef.current!;

    const handleNewMessage = (raw: any) => {
        try {
            if (!raw) return;
            // Unwrap common envelope shapes
            const incoming = (raw as any)?.data ?? (raw as any)?.message ?? raw;
            if (!incoming) return;
            if (Array.isArray(incoming)) {
                incoming.forEach(handleNewMessage);
                return;
            }

            // Normalize fields from various possible keys
            // Standardize to canonical DM shape
            const sender = String(
            incoming.sender_id ??
            incoming.senderId ??
            incoming.from ??
            incoming.userId ??
            incoming.user ??
            ""
            );

            const receiver = String(
            incoming.receiver_id ??
            incoming.receiverId ??
            incoming.to ??
            incoming.targetId ??
            ""
            );

            const incomingMsg: DirectMessage = {
            id: String(incoming.id ?? incoming.message_id ?? incoming.clientMessageId ?? `sock-${Date.now()}`),
            content: String(incoming.content ?? incoming.message ?? ""),
            sender_id: sender,
            receiver_id: receiver,
            timestamp: String(incoming.timestamp ?? new Date().toISOString()),
            media_url: incoming.media_url ?? incoming.mediaUrl ?? null,
            };

            const selfId = currentUser?.id;
            let partnerId = incomingMsg.sender_id;
            if (partnerId === selfId) partnerId = incomingMsg.receiver_id;
            if (!partnerId) return console.warn("Missing partner for DM:", incomingMsg);

            if (!partnerId) {
                console.warn("Incoming DM missing partner id", incoming);
                return;
            }

            setMessages(prevMap => {
                const newMap = new Map(prevMap);
                const currentDms = newMap.get(partnerId) || [];

                // De-duplicate: remove optimistic message with same sender+content close in time
                const thresholdMs = 60_000; // 60s window
                const incTime = Date.parse(incomingMsg.timestamp);
                let updated = currentDms.filter(m => {
                    const sameSender = m.sender_id === incomingMsg.sender_id;
                    const sameContent = (m.content || "") === (incomingMsg.content || "");
                    const mTime = Date.parse(m.timestamp);
                    const nearInTime = Number.isFinite(incTime) && Number.isFinite(mTime)
                        ? Math.abs(mTime - incTime) < thresholdMs
                        : false;
                    return !(sameSender && sameContent && nearInTime);
                });

                // If exact id exists, avoid duplicate; otherwise append to the end (arrival order)
                if (!updated.some(m => m.id === incomingMsg.id)) {
                    updated = [...updated, incomingMsg];
                }

                newMap.set(partnerId, updated);
                return newMap;
            });
        } catch (e) {
            console.error("Failed to handle incoming DM:", e, raw);
        }
    };

    const handleError = (errorMessage: any) => {
        console.error("Socket DM Error:", errorMessage);
    };

    const onConnect = () => {
        // Connected
    };

    socket.on("connect", onConnect);
    socket.on("dm_sent_confirmation", handleNewMessage);
    socket.on("receive_dm", handleNewMessage);
    socket.on("dm_error", handleError);

    return () => {
        socket.off("connect", onConnect);
        socket.off("dm_sent_confirmation", handleNewMessage);
        socket.off("receive_dm", handleNewMessage);
        socket.off("dm_error", handleError);
        socket.disconnect();
        socketRef.current = null;
    };
}, [currentUser?.id]);


    // Effect to get user and initialize socket
    useEffect(() => {
        const userItem = localStorage.getItem("user");
        if (userItem) {
            const loggedInUser = JSON.parse(userItem);
            setCurrentUser(loggedInUser);
        } else {
            router.push('/');
        }
    }, [router]);
  useEffect(() => {
    if (!currentUser?.id || !currentUser.avatar_url) return;

    const bustedUrl = `${currentUser.avatar_url}?t=${Date.now()}`;

    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id ? { ...u, avatar_url: bustedUrl } : u
      )
    );
  }, [currentUser?.avatar_url]);


    
    // Removed duplicate socket setup effect; handled in single effect above

    // --- EFFECT TO FETCH HISTORICAL DMS (with improved error logging) ---
    useEffect(() => {
        // Ensure we have a valid user before fetching
        if (currentUser && currentUser.id) {
            const fetchDms = async () => {
                try {
                    setIsLoading(true);
                    setError(null);
                    const payload = await getUserDMs();

                    // Normalize different possible response shapes
                    const top = (payload as any)?.data ?? payload;
                    let threads: any[] = [];
                    if (Array.isArray(top)) {
                        threads = top;
                    } else if (Array.isArray((top as any)?.threads)) {
                        threads = (top as any).threads;
                    } else if (Array.isArray((top as any)?.data)) {
                        threads = (top as any).data;
                    } else {
                        console.warn("Unexpected DM response shape", top);
                        threads = [];
                    }

                    const users: User[] = [];
                    const messagesMap = new Map<string, DirectMessage[]>();

                    threads.forEach((thread: any) => {
                        // Two possible shapes supported:
                        // A) { other_user: { id, username/fullname/name, avatar_url }, messages: [...] }
                        // B) { recipientId, recipientName, lastMessage, updatedAt, messages?: [...] }
                        const other = thread.other_user;
                        if (other && other.id) {
                            const name = other.fullname || other.username || other.name || other.display_name || "Unknown User";
                            users.push({id: String(other.id), fullname: name, avatar_url: other.avatar_url ?? null,});
                            if (Array.isArray(thread.messages)) {
                                const sorted = thread.messages
                                    .map((m: any) => ({
                                        id: String(m.id ?? `${other.id}-${m.timestamp ?? Math.random()}`),
                                        content: m.content ?? m.message ?? "",
                                        sender_id: String(m.sender_id ?? m.senderId ?? ""),
                                        receiver_id: String(m.receiver_id ?? m.receiverId ?? other.id),
                                        timestamp: String(m.timestamp ?? new Date().toISOString()),
                                        thread_id: m.thread_id,
                                        media_url: m.media_url ?? null,
                                    }))
                                    .sort((a: DirectMessage, b: DirectMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                messagesMap.set(String(other.id), sorted);
                            }
                        } else if (thread.recipientId) {
                            const rid = String(thread.recipientId);
                            const name = thread.recipientName || "Unknown User";
                            users.push({ id: rid, fullname: name });
                            if (Array.isArray(thread.messages)) {
                                const sorted = thread.messages
                                    .map((m: any) => ({
                                        id: String(m.id ?? `${rid}-${m.timestamp ?? Math.random()}`),
                                        content: m.content ?? m.message ?? "",
                                        sender_id: String(m.sender_id ?? m.senderId ?? ""),
                                        receiver_id: String(m.receiver_id ?? m.receiverId ?? rid),
                                        timestamp: String(m.timestamp ?? new Date().toISOString()),
                                        thread_id: m.thread_id,
                                        media_url: m.media_url ?? null,
                                    }))
                                    .sort((a: DirectMessage, b: DirectMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                messagesMap.set(rid, sorted);
                            } else if (thread.lastMessage) {
                                // Minimal conversation with lastMessage only
                                const minimal: DirectMessage = {
                                    id: `${rid}-last`,
                                    content: thread.lastMessage,
                                    sender_id: "",
                                    receiver_id: rid,
                                    timestamp: String(thread.updatedAt ?? new Date().toISOString()),
                                } as DirectMessage;
                                messagesMap.set(rid, [minimal]);
                            }
                        }
                    });

                    setAllUsers(users);
                    setMessages(messagesMap);

                } catch (error: any) {
                    console.error("--- DETAILED FETCH ERROR ---");
                    console.error(error);
                    if (error.response) {
                        console.error("Backend Response Data:", error.response.data);
                    }
                    setError("Failed to load conversations. Check console for details.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDms();
        }
    }, [currentUser]);


    // Effect to set the active DM based on the URL parameter
    // If user not in allUsers, fetch their profile and add them
    // Effect to set the active DM based on the URL parameter
    // If user not in allUsers, fetch their profile and add them
    useEffect(() => {
        if (!selectedDM || !currentUser) return;

        // Check if user already exists
        const userExists = allUsers.some(u => u.id === selectedDM);
        
        if (userExists) {
            // User exists, just set as active
            setActiveDmId(selectedDM);
            return; // Exit early, no fetch needed
        }

        // User doesn't exist, fetch their profile
        let isCancelled = false;
        
        const fetchAndAddUser = async () => {
            try {
                const profile = await fetchUserProfile(selectedDM);
                
                // Don't update if effect was cleaned up
                if (isCancelled) return;
                
                if (profile) {
                    const newUser: User = {
                        id: profile.id || selectedDM,
                        fullname: profile.fullname || profile.username || profile.name || "Unknown User",
                        avatar_url: profile.avatar_url,
                    };
                    
                    // Add user to allUsers if not already present
                    setAllUsers(prev => {
                        if (prev.some(u => u.id === selectedDM)) return prev;
                        return [...prev, newUser];
                    });
                    
                    // Initialize empty messages for this user
                    setMessages(prev => {
                        if (prev.has(selectedDM)) return prev;
                        const newMap = new Map(prev);
                        newMap.set(selectedDM, []);
                        return newMap;
                    });
                    
                    setActiveDmId(selectedDM);
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error("Failed to fetch user profile for DM:", error);
                }
            }
        };
        
        fetchAndAddUser();
        
        // Cleanup function
        return () => {
            isCancelled = true;
        };
    }, [selectedDM, currentUser?.id, allUsers.length]); // Use allUsers.length instead of allUsers
// Empty dependency array is okay here due to the functional updates.
    // Effect for handling incoming socket events

    const handleSendMessage = async (content: string, file: File | null) => {
        if (!currentUser || !activeDmId) return;
        if (!content.trim() && !file) return; // allow media-only messages

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const tempMessage: DirectMessage = {
            id: tempId,
            content: content,        
            sender_id: currentUser.id,
            receiver_id: activeDmId,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => {
            const newMap = new Map(prev);
            const list = newMap.get(activeDmId) || [];
            const updated = [...list, tempMessage]; // keep arrival order
            newMap.set(activeDmId, updated);
            return newMap;
        });

        // Send via API route only; backend will broadcast via socket
        try {
            const dmPayload = {
                sender_id: currentUser.id,
                receiver_id: activeDmId,
                message: content,
                mediaurl: file ?? undefined,
            };


            const saved = await uploaddm(dmPayload);
            if (!saved) {
                console.warn("DM upload returned no data");
            }
            // Optionally reconcile temp message with saved (id/media_url) if backend doesn't echo quickly
            if (saved && (saved.id || saved.media_url)) {
                setMessages(prev => {
                    const newMap = new Map(prev);
                    const list = newMap.get(activeDmId) || [];
                    const idx = list.findIndex(m => m.id === tempId);
                    if (idx !== -1) {
                        const next = [...list];
                        next[idx] = {
                            ...next[idx],
                            id: String(saved.id ?? tempId),
                            media_url: saved.media_url ?? next[idx].media_url ?? null,
                            content: saved.content ?? saved.message ?? next[idx].content,
                            timestamp: String(saved.timestamp ?? next[idx].timestamp),
                        } as DirectMessage;
                        newMap.set(activeDmId, next);
                    }
                    return newMap;
                });
            }
        } catch (e) {
            console.error("Failed to send DM via API:", e);
            // Roll back optimistic message on error
            setMessages(prev => {
                const newMap = new Map(prev);
                const list = (newMap.get(activeDmId) || []).filter(m => m.id !== tempId);
                newMap.set(activeDmId, list);
                return newMap;
            });
        }
    };

    const handleSelectDm = useCallback((userId: string) => {
        setActiveDmId(userId);
        router.push(`/messages?dm=${userId}`);
    }, [router]);
    
    // Mark thread as read when user opens a DM
    useEffect(() => {
        if (!activeDmId || !currentUser?.id) return;
        
        const markAsRead = async () => {
            try {
                // Get messages for this DM to find the thread_id
                const userMessages = messages.get(activeDmId);
                if (!userMessages || userMessages.length === 0) {
                    return;
                }
                
                // Get thread_id from any message (they all share the same thread_id)
                const threadId = userMessages[0]?.thread_id;
                if (!threadId) {
                    return;
                }
                
                // Mark thread as read
                await markThreadAsRead(threadId);
                
                // Immediately refresh unread counts to update badges
                await refreshMessageNotifications();
            } catch (error) {
                console.error('Failed to mark thread as read:', error);
            }
        };
        
        // Small delay to ensure messages are loaded
        const timeoutId = setTimeout(markAsRead, 100);
        return () => clearTimeout(timeoutId);
    }, [activeDmId, currentUser?.id]);
    
    const conversations = useMemo(() => {
        return allUsers.map(user => {
            const userMessages = messages.get(user.id) || [];
            const lastMessageObj = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
            let lastMessage = "No messages yet.";
            let timestamp = new Date(0).toISOString(); // Default to epoch
            
            if (lastMessageObj) {
                const isSender = lastMessageObj.sender_id === currentUser?.id;
                const content = lastMessageObj.media_url ? "Sent an attachment" : (lastMessageObj.content || "");
                const prefix = isSender ? "You: " : `${user.fullname}: `;
                lastMessage = `${prefix}${content}`.trim();
                timestamp = lastMessageObj.timestamp;
            }
            
            // Get unread count from context
            const threadId = lastMessageObj?.thread_id;
            const unreadCount = threadId ? unreadPerThread[threadId] || 0 : 0;
            
            return { 
                user, 
                lastMessage, 
                timestamp,
                unreadCount 
            };
        }).sort((a, b) => {
            // Sort by timestamp descending (newest first)
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA;
        });
    }, [allUsers, messages, currentUser?.id, unreadPerThread]);

    const activeUser = useMemo(() => {
      return allUsers.find((u) => u.id === activeDmId) || null;
    }, [allUsers, activeDmId]);

    const activeMessages = activeDmId ? messages.get(activeDmId) || [] : [];

    return (
        <div className="flex h-screen min-h-0 w-full bg-slate-950 text-slate-100">
            <ChatList 
                conversations={conversations} 
                activeDmId={activeDmId} 
                onSelectDm={handleSelectDm}
                isLoading={isLoading} 
                error={error}
            />
            <div className="flex flex-1 flex-col">
                <div className="border-b border-slate-800/70 bg-black px-4 py-3 lg:hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-100">Direct Messages</h2>
                            <p className="text-xs text-slate-400">Tap a friend to open the chat.</p>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-3 overflow-x-auto">
                        {conversations.map(({ user }) => {
                            const isActive = activeDmId === user.id;
                            return (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectDm(user.id)}
                                    className={`flex min-w-[64px] flex-col items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition-colors ${
                                        isActive
                                            ? 'border-indigo-400/70 bg-indigo-500/10 text-indigo-100'
                                            : 'border-slate-800/70 bg-slate-900/60 text-slate-300'
                                    }`}
                                >
                                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-800/70 bg-slate-800/60">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.fullname} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-200">
                                                {getInitials(user.fullname)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="truncate text-center text-[11px] leading-tight">{user.fullname.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <ChatWindow 
                        activeUser={activeUser}
                        messages={activeMessages} 
                        currentUser={currentUser}
                        partnerId={activeDmId}
                        allUsers={allUsers}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            </div>
        </div>
    );
}

export default function MessagesPageContent() {
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

  useEffect(() => {
    setToast({
      message: "Loading messages…",
      type: "info",
    });
  }, []);

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
      <Suspense fallback={<div className="h-screen bg-black" />}>
        <MessagesPageContentInner />
      </Suspense>
    </>
  );
}