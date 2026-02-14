"use client";

import React, { useEffect, useState } from "react";
import { usePageReady } from "@/components/RouteChangeLoader";
import { FaUserFriends, FaPlus, FaUserCircle, FaSearch, FaCommentAlt } from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  fetchAllFriends,
  fetchFriendRequests,
  addFriend,
  respondToFriendRequest,
  searchUsers
} from "@/api";
import Loader from "@/components/Loader";
import { useFriendNotifications } from "@/contexts/FriendNotificationContext";
import {SearchUserResult} from "@/api/types/user.types";

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
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([loadFriends(), loadRequests()]).finally(() => {
      setInitialLoading(false);
      pageReady();
    });
  }, [pageReady]);

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
      setSearchQuery("");
      setSearchResults([]);
      loadRequests();
      // Update search results to reflect new status
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, relationshipStatus: 'pending' as const }
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

  const handleAccept = async (requestId: string) => {
    try {
      await respondToFriendRequest(requestId, "accepted");
      loadFriends();
      loadRequests();
      // Refresh the sidebar notification badge
      await refreshFriendNotifications();
    } catch (err: any) {
      console.error("Error accepting request:", err);
      setError(err?.response?.data?.message || "Failed to accept friend request");
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
      setError(err?.response?.data?.message || "Failed to reject friend request");
    }
  };


  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="w-80 bg-black border-r border-gray-700 p-4">
        <h2 className="font-bold flex items-center gap-2 text-lg mb-4">
          <FaUserFriends /> Friends
          {requests.length > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 font-bold">
              {requests.length}
            </span>
          )}
        </h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 text-xs p-2 rounded mb-2">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label className="group flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 focus-within:border-indigo-500/60 focus-within:text-indigo-300">
            <FaSearch className="h-4 w-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by username..."
              className="flex-1 bg-transparent outline-none placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          
          {/* Search Results Dropdown */}
          {searching && searchQuery.trim() && searchResults.length === 0 && (
            <div className="mt-2 rounded border border-gray-700 bg-gray-800/70 px-3 py-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-gray-600 border-t-blue-500 animate-spin" />
                Searching...
              </div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-64 overflow-y-auto bg-gray-800 border border-gray-700 rounded">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-750 border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <img
                      src={user.avatar_url || "/avatar.png"}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover bg-gray-700"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/avatar.png";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{user.username}</div>
                      <div className="text-xs text-gray-400 truncate">{user.fullname}</div>
                    </div>
                  </div>
                  
                  {user.relationshipStatus === 'none' && (
                    <button
                      onClick={() => handleAddFriend(user.id)}
                      disabled={loading}
                      className="bg-green-600 text-xs px-3 py-1 rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaPlus className="inline mr-1" /> Add
                    </button>
                  )}
                  {user.relationshipStatus === 'pending' && (
                    <span className="text-xs text-yellow-400 px-3 py-1">Pending</span>
                  )}
                  {user.relationshipStatus === 'accepted' && (
                    <span className="text-xs text-green-400 px-3 py-1">Friends</span>
                  )}
                  {user.relationshipStatus === 'rejected' && (
                    <span className="text-xs text-red-400 px-3 py-1">Rejected</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <h3 className="mt-6 text-gray-400 text-xs uppercase">Pending Requests</h3>
        {requests.length === 0 && (
          <p className="text-gray-500 text-sm mt-1">No pending requests</p>
        )}
        {requests.map((req) => (
          <div
            key={req.friends_id}
            className="bg-gray-800 rounded px-2 py-2 mt-2"
          >
            <div className="flex items-center gap-2 mb-2">
              <img
                src={req.user1.avatar_url || "/avatar.png"}
                alt={req.user1.username}
                className="w-8 h-8 rounded-full object-cover bg-gray-700"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/avatar.png";
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{req.user1.username}</div>
                <div className="text-xs text-gray-400 truncate">{req.user1.fullname}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(req.friends_id)}
                className="flex-1 bg-green-600 text-xs py-1 rounded hover:bg-green-500"
              >
                Accept
              </button>
              <button
                onClick={() => handleReject(req.friends_id)}
                className="flex-1 bg-red-600 text-xs py-1 rounded hover:bg-red-500"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 p-4">
        <h2 className="font-bold text-xl mb-3">All Friends</h2>
        {friends.length === 0 ? (
          <p className="text-gray-500">No friends yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {friends.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 bg-gray-800 p-3 rounded hover:bg-gray-750 transition relative group"
              >
                <img
                  src={f.avatar_url || "/avatar.png"}
                  alt={f.username}
                  className="w-12 h-12 rounded-full object-cover bg-gray-700"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/avatar.png";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{f.username}</div>
                  <div className="text-sm text-gray-400 truncate">{f.fullname}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`w-2 h-2 rounded-full ${f.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-xs text-gray-400 capitalize">{f.status}</span>
                  </div>
                </div>
                
                {/* DM Button */}
                <button
                  onClick={() => handleSendDM(f.id, f.username)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full shadow-lg"
                  title="Send message"
                >
                  <FaCommentAlt className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
