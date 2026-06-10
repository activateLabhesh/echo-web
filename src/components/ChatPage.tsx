"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePageReady } from "@/components/RouteChangeLoader";
import {
  Bell,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Smile,
  X,
} from "lucide-react";
import {
  getUserDMs,
  uploaddm,
  getDmThreadMessages,
  markThreadAsRead,
  invalidateUserDmCache,
  searchDmMessages,
} from "@/api/message.api";
import { fetchUserProfile } from "@/api/profile.api";
import { Socket } from "socket.io-client";
import { createAuthSocket } from "@/socket";
import MessageBubble from "./MessageBubble";
import MessageAttachment from "./MessageAttachment";
import Loader from "@/components/Loader";
import { useMessageNotifications } from "@/contexts/MessageNotificationContext";
import Toast from "@/components/Toast";
import { useToast } from "@/contexts/ToastContext";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import UserProfileModal from "./UserProfileModal";
import { useMessageReactions } from "@/hooks/useMessageReactions";
// import { usePinnedMessages } from "@/hooks/usePinnedMessages";
import MessageSearchPanel from "./MessageSearchPanel";
// import PinnedMessagesBar from "./PinnedMessagesBar";
import { MessageSearchResult } from "@/api/types/message.types";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

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
  media_type?: string;
  replyTo?: {
    id: string | number;
    content: string;
    author?: string;
    mediaUrl?: string | null;
    mediaType?: string;
  } | null;
}

type DMReplyTarget = {
  id: string | number;
  content: string;
  author?: string;
  mediaUrl?: string | null;
  mediaType?: string;
} | null;
interface SelectedFile {
  file: File;
  valid: boolean;
  errorReason?: string;
}

const getInitials = (name: string = "") => {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2) || "?"
  );
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
  conversations: { user: User; lastMessage: string; unreadCount: number }[];
  activeDmId: string | null;
  onSelectDm: (userId: string) => void;
  isLoading: boolean;
  error: string | null;
}

const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeDmId,
  onSelectDm,
  isLoading,
  error,
}) => {
  const [query, setQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!query.trim()) return conversations;
    const lowered = query.trim().toLowerCase();
    return conversations.filter(
      ({ user, lastMessage }) =>
        user.fullname.toLowerCase().includes(lowered) ||
        lastMessage.toLowerCase().includes(lowered)
    );
  }, [conversations, query]);

  return (
    <aside className="hidden h-full w-80 flex-col border-r border-slate-800 bg-black p-4 backdrop-blur-lg lg:flex">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-100">
          Direct Messages
        </h2>
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
                    isActive
                      ? "border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]"
                      : ""
                  }`}
                >
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-slate-700/60 bg-slate-800/60">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.fullname}
                        className="h-10 w-10 object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden"
                          );
                        }}
                      />
                    ) : null}
                    <div
                      className={`flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-300 ${
                        user.avatar_url ? "hidden" : ""
                      }`}
                    >
                      {getInitials(user.fullname)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm font-medium ${
                          isActive ? "text-slate-100" : "text-slate-200"
                        }`}
                      >
                        {user.fullname}
                      </p>
                      {unreadCount > 0 && !isActive && (
                        <span className="flex-shrink-0 bg-green-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 font-bold">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400 group-hover:text-slate-300">
                      {lastMessage || "No messages yet."}
                    </p>
                  </div>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-indigo-400" />
                  )}
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
  onLoadOlderMessages?:()=> void;
  activeUser: User | null;
  messages: DirectMessage[];
  currentUser: User | null;
  partnerId: string | null;
  threadId: string | null;
  allUsers: User[];
  onSendMessage: (
    message: string,
    files: File[],
    replyTo?: DMReplyTarget
  ) => void;
  onFileError: (msg: string) => void;
  onOpenProfile: (
    userId: string,
    fallbackName?: string,
    fallbackAvatar?: string
  ) => void;
  onToast: (msg: string, type: "info" | "success" | "error") => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  onLoadOlderMessages,
  activeUser,
  messages,
  currentUser,
  partnerId,
  threadId,
  allUsers,
  onSendMessage,
  onFileError,
  onToast,
  onOpenProfile,
}) => {
  const messageIds = useMemo(
    () => messages.map((msg) => msg.id).filter(Boolean),
    [messages]
  );

  const { getReactionsForMessage, toggleReaction } = useMessageReactions({
    mode: "dm",
    currentUserId: currentUser?.id ?? null,
    messageIds,
  });

  // const { pins, isPinned, togglePin, unpin, canPinMore } = usePinnedMessages({
  //   threadId,
  //   onError: (message) => onToast(message, "error"),
  // });

  const { showToast } = useToast();
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<DMReplyTarget>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  interface SelectedFile {
    file: File;
    valid: boolean;
    errorReason?: string;
  }
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftInputRef = useRef<HTMLTextAreaElement>(null);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );
  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const messagesContainerRef = useRef<HTMLDivElement>(null);

const handleDmScroll = (
  e: React.UIEvent<HTMLDivElement>
) => {
  const container = e.currentTarget;

  if (container.scrollTop < 100) {
    onLoadOlderMessages?.();
  }
};

  const groupedMessages = useMemo<GroupedSection[]>(() => {
    if (!messages.length) return [];

    const sections: GroupedSection[] = [];
    const partner = partnerId
      ? allUsers.find((u) => u.id === partnerId) || activeUser
      : activeUser;

    messages.forEach((message) => {
      const timestamp = new Date(message.timestamp);
      const dayLabel = Number.isNaN(timestamp.getTime())
        ? "Recent"
        : dayFormatter.format(timestamp);
      let section = sections[sections.length - 1];
      if (!section || section.dayLabel !== dayLabel) {
        section = { dayLabel, groups: [] };
        sections.push(section);
      }

      const senderId = message.sender_id;
      const isSender = senderId === currentUser?.id;
      const name = isSender ? "You" : (partner?.fullname ?? "Unknown User");
      const avatarUrl = isSender
        ? currentUser?.avatar_url
        : partner?.avatar_url;
      let group = section.groups[section.groups.length - 1];
      if (!group || group.senderId !== senderId) {
        group = {
          key: `${dayLabel}-${partnerId}-${isSender ? "me" : "them"}-${
            message.id
          }`,
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
        timeLabel: Number.isNaN(timestamp.getTime())
          ? ""
          : timeFormatter.format(timestamp),
      });
    });

    return sections;
  }, [
    messages,
    currentUser?.id,
    partnerId,
    allUsers,
    dayFormatter,
    timeFormatter,
  ]);
  const scrollToMessage = useCallback(async (messageId: string) => {
    const el =
      messageRefs.current[messageId] ??
      (document.querySelector(
        `[data-message-id="${messageId}"]`
      ) as HTMLElement | null);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("mention-highlight");
      setTimeout(() => el.classList.remove("mention-highlight"), 1500);
      return true;
    }
    return false;
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!threadId) return [];
      return searchDmMessages(threadId, query);
    },
    [threadId]
  );

  const handleSearchSelect = useCallback(
    async (result: MessageSearchResult) => {
      const success = await scrollToMessage(result.id);
      if (!success) {
        onToast("Could not find that message in this conversation.", "error");
      }
    },
    [scrollToMessage, onToast]
  );

  const canSend = draft.length > 0 || files.some((f) => f.valid);
  const handleSend = (value: string) => {
    const validFiles = files.filter((f) => f.valid).map((f) => f.file);
    if (value.trim().length === 0 && validFiles.length === 0) return;
    onSendMessage(value, validFiles, replyingTo);
    setDraft("");
    setFiles([]);
    setReplyingTo(null);
    requestAnimationFrame(() => {
      if (draftInputRef.current) {
        draftInputRef.current.style.height = "auto";
        draftInputRef.current.focus();
      }
    });
  };

  const MAX_FILE_SIZE_MB = 25;
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ];

  const ALLOWED_LABEL =
    "Images, videos, PDFs, Word, Excel, CSV, and plain text (max 25 MB each)";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    const annotated: SelectedFile[] = selected.map((file) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
        return {
          file,
          valid: false,
          errorReason: `Too large (max ${MAX_FILE_SIZE_MB} MB)`,
        };
      if (!ALLOWED_TYPES.includes(file.type))
        return { file, valid: false, errorReason: "Unsupported file type" };
      return { file, valid: true };
    });
    const invalid = annotated.filter((f) => !f.valid);
    if (invalid.length > 0) {
      onToast(
        invalid.map((f) => `"${f.file.name}": ${f.errorReason}`).join("\n"),
        "error"
      );
    }
    setFiles((prev) => [...prev, ...annotated]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  // useEffect(() => {
  //   bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

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

  const recipientFirstName =
    activeUser.fullname.split(" ")[0] || activeUser.fullname;

  return (
    <div className="flex h-full flex-1 flex-col bg-black backdrop-blur">
      <header className="flex items-center justify-between border-b border-slate-800/80 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-800/70 bg-slate-900/70">
            {activeUser.avatar_url ? (
              <img
                src={activeUser.avatar_url}
                alt={activeUser.fullname}
                className="h-full w-full cursor-pointer object-cover"
                onClick={() =>
                  onOpenProfile(
                    activeUser.id,
                    activeUser.fullname,
                    activeUser.avatar_url
                  )
                }
              />
            ) : (
              <div
                onClick={() =>
                  onOpenProfile(
                    activeUser.id,
                    activeUser.fullname,
                    activeUser.avatar_url
                  )
                }
                className="flex h-full w-full cursor-pointer items-center justify-center text-sm font-semibold uppercase text-slate-200"
              >
                {getInitials(activeUser.fullname)}
              </div>
            )}
          </div>
          <div>
            <h3
              onClick={() =>
                onOpenProfile(
                  activeUser.id,
                  activeUser.fullname,
                  activeUser.avatar_url
                )
              }
              className="text-base font-semibold text-slate-100 cursor-pointer hover:text-white"
            >
              {activeUser.fullname}
            </h3>
            <p className="text-xs text-slate-400">
              Direct message • {messages.length}{" "}
              {messages.length === 1 ? "message" : "messages"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            disabled={!threadId}
            className="rounded-full border border-slate-800/70 p-2 transition-colors hover:border-indigo-500/50 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Search in conversation"
            title="Search messages"
          >
            <Search className="h-4 w-4" />
          </button>
          {/* <span className="text-[10px] text-slate-500">
            {canPinMore ? `${pins.length}/3 pins` : "3/3 pins"}
          </span> */}
        </div>
      </header>

      {/* <PinnedMessagesBar
        pins={pins}
        onJumpTo={(messageId) => {
          void scrollToMessage(messageId);
        }}
        onUnpin={(messageId) => {
          void unpin(messageId, true);
        }}
        isDm
      /> */}

      <MessageSearchPanel
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={handleSearch}
        onSelectResult={handleSearchSelect}
        placeholder="Search in this conversation..."
        title="Search Conversation"
      />

      <div
        ref={messagesContainerRef}
        onScroll={handleDmScroll}
        className="chat-scroll flex-1 space-y-8 overflow-y-auto px-6 py-8">
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
                      <div
                        key={msg.id}
                        ref={(el) => {
                          messageRefs.current[msg.id] = el;
                        }}
                      >
                        <MessageBubble
                        isSender={group.isSender}
                        message={msg}
                        reactions={getReactionsForMessage(msg.id)}
                        onReact={(emoji) => {
                          if (currentUser?.id) {
                            void toggleReaction(msg.id, emoji, currentUser.id);
                          }
                        }}
                        showPinAction={
                          !!msg.id && !String(msg.id).startsWith("temp-")
                        }
                        // isPinned={isPinned(msg.id)}
                        // onPin={() => {
                        //   void togglePin(msg.id, true);
                        // }}
                        timestamp={msg.timeLabel}
                        name={
                          !group.isSender && index === 0
                            ? group.name
                            : undefined
                        }
                        avatarUrl={group.avatarUrl}
                        onProfileClick={
                          group.isSender
                            ? undefined
                            : () =>
                                onOpenProfile(
                                  group.senderId,
                                  group.name,
                                  group.avatarUrl
                                )
                        }
                      >
                        {msg.media_url && (
                          <MessageAttachment
                            media_url={msg.media_url}
                            media_type={msg.media_type}
                          />
                        )}
                      </MessageBubble>
                      </div>
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
        {files.length > 0 && (
          <div className="mb-3 space-y-2">
            {files.map((entry, index) => (
              <div
                key={`${entry.file.name}-${entry.file.lastModified}-${index}`}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                  entry.valid
                    ? "border-slate-800/70 bg-slate-900/60 text-slate-200"
                    : "border-rose-500/30 bg-rose-950/30 text-slate-500 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Paperclip
                    className={`h-4 w-4 ${
                      entry.valid ? "text-indigo-300" : "text-slate-600"
                    }`}
                  />
                  <span className="truncate max-w-[220px]">
                    {entry.file.name}
                  </span>
                  <span className="text-xs">
                    {entry.valid
                      ? `${Math.round(entry.file.size / 1024)} KB`
                      : entry.errorReason}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="rounded-full border border-slate-800/70 p1 text-slate-400 transition-colors hover:border-rose-500/50 hover:text-rose-300"
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {replyingTo && (
          <div className="mb-2 rounded-lg border-l-4 border-blue-500 bg-slate-800 px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-sm text-slate-300">
                Replying to{" "}
                <span className="font-semibold">
                  {replyingTo.author || "User"}
                </span>
                : <span className="italic">{replyingTo.content}</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-slate-400 transition hover:text-white"
                aria-label="Cancel reply"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-4 py-3">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-msvideo,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
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
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="rounded-full border border-slate-800/70 p-2 text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
          >
            <Smile className="h-4 w-4" />
          </button>

          <textarea
            ref={draftInputRef}
            rows={1}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) {
                return;
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend(draft);
              }
            }}
            placeholder={`Message @${recipientFirstName}`}
            className="max-h-32 min-h-6 flex-1 resize-none overflow-y-auto bg-transparent py-0 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
          />
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-20 left-6 z-50"
            >
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={(emojiData) => {
                  setDraft((prev) => prev + emojiData.emoji);
                }}
              />
            </div>
          )}

          <button
            onClick={() => handleSend(draft)}
            disabled={!canSend}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition ${
              canSend
                ? "bg-indigo-500/90 hover:bg-indigo-400"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
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
  const { refreshCount: refreshMessageNotifications, unreadPerThread } =
    useMessageNotifications();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Map<string, DirectMessage[]>>(
    new Map()
  );
  const [threadIds, setThreadIds] = useState<Map<string, string>>(
    new Map()
  );
  const [dmOffsets, setDmOffsets] = useState<Map<string, number>>(
    new Map()
  );
  const [dmHasMore, setDmHasMore] = useState<Map<string, boolean>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
    roles?: string[];
  } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pageReady = usePageReady();
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
    key: number;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const invalidateDmCacheForCurrentUser = () => {
    if (currentUser?.id) {
      invalidateUserDmCache(currentUser.id);
    }
  };

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
        invalidateDmCacheForCurrentUser();
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

        const rawMediaUrl = incoming.media_url ?? incoming.mediaUrl ?? null;
        const replySource =
          incoming.reply_to_message ?? incoming.replyTo ?? incoming.reply_to;

        const incomingMsg: DirectMessage = {
          id: String(
            incoming.id ??
              incoming.message_id ??
              incoming.clientMessageId ??
              `sock-${Date.now()}`
          ),
          content: String(incoming.content ?? incoming.message ?? ""),
          sender_id: sender,
          receiver_id: receiver,
          timestamp: String(incoming.timestamp ?? new Date().toISOString()),
          thread_id: incoming.thread_id
            ? String(incoming.thread_id)
            : undefined,
          media_url: rawMediaUrl?.startsWith("blob:") ? null : rawMediaUrl,
          media_type: incoming.media_type,
          replyTo:
            replySource && typeof replySource === "object"
              ? {
                  id: String(replySource.id ?? replySource.message_id ?? ""),
                  content: String(
                    replySource.content ?? replySource.message ?? ""
                  ),
                  author:
                    replySource.users?.username ??
                    replySource.user?.username ??
                    replySource.author ??
                    "User",
                  mediaUrl:
                    replySource.media_url ?? replySource.mediaUrl ?? null,
                  mediaType: replySource.media_type,
                }
              : null,
        };

        const selfId = currentUser?.id;
        let partnerId = incomingMsg.sender_id;
        if (partnerId === selfId) partnerId = incomingMsg.receiver_id;
        if (!partnerId)
          return console.warn("Missing partner for DM:", incomingMsg);

        if (!partnerId) {
          console.warn("Incoming DM missing partner id", incoming);
          return;
        }

        setMessages((prevMap) => {
          const newMap = new Map(prevMap);
          const currentDms = newMap.get(partnerId) || [];

          // De-duplicate: remove optimistic message with same sender+content close in time
          const thresholdMs = 60_000; // 60s window
          const incTime = Date.parse(incomingMsg.timestamp);
          // Always remove any blob optimistic messages first
          let updated = currentDms.filter((m) => {
            if (m.media_url?.startsWith("blob:")) return false;
            if (m.id.toString().startsWith("temp-")) return false;
            const sameSender = m.sender_id === incomingMsg.sender_id;
            const sameContent =
              (m.content || "") === (incomingMsg.content || "");
            const mTime = Date.parse(m.timestamp);
            const incTime2 = Date.parse(incomingMsg.timestamp);
            const nearInTime =
              Number.isFinite(incTime2) && Number.isFinite(mTime)
                ? Math.abs(mTime - incTime2) < 60_000
                : false;
            return !(sameSender && sameContent && nearInTime);
          });

          // If exact id exists, avoid duplicate; otherwise append to the end (arrival order)
          if (!updated.some((m) => m.id === incomingMsg.id)) {
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
      router.push("/");
    }
  }, [router]);
  useEffect(() => {
    const handleProfileUpdate = () => {
      const userItem = localStorage.getItem("user");
      if (!userItem) return;

      const updatedUser = JSON.parse(userItem) as User;
      setCurrentUser(updatedUser);

      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === updatedUser.id
            ? {
                ...u,
                fullname: updatedUser.fullname,
                avatar_url: updatedUser.avatar_url
                  ? `${updatedUser.avatar_url}?t=${Date.now()}`
                  : u.avatar_url,
              }
            : u
        )
      );
    };

    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () =>
      window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);
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
          const threadMap = new Map<string, string>();

          threads.forEach((thread: any) => {
            const threadId = thread.thread_id
              ? String(thread.thread_id)
              : thread._id
                ? String(thread._id)
                : thread.id
                  ? String(thread.id)
                  : undefined;

            const other = thread.other_user;

            if (other && other.id) {
              const name =
                other.fullname ||
                other.username ||
                other.name ||
                other.display_name ||
                "Unknown User";

              users.push({
                id: String(other.id),
                fullname: name,
                avatar_url: other.avatar_url ?? null,
              });

              if (threadId) {
                threadMap.set(String(other.id), threadId);
              }
            } else if (thread.recipientId) {
              const rid = String(thread.recipientId);
              const name = thread.recipientName || "Unknown User";

              users.push({
                id: rid,
                fullname: name,
              });

              if (threadId) {
                threadMap.set(rid, threadId);
              }
            }
          });

          setAllUsers(users);
          setThreadIds(threadMap);

        } catch (error: any) {
          console.error("--- DETAILED FETCH ERROR ---");
          console.error(error);
          if (error.response) {
            console.error("Backend Response Data:", error.response.data);
          }
          setError("Failed to load conversations. Check console for details.");
        } finally {
          setIsLoading(false);
          pageReady();
        }
      };
      fetchDms();
    }
  }, [currentUser]);


  useEffect(() => {
  if (!activeDmId) return;

  const threadId = threadIds.get(activeDmId);

  if (!threadId) return;

  const loadMessages = async () => {
    try {
      const result = await getDmThreadMessages(threadId, 0);


      const parsed = result.data.map((m: any) => ({
        id: String(m.id),
        content: m.content ?? "",
        sender_id: String(m.sender_id ?? ""),
        receiver_id: String(m.receiver_id ?? ""),
        timestamp: String(m.timestamp),
        thread_id: String(m.thread_id),
        media_url: m.media_url ?? null,
        media_type: m.media_type,
        replyTo: m.reply_to_message
          ? {
              id: String(m.reply_to_message.id),
              content: String(m.reply_to_message.content ?? ""),
              author:
                m.reply_to_message.users?.username ??
                m.reply_to_message.user?.username ??
                "User",
              mediaUrl:
                m.reply_to_message.media_url ??
                null,
              mediaType:
                m.reply_to_message.media_type,
            }
          : null,
      }));

      setMessages(prev => {
        const next = new Map(prev);
        next.set(activeDmId, parsed);
        return next;
      });

      setDmOffsets(prev => {
        const next = new Map(prev);
        next.set(activeDmId, parsed.length);
        return next;
      });

      setDmHasMore(prev => {
        const next = new Map(prev);
        next.set(activeDmId, result.hasMore);
        return next;
      });
            
    } catch (err) {
      console.error(err);
    }
  };

  loadMessages();
}, [activeDmId, threadIds]);

const isLoadingOlderDmRef = useRef(false);




const loadOlderMessages = async () => {
  if (isLoadingOlderDmRef.current) return;

  if (!activeDmId) return;

  const threadId = threadIds.get(activeDmId);
  if (!threadId) return;

  const offset = dmOffsets.get(activeDmId) ?? 0;
  const hasMore = dmHasMore.get(activeDmId);

  if (!hasMore) return;

  isLoadingOlderDmRef.current = true;

  try {

    const container = messagesContainerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;

    const result = await getDmThreadMessages(threadId, offset);

    const parsed = result.data
      .map((m: any) => ({
        id: String(m.id),
        content: m.content ?? "",
        sender_id: String(m.sender_id ?? ""),
        receiver_id: String(m.receiver_id ?? ""),
        timestamp: String(m.timestamp),
        thread_id: String(m.thread_id),
        media_url: m.media_url ?? null,
        media_type: m.media_type,
        replyTo: null,
      }))
      .sort(
        (a: DirectMessage, b: DirectMessage) =>
          new Date(a.timestamp).getTime() -
          new Date(b.timestamp).getTime()
      );

    setMessages((prev) => {
      const next = new Map(prev);
      const current = next.get(activeDmId) || [];

      next.set(activeDmId, [...parsed, ...current]);

      return next;
    });

    requestAnimationFrame(() => {
  if (!container) return;

  const newHeight = container.scrollHeight;

  container.scrollTop += newHeight - previousHeight;
});

    setDmOffsets((prev) => {
      const next = new Map(prev);
      next.set(activeDmId, offset + parsed.length);
      return next;
    });

    setDmHasMore((prev) => {
      const next = new Map(prev);
      next.set(activeDmId, result.hasMore);
      return next;
    });
  } catch (err) {
    console.error(err);
  } finally {
    isLoadingOlderDmRef.current = false;
  }
};

  // Effect to set the active DM based on the URL parameter
  // If user not in allUsers, fetch their profile and add them
  // Effect to set the active DM based on the URL parameter
  // If user not in allUsers, fetch their profile and add them
  useEffect(() => {
    if (!selectedDM || !currentUser) return;

    // Check if user already exists
    const userExists = allUsers.some((u) => u.id === selectedDM);

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
            fullname:
              profile.fullname ||
              profile.username ||
              profile.name ||
              "Unknown User",
            avatar_url: profile.avatar_url,
          };

          // Add user to allUsers if not already present
          setAllUsers((prev) => {
            if (prev.some((u) => u.id === selectedDM)) return prev;
            return [...prev, newUser];
          });

          // Initialize empty messages for this user
          setMessages((prev) => {
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
  const handleSendMessage = async (
    content: string,
    files: File[],
    replyTo?: DMReplyTarget
  ) => {
    if (!currentUser || !activeDmId) return;
    if (!content.trim() && files.length === 0) return;

    const uploads = (files.length > 0 ? files : [null]).map((file, index) => {
      const contentForFile =
        index === 0 ? content : `📎 ${file?.name ?? "file"}`;
      const blobUrl = file ? URL.createObjectURL(file) : null;

      return {
        file,
        content: contentForFile,
        tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        optimisticContent: contentForFile,
        blobUrl,
        replyTo: index === 0 ? replyTo : null,
      };
    });
    setMessages((prev) => {
      const newMap = new Map(prev);
      const list = newMap.get(activeDmId) || [];
      const updated = [...list];

      uploads.forEach((upload) => {
        updated.push({
          id: upload.tempId,
          content: upload.optimisticContent,
          sender_id: currentUser.id,
          receiver_id: activeDmId,
          timestamp: new Date().toISOString(),
          media_url: upload.blobUrl,
          media_type: upload.file?.type ?? undefined,
          replyTo: upload.replyTo,
        });
      });

      newMap.set(activeDmId, updated);
      return newMap;
    });

    try {
      for (const upload of uploads) {
        const dmPayload = {
          sender_id: currentUser.id,
          receiver_id: activeDmId,
          message: upload.content,
          mediaurl: upload.file ?? undefined,
          reply_to: upload.replyTo?.id,
        };

        const saved = await uploaddm(dmPayload);
        if (!saved) {
          console.warn("DM upload returned no data");
        }
        invalidateDmCacheForCurrentUser();

        if (saved && (saved.id || saved.media_url || saved.mediaUrl)) {
          setMessages((prev) => {
            const newMap = new Map(prev);
            const list = newMap.get(activeDmId) || [];
            const idx = list.findIndex((m) => m.id === upload.tempId);
            if (idx !== -1) {
              const next = [...list];
              if (upload.blobUrl) URL.revokeObjectURL(upload.blobUrl);
              next[idx] = {
                ...next[idx],
                id: String(saved.id ?? upload.tempId),
                thread_id: saved.thread_id
                  ? String(saved.thread_id)
                  : next[idx].thread_id,
                media_url: saved.media_url ?? saved.mediaUrl ?? null,
                media_type: saved.media_type ?? next[idx].media_type,
                content: saved.content ?? saved.message ?? next[idx].content,
                timestamp: String(saved.timestamp ?? next[idx].timestamp),
                replyTo: saved.reply_to_message
                  ? {
                      id: String(saved.reply_to_message.id),
                      content: String(saved.reply_to_message.content ?? ""),
                      author:
                        saved.reply_to_message.users?.username ??
                        saved.reply_to_message.user?.username ??
                        "User",
                      mediaUrl:
                        saved.reply_to_message.media_url ??
                        saved.reply_to_message.mediaUrl ??
                        null,
                      mediaType: saved.reply_to_message.media_type,
                    }
                  : next[idx].replyTo,
              } as DirectMessage;
              newMap.set(activeDmId, next);
            }
            return newMap;
          });
        }
      }
    } catch (e: any) {
      console.error("Failed to send DM via API:", e);
      // Revoke blob URLs
      uploads.forEach((upload) => {
        if (upload.blobUrl) URL.revokeObjectURL(upload.blobUrl);
      });
      // Roll back optimistic messages on error
      setMessages((prev) => {
        const newMap = new Map(prev);
        const tempIds = new Set(uploads.map((upload) => upload.tempId));
        const list = (newMap.get(activeDmId) || []).filter(
          (m) => !tempIds.has(m.id)
        );
        newMap.set(activeDmId, list);
        return newMap;
      });
      const reason =
        e?.response?.data?.message ??
        e?.message ??
        "Failed to send message. Please try again.";
      setToast({
        message: "file size excceded",
        type: "error",
        key: Date.now(),
      });
    }
  };

  const handleSelectDm = useCallback(
    (userId: string) => {
      setActiveDmId(userId);
      router.push(`/messages?dm=${userId}`);
    },
    [router]
  );

  const openUserProfile = useCallback(
    async (userId: string, fallbackName?: string, fallbackAvatar?: string) => {
      if (!userId) return;

      setSelectedUser({
        id: userId,
        username: fallbackName || "Unknown User",
        avatarUrl: fallbackAvatar || "/User_profil.png",
        about: "Loading bio...",
        roles: [],
      });
      setIsProfileOpen(true);

      try {
        const profile = await fetchUserProfile(userId);
        if (!profile) return;

        setSelectedUser((prev) => {
          if (!prev || prev.id !== userId) return prev;
          return {
            id: userId,
            username:
              profile.username ||
              profile.fullname ||
              fallbackName ||
              "Unknown User",
            avatarUrl:
              profile.avatar_url || fallbackAvatar || "/User_profil.png",
            about: profile.bio || "No bio yet...",
            roles: Array.isArray(profile.roles)
              ? profile.roles
                  .map((role: any) =>
                    typeof role === "string" ? role : role?.name
                  )
                  .filter(Boolean)
              : [],
          };
        });
      } catch (profileError) {
        console.error("Failed to open DM user profile:", profileError);
      }
    },
    []
  );

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
        console.error("Failed to mark thread as read:", error);
      }
    };

    // Small delay to ensure messages are loaded
    const timeoutId = setTimeout(markAsRead, 100);
    return () => clearTimeout(timeoutId);
  }, [activeDmId, currentUser?.id]);

  const conversations = useMemo(() => {
    return allUsers
      .map((user) => {
        const userMessages = messages.get(user.id) || [];
        const lastMessageObj =
          userMessages.length > 0
            ? userMessages[userMessages.length - 1]
            : null;
        let lastMessage = "No messages yet.";
        let timestamp = new Date(0).toISOString(); // Default to epoch

        if (lastMessageObj) {
          const isSender = lastMessageObj.sender_id === currentUser?.id;
          const content = lastMessageObj.media_url
            ? "Sent an attachment"
            : lastMessageObj.content || "";
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
          unreadCount,
        };
      })
      .sort((a, b) => {
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
  const activeThreadId = activeDmId ? threadIds.get(activeDmId) ?? null : null;

  return (
    <div className="flex h-screen min-h-0 w-full bg-slate-950 text-slate-100">
      {toast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <Toast
            key={toast.key}
            message={toast.message}
            type={toast.type}
            duration={4000}
            onClose={() => setToast(null)}
          />
        </div>
      )}
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
              <h2 className="text-base font-semibold text-slate-100">
                Direct Messages
              </h2>
              <p className="text-xs text-slate-400">
                Tap a friend to open the chat.
              </p>
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
                      ? "border-indigo-400/70 bg-indigo-500/10 text-indigo-100"
                      : "border-slate-800/70 bg-slate-900/60 text-slate-300"
                  }`}
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-800/70 bg-slate-800/60">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.fullname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-200">
                        {getInitials(user.fullname)}
                      </div>
                    )}
                  </div>
                  <span className="truncate text-center text-[11px] leading-tight">
                    {user.fullname.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <ChatWindow
            onLoadOlderMessages = {loadOlderMessages}
            activeUser={activeUser}
            messages={activeMessages}
            currentUser={currentUser}
            partnerId={activeDmId}
            threadId={activeThreadId}
            allUsers={allUsers}
            onSendMessage={handleSendMessage}
            onFileError={(msg) => setFileError(msg)}
            onOpenProfile={openUserProfile}
            onToast={(msg, type) =>
              setToast({ message: msg, type, key: Date.now() })
            }
          />
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}

export default function MessagesPageContent() {
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

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
