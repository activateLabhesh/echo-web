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
}

interface MessageBubbleProps {
  message: ChatMessage;
  name?: string;
  isSender?: boolean;
  avatarUrl?: string;
  timestamp?: string;

  onProfileClick?: () => void;
  onReply?: () => void;
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
  children,
  messageRenderer,
  isMentioned = false,
}) => {
  const bubbleStyles = isSender
    ? "bg-[#3a3c43] text-[#dbdee1]"
    : "bg-[#2b2d31] text-[#dbdee1]";

  const displayAvatar = avatarUrl || "/User_profil.png";

  return (
    <div className={`flex mb-3 ${isSender ? "justify-end" : "justify-start"}`}>
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
          `}
        >
          {/* Message text */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {messageRenderer
              ? messageRenderer(message.content)
              : message.content}
          </div>

          {children && <div className="mt-3">{children}</div>}

          {onReply && (
            <button
              onClick={onReply}
              className="mt-1 text-xs text-[#949ba4] hover:text-[#dbdee1]"
            >
              Reply
            </button>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-[10px] text-[#949ba4] px-1">{timestamp}</span>
        )}
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
