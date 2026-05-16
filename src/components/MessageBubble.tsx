import React, { memo, useState } from "react";

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

interface MessageBubbleProps {
  message: ChatMessage;
  name?: string;
  isSender?: boolean;
  avatarUrl?: string;
  timestamp?: string;
  onProfileClick?: () => void;
  onReply?: () => void;
  onRetry?: () => void;
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
  children,
  messageRenderer,
  isMentioned = false,
}) => {
  const isPending = message.status === "pending";
  const isFailed = message.status === "failed";

  const bubbleStyles = isSender
    ? "bg-[#3a3c43] text-[#dbdee1]"
    : "bg-[#2b2d31] text-[#dbdee1]";

  return (
    <div
      data-message-id={message.id}
      className={`flex mb-3 ${isSender ? "justify-end" : "justify-start"} ${
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
            px-4 py-2.5 w-fit max-w-full
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
          <div className="text-sm leading-relaxed whitespace-normal break-words text-left">
            {messageRenderer
              ? messageRenderer(message.content)
              : message.content}
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
              
                <svg className="w-3 h-3 mt-0.5" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M268.2 82.4C280.2 87.4 288 99 288 112L288 192L400 192C497.2 192 576 270.8 576 368C576 481.3 494.5 531.9 475.8 542.1C473.3 543.5 470.5 544 467.7 544C456.8 544 448 535.1 448 524.3C448 516.8 452.3 509.9 457.8 504.8C467.2 496 480 478.4 480 448.1C480 395.1 437 352.1 384 352.1L288 352.1L288 432.1C288 445 280.2 456.7 268.2 461.7C256.2 466.7 242.5 463.9 233.3 454.8L73.3 294.8C60.8 282.3 60.8 262 73.3 249.5L233.3 89.5C242.5 80.3 256.2 77.6 268.2 82.6z" fill="currentColor" />
                </svg>
                <span>Reply</span>
              </button>
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
