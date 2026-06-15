"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, Send, Paperclip, X, ImageIcon } from "lucide-react";
import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";
import { apiClient } from "@/utils/apiClient";
import { useToast } from "@/contexts/ToastContext";
import { chatUi } from "./ui/chatUi";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-[350px] h-[450px] bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full" />
      </div>
    ),
  }
);

interface MentionableUser {
  id: string;
  username: string;
  avatar_url?: string;
  fullname?: string;
}

interface MessageInputWithMentionsProps {
  sendMessage: (text: string, files: File[]) => void;
  isSending: boolean;
  serverId?: string;
  serverRoles: { id: string; name: string; color?: string }[];
}

/* -------------------- COMPONENT -------------------- */
const UserMentionAvatar: React.FC<{
  username: string;
  avatarUrl?: string;
}> = ({ username, avatarUrl }) => {
  const [hasError, setHasError] = useState(false);
  const initials = username?.slice(0, 2).toUpperCase() || "??";

  return (
    <div className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center">
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="text-xs font-semibold uppercase text-slate-300">
          {initials}
        </span>
      )}
    </div>
  );
};

export default function MessageInputWithMentions({
  sendMessage,
  isSending,
  serverId,
  serverRoles,
}: MessageInputWithMentionsProps) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const gifPickerRef = useRef<HTMLDivElement>(null);

  const [mentionPosition, setMentionPosition] = useState(0);
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>(
    []
  );
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [searchingMentions, setSearchingMentions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isSending) {
      requestAnimationFrame(() => {
        textInputRef.current?.focus();
      });
    }
  }, [isSending]);

  const resizeTextArea = () => {
    const textArea = textInputRef.current;
    if (!textArea) return;

    textArea.style.height = "auto";
    textArea.style.height = `${textArea.scrollHeight}px`;
  };
  const MAX_WORDS = 250;

const getWordCount = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    resizeTextArea();
  }, [text]);

  // useEffect(() => {
  //   const handleGlobalClick = (e: MouseEvent) => {
  //     const target = e.target as HTMLElement;

  //     if (
  //       target.closest("button") ||
  //       target.closest('input[type="file"]') ||
  //       emojiPickerRef.current?.contains(target) ||
  //       mentionDropdownRef.current?.contains(target)
  //     ) {
  //       return;
  //     }

  //     requestAnimationFrame(() => {
  //       textInputRef.current?.focus();
  //     });
  //   };

  //   document.addEventListener("click", handleGlobalClick);
  //   return () => document.removeEventListener("click", handleGlobalClick);
  // }, []);

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
  useEffect(() => {
    if (!showGifPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        gifPickerRef.current &&
        !gifPickerRef.current.contains(e.target as Node)
      ) {
        setShowGifPicker(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowGifPicker(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showGifPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const annotated = selected.map((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES)
        return { file, valid: false, errorReason: "Too large (max 25 MB)" };
      if (!ALLOWED_TYPES.includes(file.type))
        return { file, valid: false, errorReason: "Unsupported file type" };
      return { file, valid: true, errorReason: undefined };
    });

    const invalid = annotated.filter((f) => !f.valid);
    if (invalid.length > 0) {
      showToast(
        invalid.map((f) => `"${f.file.name}": ${f.errorReason}`).join("\n"),
        "error"
      );
    }

    setFiles((prev) => [
      ...prev,
      ...annotated.filter((f) => f.valid).map((f) => f.file),
    ]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateRoleMentions = (message: string) => {
    const roleMentionRegex = /@&([a-zA-Z0-9_ ]+?)(?=\s|$)/g;
    let match: RegExpExecArray | null;

    while ((match = roleMentionRegex.exec(message)) !== null) {
      const roleName = match[1].trim();

      const roleExists = serverRoles.some(
        (r) => r.name.toLowerCase() === roleName.toLowerCase()
      );

      if (!roleExists) {
        return { valid: false, invalidRole: roleName };
      }
    }

    return { valid: true };
  };
const handleSend = () => {
  if (text.trim() === "" && files.length === 0) return;

  const wordCount = getWordCount(text);

  if (wordCount > MAX_WORDS) {
    showToast(
      `Messages cannot exceed ${MAX_WORDS} words. You currently have ${wordCount} words.`,
      "error"
    );
    return;
  }

  const validation = validateRoleMentions(text);

  if (!validation.valid) {
    showToast(
      `Role "${validation.invalidRole}" does not exist in this server.`,
      "error"
    );
    return;
  }

  sendMessage(text, files);

  setShowEmojiPicker(false);
  setShowMentionDropdown(false);

  setText("");
  setFiles([]);

  requestAnimationFrame(() => {
    if (textInputRef.current) {
      textInputRef.current.style.height = "auto";
      textInputRef.current.focus();
    }
  });
};

  const searchMentionable = async (query: string) => {
    if (!serverId) {
      setMentionableUsers([]);
      return;
    }

    setSearchingMentions(true);
    try {
      const res = await apiClient.get(`/api/mentions/search/${serverId}`, {
        params: { q: query || "" },
      });
      setMentionableUsers(res.data?.users || []);
    } catch (err) {
      console.error("Mention search failed", err);
      setMentionableUsers([]);
    } finally {
      setSearchingMentions(false);
    }
  };

 const MAX_CHARS = 950;
const handleTextChange = (
  e: React.ChangeEvent<HTMLTextAreaElement>
) => {
  const value = e.target.value;

  const wordCount = value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (wordCount > MAX_WORDS) {
    showToast(
      `Maximum ${MAX_WORDS} words allowed.`,
      "error"
    );
    return;
  }

if (value.length > MAX_CHARS) {
  showToast("Maximum 950 characters allowed.", "error");
  return;
}

  setText(value);

  e.target.style.height = "auto";
  e.target.style.height = `${e.target.scrollHeight}px`;
  const cursor = e.target.selectionStart || 0;

    const beforeCursor = value.slice(0, cursor);

    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

    if (match) {
      const atSymbolIndex = beforeCursor.lastIndexOf("@");

      setMentionQuery(match[1]);
      setMentionPosition(atSymbolIndex);
      setShowMentionDropdown(true);
      setSelectedMentionIndex(0);
      searchMentionable(match[1]);
    } else {
      setShowMentionDropdown(false);
      setMentionableUsers([]);
    }
  };

  const insertMention = (type: "user" | "role" | "everyone", name: string) => {
    const beforeMention = text.substring(0, mentionPosition);
    const afterMention = text.substring(
      mentionPosition + mentionQuery.length + 1
    );

    let mentionText = "";
    if (type === "user") {
      mentionText = `@${name}`;
    } else if (type === "role") {
      mentionText = `@&${name}`;
    } else if (type === "everyone") {
      mentionText = `@everyone`;
    }

    const newText = beforeMention + mentionText + " " + afterMention;
    setText(newText);
    setShowMentionDropdown(false);

    requestAnimationFrame(() => {
      textInputRef.current?.focus();
      const pos = beforeMention.length + mentionText.length + 1;
      textInputRef.current?.setSelectionRange(pos, pos);
    });
  };

  const filteredRoles = serverRoles.filter((role) =>
    role.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter" && e.shiftKey) {
      return;
    }

    if (showMentionDropdown) {
      const total = filteredRoles.length + mentionableUsers.length + 1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((i) => (i + 1) % total);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((i) => (i - 1 + total) % total);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const roleCount = filteredRoles.length;
        const userCount = mentionableUsers.length;

        if (selectedMentionIndex < roleCount) {
          insertMention("role", filteredRoles[selectedMentionIndex].name);
        } else if (selectedMentionIndex < roleCount + userCount) {
          insertMention(
            "user",
            mentionableUsers[selectedMentionIndex - roleCount].username
          );
        } else {
          insertMention("everyone", "everyone");
        }
      } else if (e.key === "Escape") {
        setShowMentionDropdown(false);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };
  const searchGifs = async (query: string) => {
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.NEXT_PUBLIC_GIPHY_API_KEY}&q=${encodeURIComponent(
        query
      )}&limit=20&rating=g`
    );

    const data = await res.json();
    setGifs(data.data || []);
  } catch (error) {
    console.error("Failed to fetch GIFs:", error);
    setGifs([]);
  }
};
  const sendGif = (url: string) => {
  sendMessage(`[GIF]${url}`, []);
};
const loadTrendingGifs = async () => {
  const res = await fetch(
    `https://api.giphy.com/v1/gifs/trending?api_key=${process.env.NEXT_PUBLIC_GIPHY_API_KEY}&limit=20`
  );

  const data = await res.json();
  setGifs(data.data || []);
};

  return (
    <div className="relative px-4 pb-4 pt-3">
      {/* Emoji Picker */}
      {showEmojiPicker && (
      <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50 overflow-hidden rounded-2xl border border-[color:var(--chat-border)] shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
        <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
      </div>
      )}
      {showGifPicker && (
        <div
          ref={gifPickerRef}
          className="absolute bottom-24 left-4 z-50 h-96 w-96 overflow-hidden rounded-2xl border border-[color:var(--chat-border)] bg-[color:var(--chat-panel)] shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
        >
          <input
            value={gifSearch}
            onChange={(e) => {
              setGifSearch(e.target.value);
              searchGifs(e.target.value);
            }}
            placeholder="Search GIFs..."
            className="chat-search-input w-full border-b border-[color:var(--chat-border)] px-4 py-3"
          />

          <div className="grid h-[330px] grid-cols-2 gap-2 overflow-y-auto p-3">
            {gifs.map((gif) => (
              <img
                key={gif.id}
                src={gif.images.fixed_width.url}
                className="cursor-pointer rounded-xl border border-transparent object-cover transition hover:border-[color:var(--chat-accent)]/40 hover:opacity-95"
                onClick={() => {
                  sendGif(gif.images.original.url);
                  setShowGifPicker(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
      {/* Mention Dropdown */}
      {showMentionDropdown && (
        <div
          ref={mentionDropdownRef}
          className="absolute bottom-20 left-4 z-50 max-h-60 w-72 overflow-y-auto overflow-x-hidden rounded-2xl border border-[color:var(--chat-border)] bg-[color:var(--chat-panel)] shadow-[0_24px_70px_rgba(0,0,0,0.48)]"
        >
          {searchingMentions ? (
            <div className="p-4 text-center text-sm text-[color:var(--chat-text-muted)]">
              Searching…
            </div>
          ) : (
            <>
              {filteredRoles.length > 0 && (
                <div className="px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--chat-accent-strong)]">Roles</div>
              )}
              {filteredRoles.map((role, idx) => (
                <div
                  key={`role-${role.id}`}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors ${
                    idx === selectedMentionIndex
                      ? "bg-white/8"
                      : "hover:bg-white/5"
                  }`}
                  onClick={() => insertMention("role", role.name)}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--chat-panel-3)] text-sm font-medium text-[color:var(--chat-accent-strong)]">
                    #
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-[color:var(--chat-text)]">
                      {role.name}
                    </div>
                    <div className="truncate text-xs text-[color:var(--chat-text-muted)]">
                      @{role.name}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs text-[color:var(--chat-accent-strong)]">
                    role
                  </div>
                </div>
              ))}

              {mentionableUsers.length > 0 && (
                <div className="px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--chat-accent-strong)]">Users</div>
              )}
              {mentionableUsers.map((user, idx) => {
                const adjustedIdx = filteredRoles.length + idx;
                return (
                  <div
                    key={`user-${user.id}`}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors ${
                      adjustedIdx === selectedMentionIndex
                        ? "bg-white/8"
                        : "hover:bg-white/5"
                    }`}
                    onClick={() => insertMention("user", user.username)}
                  >
                    <UserMentionAvatar
                      username={user.username}
                      avatarUrl={user.avatar_url}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-[color:var(--chat-text)]">
                        {user.fullname || user.username}
                      </div>
                      <div className="truncate text-xs text-[color:var(--chat-text-muted)]">
                        @{user.username}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-xs text-[color:var(--chat-accent-strong)]">
                      user
                    </div>
                  </div>
                );
              })}
              <div className="px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--chat-danger)]">Special</div>
              <div
                className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors ${
                  selectedMentionIndex ===
                  filteredRoles.length + mentionableUsers.length
                    ? "bg-white/8"
                    : "hover:bg-white/5"
                }`}
                onClick={() => insertMention("everyone", "everyone")}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--chat-danger)]/20 text-sm font-medium text-[color:var(--chat-danger)]">
                  @
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-[color:var(--chat-text)]">
                    everyone
                  </div>
                  <div className="truncate text-xs text-[color:var(--chat-text-muted)]">
                    @everyone
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs text-[color:var(--chat-danger)]">
                  everyone
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {/* File Preview */}
      {files.length > 0 && (
        <div className="mb-3 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center gap-2 rounded-xl border border-[color:var(--chat-border)] bg-[color:var(--chat-panel-2)] px-3 py-2"
            >
              <span className="flex-1 truncate text-sm text-[color:var(--chat-text)]">
                {file.name}
              </span>
              <button
                onClick={() =>
                  setFiles((prev) =>
                    prev.filter((_, fileIndex) => fileIndex !== index)
                  )
                }
                className="ml-2 rounded-full p-1 text-[color:var(--chat-text-muted)] transition hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className={chatUi.inputShell + " mb-2"}>
        <textarea
          ref={textInputRef}
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className={chatUi.input}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-msvideo,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
          onChange={handleFileChange}
        />

        <button onClick={() => fileInputRef.current?.click()} className={chatUi.buttonGhost + " p-2"}>
          <Paperclip size={20} />
        </button>

        <button onClick={() => setShowEmojiPicker((v) => !v)} className={chatUi.buttonGhost + " p-2"}>
          <Smile size={20} />
        </button>
        <button
          onClick={() => {
            setShowGifPicker((v) => !v);

            if (!showGifPicker) {
              loadTrendingGifs();
            }
          }}
          disabled={isSending}
          className={chatUi.buttonGhost + " p-2"}
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && files.length === 0)}
          className={chatUi.buttonPrimary + " rounded-xl px-4 py-2"}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
