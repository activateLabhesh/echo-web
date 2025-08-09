'use client';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function DeleteAccount() {
    const [password, setPassword] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setSubmitted(false);

        if (!password) {
            setMessage("Please enter your password to confirm.");
            return;
        }
        try {
            await axios.delete(`${API_BASE_URL}/profile/deleteProfile`, {
                data: { password },
                withCredentials: true,
            });
            alert("Account deleted.");
            // redirect to homepage or logout page
            router.push("/");
        } catch (err) {
            console.error("Failed to delete profile", err);
            alert("Failed to delete profile. Please check your password.");
        }
    };

    return (
        <div className="flex h-screen bg-black font-sans">
            {/* Left side image */}
            <div className="w-1/2 h-full">
                <img
                    src="/gradient.png"
                    alt="Delete Account Visual"
                    className="h-full w-full object-cover rounded-tr-[50px] rounded-br-[50px]"
                />
            </div>

            {/* Right side form */}
            <div className="w-1/2 flex justify-center items-center">
                <div className="w-[70%] max-w-md">
                    {/* Logo or branding (optional, replicate from reset password) */}
                    <div className="w-full mb-10">
                        <div className="relative inline-block">
                            <div
                                id="echo-text"
                                className="font-jersey lg:text-[64px] md:text-[48px] text-[40px] font-normal text-white"
                            >
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

                    <form onSubmit={handleDelete}>
                        <h1 className="text-white text-2xl font-semibold mb-6">
                            Confirm Account Deletion
                        </h1>
                        <p className="text-white mb-6">
                            Please enter your password to confirm that you want to delete your
                            account. This action cannot be undone.
                        </p>
                        <div className="mb-6">
                            <label className="text-white text-sm font-light">
                                Password
                            </label>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 mt-1 text-white bg-transparent border border-white rounded-md focus:outline-none"
                                required
                                disabled={submitted}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 mt-2 mb-4 text-lg font-semibold text-black bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60"
                            disabled={submitted}
                        >
                            Delete Account
                        </button>
                    </form>

                    {message && (
                        <div
                            className={`text-center text-sm ${
                                submitted ? "text-green-500" : "text-red-500"
                            }`}
                        >
                            {message}
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <button
                            className="text-[#FFC341] text-sm hover:underline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}