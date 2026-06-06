"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, Send, Paperclip, X } from "lucide-react";
import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";
import { apiClient } from "@/utils/apiClient";
import { useToast } from "@/contexts/ToastContext";

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

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
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

  useEffect(() => {
    resizeTextArea();
  }, [text]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        target.closest("button") ||
        target.closest('input[type="file"]') ||
        emojiPickerRef.current?.contains(target) ||
        mentionDropdownRef.current?.contains(target)
      ) {
        return;
      }

      requestAnimationFrame(() => {
        textInputRef.current?.focus();
      });
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

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

    const validation = validateRoleMentions(text);
    if (!validation.valid) {
      alert(`Role "${validation.invalidRole}" does not exist in this server.`);
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart || 0;

    setText(value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;

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

  return (
    <div className="relative p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Mention Dropdown */}
      {showMentionDropdown && (
        <div
          ref={mentionDropdownRef}
          className="absolute bottom-20 left-4 w-72 max-h-60 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-800 border border-gray-600 z-50"
        >
          {searchingMentions ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              Searching…
            </div>
          ) : (
            <>
              {filteredRoles.length > 0 && (
                <div className="px-3 py-1 text-xs text-purple-400">Roles</div>
              )}
              {filteredRoles.map((role, idx) => (
                <div
                  key={`role-${role.id}`}
                  className={`px-3 py-3 cursor-pointer flex items-center space-x-3 transition-colors ${
                    idx === selectedMentionIndex
                      ? "bg-blue-600"
                      : "hover:bg-gray-700"
                  }`}
                  onClick={() => insertMention("role", role.name)}
                >
                  <div className="w-8 h-8 flex-shrink-0 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    #
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-purple-300 text-sm font-medium truncate">
                      {role.name}
                    </div>
                    <div className="text-gray-400 text-xs truncate">
                      @{role.name}
                    </div>
                  </div>
                  <div className="text-purple-400 text-xs flex-shrink-0">
                    role
                  </div>
                </div>
              ))}

              {mentionableUsers.length > 0 && (
                <div className="px-3 py-1 text-xs text-blue-400">Users</div>
              )}
              {mentionableUsers.map((user, idx) => {
                const adjustedIdx = filteredRoles.length + idx;
                return (
                  <div
                    key={`user-${user.id}`}
                    className={`px-3 py-3 cursor-pointer flex items-center space-x-3 transition-colors ${
                      adjustedIdx === selectedMentionIndex
                        ? "bg-blue-600"
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => insertMention("user", user.username)}
                  >
                    <UserMentionAvatar
                      username={user.username}
                      avatarUrl={user.avatar_url}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {user.fullname || user.username}
                      </div>
                      <div className="text-gray-400 text-xs truncate">
                        @{user.username}
                      </div>
                    </div>
                    <div className="text-blue-400 text-xs flex-shrink-0">
                      user
                    </div>
                  </div>
                );
              })}
              <div className="px-3 py-1 text-xs text-red-400">Special</div>
              <div
                className={`px-3 py-3 cursor-pointer flex items-center space-x-3 transition-colors ${
                  selectedMentionIndex ===
                  filteredRoles.length + mentionableUsers.length
                    ? "bg-blue-600"
                    : "hover:bg-gray-700"
                }`}
                onClick={() => insertMention("everyone", "everyone")}
              >
                <div className="w-8 h-8 flex-shrink-0 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  @
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    everyone
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    @everyone
                  </div>
                </div>
                <div className="text-red-400 text-xs flex-shrink-0">
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
              className="flex items-center bg-gray-800 p-2 rounded-lg"
            >
              <span className="text-sm text-gray-300 truncate flex-1">
                {file.name}
              </span>
              <button
                onClick={() =>
                  setFiles((prev) =>
                    prev.filter((_, fileIndex) => fileIndex !== index)
                  )
                }
                className="text-red-400 ml-2"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-end gap-2 bg-gray-800 rounded-lg p-3">
        <textarea
          ref={textInputRef}
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent leading-6 text-white outline-none placeholder:text-gray-400"
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-msvideo,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
          onChange={handleFileChange}
        />

        <button onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={20} />
        </button>

        <button onClick={() => setShowEmojiPicker((v) => !v)}>
          <Smile size={20} />
        </button>

        <button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && files.length === 0)}
          className="bg-blue-600 p-2 rounded-lg disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
