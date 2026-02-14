"use client";
import { getUser } from "@/api/profile.api";
import { logout } from "@/api/auth.api";
import type { profile } from "@/api/types/profile.types";
import { useUser } from "@/components/UserContext";

import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  User as UserIcon,
  Phone,
  Bell,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { useFriendNotifications } from "../contexts/FriendNotificationContext";
import { useMessageNotifications } from "../contexts/MessageNotificationContext";
import { createAuthSocket } from "@/socket";

const navItems = [
  { label: "Servers", icon: Users, path: "/servers" },
  { label: "Messages", icon: MessageSquareText, path: "/messages" },
  { label: "Friends", icon: UserIcon, path: "/friends" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
];

export default function Sidebar() {
  const { user } = useUser();

  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ✅ Get values directly from hooks (no refreshCount needed)
  const { unreadCount, setUnreadCount } = useNotifications();
  const { friendRequestCount, refreshCount: refreshFriendCount } =
    useFriendNotifications();
  const { unreadMessageCount, refreshCount: refreshMessageCount } =
    useMessageNotifications();

  const handleNavClick = async (path: string) => {
    // Refresh counts when clicking nav items
    if (path === "/friends") {
      await refreshFriendCount();
    } else if (path === "/messages") {
      await refreshMessageCount();
    }
    // Notifications page will handle its own refresh
  };

  // ✅ WebSocket-based real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const socket = createAuthSocket(user.id);

    // Listen for real-time notification events
    socket.on("new_notification", (data?: { count?: number }) => {
      console.log("📬 New notification received", data);

      // If backend sends the new count, use it
      if (data?.count !== undefined) {
        setUnreadCount(data.count);
      } else {
        // Otherwise increment locally
        setUnreadCount((prev) => prev + 1);
      }
    });

    socket.on("new_message", () => {
      console.log("💬 New message received");
      // Message notifications context will handle its own update
      refreshMessageCount?.();
    });

    socket.on("friend_request", () => {
      console.log("👋 New friend request received");
      refreshFriendCount?.();
    });

    socket.on("friend_request_accepted", () => {
      console.log("✅ Friend request accepted");
      refreshFriendCount?.();
    });

    // Cleanup on unmount
    return () => {
      socket.off("new_notification");
      socket.off("new_message");
      socket.off("friend_request");
      socket.off("friend_request_accepted");
      socket.disconnect();
    };
  }, [user?.id, setUnreadCount, refreshFriendCount, refreshMessageCount]);

  // ✅ Refresh counts when window regains focus
  useEffect(() => {
    const handleFocus = async () => {
      try {
        // Only refresh what we can
        await Promise.all(
          [refreshFriendCount?.(), refreshMessageCount?.()].filter(Boolean)
        );

        // Notification count is managed by its own context
      } catch (error) {
        console.error("Failed to refresh counts on focus:", error);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshFriendCount, refreshMessageCount]);

  useEffect(() => {
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored !== null) {
      setCollapsed(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!user) {
    return (
      <aside className="w-64 h-screen bg-black flex items-center justify-center text-white">
       
      </aside>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "/";
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <aside
      className={clsx(
        "relative h-screen flex flex-col justify-between overflow-hidden transition-all duration-300 ease-in-out select-none shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Background */}
      <div
  className="absolute inset-0 z-0 bg-no-repeat bg-cover opacity-90 border-r border-gray-800"
/>


      {/* Content */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Top Section */}
        <div>
          <div className="flex items-center justify-between p-4">
            <Image
              src="/echo-logo.png"
              alt="Echo Logo"
              width={collapsed ? 0 : 100}
              height={32}
              className={clsx(
                "object-contain transition-opacity duration-300",
                collapsed && "opacity-0"
              )}
            />
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="text-white hover:text-gray-400 transition"
            >
              {collapsed ? (
                <ChevronsRight size={20} />
              ) : (
                <ChevronsLeft size={20} />
              )}
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              let notificationCount = 0;
              if (item.label === "Notifications") {
                notificationCount = unreadCount;
              } else if (item.label === "Messages") {
                notificationCount = unreadMessageCount;
              } else if (item.label === "Friends") {
                notificationCount = friendRequestCount;
              }

              return (
                <div className="relative group" key={item.label}>
                  <Link
                    href={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all",

                      isActive
                        ? "bg-white/20 text-white shadow-md"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {/* Show notification badge with animation */}
                      {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-bold animate-pulse">
                          {notificationCount > 99 ? "99+" : notificationCount}
                        </span>
                      )}
                    </div>

                    {!collapsed && <span>{item.label}</span>}
                  </Link>

                  {collapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-20 px-3 py-1 text-sm text-white bg-black rounded shadow-lg opacity-0 group-hover:opacity-100 transition">
                      {item.label}
                      {notificationCount > 0 && ` (${notificationCount})`}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div>
          {/* Logout Button */}
          <div className="px-2 mb-2">
            <div className="relative group">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all"
              >
                <LogOut className="w-5 h-5" />
                {!collapsed && <span>Logout</span>}
              </button>

              {collapsed && (
                <button
                  onClick={handleLogout}
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-20 px-3 py-1 text-sm text-white bg-black rounded shadow-lg opacity-0 group-hover:opacity-100 transition"
                >
                  Logout
                </button>
              )}
            </div>
          </div>

          {/* Profile */}
          <Link href="/profile-settings">
            <div className="p-4 flex items-center gap-3 mt-auto cursor-pointer group hover:bg-white/10 transition rounded-lg">
              <div className="relative shrink-0">
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500">
                  <Image
                    src={user?.avatar_url || "/avatar.png"}
                    alt="User"
                    width={40}
                    height={40}
                    className="rounded-full bg-white"
                  />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1a1a1a] rounded-full" />
              </div>

              {!collapsed && (
                <div className="flex justify-between items-center flex-1">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white truncate max-w-[140px]">
                      {user.fullname}
                    </span>

                    <span className="text-xs text-gray-400 truncate max-w-[140px]">
                      {user.username}
                    </span>
                  </div>
                  <Settings className="text-gray-400 w-5 h-5 group-hover:text-white" />
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
