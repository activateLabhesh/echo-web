'use client';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { resetPassword } from '../../api';
import Link from 'next/link';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage('');
        setSubmitted(false);

        if (!token) {
            setMessage('Reset token is missing or invalid.');
            return;
        }
        if (password !== confirm) {
            setMessage('Passwords do not match.');
            return;
        }

        try {
            await resetPassword(password, token);
            setSubmitted(true);
            setMessage('Password updated! Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            setMessage(err?.response?.data?.message || 'Reset failed. Try again.');
        }
    }

    return (
        <div className="flex h-screen bg-black font-sans">
            <div className="w-1/2 h-full">
                <img
                    src="/gradient.png"
                    alt="Reset Password Visual"
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

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="text-white text-sm font-light">New Password</label>
                            <input
                                type="password"
                                placeholder="Enter your new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                                required
                                minLength={8}
                                disabled={submitted}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="text-white text-sm font-light">Confirm New Password</label>
                            <input
                                type="password"
                                placeholder="Confirm your new password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                                required
                                minLength={8}
                                disabled={submitted}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 mt-2 text-lg font-semibold text-black bg-yellow-400 rounded-md hover:bg-yellow-500"
                            disabled={submitted}
                        >
                            Reset Password
                        </button>
                    </form>

                    {/* Message area */}
                    {message && (
                        <div
                            className={`mt-4 text-center text-sm ${
                                submitted ? 'text-green-500' : 'text-red-500'
                            }`}
                        >
                            {message}
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-[#FFC341] text-sm hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResetPassword() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading…</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
