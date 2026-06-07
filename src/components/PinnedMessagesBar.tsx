"use client";

import React from "react";
import { Pin, X } from "lucide-react";
import { PinnedMessage } from "@/api/types/message.types";

interface PinnedMessagesBarProps {
  pins: PinnedMessage[];
  onJumpTo: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  isDm?: boolean;
}

const PinnedMessagesBar: React.FC<PinnedMessagesBarProps> = ({
  pins,
  onJumpTo,
  onUnpin,
  isDm = false,
}) => {
  if (pins.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-slate-800/80 bg-[#1e1f22]/90 px-4 py-2">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Pin className="h-3 w-3" />
        <span>Pinned Messages — {pins.length}/3</span>
      </div>
      <div className="space-y-1">
        {pins.map((pin) => {
          const messageId = isDm
            ? pin.dm_message_id ?? pin.id
            : pin.message_id ?? pin.id;
          const preview = (pin.content || "").trim() || "Pinned message";
          const author = pin.username ?? pin.sender_name ?? "Unknown";

          return (
            <div
              key={pin.id || messageId}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-800/50"
            >
              <button
                type="button"
                onClick={() => onJumpTo(String(messageId))}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <Pin className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
                <span className="flex-shrink-0 text-xs font-medium text-indigo-300">
                  {author}:
                </span>
                <span className="truncate text-xs text-slate-300">{preview}</span>
              </button>
              <button
                type="button"
                onClick={() => onUnpin(String(messageId))}
                className="rounded p-1 text-slate-500 opacity-0 transition hover:bg-slate-700 hover:text-slate-200 group-hover:opacity-100"
                aria-label="Unpin message"
                title="Unpin"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PinnedMessagesBar;
