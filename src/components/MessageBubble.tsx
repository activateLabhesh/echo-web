"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";

/* -------------------- TYPES -------------------- */

export interface ChatMessage {
  id?: string | number;
  content: string;
  replyTo?: {
    id: string | number;
    content: string;
    author?: string;
  } | null;
  status?: "pending" | "sent" | "failed";
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

interface MessageBubbleProps {
  message: ChatMessage;
  name?: string;
  isSender?: boolean;
  avatarUrl?: string;
  timestamp?: string;
  onProfileClick?: () => void;
  onReply?: () => void;
  onRetry?: () => void;
  onReact?: (emoji: string) => void;
  reactions?: MessageReactionSummary[];
  children?: React.ReactNode;
  messageRenderer?: (content: string) => React.ReactNode;
  isMentioned?: boolean;
}

/* -------------------- AVATAR -------------------- */

const MessageAvatar: React.FC<{
  name?: string;
  avatarUrl?: string;
  onClick?: () => void;
  className?: string;
}> = ({ name, avatarUrl, onClick, className = "" }) => {
  const [hasError, setHasError] = useState(false);
  const initials = (name || "?").slice(0, 2).toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center ${
        onClick ? "cursor-pointer hover:opacity-90 transition" : ""
      } ${className}`}
    >
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={name || "User"}
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

/* -------------------- COMPONENT -------------------- */

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  name,
  isSender = false,
  avatarUrl,
  timestamp,
  onProfileClick,
  onReply,
  onRetry,
  onReact,
  reactions = [],
  children,
  messageRenderer,
  isMentioned = false,
}) => {
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null);
  const isPending = message.status === "pending";
  const isFailed = message.status === "failed";
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState<{
    top: number;
    left: number;
    placement: "above" | "below";
  } | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏", "👏"];

  useEffect(() => {
    if (!showReactionPicker) return;

    const updatePosition = () => {
      const button = reactionButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const pickerWidth = 352;
      const pickerHeight = 438;
      const gap = 8;

      const leftBase = isSender ? rect.right - pickerWidth : rect.left;
      const left = Math.max(
        8,
        Math.min(leftBase, window.innerWidth - pickerWidth - 8)
      );

      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const placement =
        spaceBelow >= pickerHeight || spaceBelow >= spaceAbove
          ? "below"
          : "above";

      const top =
        placement === "below"
          ? rect.bottom + gap
          : Math.max(8, rect.top - pickerHeight - gap);

      setReactionPickerPosition({ top, left, placement });
    };

    updatePosition();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(target) &&
        reactionButtonRef.current &&
        !reactionButtonRef.current.contains(target)
      ) {
        setShowReactionPicker(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [showReactionPicker, isSender]);

  const handleReactionPick = (emojiData: EmojiClickData) => {
    onReact?.(emojiData.emoji);
    setShowReactionPicker(false);
  };

  const handleQuickReaction = (emoji: string) => {
    onReact?.(emoji);
  };

  const bubbleStyles = isSender
    ? "bg-[#3a3c43] text-[#dbdee1]"
    : "bg-[#2b2d31] text-[#dbdee1]";

  const copyCodeBlock = async (code: string, blockIndex: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBlockIndex(blockIndex);
      window.setTimeout(() => {
        setCopiedBlockIndex((current) =>
          current === blockIndex ? null : current
        );
      }, 1500);
    } catch (error) {
      console.error("Failed to copy code block:", error);
    }
  };

  const renderPlainContent = (content: string) => {
    if (!content) return null;

    const codeFenceRegex = /```([\s\S]*?)```/g;
    const segments: Array<{ type: "text" | "code"; value: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeFenceRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          value: content.slice(lastIndex, match.index),
        });
      }

      segments.push({
        type: "code",
        value: match[1].replace(/^\n/, "").replace(/\n$/, ""),
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      segments.push({ type: "text", value: content.slice(lastIndex) });
    }

    if (segments.length === 0) {
      return content;
    }

    return segments.map((segment, segmentIndex) => {
      if (segment.type === "text") {
        return (
          <React.Fragment key={`text-${segmentIndex}`}>
            {segment.value}
          </React.Fragment>
        );
      }

      const isCopied = copiedBlockIndex === segmentIndex;

      return (
        <div
          key={`code-${segmentIndex}`}
          className="my-2 overflow-hidden rounded-lg border border-slate-600 bg-[#1e1f22] text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2 text-[11px] text-slate-400">
            <span>Code</span>
            <button
              type="button"
              onClick={() => copyCodeBlock(segment.value, segmentIndex)}
              className="rounded-md border border-slate-600 px-2 py-1 text-slate-200 transition hover:bg-slate-700"
            >
              {isCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto p-3 text-sm leading-6 text-slate-100">
            <code className="font-mono whitespace-pre-wrap break-words">
              {segment.value}
            </code>
          </pre>
        </div>
      );
    });
  };

  return (
    <div
      data-message-id={message.id}
      className={`group flex mb-3 ${isSender ? "justify-end" : "justify-start"} ${
        isPending ? "opacity-70" : ""
      }`}
    >
      {/* Left Avatar (receiver) */}
      {!isSender && (
        <div className="mr-3">
          <MessageAvatar
            name={name}
            avatarUrl={avatarUrl}
            onClick={onProfileClick}
          />
        </div>
      )}

      {/* Message Body */}
      <div
        className={`flex flex-col gap-1 max-w-[75%] ${
          isSender ? "items-end text-left" : "items-start"
        }`}
      >
        {/* Username */}
        {name && !isSender && (
          <span
            className="text-xs font-medium text-[#949ba4] px-1 cursor-pointer hover:text-[#dbdee1]"
            onClick={onProfileClick}
          >
            {name}
          </span>
        )}

        {/* Reply Preview */}
        {message.replyTo && (
          <div className="px-3 py-2 text-xs text-[#dbdee1] bg-[#1e1f22] rounded-md border-l-4 border-[#5865f2]">
            <span className="font-semibold">
              {message.replyTo.author || "User"}
            </span>
            : {message.replyTo.content}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`
            px-4 py-2.5 w-fit max-w-96
            ${bubbleStyles}
            rounded-lg
            ${
              isMentioned
                ? "bg-[rgba(250,204,21,0.15)] ring-1 ring-[#facc15]"
                : ""
            }
            ${isFailed ? "ring-1 ring-red-500 bg-red-900/20" : ""}
          `}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-left">
            {messageRenderer
              ? messageRenderer(message.content)
              : renderPlainContent(message.content)}
          </div>

          {children && <div className="mt-3">{children}</div>}

          <div className="flex items-center gap-2 mt-1">
            {onReply && !isFailed && (
              <button
                onClick={onReply}
                className="text-xs text-[#949ba4] hover:text-[#dbdee1] flex items-center gap-1"
                aria-label="Reply"
                title="Reply"
              >
                <svg
                  className="w-3 h-3 mt-0.5"
                  viewBox="0 0 640 640"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M268.2 82.4C280.2 87.4 288 99 288 112L288 192L400 192C497.2 192 576 270.8 576 368C576 481.3 494.5 531.9 475.8 542.1C473.3 543.5 470.5 544 467.7 544C456.8 544 448 535.1 448 524.3C448 516.8 452.3 509.9 457.8 504.8C467.2 496 480 478.4 480 448.1C480 395.1 437 352.1 384 352.1L288 352.1L288 432.1C288 445 280.2 456.7 268.2 461.7C256.2 466.7 242.5 463.9 233.3 454.8L73.3 294.8C60.8 282.3 60.8 262 73.3 249.5L233.3 89.5C242.5 80.3 256.2 77.6 268.2 82.6z"
                    fill="currentColor"
                  />
                </svg>
                <span>Reply</span>
              </button>
            )}
            {reactions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {reactions.map((reaction) => (
                  <button
                    key={`${message.id}-${reaction.emoji}`}
                    type="button"
                    onClick={() => handleQuickReaction(reaction.emoji)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                      reaction.reactedByMe
                        ? "border-indigo-500/60 bg-slate-800 text-slate-100 hover:bg-slate-700/90"
                        : "border-slate-700/80 bg-slate-900/90 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
                    }`}
                    aria-label={
                      reaction.reactedByMe
                        ? `Remove reaction ${reaction.emoji}`
                        : `React with ${reaction.emoji}`
                    }
                    title={
                      reaction.reactedByMe
                        ? `Remove reaction ${reaction.emoji}`
                        : `React with ${reaction.emoji}`
                    }
                  >
                    <span>{reaction.emoji}</span>
                    {reaction.count > 1 && <span>{reaction.count}</span>}
                  </button>
                ))}
              </div>
            )}
            {onReact && (
              <div ref={reactionPickerRef} className="relative">
                <button
                  ref={reactionButtonRef}
                  type="button"
                  onClick={() => setShowReactionPicker((value) => !value)}
                  className="text-xs text-[#949ba4] hover:text-[#dbdee1] flex items-center gap-1"
                  aria-label="Add reaction"
                  title="Add reaction"
                >
                  <Smile className="h-3 w-3 mt-0.5" />
                </button>
              </div>
            )}
            {isFailed && onRetry && (
              <button
                onClick={onRetry}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <span>Failed</span>
                <span className="underline">Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* Timestamp and status */}
        <div className="flex items-center gap-2 px-1">
          {timestamp && (
            <span className="text-[10px] text-[#949ba4]">{timestamp}</span>
          )}
          {isPending && (
            <span className="text-[10px] text-[#949ba4] flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sending...
            </span>
          )}
          {isFailed && (
            <span className="text-[10px] text-red-400">Not delivered</span>
          )}
        </div>

        {showReactionPicker &&
        reactionPickerPosition &&
        typeof document !== "undefined"
          ? createPortal(
              <div
                ref={reactionPickerRef}
                className="fixed z-[9999]"
                style={{
                  top: reactionPickerPosition.top,
                  left: reactionPickerPosition.left,
                }}
              >
                <EmojiPicker
                  theme={Theme.DARK}
                  onEmojiClick={handleReactionPick}
                />
              </div>,
              document.body
            )
          : null}
      </div>

      {/* Right Avatar (sender) */}
      {isSender && (
        <div className="ml-3">
          <MessageAvatar name={name || "You"} avatarUrl={avatarUrl} />
        </div>
      )}
    </div>
  );
};

export default memo(MessageBubble);
