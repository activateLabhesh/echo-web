import React from "react";

interface Props {
  name?: string;
  isSender?: boolean;
  message: string;
  avatarUrl?: string;
  timestamp: string;
  children?: React.ReactNode; // Allow children to be passed
}

const getInitials = (value: string = "") =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2) || "?";

const MessageBubble: React.FC<Props> = ({
  name,
  isSender = false,
  message,
  avatarUrl,
  timestamp,
  children,
}) => {
  const bubbleStyles = isSender
    ? "bg-gradient-to-br from-indigo-500/90 via-sky-500/80 to-cyan-400/70 text-white shadow-[0_12px_30px_rgba(14,165,233,0.25)]"
    : "bg-slate-800/80 text-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.35)]";

  const alignment = isSender ? "flex-row-reverse" : "flex-row";
  const containerAlignment = isSender ? "items-end text-right" : "items-start";
  const initials = name ? getInitials(name) : "";
  const showAvatar = !isSender && (Boolean(avatarUrl) || Boolean(name));
  const shouldRenderAvatarSlot = !isSender;

  return (
    <div className={`flex ${alignment} gap-3`}>
      {shouldRenderAvatarSlot ? (
        <div className="flex h-9 w-9 flex-shrink-0 items-end justify-center">
          <div
            className={`mt-auto h-9 w-9 overflow-hidden rounded-full border border-slate-800/60 bg-slate-800/60 transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name || "User avatar"} className="h-full w-full object-cover" />
            ) : name ? (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-300">
                {initials}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={`flex max-w-[min(32rem,70%)] flex-col ${containerAlignment} gap-1`}
      >
        {name && !isSender && (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {name}
          </span>
        )}
        <div className={`message-bubble rounded-3xl px-4 py-3 ${bubbleStyles}`}>
          {message && <p className="text-sm leading-relaxed">{message}</p>}
          {children && <div className={message ? "mt-3" : ""}>{children}</div>}
        </div>
        {timestamp && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
