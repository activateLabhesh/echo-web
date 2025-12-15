"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import Loader from "@/components/Loader";

function ChangePasswordContent() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setSubmitted(false);

    if (!email || !current) {
      setMessage("Email and current password are required.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setMessage("New password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      
      await axios.post("/api/login", {
        email,
        password: current,
      });

  
      await axios.post("/api/change-password", {
        new_password: password,
      });

      setSubmitted(true);
      setMessage("Password changed successfully! Redirecting…");
      setLoading(false);

      setTimeout(() => router.push("/profile"), 1500);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Failed to change password");
      setLoading(false);
    }
  }

  
  if (loading) {
    return <Loader fullscreen text="Updating password…" size="md" />;
  }

  return (
    <div className="flex h-screen bg-black font-sans">
      {/* Left Image */}
      <div className="w-1/2 h-full">
        <img
          src="/gradient.png"
          alt="Change Password Visual"
          className="h-full w-full object-cover rounded-tr-[50px] rounded-br-[50px]"
        />
      </div>

      
      <div className="w-1/2 flex justify-center items-center">
        <div className="w-[70%] max-w-md">
        
          <div className="w-full mb-[20px] lg:mb-[40px]">
            <div className="relative inline-block">
              <div className="font-jersey lg:text-[64px] md:text-[48px] text-[40px] text-white">
                echo
              </div>
            </div>
          </div>

          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-white text-sm font-light">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enter current email"
                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                disabled={submitted}
                required
              />
            </div>

            <div className="mb-6">
              <label className="text-white text-sm font-light">
                Current password
              </label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                disabled={submitted}
                required
              />
            </div>

            <div className="mb-6">
              <label className="text-white text-sm font-light">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                required
                disabled={submitted}
                minLength={8}
              />
            </div>

            <div className="mb-6">
              <label className="text-white text-sm font-light">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm your new password"
                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                required
                disabled={submitted}
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={submitted}
              className="w-full py-3 mt-2 text-lg font-semibold text-black bg-yellow-400 rounded-md hover:bg-yellow-500 disabled:opacity-60"
            >
              Change Password
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 text-center text-sm ${
                submitted ? "text-green-500" : "text-red-500"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/profile"
              className="text-[#FFC341] text-sm hover:underline"
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangePassword() {
  return (
    <Suspense fallback={<Loader fullscreen text="Loading…" size="md" />}>
      <ChangePasswordContent />
    </Suspense>
  );
}
