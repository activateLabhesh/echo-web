"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, Send, Paperclip, X } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

interface MessageInputProps {
  sendMessage: (text: string, file: File | null) => void;
  isSending: boolean;
}

export default function MessageInput({
  sendMessage,
  isSending,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* -------------------- KEEP FOCUS AFTER SEND -------------------- */
  useEffect(() => {
    if (!isSending) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isSending]);

  /* -------------------- EMOJI -------------------- */
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
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

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.focus();
      }
    });
  };

  /* -------------------- KEEP FOCUS AFTER SEND -------------------- */
  useEffect(() => {
    if (!isSending) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isSending]);

  /* -------------------- AUTO-FOCUS ON MOUNT -------------------- */
  useEffect(() => {
    // Focus immediately when component mounts
    inputRef.current?.focus();
  }, []);

  /* -------------------- MAINTAIN FOCUS -------------------- */
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Don't refocus if clicking on buttons, emoji picker, or file preview
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest(".emoji-picker-react") ||
        target.closest('input[type="file"]')
      ) {
        return;
      }

      // Refocus the textarea
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);
  /* -------------------- TEXTAREA -------------------- */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* -------------------- RENDER -------------------- */
  return (
    <div className="relative p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-react absolute bottom-24 left-4 z-50 shadow-xl">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="mb-2 flex items-center bg-white/10 backdrop-blur-md p-2 rounded-lg">
          <Paperclip className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-sm text-white truncate flex-1">
            {file.name}
          </span>
          <button
            onClick={() => setFile(null)}
            className="ml-2 text-gray-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div
        className="bg-white/10 backdrop-blur-lg border border-white/20 
                   rounded-2xl flex items-end px-3 py-2 gap-2 text-white"
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Attach */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji */}
        <button
          onClick={() => setShowEmojiPicker((v) => !v)}
          disabled={isSending}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* TEXTAREA */}
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          className="flex-1 bg-transparent resize-none 
                     text-white caret-white 
                     placeholder-white/60 
                     focus:outline-none 
                     max-h-32 overflow-y-auto leading-6"
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && !file)}
          className="bg-blue-600 hover:bg-blue-700 
                     active:scale-95 transition 
                     p-2 rounded-full disabled:opacity-40"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
