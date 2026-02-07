"use client";

import { useState, useRef } from "react";
import { Smile, Send, Paperclip, X } from "lucide-react";
import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";
import { apiClient } from "@/utils/apiClient";

/* -------------------- EMOJI PICKER -------------------- */

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.default),
  { ssr: false }
);

/* -------------------- TYPES -------------------- */

interface MentionableUser {
  id: string;
  username: string;
  avatar_url?: string;
  fullname?: string;
}

interface MessageInputWithMentionsProps {
  sendMessage: (text: string, file: File | null) => void;
  isSending: boolean;
  serverId?: string;
  serverRoles: { id: string; name: string; color?: string }[];
}

/* -------------------- COMPONENT -------------------- */

export default function MessageInputWithMentions({
  sendMessage,
  isSending,
  serverId,
  serverRoles,
}: MessageInputWithMentionsProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>(
    []
  );
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const textInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  /* -------------------- UTIL -------------------- */

  const focusInput = () => {
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
  };

  /* -------------------- EMOJI -------------------- */

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    focusInput();
  };

  /* -------------------- FILE -------------------- */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  /* -------------------- SEND -------------------- */

  const handleSend = () => {
    if (!text.trim() && !file) return;

    sendMessage(text.trim(), file);

    setText("");
    setFile(null);
    setShowEmojiPicker(false);
    setShowMentionDropdown(false);

    focusInput(); // ⚡ instant, no delay
  };

  /* -------------------- MENTIONS -------------------- */

  const searchMentionable = async (query: string) => {
    if (!serverId) return;

    try {
      const res = await apiClient.get(`/api/mentions/search/${serverId}`, {
        params: { q: query || "" },
      });
      setMentionableUsers(res.data?.users || []);
    } catch {
      setMentionableUsers([]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart || 0;

    setText(value);

    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionPosition(match.index || 0);
      setShowMentionDropdown(true);
      setSelectedMentionIndex(0);
      searchMentionable(match[1]);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (name: string) => {
    const before = text.slice(0, mentionPosition);
    const after = text.slice(mentionPosition + mentionQuery.length + 1);

    const newText = `${before}@${name} ${after}`;
    setText(newText);
    setShowMentionDropdown(false);

    requestAnimationFrame(() => {
      const pos = before.length + name.length + 2;
      textInputRef.current?.setSelectionRange(pos, pos);
      textInputRef.current?.focus();
    });
  };

  /* -------------------- KEYBOARD -------------------- */

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionDropdown && mentionableUsers.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((i) => (i + 1) % mentionableUsers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex(
          (i) => (i - 1 + mentionableUsers.length) % mentionableUsers.length
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        insertMention(mentionableUsers[selectedMentionIndex].username);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  /* -------------------- RENDER -------------------- */

  return (
    <div className="relative p-4">
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {showMentionDropdown && mentionableUsers.length > 0 && (
        <div
          ref={mentionDropdownRef}
          className="absolute bottom-20 left-4 w-72 bg-gray-800 rounded-lg z-50"
        >
          {mentionableUsers.map((u, i) => (
            <div
              key={u.id}
              onClick={() => insertMention(u.username)}
              className={`px-3 py-2 cursor-pointer ${
                i === selectedMentionIndex ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
            >
              @{u.username}
            </div>
          ))}
        </div>
      )}

      {file && (
        <div className="mb-2 flex items-center bg-gray-800 p-2 rounded">
          <span className="flex-1 text-sm text-gray-300 truncate">
            {file.name}
          </span>
          <button onClick={() => setFile(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div
        className="flex items-center gap-2 bg-gray-800 rounded-lg p-3"
        onClick={focusInput}
      >
        <input
          ref={textInputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="flex-1 bg-transparent outline-none text-white caret-white"
        />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
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
          disabled={isSending || (!text.trim() && !file)}
          className="bg-blue-600 p-2 rounded disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
