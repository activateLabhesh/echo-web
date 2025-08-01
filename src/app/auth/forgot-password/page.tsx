'use client';
import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '../../api';

export default function ForgotPassword() {
    const [identifier, setIdentifier] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitted(false);
        setError('');

        try {
            await forgotPassword(identifier);
            setSubmitted(true);
        } catch (err: any) {
            setSubmitted(false);
            setError(err?.response?.data?.message || 'Something went wrong.');
        }
    }

    return (
        <div className="flex h-screen bg-black font-sans">
            <div className="w-1/2 h-full">
                <img
                    src="/gradient.png"
                    alt="Forgot Password Visual"
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
                            <label className="text-white text-sm font-light">Email or Username</label>
                            <input
                                type="text"
                                placeholder="Enter your email or username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 mt-2 text-lg font-semibold text-black bg-yellow-400 rounded-md hover:bg-yellow-500"
                            disabled={submitted}
                        >
                            Send Reset Link
                        </button>
                    </form>

                    {/* Placeholder message after submit */}
                    {submitted && (
                        <div className="mt-4 text-green-500 text-center text-sm">
                            If an account exists, a password reset link will be sent to your email.
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
