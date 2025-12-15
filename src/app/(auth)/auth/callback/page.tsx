"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL (contains tokens)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (type === "signup" || type === "email_change" || type === "recovery") {
          // Email verification or password recovery
          if (accessToken && refreshToken) {
            // Set the session
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("Session error:", error);
              setStatus("error");
              setMessage("Failed to verify email. Please try again.");
              setTimeout(() => router.push("/login"), 3000);
              return;
            }

            // Success
            setStatus("success");
            if (type === "signup") {
              setMessage("Email verified successfully! Redirecting to login...");
            } else if (type === "recovery") {
              setMessage("Password reset link verified! Redirecting...");
              setTimeout(() => router.push("/reset-password"), 2000);
              return;
            } else {
              setMessage("Email verified! Redirecting to login...");
            }
            
            setTimeout(() => router.push("/login?verified=true"), 2000);
          } else {
            setStatus("error");
            setMessage("Invalid verification link.");
            setTimeout(() => router.push("/login"), 3000);
          }
        } else {
          // Unknown type or no type
          setStatus("success");
          setMessage("Redirecting to login...");
          setTimeout(() => router.push("/login"), 1000);
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage("An error occurred. Redirecting to login...");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verifying Email</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-4">
              <div className="rounded-full h-16 w-16 bg-green-500 mx-auto flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">Success!</h2>
            <p className="text-gray-300">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-4">
              <div className="rounded-full h-16 w-16 bg-red-500 mx-auto flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Verification Failed</h2>
            <p className="text-gray-300">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
