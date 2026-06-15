"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, Send, Paperclip, X, ImageIcon } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useToast } from "@/contexts/ToastContext";
import { chatUi } from "./ui/chatUi";

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
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* -------------------- KEEP FOCUS AFTER SEND -------------------- */
  useEffect(() => {
    if (!isSending) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isSending]);
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


  /* -------------------- EMOJI -------------------- */
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const MAX_WORDS = 250;

const getWordCount = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;
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
  const wordCount = getWordCount(text);

  if (wordCount > MAX_WORDS) {
    const msg = `Messages cannot exceed ${MAX_WORDS} words. You currently have ${wordCount} words.`;

    if (onToast) onToast(msg, "error");
    else showToast(msg, "error");

    return;
  }

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
  const value = e.target.value;

  const wordCount = value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (wordCount > 250) {
    showToast("Maximum 250 words allowed.", "error");
    return;
  }

  setText(value);

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
    <div className="relative px-4 pb-4 pt-3">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-react absolute bottom-24 left-4 z-50 overflow-hidden rounded-2xl border border-[color:var(--chat-border)] shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
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
      {/* File Preview */}
      {files.length > 0 && (
        <div className="mb-2 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center gap-2 rounded-xl border border-[color:var(--chat-border)] bg-[color:var(--chat-panel-2)] px-3 py-2"
            >
              <Paperclip className="mr-1 h-4 w-4 text-[color:var(--chat-text-muted)]" />
              <span className="flex-1 truncate text-sm text-[color:var(--chat-text)]">
                {file.name}
              </span>
              <button
                onClick={() =>
                  setFiles((prev) =>
                    prev.filter((_, fileIndex) => fileIndex !== index)
                  )
                }
                className="rounded-full p-1 text-[color:var(--chat-text-muted)] transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Input Bar */}
      <div className={chatUi.inputShell}>
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
          className={chatUi.buttonGhost + " p-2"}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji */}
        <button
          onClick={() => setShowEmojiPicker((v) => !v)}
          disabled={isSending}
          className={chatUi.buttonGhost + " p-2"}
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
          className={chatUi.buttonGhost + " p-2"}
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
          className={chatUi.input}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && files.length === 0)}
          className={chatUi.buttonPrimary + " rounded-full px-4 py-2"}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
