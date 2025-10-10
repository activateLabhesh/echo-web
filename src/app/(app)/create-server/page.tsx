"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createServer } from "@/app/api/API"; // ✅ import API function

export default function CreateServerPage() {
  const router = useRouter();
  const [serverName, setServerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!serverName.trim()) {
      setError("Please enter a server name.");
      return;
    }

    try {
      setLoading(true);
     const data = await createServer({ name: serverName });

      setSuccess(`Server "${data.name}" created successfully!`);
      setTimeout(() => router.push("/servers"), 1500); 
    } catch (err: any) {
      setError(err.message || "Failed to create server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white items-center justify-center">
      <div className="w-full max-w-md p-8 bg-[#111214] rounded-2xl shadow-lg border border-gray-800">
        <h1 className="text-3xl font-bold mb-6 text-center bg-white bg-clip-text text-transparent">
          Create a Server
        </h1>

        <form onSubmit={handleCreateServer} className="space-y-4">
          <input
            type="text"
            placeholder="Enter server name"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            className="w-full p-3 bg-gray-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
          {success && (
            <p className="text-green-400 text-center text-sm">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
              loading
                ? "bg-green-900 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {loading ? "Creating..." : "Create Server"}
          </button>
        </form>

        <button
          onClick={() => router.push("/servers")}
          className="mt-6 w-full py-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600 transition-all"
        >
          ← Back to Servers
        </button>
      </div>
    </div>
  );
}
