"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, Send, Paperclip, X, ImageIcon } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useToast } from "@/contexts/ToastContext";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

interface MessageInputProps {
  sendMessage: (text: string, files: File[]) => void;
  isSending: boolean;
  onToast?: (msg: string, type: "info" | "success" | "error") => void;
}
export default function MessageInput({
  sendMessage,
  isSending,
  onToast,
}: MessageInputProps) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
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
        return { file, valid: false, errorReason: `Too large (max 25 MB)` };
      if (!ALLOWED_TYPES.includes(file.type))
        return { file, valid: false, errorReason: "Unsupported file type" };
      return { file, valid: true, errorReason: undefined };
    });

    const invalid = annotated.filter((f) => !f.valid);
    if (invalid.length > 0) {
      const msg = invalid
        .map((f) => `"${f.file.name}": ${f.errorReason}`)
        .join("\n");
      if (onToast) onToast(msg, "error");
      else showToast(msg, "error");
    }

    setFiles((prev) => [
      ...prev,
      ...annotated.filter((f) => f.valid).map((f) => f.file),
    ]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  /* -------------------- SEND -------------------- */
  const handleSend = () => {
    if (!text.trim() && files.length === 0) return;

    sendMessage(text, files);

    setText("");
    setFiles([]);
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  /* -------------------- RENDER -------------------- */
  return (
    <div className="relative p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-react absolute bottom-24 left-4 z-50 shadow-xl">
          <EmojiPicker theme={Theme.DARK} onEmojiClick={handleEmojiClick} />
        </div>
      )}
      {showGifPicker && (
        <div className="absolute bottom-24 left-4 w-96 h-96 bg-zinc-900 rounded-xl overflow-hidden z-50">
          <input
            value={gifSearch}
            onChange={(e) => {
              setGifSearch(e.target.value);
              searchGifs(e.target.value);
            }}
            placeholder="Search GIFs..."
            className="w-full p-3 bg-zinc-800 text-white"
          />

          <div className="grid grid-cols-2 gap-2 p-2 overflow-y-auto h-[330px]">
            {gifs.map((gif) => (
            <img
              key={gif.id}
              src={gif.images.fixed_width.url}
              className="cursor-pointer rounded"
              onClick={() => {
                sendGif(gif.images.original.url);
                setShowGifPicker(false);
              }}
            />
          ))}
          </div>
        </div>
      )}
      {/* File Preview */}
      {files.length > 0 && (
        <div className="mb-2 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center bg-white/10 backdrop-blur-md p-2 rounded-lg"
            >
              <Paperclip className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm text-white truncate flex-1">
                {file.name}
              </span>
              <button
                onClick={() =>
                  setFiles((prev) =>
                    prev.filter((_, fileIndex) => fileIndex !== index)
                  )
                }
                className="ml-2 text-gray-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Input Bar */}
      <div
        className="bg-white/10 backdrop-blur-lg border border-white/20 
                   rounded-2xl flex items-center px-3 py-2 gap-2 text-white"
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-msvideo,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
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
        <button
        onClick={() => {
        setShowGifPicker((v) => !v);

        if (!showGifPicker) {
          loadTrendingGifs();
        }
      }}
        disabled={isSending}
        className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
      >
        <ImageIcon className="w-5 h-5" />
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
                     max-h-32 min-h-6 overflow-y-auto py-0 leading-6"
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && files.length === 0)}
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
