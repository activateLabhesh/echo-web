"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { MessageSearchResult } from "@/api/types/message.types";
import { chatUi } from "./ui/chatUi";

interface MessageSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<MessageSearchResult[]>;
  onSelectResult: (result: MessageSearchResult) => void;
  placeholder?: string;
  title?: string;
  showChannelName?: boolean;
}

const MessageSearchPanel: React.FC<MessageSearchPanelProps> = ({
  isOpen,
  onClose,
  onSearch,
  onSelectResult,
  placeholder = "Search messages...",
  title = "Search Messages",
  showChannelName = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await onSearch(trimmed);
        setResults(data);
        setError(data.length === 0 ? "No messages found." : null);
      } catch (err) {
        console.error("Message search failed", err);
        setResults([]);
        setError("Search failed. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, onSearch]);

  if (!isOpen) return null;

  return (
    <div className="chat-modal-backdrop flex items-start justify-center px-4 pt-16">
      <div className={`chat-modal w-full max-w-lg`}>
        <div className="flex items-center justify-between border-b border-[color:var(--chat-border)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[color:var(--chat-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[color:var(--chat-text-muted)] transition hover:bg-white/5 hover:text-white"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-[color:var(--chat-border)]/80 px-4 py-3">
          <Search className="h-4 w-4 text-[color:var(--chat-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className={chatUi.searchInput}
          />
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-[color:var(--chat-accent-strong)]" />
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {error && !isSearching && (
            <p className="px-4 py-6 text-center text-sm text-[color:var(--chat-text-muted)]">
              {error}
            </p>
          )}

          {results.map((result) => {
            const displayName =
              result.username ?? result.sender_name ?? "Unknown";
            const preview = (result.content || "").trim() || "Attachment";
            const timeLabel = result.timestamp
              ? new Date(result.timestamp).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            return (
              <button
                key={`${result.id}-${result.channel_id ?? ""}-${result.timestamp ?? ""}`}
                type="button"
                onClick={() => {
                  onSelectResult(result);
                  onClose();
                }}
                className="flex w-full flex-col gap-1 border-b border-[color:var(--chat-border)] px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[color:var(--chat-accent-strong)]">
                    {displayName}
                  </span>
                  {timeLabel && (
                    <span className="text-[10px] text-[color:var(--chat-text-muted)]">{timeLabel}</span>
                  )}
                </div>
                {showChannelName && result.channel_name && (
                  <span className="text-[10px] uppercase tracking-wide text-[color:var(--chat-text-muted)]">
                    #{result.channel_name}
                  </span>
                )}
                <p className="line-clamp-2 text-sm text-[color:var(--chat-text-secondary)]">{preview}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MessageSearchPanel;
