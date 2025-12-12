"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, Send, Paperclip, X } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

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
}

export default function MessageInputWithMentions({ 
  sendMessage, 
  isSending, 
  serverId 
}: MessageInputWithMentionsProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [searchingMentions, setSearchingMentions] = useState(false);

  // console.log('MessageInputWithMentions initialized - ServerId:', serverId);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSend = () => {
    if (text.trim() === "" && !file) return;
    sendMessage(text.trim(), file);
    setText("");
    setFile(null);
  };

  // Search for mentionable users
  const searchMentionable = async (query: string) => {
    if (!serverId) {
      setMentionableUsers([]);
      return;
    }

    setSearchingMentions(true);

    try {
      // If query is empty or very short, show all users in the server
      const searchQuery = query.length >= 1 ? query : '';
      const url = `/api/mentions/search/${serverId}?q=${encodeURIComponent(searchQuery)}`;
      // console.log('Fetching mentions from:', url);
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      // console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        // console.log('Response data:', data);
        
        setMentionableUsers(data.users || []);
        
        // console.log('Set mentionable users:', data.users?.length || 0, data.users);
      } else {
        const errorText = await response.text();
        console.error('Search API failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('Failed to search mentionable:', error);
    } finally {
      setSearchingMentions(false);
    }
  };

  // Handle text input changes and mention detection
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    setText(value);
    // console.log('Text changed:', value, 'Cursor:', cursorPosition);

    // Check for mention trigger (@)
    const beforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    
    // console.log('Before cursor:', beforeCursor, 'Mention match:', mentionMatch);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setMentionPosition(mentionMatch.index || 0);
      setShowMentionDropdown(true);
      setSelectedMentionIndex(0);
      
      // console.log('Mention triggered - Query:', query, 'Position:', mentionMatch.index || 0);
      
      // Search immediately, even with empty query to show all users
      searchMentionable(query);
    } else {
      setShowMentionDropdown(false);
      setMentionableUsers([]);
      // console.log('No mention found, hiding dropdown');
    }
  };

  // Insert mention into text
  const insertMention = (type: 'user' | 'everyone', name: string) => {
    const beforeMention = text.substring(0, mentionPosition);
    const afterMention = text.substring(mentionPosition + mentionQuery.length + 1); // +1 for @
    
    let mentionText = '';
    if (type === 'user') {
      mentionText = `@${name}`;
    } else if (type === 'everyone') {
      mentionText = `@everyone`;
    }
    
    const newText = beforeMention + mentionText + ' ' + afterMention;
    setText(newText);
    setShowMentionDropdown(false);
    
    // Focus back to input
    if (textInputRef.current) {
      const newPosition = beforeMention.length + mentionText.length + 1;
      setTimeout(() => {
        textInputRef.current?.focus();
        textInputRef.current?.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionDropdown) {
      const totalItems = mentionableUsers.length + 1; // +1 for @everyone
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        
        // Select the highlighted mention
        if (selectedMentionIndex < mentionableUsers.length) {
          const user = mentionableUsers[selectedMentionIndex];
          insertMention('user', user.username);
        } else {
          insertMention('everyone', 'everyone');
        }
      } else if (e.key === 'Escape') {
        setShowMentionDropdown(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const allMentionItems = [
    ...mentionableUsers.map(user => ({ type: 'user' as const, item: user })),
    { type: 'everyone' as const, item: { id: 'everyone', name: 'everyone' } }
  ];

  return (
    <div className="relative p-4">
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Mention Dropdown */}
      {showMentionDropdown && (
        <div className="absolute bottom-20 left-4 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto w-72">
          {searchingMentions ? (
            <div className="px-3 py-4 text-center text-gray-400 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : allMentionItems.length > 0 ? (
            <>
              <div className="px-3 py-2 border-b border-gray-600 text-gray-400 text-xs uppercase font-semibold">
                {mentionQuery ? `Search results for "${mentionQuery}"` : 'Mention someone...'}
              </div>
              {allMentionItems.map((mentionItem, index) => (
                <div
                  key={`${mentionItem.type}-${mentionItem.item.id}`}
                  className={`px-3 py-3 cursor-pointer flex items-center space-x-3 transition-colors ${
                    index === selectedMentionIndex ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    if (mentionItem.type === 'user') {
                      insertMention('user', (mentionItem.item as MentionableUser).username);
                    } else {
                      insertMention('everyone', 'everyone');
                    }
                  }}
                >
                  {mentionItem.type === 'user' ? (
                    <>
                      {(mentionItem.item as MentionableUser).avatar_url ? (
                        <img
                          src={(mentionItem.item as MentionableUser).avatar_url}
                          alt={(mentionItem.item as MentionableUser).username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {(mentionItem.item as MentionableUser).username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">
                          {(mentionItem.item as MentionableUser).fullname || (mentionItem.item as MentionableUser).username}
                        </div>
                        <div className="text-gray-400 text-xs">
                          @{(mentionItem.item as MentionableUser).username}
                        </div>
                      </div>
                      <div className="text-blue-400 text-xs">
                        user
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="px-3 py-4 text-center text-gray-400 text-sm">
              {mentionQuery ? (
                <>
                  <div>No users found for "{mentionQuery}"</div>
                  <div className="text-xs mt-1">Try typing a different username</div>
                </>
              ) : (
                <>
                  <div>No users available</div>
                  <div className="text-xs mt-1">Make sure you're in a server channel</div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {file && (
        <div className="mb-3 p-2 bg-gray-800 rounded-lg flex items-center justify-between">
          <span className="text-gray-300 text-sm truncate flex-1">
            {file.name}
          </span>
          <button
            onClick={() => setFile(null)}
            className="text-red-400 hover:text-red-300 ml-2"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-3">
        <input
          ref={textInputRef}
          type="text"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... Use @ to mention users, @&role for roles, or @everyone"
          className="flex-1 bg-transparent text-white placeholder-gray-400 border-none outline-none"
          disabled={isSending}
          autoComplete="off"
        />

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-400 hover:text-white transition-colors"
          disabled={isSending}
        >
          <Paperclip size={20} />
        </button>

        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-gray-400 hover:text-white transition-colors"
          disabled={isSending}
        >
          <Smile size={20} />
        </button>

        <button
          onClick={handleSend}
          disabled={isSending || (text.trim() === "" && !file)}
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
