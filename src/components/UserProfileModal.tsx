"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
    roles?: (string | { id: string; name: string; color: string })[];
    isLoadingRoles?: boolean; // Add loading state
  } | null;
  currentUserId?: string;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  currentUserId,
}: UserProfileModalProps) {
  const router = useRouter();
  const bioText = (user?.about || "No bio yet...").slice(0, 100);

  // console.log("UserProfileModal render:", { isOpen, user, currentUserId });

  const handleMessageClick = (e: React.MouseEvent) => {
    // console.log("Send Message clicked");
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      console.error("No user in handleMessageClick");
      return;
    }
    // console.log("Navigating to DM with:", user.id);
    onClose();
    
    // Use router.push with a slight delay to ensure modal closes first
    setTimeout(() => {
      router.push(`/messages?dm=${user.id}`);
    }, 150);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm">
      <div className="bg-[#1E1F22] rounded-2xl shadow-2xl w-80 p-6 text-white relative animate-fadeIn">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ✖
        </button>
   <div className="w-full flex flex-col items-center space-y-4 px-4">

  {/* Avatar */}
  <div className="relative group">
    <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-lg opacity-0 group-hover:opacity-100 transition duration-300" />
    <img
      src={user.avatarUrl || "/User_profil.png"}
      alt={user.username}
      className="relative w-24 h-24 rounded-full border-4 border-gray-600 object-cover shadow-xl transition-transform duration-300 group-hover:scale-105"
    />
  </div>

  {/* Username */}
  <div className="w-full min-w-0 text-center">
    <h2 className="text-xl font-semibold text-white truncate max-w-full">
      {user.username}
    </h2>
  </div>

  {/* Bio Section */}
  <div className="w-full bg-gray-800/60 backdrop-blur-md rounded-2xl p-4 border border-gray-700/60 shadow-lg">
    <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 text-center">
      Bio
    </h3>

    <p className="text-sm text-gray-300 text-center break-words max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
      {bioText}
    </p>
  </div>



          {/* Roles Display */}
          {user.isLoadingRoles ? (
            <div className="w-full">
              <h3 className="text-xs text-gray-400 uppercase font-semibold mb-2">
                Roles
              </h3>
              <div className="flex justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
              </div>
            </div>
          ) : user.roles && user.roles.length > 0 ? (
            <div className="w-full">
              <h3 className="text-xs text-gray-400 uppercase font-semibold mb-2">
                Roles
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role, index) => {
                  const roleName = typeof role === "string" ? role : role.name;
                  return (
                    <span
                      key={index}
                      className="px-3 py-1 bg-indigo-600/30 text-indigo-300 rounded-full text-xs font-medium"
                    >
                      {roleName}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Send Message Button */}
          {currentUserId !== user.id && (
            <div className="w-full mt-4">
              <button
                onClick={handleMessageClick}
                type="button"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition flex items-center justify-center gap-2 font-medium"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

