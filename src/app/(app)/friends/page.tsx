"use client";

import React, { useEffect, useState } from "react";
import { FaUserFriends, FaPlus, FaUserCircle } from "react-icons/fa";
import {
  fetchAllFriends,
  fetchFriendRequests,
  addFriend,
  respondToFriendRequest,
} from "../../../app/api/API";

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [newFriendId, setNewFriendId] = useState("");

  // Replace with actual current user's ID if needed
  const currentUserId = "d8670038-9985-4693-add5-69c27d27b9fe";

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    try {
      // For fetchAllFriends we need requestId + status
      const data = await fetchAllFriends(currentUserId, "accepted");
      setFriends(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await fetchFriendRequests(currentUserId);
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriend = async () => {
    if (!newFriendId.trim()) return;
    try {
      await addFriend(newFriendId);
      setNewFriendId("");
      loadRequests(); // refresh requests
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await respondToFriendRequest(requestId, "accepted");
      loadFriends();
      loadRequests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="w-60 bg-black border-r border-gray-700 p-3">
        <h2 className="font-bold flex items-center gap-2 text-lg mb-4">
          <FaUserFriends /> Friends
        </h2>
        <input
          type="text"
          placeholder="Add by user ID"
          className="w-full text-sm p-2 rounded bg-gray-800 text-gray-300 mb-2"
          value={newFriendId}
          onChange={(e) => setNewFriendId(e.target.value)}
        />
        <button
          onClick={handleAddFriend}
          className="w-full bg-green-600 py-1.5 rounded hover:bg-green-500"
        >
          <FaPlus className="inline mr-1" /> Add Friend
        </button>

        <h3 className="mt-6 text-gray-400 text-xs uppercase">Pending</h3>
        {requests.length === 0 && (
          <p className="text-gray-500 text-sm mt-1">No requests</p>
        )}
        {requests.map((req) => (
          <div
            key={req.requestId}
            className="flex items-center justify-between bg-gray-800 rounded px-2 py-1 mt-2"
          >
            <span>{req.senderId}</span>
            <button
              onClick={() => handleAccept(req.requestId)}
              className="text-green-400 text-xs hover:text-green-200"
            >
              Accept
            </button>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 p-4">
        <h2 className="font-bold text-xl mb-3">All Friends</h2>
        {friends.length === 0 ? (
          <p className="text-gray-500">No friends yet.</p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 bg-gray-800 p-2 rounded"
              >
                <FaUserCircle className="w-6 h-6 text-gray-500" />
                <span>{f.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
