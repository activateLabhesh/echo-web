"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { usePageReady } from "@/components/RouteChangeLoader";
import {
  FaUserFriends,
  FaPlus,
  FaSearch,
  FaCommentAlt,
  FaUserMinus,
  FaCircle,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  fetchAllFriends,
  fetchFriendRequests,
  addFriend,
  removeFriend,
  respondToFriendRequest,
  searchUsers,
  getUser,
} from "@/api";
import { fetchUserProfile } from "@/api/profile.api";
import Loader from "@/components/Loader";
import UserProfileModal from "@/components/UserProfileModal";
import { useFriendNotifications } from "@/contexts/FriendNotificationContext";
import { SearchUserResult } from "@/api/types/user.types";
import { createAuthSocket } from "@/socket";
import { Socket } from "socket.io-client";

type RelationshipStatus = SearchUserResult["relationshipStatus"];

interface FriendRequestData {
  friends_id: string;
  created_at: string;
  user1_id: string;
  user1: {
    username: string;
    fullname: string;
    avatar_url: string;
  };
}

interface FriendData {
  id: string;
  username: string;
  fullname: string;
  avatar_url: string;
  status: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const pageReady = usePageReady();
  const { refreshCount: refreshFriendNotifications } = useFriendNotifications();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [requests, setRequests] = useState<FriendRequestData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
    roles?: string[];
  } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sort friends: online first, then alphabetical
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aOnline = a.status === "online" ? 0 : 1;
      const bOnline = b.status === "online" ? 0 : 1;
      if (aOnline !== bOnline) return aOnline - bOnline;
      return (a.username || "").localeCompare(b.username || "");
    });
  }, [friends]);

  const onlineCount = useMemo(
    () => friends.filter((f) => f.status === "online").length,
    [friends]
  );

  useEffect(() => {
    Promise.all([loadFriends(), loadRequests()]).finally(() => {
      setInitialLoading(false);
      pageReady();
    });
  }, [pageReady]);

  useEffect(() => {
    const userItem = localStorage.getItem("user");
    if (!userItem) return;
    try {
      const parsed = JSON.parse(userItem);
      setCurrentUserId(parsed?.id);
    } catch {
      setCurrentUserId(undefined);
    }
  }, []);

  // Socket-based presence tracking + periodic polling fallback
  // useEffect(() => {
  //   let mounted = true;

  //   const setupPresence = async () => {
  //     try {
  //       const user = await getUser();
  //       if (!mounted || !user?.id) return;

  //       // Create a dedicated socket for presence on the friends page
  //       const socket = createAuthSocket(user.id);
  //       socketRef.current = socket;

  //       // Listen for real-time friend status changes if the backend emits them
  //       socket.on("friend:status_change", (data: { userId: string; status: string }) => {
  //         if (!mounted) return;
  //         setFriends((prev) =>
  //           prev.map((f) =>
  //             f.id === data.userId ? { ...f, status: data.status } : f
  //           )
  //         );
  //       });

  //       // Also listen for generic user status updates
  //       socket.on("user:status_update", (data: { userId: string; status: string }) => {
  //         if (!mounted) return;
  //         setFriends((prev) =>
  //           prev.map((f) =>
  //             f.id === data.userId ? { ...f, status: data.status } : f
  //           )
  //         );
  //       });

  //       // Periodic polling fallback: re-fetch friends every 30s to get fresh status
  //       presenceIntervalRef.current = setInterval(async () => {
  //         if (!mounted) return;
  //         try {
  //           const data = await fetchAllFriends();
  //           if (mounted) setFriends(data as any);
  //         } catch {
  //           // Silently ignore polling errors
  //         }
  //       }, 30000);
  //     } catch (err) {
  //       console.error("Failed to set up presence tracking:", err);
  //     }
  //   };

  //   setupPresence();

  //   return () => {
  //     mounted = false;
  //     if (socketRef.current) {
  //       socketRef.current.disconnect();
  //       socketRef.current = null;
  //     }
  //     if (presenceIntervalRef.current) {
  //       clearInterval(presenceIntervalRef.current);
  //       presenceIntervalRef.current = null;
  //     }
  //   };
  // }, []);

  const openUserProfile = useCallback(
    async (userId: string, fallbackName?: string, fallbackAvatar?: string) => {
      if (!userId) return;

      setSelectedUser({
        id: userId,
        username: fallbackName || "Unknown User",
        avatarUrl: fallbackAvatar || "/User_profil.png",
        about: "Loading bio...",
        roles: [],
      });
      setIsProfileOpen(true);

      try {
        const profile = await fetchUserProfile(userId);
        if (!profile) return;

        setSelectedUser((prev) => {
          if (!prev || prev.id !== userId) return prev;
          return {
            id: userId,
            username:
              profile.username ||
              profile.fullname ||
              fallbackName ||
              "Unknown User",
            avatarUrl:
              profile.avatar_url || fallbackAvatar || "/User_profil.png",
            about: profile.bio || "No bio yet...",
            roles: Array.isArray(profile.roles)
              ? profile.roles
                  .map((role: any) =>
                    typeof role === "string" ? role : role?.name
                  )
                  .filter(Boolean)
              : [],
          };
        });
      } catch (profileError) {
        console.error("Failed to open friend profile:", profileError);
      }
    },
    []
  );

  const loadFriends = async () => {
    try {
      const data = await fetchAllFriends();
      setFriends(data as any);
    } catch (err: any) {
      console.error("Error loading friends:", err);
      setError(err?.response?.data?.message || "Failed to load friends");
    }
  };

  const loadRequests = async () => {
    try {
      const data = await fetchFriendRequests();
      setRequests(data as any);
    } catch (err: any) {
      console.error("Error loading requests:", err);
    }
  };

  const handleAddFriend = async (userId: string) => {
    setLoading(true);
    setError("");
    try {
      await addFriend(userId);
      loadRequests();
      // Update search results to reflect new status
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, relationshipStatus: "pending" as const }
            : user
        )
      );
    } catch (err: any) {
      console.error("Error adding friend:", err);
      setError(err?.response?.data?.message || "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setError("");
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (err: any) {
      console.error("Error searching users:", err);
      setError(err?.response?.data?.message || "Failed to search users");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Auto-search on typing with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSendDM = async (friendId: string, friendUsername: string) => {
    // Navigate directly to messages with the friend's user ID
    // The ChatPage component will handle finding/creating the DM thread
    router.push(`/messages?dm=${friendId}`);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!friendId || removingFriendId) return;

    setRemovingFriendId(friendId);
    setError("");
    try {
      await removeFriend(friendId);
      setFriends((prev) => prev.filter((friend) => friend.id !== friendId));
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === friendId
            ? { ...user, relationshipStatus: "none" as const }
            : user
        )
      );
    } catch (err: any) {
      console.error("Error removing friend:", err);
      setError(err?.response?.data?.message || "Failed to remove friend");
    } finally {
      setRemovingFriendId(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await respondToFriendRequest(requestId, "accepted");
      loadFriends();
      loadRequests();
      // Refresh the sidebar notification badge
      await refreshFriendNotifications();
    } catch (err: any) {
      console.error("Error accepting request:", err);
      setError(
        err?.response?.data?.message || "Failed to accept friend request"
      );
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await respondToFriendRequest(requestId, "rejected");
      loadRequests();
      // Refresh the sidebar notification badge
      await refreshFriendNotifications();
    } catch (err: any) {
      console.error("Error rejecting request:", err);
      setError(
        err?.response?.data?.message || "Failed to reject friend request"
      );
    }
  };

  const getProfileRelationshipStatus = (
    userId?: string
  ): RelationshipStatus | undefined => {
    if (!userId || userId === currentUserId) return undefined;

    const searchMatch = searchResults.find((user) => user.id === userId);
    if (searchMatch) return searchMatch.relationshipStatus;

    if (friends.some((friend) => friend.id === userId)) return "accepted";
    if (requests.some((request) => request.user1_id === userId))
      return "pending";

    return "none";
  };

  const selectedUserRelationshipStatus = getProfileRelationshipStatus(
    selectedUser?.id
  );
  const selectedUserActionLoading =
    Boolean(selectedUser?.id && removingFriendId === selectedUser.id) ||
    loading;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-800 bg-black">
          <div className="p-5">
            {error && (
              <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
                {error}
              </div>
            )}

            <div className="mt-4">
              <label className="group flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm text-white/70 shadow-inner focus-within:border-gray-700 focus-within:text-white">
                <FaSearch className="h-4 w-4 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  className="flex-1 bg-transparent outline-none placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>

              {searching &&
                searchQuery.trim() &&
                searchResults.length === 0 && (
                  <div className="mt-2 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-700 border-t-gray-400" />
                      Searching...
                    </div>
                  </div>
                )}

              {searchResults.length > 0 && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-800 bg-black">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-2 border-b border-gray-800 p-2 last:border-b-0 hover:bg-gray-800"
                    >
                      <div
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                        onClick={() =>
                          openUserProfile(
                            user.id,
                            user.username,
                            user.avatar_url
                          )
                        }
                      >
                        <img
                          src={user.avatar_url || "/avatar.png"}
                          alt={user.username}
                          className="h-8 w-8 rounded-full bg-gray-700 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/avatar.png";
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {user.username}
                          </div>
                          <div className="truncate text-xs text-white/50">
                            {user.fullname}
                          </div>
                        </div>
                      </div>

                      {user.relationshipStatus === "none" && (
                        <button
                          onClick={() => handleAddFriend(user.id)}
                          disabled={loading}
                          className="rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                        >
                          <FaPlus className="mr-1 inline" /> Add
                        </button>
                      )}
                      {user.relationshipStatus === "pending" && (
                        <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                          Pending
                        </span>
                      )}
                      {user.relationshipStatus === "accepted" && (
                        <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                          Friends
                        </span>
                      )}
                      {user.relationshipStatus === "rejected" && (
                        <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
                          Rejected
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs uppercase text-white/50">
                  Pending Requests
                </h3>
                <span className="text-xs text-white/40">{requests.length}</span>
              </div>

              {requests.length === 0 && (
                <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-400">
                  No pending requests right now.
                </div>
              )}

              {requests.map((req) => (
                <div
                  key={req.friends_id}
                  className="mt-2 rounded-xl border border-gray-800 bg-gray-900/60 p-3"
                >
                  <div
                    className="mb-3 flex cursor-pointer items-center gap-2"
                    onClick={() =>
                      openUserProfile(
                        req.user1_id,
                        req.user1.username,
                        req.user1.avatar_url
                      )
                    }
                  >
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-800 border border-gray-700">
                      {req.user1.avatar_url ? (
                        <img
                          src={req.user1.avatar_url}
                          alt={req.user1.username}
                          className="h-9 w-9 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget
                              .nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          display: req.user1.avatar_url ? "none" : "flex",
                        }}
                        className="h-full w-full items-center justify-center text-xs font-semibold uppercase text-slate-300"
                      >
                        {req.user1.username?.slice(0, 2).toUpperCase() || "??"}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {req.user1.username}
                      </div>
                      <div className="truncate text-xs text-white/50">
                        {req.user1.fullname}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.friends_id)}
                      className="flex-1 rounded-lg bg-gray-800 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.friends_id)}
                      className="flex-1 rounded-lg border border-gray-700 py-1.5 text-xs font-semibold text-gray-300 hover:bg-gray-800"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8">
          {friends.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-800 bg-gray-900">
                <FaUserFriends className="text-gray-300" />
              </div>
              <p className="text-gray-200">No friends yet.</p>
              <p className="mt-1 text-xs text-gray-500">
                Search by username to start building your list.
              </p>
            </div>
          ) : (
            <>
              {/* Online / Offline count header */}
              {/* <div className="mb-5 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  <span className="text-sm font-medium text-emerald-300">
                    {onlineCount} Online
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-500" />
                  <span className="text-sm font-medium text-gray-400">
                    {friends.length - onlineCount} Offline
                  </span>
                </div>
              </div> */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortedFriends.map((f) => (
                  <div
                    key={f.id}
                    className={`group relative overflow-hidden rounded-2xl border p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 ${
                      f.status === "online"
                        ? "border-emerald-500/20 bg-gray-900/60 hover:border-emerald-500/40"
                        : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                    }`}
                  >
                    <div className="relative flex items-center gap-3">
                      {/* Avatar with status dot */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={f.avatar_url}
                          alt={f.username}
                          className={`h-12 w-12 cursor-pointer rounded-xl bg-gray-700 object-cover transition ${
                            f.status !== "online" ? "opacity-60 grayscale-[30%]" : ""
                          }`}
                          onClick={() =>
                            openUserProfile(f.id, f.username, f.avatar_url)
                          }
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/avatar.png";
                          }}
                        />
                        {/* Status indicator dot on avatar */}
                        {/* <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-gray-900 ${
                            f.status === "online"
                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                              : "bg-gray-500"
                          }`}
                        /> */}
                      </div>
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() =>
                          openUserProfile(f.id, f.username, f.avatar_url)
                        }
                      >
                        <div className={`truncate text-base font-semibold ${
                          f.status !== "online" ? "text-gray-400" : "text-white"
                        }`}>
                          {f.username}
                        </div>
                        <div className="truncate text-xs text-white/50">
                          {f.fullname}
                        </div>
                        {/* <div className="mt-1 flex items-center gap-1.5">
                          <span className={`text-[11px] font-medium capitalize ${
                            f.status === "online" ? "text-emerald-400" : "text-gray-500"
                          }`}>
                            {f.status === "online" ? "Online" : "Offline"}
                          </span>
                        </div> */}
                      </div>
                      <button
                        onClick={() => handleSendDM(f.id, f.username)}
                        className="rounded-full bg-gray-800 p-2 text-white shadow-lg transition hover:bg-gray-700"
                        title="Send message"
                      >
                        <FaCommentAlt className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(f.id)}
                        disabled={removingFriendId === f.id}
                        className="rounded-full border border-red-500/30 bg-red-500/10 p-2 text-red-200 shadow-lg transition hover:border-red-400/50 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Unfriend"
                      >
                        <FaUserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
        currentUserId={currentUserId}
        relationshipStatus={selectedUserRelationshipStatus}
        friendActionLoading={selectedUserActionLoading}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
      />
    </div>
  );
}
