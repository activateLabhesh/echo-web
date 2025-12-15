"use client";

import { login, getToken } from "../../api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false); 

  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for email verification success
  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "true") {
      setMessage("Email verified successfully! You can now login.");
      setSuccess(true);
      
      // Clear the query parameter after 5 seconds
      setTimeout(() => {
        setMessage("");
        setSuccess(false);
      }, 5000);
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);
    setLoading(true); 

    try {
      const data = await login(identifier, password);

      setSuccess(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem("access_token", data.token);
          getToken(data.token);
        }
      }

      setMessage(data.message || "Login successful!");
      const redirect =
    localStorage.getItem("redirectAfterLogin") || "/servers";

  localStorage.removeItem("redirectAfterLogin");
  router.replace(redirect);
    } catch (error: any) {
      setSuccess(false);
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Login failed. Please try again."
      );

      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        getToken(undefined);
      }
    } finally {
      setLoading(false); // ✅ stop loader
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true); 
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setSuccess(false);
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black font-sans relative">
   
      {loading && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Left Image */}
      <div className="w-1/2 h-full">
        <img
          src="/gradient.png"
          alt="Login Visual"
          className="h-full w-full object-cover rounded-tr-[50px] rounded-br-[50px]"
        />
      </div>

      {/* Right Section */}
      <div className="w-1/2 flex justify-center items-center">
        <div className="w-[70%] max-w-md">
          {/* Logo */}
          <div className="w-full mb-[40px]">
            <div className="relative inline-block">
              <div className="font-jersey text-[64px] text-white">echo</div>
              <svg
                width="13"
                height="34"
                className="absolute left-[116px] top-[34px]"
                fill="none"
              >
                <path
                  d="M2 2C14.2659 13.7159 13.7311 20.2841 2 32"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>
              <svg
                width="16"
                height="46"
                className="absolute left-[120px] top-[28px]"
                fill="none"
              >
                <path
                  d="M2 2C18.3545 18.4022 17.6415 27.5977 2 44"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-5 text-center">
            Login
          </h1>

          {/* Sign up link */}
          <div className="text-lg mb-8 text-center">
            <span className="text-white">New Here? </span>
            <Link href="/signup" className="text-[#FFC341] underline">
              Sign Up
            </Link>
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div className="mb-4">
              <label className="text-white text-sm">Email or Username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md"
                required
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="text-white text-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md"
                required
              />
              <div className="flex justify-end mt-1">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#FFC341] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="form-checkbox text-yellow-400"
              />
              <label className="ml-2 text-sm text-white">Remember Me</label>
            </div>

            {/* Sign In Button with Loader */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-lg font-semibold rounded-md mt-2
                ${
                  loading
                    ? "bg-yellow-300 cursor-not-allowed"
                    : "bg-yellow-400 hover:bg-yellow-500"
                }
                text-black flex items-center justify-center`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div
              className={`mt-4 text-center ${
                success ? "text-green-400" : "text-red-400"
              }`}
            >
              {message}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center justify-center mt-6 mb-4">
            <div className="flex-grow h-px bg-white opacity-40" />
            <span className="mx-4 text-white">Or</span>
            <div className="flex-grow h-px bg-white opacity-40" />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center w-full py-3 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <img src="/Google.svg" alt="Google" className="w-6 h-6 mr-3" />
                <span className="text-base font-medium text-[#3c4043]">
                  Sign up with Google
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
