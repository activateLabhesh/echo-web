"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { joinServer } from "@/api";
import { supabase } from "@/lib/supabaseClient";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const joinAttemptRef = useRef<string | null>(null);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`,
        queryParams: {
          hd: "vitstudent.ac.in",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Error initiating Google sign-in:", error);
    }
  };

  const [pageState, setPageState] = useState<
    "loading" | "signIn" | "confirm" | "joining" | "done" | "alreadyMember" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  useEffect(() => {
    if (!code) {
      setError("Invalid invite link.");
      setErrorCode("INVALID");
      setPageState("error");
      return;
    }

    const token = localStorage.getItem("access_token");
    const tokenExpiry = localStorage.getItem("tokenExpiry");
    const isExpired = tokenExpiry && Date.now() > parseInt(tokenExpiry);

    if (!token || isExpired) {
      localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
      setPageState("signIn");
      return;
    }

    setPageState("confirm");
  }, [code]);

  const handleJoin = async () => {
    if (!code || joinAttemptRef.current === code) return;
    joinAttemptRef.current = code;

    const lockKey = `invite_lock_${code}`;
    const existingLock = localStorage.getItem(lockKey);
    if (existingLock && Date.now() - parseInt(existingLock) < 10000) {
      return;
    }
    localStorage.setItem(lockKey, Date.now().toString());

    setPageState("joining");

    try {
      await joinServer(code);

      localStorage.removeItem(lockKey);

      setPageState("done");
    } catch (err: any) {
      localStorage.removeItem(lockKey);

      if (err.code === "AUTH_REQUIRED" || err?.response?.status === 401) {
        localStorage.setItem("redirectAfterLogin", `/invite/${code}`);
        setPageState("signIn");
        return;
      }

      const msg = err?.message || "Failed to join the server.";

      setError(msg);

      const code = err?.code || "";
      if (
        code === "ALREADY_MEMBER" ||
        msg.toLowerCase().includes("already")
      ) {
        setErrorCode("ALREADY_MEMBER");
        setPageState("alreadyMember");
        return;
      }

      setErrorCode(code);
      setPageState("error");
    }
  };

  if (pageState === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="w-10 h-10 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-sm mx-4 bg-[#1e1f22] rounded-xl shadow-2xl border border-[#2b2d31] overflow-hidden">
        {/* Header gradient */}
        <div className="h-16 bg-gradient-to-br from-blue-600 to-indigo-700 relative">
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-16 h-16 rounded-full bg-[#1e1f22] flex items-center justify-center shadow-lg border-4 border-[#1e1f22]">
              {pageState === "signIn" && (
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              )}
              {pageState === "confirm" && (
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              )}
              {pageState === "joining" && (
                <div className="w-7 h-7 rounded-full border-[3px] border-gray-600 border-t-blue-400 animate-spin" />
              )}
              {pageState === "done" && (
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {pageState === "alreadyMember" && (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
              {pageState === "error" && (
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-12 pb-6 px-6 text-center">
          {pageState === "signIn" && (
            <>
              <h1 className="text-xl font-bold text-white mb-1">
                You&apos;re invited!
              </h1>
              <p className="text-sm text-[#a3a6aa] mb-5">
                Sign in with your VIT email to accept this invite.
              </p>

              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-[#4285F4] text-white px-6 py-2.5 rounded-md font-medium hover:bg-[#3367d6] transition-all text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.04.69-2.36 1.1-3.71 1.1-2.85 0-5.27-1.92-6.13-4.51H2.18v2.85C3.99 20.43 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.87 14.16c-.22-.67-.35-1.38-.35-2.16s.13-1.49.35-2.16V7H2.18C1.43 8.35 1 9.89 1 12s.43 3.65 1.18 5l2.69-2.84z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.57 2.18 7l2.49 2c.86-2.59 3.28-4.51 6.13-4.51z"/>
                </svg>
                Sign in with Google
              </button>

              <div className="mt-5 pt-4 border-t border-[#2b2d31]">
                <p className="text-xs text-[#6d6f78] uppercase tracking-wider">
                  Invite Code
                </p>
                <p className="mt-1 text-base font-mono font-semibold text-[#b5bac1] tracking-widest">
                  {code}
                </p>
              </div>
            </>
          )}

          {pageState === "confirm" && (
            <>
              <h1 className="text-xl font-bold text-white mb-1">
                Accept Invite
              </h1>
              <p className="text-sm text-[#a3a6aa] mb-6">
                You have been invited to join a server.
              </p>

              <button
                onClick={handleJoin}
                className="w-full py-2.5 rounded-md text-white font-medium bg-[#5865f2] hover:bg-[#4752c4] transition-all text-sm"
              >
                Accept Invite
              </button>

              <button
                onClick={() => router.push("/servers")}
                className="w-full mt-2 py-2.5 rounded-md text-sm text-[#a3a6aa] hover:text-white bg-transparent hover:bg-[#2b2d31] transition-all"
              >
                Back to Servers
              </button>

              <div className="mt-5 pt-4 border-t border-[#2b2d31]">
                <p className="text-xs text-[#6d6f78] uppercase tracking-wider">
                  Invite Code
                </p>
                <p className="mt-1 text-base font-mono font-semibold text-[#b5bac1] tracking-widest">
                  {code}
                </p>
              </div>
            </>
          )}

          {pageState === "joining" && (
            <>
              <div className="w-10 h-10 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-sm text-[#a3a6aa]">Joining server...</p>
            </>
          )}

          {pageState === "done" && (
            <>
              <h1 className="text-xl font-bold text-green-400 mb-1">
                You joined!
              </h1>
              <p className="text-sm text-[#a3a6aa] mb-5">
                You can now access the server from your server list.
              </p>
              <button
                onClick={() => router.push("/servers")}
                className="w-full py-2.5 rounded-md text-white font-medium bg-[#5865f2] hover:bg-[#4752c4] transition-all text-sm"
              >
                Back to Servers
              </button>
            </>
          )}

          {pageState === "alreadyMember" && (
            <>
              <h1 className="text-xl font-bold text-white mb-1">
                Already a member
              </h1>
              <p className="text-sm text-[#a3a6aa] mb-5">
                You are already in this server.
              </p>
              <button
                onClick={() => router.push("/servers")}
                className="w-full py-2.5 rounded-md text-white font-medium bg-[#5865f2] hover:bg-[#4752c4] transition-all text-sm"
              >
                Back to Servers
              </button>
            </>
          )}

          {pageState === "error" && errorCode !== "USER_BANNED" && errorCode !== "INVALID" && (
            <>
              <h1 className="text-xl font-bold text-white mb-1">
                Invite Failed
              </h1>
              <p className="text-sm text-[#a3a6aa]">{error}</p>
            </>
          )}

          {pageState === "error" && errorCode === "USER_BANNED" && (
            <>
              <h1 className="text-xl font-bold text-red-400 mb-1">
                Access Denied
              </h1>
              <p className="text-sm text-[#a3a6aa] mb-1">{error}</p>
              <p className="text-xs text-[#6d6f78]">
                You have been banned from this server.
              </p>
            </>
          )}

          {pageState === "error" && errorCode === "INVALID" && (
            <>
              <h1 className="text-xl font-bold text-white mb-1">
                Invalid Invite
              </h1>
              <p className="text-sm text-[#a3a6aa]">
                This invite link is not valid.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
