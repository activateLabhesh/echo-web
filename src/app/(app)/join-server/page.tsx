"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { joinServer } from "@/api";
import Loader from "@/components/Loader";
import Toast from "@/components/Toast";

export default function JoinServerPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!inviteCode.trim()) {
      setToast({ message: "Please enter a valid invite code.", type: "error" });
      setError("Please enter a valid invite code or link.");
      return;
    }

    try {
      setLoading(true);

      setToast({ message: "Joining server…", type: "info" });

      await joinServer(inviteCode);

      setToast({ message: "Joined server successfully!", type: "success" });

      setTimeout(() => {
        router.push("/servers");
      }, 800);
    } catch (err: any) {
      const msg = err?.message || "Failed to join server. Try again.";

      setToast({ message: msg, type: "error" });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast &&
        (() => {
          const { message, type } = toast;
          return (
            <div className="fixed top-6 right-6 z-[9999]">
              <Toast
                message={message}
                type={type}
                duration={3000}
                onClose={() => setToast(null)}
              />
            </div>
          );
        })()}

      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-950 via-black to-gray-900 text-white px-6">
        <div className="w-full max-w-md bg-[#111214] rounded-2xl shadow-2xl p-8 border border-gray-800">
          {loading ? (
            <Loader size="md" />
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-3 text-center bg-white bg-clip-text text-yellow-300 text-transparent">
                Join a Server
              </h1>

              <p className="text-gray-400 text-center mb-8">
                Enter an invite code or link to join your friend’s community.
              </p>

              <form onSubmit={handleJoinServer} className="space-y-5">
                <div>
                  <label
                    htmlFor="inviteCode"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Invite Code or Link
                  </label>
                  <input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. abcd1234 or https://discord.gg/abcd1234"
                    className="w-full px-4 py-3 rounded-lg bg-[#2f3136] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 focus:ring-offset-black transition"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-lg text-black font-semibold bg-yellow-400 hover:opacity-90 transition-all"
                >
                  Join Server
                </button>
              </form>

              <button
                onClick={() => router.push("/servers")}
                className="mt-6 w-full py-2 text-sm rounded-md bg-gray-800 hover:bg-gray-700 transition-all"
              >
                ← Back to Servers
              </button>
            </>
          )}
        </div>

        {!loading && (
          <p className="mt-8 text-gray-500 text-sm">
            Don’t have an invite?{" "}
            <button
              onClick={() => router.push("/create-server")}
              className="text-blue-400 hover:underline"
            >
              Create your own server
            </button>
          </p>
        )}
      </div>
    </>
  );
}
