'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { handleOAuthLogin} from '@/api';
import {getToken} from "@/api"
//@/app/api/auth.api
import Toast from "@/components/Toast";

export default function OAuthCallback() {
    const router = useRouter();
    const [message, setMessage] = useState('Processing login...');
    const [error, setError] = useState(false);
    const [toast, setToast] = useState<{
      message: string;
      type: "info" | "success" | "error";
    } | null>(null);


      useEffect(() => {
        const handleOAuthCallback = async () => {
         try {
           setToast({ message: "Processing login…", type: "info" });

         const {
           data: { session },
           error: sessionError,
         } = await supabase.auth.getSession();

         if (sessionError || !session) {
           setToast({ message: "Failed to get session", type: "error" });
           setMessage("Failed to get session. Please try again.");
           setError(true);
           setTimeout(() => router.push("/login"), 3000);
           return;
         }

         setMessage("Verifying account…");

         const response = await handleOAuthLogin(session.access_token, session.refresh_token);

         localStorage.setItem("access_token", session.access_token);
         localStorage.setItem("refresh_token", session.refresh_token);
         localStorage.setItem("user", JSON.stringify(response.user));
         // Set token expiry - Supabase tokens expire in 1 hour (3600 seconds) by default
         const expiresIn = session.expires_in || 3600;
         const expiryTime = Date.now() + expiresIn * 1000;
         localStorage.setItem("tokenExpiry", expiryTime.toString());
         getToken(session.access_token);

         setToast({ message: "Login successful!", type: "success" });
         setMessage("Login successful! Redirecting…");

         const redirect =
           localStorage.getItem("redirectAfterLogin") || "/servers";
           localStorage.removeItem("redirectAfterLogin");

         setTimeout(() => router.replace(redirect), 1000);
       } catch (err: any) {
         const errorMsg =
           err?.response?.data?.message || "Login failed. Please try again.";

         setToast({ message: errorMsg, type: "error" });
         setMessage(errorMsg);
         setError(true);

         setTimeout(() => router.push("/login"), 3000);
       }
     };

     handleOAuthCallback();
   }, [router]);


    return (
      <>
        

        <div className="flex h-screen bg-black font-sans items-center justify-center">
          <div className="text-center">
            <div className="mb-6">
              {/* Echo Logo */}
              <div className="relative inline-block">
                <div className="font-jersey text-[64px] font-normal text-white">
                  echo
                </div>
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

            {/* Loading Spinner */}
            {!error && (
              <div className="mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
              </div>
            )}

            {/* Message */}

            {error && (
              <p className="text-gray-400 mt-2 text-sm">
                Redirecting to login page...
              </p>
            )}
          </div>
        </div>
      </>
    );
}
