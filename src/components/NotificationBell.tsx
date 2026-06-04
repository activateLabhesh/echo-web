"use client";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";

interface NotificationBellProps {
  className?: string;
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
}

export default function NotificationBell({
  className = "",
  onNavigateToMessage,
}: NotificationBellProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);
  const { unreadCount } = useNotifications();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleBellClick = () => {
    setShowDropdown((prev) => !prev);
  };

  useEffect(() => {
    if (!showDropdown) return;

    const updateAnchor = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchorRect({
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      });
    };

    updateAnchor();
    window.addEventListener("resize", updateAnchor);

    return () => {
      window.removeEventListener("resize", updateAnchor);
    };
  }, [showDropdown]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleBellClick}
        className={`relative p-2 rounded-full hover:bg-[#23272a] transition-colors ${
          unreadCount > 0 ? "text-yellow-500" : "text-gray-400 hover:text-white"
        }`}
        title="Notifications"
      >
        <Bell size={20} />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showDropdown && (
        <NotificationDropdown
          onClose={() => setShowDropdown(false)}
          onNavigateToMessage={onNavigateToMessage}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
}
