"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { joinServer } from "@/app/api/API";
import Loader from "@/components/Loader";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  useEffect(() => {
    if (!code) {
      setError("Invalid invite link.");
      setLoading(false);
      return;
    }

    const join = async () => {
      try {
        await joinServer(code);
        router.replace("/servers");
      } catch (err: any) {
        setError(err?.message || "Failed to join the server.");
        setErrorCode(err?.code || "");
        setLoading(false);
      }
    };

    join();
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 via-black to-gray-900 text-white px-6">
      <div className="w-full max-w-md bg-[#111214] rounded-2xl shadow-2xl p-8 border border-gray-800 text-center">
        {loading && <Loader text="Accepting invite… please wait" size="md" />}

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
  );
}
