'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { handleOAuthLogin, getToken } from '../../api';

export default function OAuthCallback() {
    const router = useRouter();
    const [message, setMessage] = useState('Processing login...');
    const [error, setError] = useState(false);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Get session from Supabase
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    console.error('OAuth session error:', sessionError);
                    setMessage('Failed to get session. Please try again.');
                    setError(true);
                    setTimeout(() => router.push('/login'), 3000);
                    return;
                }

                // console.log('OAuth session obtained:', session.user.email);
                setMessage('Verifying account...');

                // Call backend to handle OAuth user creation/validation
                const response = await handleOAuthLogin(session.access_token);

                // console.log('OAuth backend response:', response);

                // Store tokens
                localStorage.setItem('access_token', session.access_token);
                localStorage.setItem('refresh_token', session.refresh_token);
                localStorage.setItem('user', JSON.stringify(response.user));
                
                // Set token in axios headers
                getToken(session.access_token);

                setMessage('Login successful! Redirecting...');

                // Check if this is a new user - might need profile completion
                if (response.isNewUser) {
                    // console.log('New OAuth user - redirecting to servers');
                    // Optionally redirect to profile setup: router.push('/profile/setup');
                }

                // Redirect to servers page
                setTimeout(() => router.push('/servers'), 1000);

            } catch (err: any) {
                console.error('OAuth callback error:', err);
                setMessage(err?.response?.data?.message || 'Login failed. Please try again.');
                setError(true);
                setTimeout(() => router.push('/login'), 3000);
            }
        };

        handleOAuthCallback();
    }, [router]);

    return (
        <div className="flex h-screen bg-black font-sans items-center justify-center">
            <div className="text-center">
                <div className="mb-6">
                    {/* Echo Logo */}
                    <div className="relative inline-block">
                        <div className="font-jersey text-[64px] font-normal text-white">
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

                {/* Loading Spinner */}
                {!error && (
                    <div className="mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
                    </div>
                )}

                {/* Message */}
                <p className={`text-lg ${error ? 'text-red-500' : 'text-white'}`}>
                    {message}
                </p>

                {error && (
                    <p className="text-gray-400 mt-2 text-sm">
                        Redirecting to login page...
                    </p>
                )}
            </div>
        </div>
    );
}
