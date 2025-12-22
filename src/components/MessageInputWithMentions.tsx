"use client";

import { useState, useRef } from "react";
import { Smile, Send, Paperclip, X } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { apiClient } from "@/utils/apiClient";

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
  serverRoles
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
  const [searchingMentions, setSearchingMentions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  /* -------------------- EMOJI -------------------- */

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  /* -------------------- FILE -------------------- */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
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
    if (text.trim() === "" && !file) return;

   
    const validation = validateRoleMentions(text);
    if (!validation.valid) {
      alert(`Role "${validation.invalidRole}" does not exist in this server.`);
      return;
    }

    sendMessage(text.trim(), file);

 
    setShowEmojiPicker(false);
    setShowMentionDropdown(false);

    setText("");
    setFile(null);
  };


  /* -------------------- MENTION SEARCH -------------------- */

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

  /* -------------------- TEXT CHANGE -------------------- */

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
      setMentionableUsers([]);
    }
  };

  /* -------------------- INSERT MENTION -------------------- */

  const insertMention = (type: 'user' | 'role' | 'everyone', name: string) => {
    const beforeMention = text.substring(0, mentionPosition);
    const afterMention = text.substring(mentionPosition + mentionQuery.length + 1); // +1 for @
    
    let mentionText = '';
    if (type === 'user') {
      mentionText = `@${name}`;
    } else if (type === 'role') {
      mentionText = `@&${name}`;
    } else if (type === 'everyone') {
      mentionText = `@everyone`;
    }

    const newText = beforeMention + mentionText + ' ' + afterMention;
    setText(newText);
    setShowMentionDropdown(false);

    requestAnimationFrame(() => {
      textInputRef.current?.focus();
      const pos = beforeMention.length + mentionText.length + 1;
      textInputRef.current?.setSelectionRange(pos, pos);
    });
  };

  /* -------------------- KEYBOARD -------------------- */

  const filteredRoles = serverRoles.filter(role =>
    role.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          insertMention('role', filteredRoles[selectedMentionIndex].name);
        } else if (selectedMentionIndex < roleCount + userCount) {
          insertMention('user', mentionableUsers[selectedMentionIndex - roleCount].username);
        } else {
          insertMention('everyone', 'everyone');
        }
      } else if (e.key === "Escape") {
        setShowMentionDropdown(false);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  /* -------------------- RENDER -------------------- */

  return (
    <div className="relative p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Mention Dropdown */}
      {showMentionDropdown && (
        <div className="absolute bottom-20 left-4 w-72 max-h-60 overflow-y-auto rounded-lg bg-gray-800 border border-gray-600 z-50">
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
                    idx === selectedMentionIndex ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => insertMention('role', role.name)}
                >
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    #
                  </div>
                  <div className="flex-1">
                    <div className="text-purple-300 text-sm font-medium">
                      {role.name}
                    </div>
                    <div className="text-gray-400 text-xs">
                      @{role.name}
                    </div>
                  </div>
                  <div className="text-purple-400 text-xs">
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
                      adjustedIdx === selectedMentionIndex ? 'bg-blue-600' : 'hover:bg-gray-700'
                    }`}
                    onClick={() => insertMention('user', user.username)}
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">
                        {user.fullname || user.username}
                      </div>
                      <div className="text-gray-400 text-xs">
                        @{user.username}
                      </div>
                    </div>
                    <div className="text-blue-400 text-xs">
                      user
                    </div>
                  </div>
                );
              })}
              
              <div className="px-3 py-1 text-xs text-red-400">Special</div>
              <div
                className={`px-3 py-3 cursor-pointer flex items-center space-x-3 transition-colors ${
                  selectedMentionIndex === filteredRoles.length + mentionableUsers.length ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
                onClick={() => insertMention('everyone', 'everyone')}
              >
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  @
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">
                    everyone
                  </div>
                  <div className="text-gray-400 text-xs">
                    @everyone
                  </div>
                </div>
                <div className="text-red-400 text-xs">
                  everyone
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="mb-3 flex items-center bg-gray-800 p-2 rounded-lg">
          <span className="text-sm text-gray-300 truncate flex-1">
            {file.name}
          </span>
          <button onClick={() => setFile(null)} className="text-red-400 ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3">
        <input
          ref={textInputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="flex-1 bg-transparent outline-none text-white"
          disabled={isSending}
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
          className="bg-blue-600 p-2 rounded-lg disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
