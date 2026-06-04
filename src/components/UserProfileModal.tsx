"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, UserMinus, UserPlus, X } from "lucide-react";
import { addFriend, fetchAllFriends, removeFriend, searchUsers } from "@/api";

type RelationshipStatus = "none" | "pending" | "accepted" | "rejected";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
    roles?: (string | { id: string; name: string; color: string })[];
    isLoadingRoles?: boolean;
  } | null;
  currentUserId?: string;
  relationshipStatus?: RelationshipStatus;
  friendActionLoading?: boolean;
  onAddFriend?: (userId: string) => void | Promise<void>;
  onRemoveFriend?: (userId: string) => void | Promise<void>;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  currentUserId,
  relationshipStatus,
  friendActionLoading = false,
  onAddFriend,
  onRemoveFriend,
}: UserProfileModalProps) {
  const router = useRouter();
  const [internalRelationshipStatus, setInternalRelationshipStatus] =
    useState<RelationshipStatus | undefined>(relationshipStatus);
  const [internalActionLoading, setInternalActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const activeRelationshipStatus =
    relationshipStatus ?? internalRelationshipStatus;
  const isFriendActionLoading = friendActionLoading || internalActionLoading;
  const isOwnProfile = Boolean(user?.id && user.id === currentUserId);
  const bioText = (user?.about || "No bio yet...").slice(0, 160);

  useEffect(() => {
    setInternalRelationshipStatus(relationshipStatus);
  }, [relationshipStatus, user?.id]);

  useEffect(() => {
    if (
      !isOpen ||
      !user ||
      isOwnProfile ||
      relationshipStatus !== undefined
    ) {
      return;
    }

    let cancelled = false;

    const loadRelationshipStatus = async () => {
      try {
        const [friends, searchResults] = await Promise.all([
          fetchAllFriends(),
          searchUsers(user.username),
        ]);
        if (cancelled) return;

        const isFriend = friends.some((friend: any) => friend.id === user.id);
        const searchMatch = searchResults.find(
          (result: any) => result.id === user.id
        );

        setInternalRelationshipStatus(
          isFriend
            ? "accepted"
            : searchMatch?.relationshipStatus || "none"
        );
      } catch (error) {
        console.error("Failed to load profile relationship status:", error);
        if (!cancelled) setInternalRelationshipStatus("none");
      }
    };

    setInternalRelationshipStatus(undefined);
    loadRelationshipStatus();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isOwnProfile, relationshipStatus, user]);

  const handleMessageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    onClose();
    setTimeout(() => {
      router.push(`/messages?dm=${user.id}`);
    }, 150);
  };

  const handleAddFriendClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    setInternalActionLoading(true);
    setActionError("");
    try {
      if (onAddFriend) {
        await onAddFriend(user.id);
      } else {
        await addFriend(user.id);
      }
      setInternalRelationshipStatus("pending");
    } catch (error: any) {
      console.error("Failed to add friend from profile:", error);
      setActionError(
        error?.response?.data?.message || "Failed to send friend request"
      );
    } finally {
      setInternalActionLoading(false);
    }
  };

  const handleRemoveFriendClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    setInternalActionLoading(true);
    setActionError("");
    try {
      if (onRemoveFriend) {
        await onRemoveFriend(user.id);
      } else {
        await removeFriend(user.id);
      }
      setInternalRelationshipStatus("none");
    } catch (error: any) {
      console.error("Failed to remove friend from profile:", error);
      setActionError(error?.response?.data?.message || "Failed to unfriend");
    } finally {
      setInternalActionLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 px-4 py-6 backdrop-blur-md">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#1E1F22]/95 text-white shadow-2xl animate-fadeIn">
        <button
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          type="button"
          aria-label="Close profile"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex w-full flex-col items-center gap-4 px-6 py-7">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />
            <img
              src={user.avatarUrl || "/User_profil.png"}
              alt={user.username}
              className="relative h-24 w-24 rounded-full border-4 border-gray-600 bg-gray-800 object-cover shadow-xl"
              onError={(e) => {
                e.currentTarget.src = "/User_profil.png";
              }}
            />
          </div>

          <div className="w-full min-w-0 text-center">
            <h2 className="truncate text-xl font-semibold text-white">
              {user.username}
            </h2>
          </div>

          <div className="w-full rounded-xl border border-gray-700/60 bg-gray-800/60 p-4 shadow-lg">
            <h3 className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
              Bio
            </h3>
            <p className="max-h-24 overflow-y-auto break-words text-center text-sm text-gray-300 scrollbar-thin scrollbar-thumb-gray-600">
              {bioText}
            </p>
          </div>

          {user.isLoadingRoles ? (
            <div className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">
                Roles
              </h3>
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-300" />
              </div>
            </div>
          ) : user.roles && user.roles.length > 0 ? (
            <div className="w-full rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">
                Roles
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role, index) => {
                  const roleName = typeof role === "string" ? role : role.name;
                  return (
                    <span
                      key={`${roleName}-${index}`}
                      className="rounded-full border border-gray-600 bg-gray-700/70 px-3 py-1 text-xs font-medium text-gray-200"
                    >
                      {roleName}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!isOwnProfile && (
            <div className="mt-1 w-full space-y-2">
              {actionError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
                  {actionError}
                </div>
              )}

              {activeRelationshipStatus === undefined ? (
                <div className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 text-center text-sm font-medium text-gray-300">
                  Checking friendship...
                </div>
              ) : activeRelationshipStatus === "accepted" ? (
                <button
                  onClick={handleRemoveFriendClick}
                  type="button"
                  disabled={isFriendActionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-600/20 py-2 font-medium text-red-100 transition hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserMinus className="h-4 w-4" />
                  {isFriendActionLoading ? "Removing..." : "Unfriend"}
                </button>
              ) : activeRelationshipStatus === "pending" ? (
                <div className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 text-center text-sm font-medium text-gray-300">
                  Friend request pending
                </div>
              ) : (
                <button
                  onClick={handleAddFriendClick}
                  type="button"
                  disabled={isFriendActionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-700 py-2 font-medium text-gray-100 transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlus className="h-4 w-4" />
                  {isFriendActionLoading ? "Sending..." : "Add Friend"}
                </button>
              )}

              <button
                onClick={handleMessageClick}
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800 py-2 font-medium text-gray-100 transition hover:bg-gray-700"
              >
                <Send className="h-4 w-4" />
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
