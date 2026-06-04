"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { joinServer } from "@/api";
import Loader from "@/components/Loader";
import Toast from "@/components/Toast";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  // Prevent duplicate joins from React strict mode / re-renders.
  const joinAttemptRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);
  useEffect(() => {
    if (!code) {
      setToast({ message: "Invalid invite link.", type: "error" });
      setError("Invalid invite link.");
      setLoading(false);
      return;
    }

    // Check if user is authenticated before attempting to join
    const token = localStorage.getItem("access_token");
    const tokenExpiry = localStorage.getItem("tokenExpiry");
    const isExpired = tokenExpiry && Date.now() > parseInt(tokenExpiry);

    if (!token || isExpired) {
      // Save invite URL for redirect after login
      localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
      setToast({ message: "Please log in to join this server.", type: "info" });
      setTimeout(() => {
        router.replace("/");
      }, 1000);
      return;
    }

    // Prevent duplicate joins from React strict mode / re-renders
    if (joinAttemptRef.current === code) {
      return;
    }

    // Multi-tab race condition prevention
    const lockKey = `invite_lock_${code}`;
    const existingLock = localStorage.getItem(lockKey);
    if (existingLock && Date.now() - parseInt(existingLock) < 10000) {
      // Another tab is processing this invite within last 10 seconds
      setToast({ message: "Join already in progress...", type: "info" });
      return;
    }
    localStorage.setItem(lockKey, Date.now().toString());

    joinAttemptRef.current = code;

    const join = async () => {
      try {
        setToast({ message: "Accepting invite…", type: "info" });

        await joinServer(code);

        // Clear the lock on success
        localStorage.removeItem(lockKey);

        setToast({ message: "Joined server successfully!", type: "success" });

        setTimeout(() => {
          router.replace("/servers");
        }, 800);
      } catch (err: any) {
        // Clear the lock on error
        localStorage.removeItem(lockKey);

        // Handle auth errors - redirect to login
        if (err.code === "AUTH_REQUIRED" || err?.response?.status === 401) {
          localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
          setToast({
            message: "Session expired. Please log in again.",
            type: "info",
          });
          setTimeout(() => {
            router.replace("/");
          }, 1000);
          return;
        }

        const msg = err?.message || "Failed to join the server.";

        setToast({ message: msg, type: "error" });

        setError(msg);
        setErrorCode(err?.code || "");
        setLoading(false);
      }
    };

    join();
  }, [code, router]);

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

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 via-black to-gray-900 text-white px-6">
        <div className="w-full max-w-md bg-[#111214] rounded-2xl shadow-2xl p-8 border border-gray-800 text-center">
          {loading && <Loader size="md" />}

          {!loading && error && errorCode === "USER_BANNED" && (
            <>
              <div className="flex justify-center mb-4">
                <svg
                  className="w-16 h-16 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>

              <h1 className="text-2xl font-bold mb-3 text-red-500">
                Access Denied
              </h1>

              <p className="text-gray-300 mb-2 font-semibold">{error}</p>

              <p className="text-gray-400 mb-6 text-sm">
                You have been banned from this server and cannot join. Please
                contact the server administrators if you believe this is a
                mistake.
              </p>

              <button
                onClick={() => router.push("/servers")}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold hover:from-[#ffcc33] hover:to-[#ffb347] transition"
              >
                Back to Servers
              </button>
            </>
          )}

          {!loading && error && errorCode !== "USER_BANNED" && (
            <>
              <div className="flex justify-center mb-4">
                <svg
                  className="w-16 h-16 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              <h1 className="text-2xl font-bold mb-3 text-yellow-500">
                Invite Failed
              </h1>

              <p className="text-gray-400 mb-6">{error}</p>

              <button
                onClick={() => router.push("/servers")}
                className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
              >
                Back to Servers
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
