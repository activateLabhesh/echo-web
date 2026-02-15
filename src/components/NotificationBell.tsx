"use client";
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBellProps {
  className?: string;
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
}

export default function NotificationBell({ className = "", onNavigateToMessage }: NotificationBellProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { unreadCount } = useNotifications();

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleBellClick}
        className={`relative p-2 rounded-full hover:bg-[#23272a] transition-colors ${
          unreadCount > 0 ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
        }`}
        title="Notifications"
      >
        <Bell size={20} />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showDropdown && (
        <NotificationDropdown
          onClose={() => setShowDropdown(false)}
          onNavigateToMessage={onNavigateToMessage}
        />
      )}
    </div>
  );
}
