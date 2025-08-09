'use client';
import { login,getToken } from "../../api";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setSuccess(false);

    try {
      const data = await login(identifier, password);
      console.log("Login response:", data);

      setSuccess(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem("access_token", data.token);
          console.log("Saved token:", data.token);
          console.log("Current in localStorage:", localStorage.getItem("access_token"));
          getToken(data.token);
        }
      }
      setMessage(data.message || 'Login successful!');
      router.push('/servers');
    } catch (error: any) {
      setSuccess(false);
      setMessage(
          error?.response?.data?.message ||
          error?.message ||
          'Login failed. Please try again.'
      );
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        getToken(undefined);  // clear token in axios headers
      }
    }
  }
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/servers`,
      },
    });
    if (error) {
      setMessage(error.message);
      setSuccess(false);
    }
  };
  return (
      <div className="flex h-screen bg-black font-sans">
        <div className="w-1/2 h-full">
          <img
              src="/gradient.png"
              alt="Login Visual"
              className="h-full w-full object-cover rounded-tr-[50px] rounded-br-[50px]"
          />
        </div>

        <div className="w-1/2 flex justify-center items-center">
          <div className="w-[70%] max-w-md">
            {/* Logo */}
            <div className="w-full mb-[20px] lg:mb-[40px]">
              <div className="relative inline-block">
                <div
                    id="echo-text"
                    className="font-jersey lg:text-[64px] md:text-[48px] text-[40px] font-normal text-white"
                >
                  echo
                </div>
                <svg width="13" height="34" className="absolute left-[116px] top-[34px]" fill="none">
                  <path d="M2 2C14.2659 13.7159 13.7311 20.2841 2 32" stroke="white" strokeWidth="4" />
                </svg>
                <svg width="16" height="46" className="absolute left-[120px] top-[28px]" fill="none">
                  <path d="M2 2C18.3545 18.4022 17.6415 27.5977 2 44" stroke="white" strokeWidth="4" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-poppins text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-5 text-center">
              Login
            </h1>

            {/* Sign up link */}
            <div className="font-poppins text-base md:text-lg lg:text-xl font-normal mb-6 md:mb-8 lg:mb-10 text-center">
              <span className="text-white">New Here? </span>
              <Link href="/signup" className="text-[#FFC341] underline cursor-pointer">
                Sign Up
              </Link>
            </div>

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div className="mb-4">
                <label className="text-white text-sm font-light">Email or Username</label>
                <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                    required
                />
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="text-white text-sm font-light">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                    required
                />
                <div className="flex justify-end mt-1">
                  <Link href="/forgot-password" className="text-sm text-[#FFC341] hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center mb-6">
                <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="form-checkbox text-yellow-400"
                />
                <label className="ml-2 text-sm text-white">Remember Me</label>
              </div>

              {/* Sign In Button */}
              <button
                  type="submit"
                  className="w-full py-3 text-lg font-semibold text-black bg-yellow-400 rounded-md hover:bg-yellow-500 mt-2"
              >
                Sign In
              </button>
            </form>

            {/* Message */}
            {message && (
                <div style={{ color: success ? 'green' : 'red', marginTop: 10 }}>{message}</div>
            )}

            {/* Divider */}
            <div className="flex items-center justify-center mt-4 mb-6 md:mb-4 relative">
              <div className="flex-grow h-px bg-white opacity-40" />
              <div className="font-poppins text-sm md:text-base font-normal text-white mx-3.5 md:mx-4">
                or Sign In With
              </div>
              <div className="flex-grow h-px bg-white opacity-40" />
            </div>

            {/* Google Sign In Button */}
            <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center w-full py-3 mb-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 transition"
            >
              <img src="/Google.svg" alt="Google" className="w-6 h-6 mr-3" />
              <span className="text-base font-medium text-[#3c4043]">Sign up with Google</span>
            </button>
          </div>
        </div>
      </div>
  );
}
