import React, { memo } from "react";

/* -------------------- TYPES -------------------- */

export interface ChatMessage {
  id?: string | number;
  content: string;
  replyTo?: {
    id: string | number;
    content: string;
    author?: string;
  } | null;
  status?: 'pending' | 'sent' | 'failed';
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
  const isPending = message.status === 'pending';
  const isFailed = message.status === 'failed';
  
  const bubbleStyles = isSender
    ? "bg-[#3a3c43] text-[#dbdee1]"
    : "bg-[#2b2d31] text-[#dbdee1]";

  const displayAvatar = avatarUrl;

  return (
    <div 
    data-message-id = {message.id}
    className={`flex mb-3 ${isSender ? "justify-end" : "justify-start"} ${isPending ? "opacity-70" : ""}`}
    >
      {/* Left Avatar */}
      {!isSender && (
        <div className="w-8 h-8 mr-3 flex-shrink-0">
          <img
            src={displayAvatar}
            alt={name || "User"}
            onClick={onProfileClick}
            onError={(e) => (e.currentTarget.src = "/User_profil.png")}
            className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-90 transition"
          />
        </div>
      )}

      {/* Message Body */}
      <div
        className={`flex flex-col gap-1 max-w-[75%] ${
          isSender ? "items-end text-right" : "items-start"
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
          {/* Message text */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {messageRenderer
              ? messageRenderer(message.content)
              : message.content}
          </div>

          {children && <div className="mt-3">{children}</div>}

          {/* Action buttons row */}
          <div className="flex items-center gap-2 mt-1">
            {onReply && !isFailed && (
              <button
                onClick={onReply}
                className="text-xs text-[#949ba4] hover:text-[#dbdee1]"
              >
                Reply
              </button>
            )}
            
            {/* Failed message retry button */}
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
          
          {/* Pending indicator */}
          {isPending && (
            <span className="text-[10px] text-[#949ba4] flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" cy="12" r="10" 
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
          
          {/* Failed indicator */}
          {isFailed && (
            <span className="text-[10px] text-red-400">Not delivered</span>
          )}
        </div>
      </div>

      {/* Right Avatar */}
      {isSender && (
        <div className="w-8 h-8 ml-3 flex-shrink-0">
          <img
            src={displayAvatar}
            alt="You"
            onError={(e) => (e.currentTarget.src = "/User_profil.png")}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default memo(MessageBubble);
