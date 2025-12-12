"use client";
import { getUser } from "../app/api";
import type { profile } from "../app/api";
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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useNotifications } from '../hooks/useNotifications';

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Servers", icon: Users, path: "/servers" },
  { label: "Messages", icon: MessageSquareText, path: "/messages" },
  { label: "Friends", icon: UserIcon, path: "/friends" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored !== null) {
      setCollapsed(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
      } catch (err) {
        setError("Failed to load user profile. Please try again.");
      }
    };
    fetchUser();
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!user) return <div className="text-white">Loading...</div>;

  return (
    <aside
      className={clsx(
        "relative h-screen flex flex-col justify-between overflow-hidden transition-all duration-300 ease-in-out select-none shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-no-repeat bg-cover opacity-9"
        style={{ backgroundImage: "url('/sidebar-bg.png')" }}
      />

      {/* Sidebar Content */}
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
              {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <div className="relative group" key={item.label}>
                  <Link
                    href={item.path}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all",
                     
                      isActive
                        ? "bg-white/20 text-white shadow-md"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {/* Show unread count badge for notifications */}
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                    
                    {!collapsed && <span>{item.label}</span>}
                  </Link>

                  {collapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-20 px-3 py-1 text-sm text-white bg-black rounded shadow-lg opacity-0 group-hover:opacity-100 transition">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
       {/* Bottom Section: Profile */}
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
                  <span className="font-semibold text-white">{user.fullname}</span>
                  <span className="text-xs text-gray-400">{user.username}</span>
                </div>
                <Settings className="text-gray-400 w-5 h-5 group-hover:text-white" />
              </div>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}
