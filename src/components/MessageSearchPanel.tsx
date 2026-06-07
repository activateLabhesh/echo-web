"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { MessageSearchResult } from "@/api/types/message.types";

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
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-16">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#1e1f22] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-700/80 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {error && !isSearching && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
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
                className="flex w-full flex-col gap-1 border-b border-slate-800/80 px-4 py-3 text-left transition hover:bg-slate-800/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-indigo-300">
                    {displayName}
                  </span>
                  {timeLabel && (
                    <span className="text-[10px] text-slate-500">{timeLabel}</span>
                  )}
                </div>
                {showChannelName && result.channel_name && (
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                    #{result.channel_name}
                  </span>
                )}
                <p className="line-clamp-2 text-sm text-slate-200">{preview}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MessageSearchPanel;
