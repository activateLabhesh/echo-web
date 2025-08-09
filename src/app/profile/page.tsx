"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Link from 'next/link';
import { fetchProfile,profile } from "../api";
import { useRouter } from "next/navigation";
export default function ProfilePage() {
    const numPolygons = 10;
    const maxOpacity = 0.6;
    const minOpacity = 0.1;
    const [profile, setProfile] = useState<profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    useEffect(() => {
        const getProfileData = async () => {
            try {
                const data = await fetchProfile();
                setProfile(data);
            } catch (err) {
                console.error("Failed to fetch profile:", err);
                setError("Could not load profile");
            } finally {
                setLoading(false);
            }
        };

        getProfileData();
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;
    if (!profile) {
        return <p>Loading profile...</p>; // or your loading UI
    }
    return (
        <div className="flex min-h-screen bg-black text-white relative font-poppins">
            <Sidebar />
            {/* Main Content */}
            <main className="flex-1 p-10 flex flex-col gap-6 relative">
                {/* Banner */}
                <div className="relative w-[calc(100%-2rem)] ml-[1.5rem] mr-[20rem] rounded-2xl overflow-hidden shadow-lg">
                    <img
                        src="/banner.png"
                        alt="Banner"
                        className="w-full h-36 object-cover rounded-3xl border border-white/10"
                    />
                </div>


                {/* Profile Section and Customization Panel side by side */}
                <section className="flex flex-row gap-8 w-full">
                    {/* Profile Info */}
                    <div className="flex-1 min-w-0 relative">
                        <div
                            className="absolute -top-[100px] -left-[30px] z-20"
                            style={{ width: 220, height: 220 }}
                        >
                            {/* SVG clipPath definition (hidden) */}
                            <svg width="0" height="0" style={{ position: "absolute" }}>
                                <defs>
                                    <clipPath id="hexClip" clipPathUnits="objectBoundingBox">
                                        <polygon points="0.25 0.067, 0.75 0.067, 1 0.5, 0.75 0.933, 0.25 0.933, 0 0.5" />
                                    </clipPath>
                                </defs>
                            </svg>
                            <img
                                src={profile?.avatar_url || "/avatar.png"}
                                alt="Avatar"
                                style={{
                                    width: 134,
                                    height: 128,
                                    objectFit: "cover",
                                    position: "absolute",
                                    top: -26,
                                    left: 12,
                                    clipPath: "url(#hexClip)",
                                    zIndex: 4,
                                }}
                                draggable={false}
                            />
                            {/* Wavy Hex Borders and Avatar */}
                            <svg
                                viewBox="0 0 220 220"
                                width={160}
                                height={160}
                                style={{ position: "absolute", top: -42, left: 0, zIndex: 2 }}
                                aria-hidden="true"
                            >
                                <defs>
                                    <linearGradient id="wavyHexGradient" x1="0" y1="0" x2="220" y2="220" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#8B5CF6" />
                                        <stop offset="100%" stopColor="#2DD4BF" />
                                    </linearGradient>
                                    <clipPath id="hexClip">
                                        <polygon
                                            points={
                                                Array.from({ length: 6 })
                                                    .map((_, j) => {
                                                        const angle = (Math.PI / 3) * j - Math.PI / 2;
                                                        const r = 140;
                                                        const x = 110 + r * Math.cos(angle);
                                                        const y = 110 + r * Math.sin(angle);
                                                        return `${x},${y}`;
                                                    })
                                                    .join(" ")
                                            }
                                        />
                                    </clipPath>
                                </defs>

                                {Array.from({ length: 13 }).map((_, i) => {
                                    const opacity = maxOpacity - (maxOpacity - minOpacity) * (i / (numPolygons - 1));
                                    const points = [];
                                    const baseRadius = 100 + i * 2;
                                    const sides=5;
                                    for (let j = 0; j < 6; j++) {
                                        const angle = (Math.PI / 3) * j - Math.PI / 2;
                                        const r = baseRadius + Math.sin(j * 2 + i) * 8;
                                        const x = 110 + r * Math.cos(angle);
                                        const y = 110 + r * Math.sin(angle);
                                        points.push(`${x},${y}`);
                                    }
                                    return (
                                        <polygon
                                            key={i}
                                            points={points.join(" ")}
                                            fill="none"
                                            stroke="url(#wavyHexGradient)"
                                            strokeWidth={i === 11 ? 3 : 1}
                                            opacity={opacity}
                                            transform={`rotate(${i * 23} 110 110)`}
                                        />
                                    );
                                })}
                            </svg>

                        </div>

                        <div className="mt-8 ml-1">
                            <h1 className="text-3xl font-bold flex items-center gap-[23rem]">
                                {profile.fullname}
                                <span className="text-white/50 text-lg cursor-pointer">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18.5 2.49998C18.8978 2.10216 19.4374 1.87866 20 1.87866C20.5626 1.87866 21.1022 2.10216 21.5 2.49998C21.8978 2.89781 22.1213 3.43737 22.1213 3.99998C22.1213 4.56259 21.8978 5.10216 21.5 5.49998L12 15L8 16L9 12L18.5 2.49998Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

                                </span>
                            </h1>
                            <p className="text-sm text-white/60">@{profile.username}</p>
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold mb-1 flex items-center gap-[30rem]">
                                    About <span className="text-white/50 text-sm cursor-pointer ml-[2.59rem]">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18.5 2.49998C18.8978 2.10216 19.4374 1.87866 20 1.87866C20.5626 1.87866 21.1022 2.10216 21.5 2.49998C21.8978 2.89781 22.1213 3.43737 22.1213 3.99998C22.1213 4.56259 21.8978 5.10216 21.5 5.49998L12 15L8 16L9 12L18.5 2.49998Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

                                </span>
                                </h3>
                                <p className="w-[41rem] text-white/60 text-sm border-t border-white/20 pt-4 text-[1.12rem]">
                                    {profile?.bio||"Enter interesting details about you!"}
                                </p>
                            </div>
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold -mb-2">
                                    Avatar & Banner
                                </h3>
                                <hr className="my-4 border-t border-white/20" />
                                <div className="flex gap-4">
                                    <button className="bg-yellow-600 hover:bg-yellow-500 text-black font-semibold px-2 py-1 rounded-md text-sm"
                                            onClick={() => router.push("/profile-settings")}>
                                        Change Avatar
                                    </button>
                                    <button className="bg-yellow-600 hover:bg-yellow-500 text-black font-semibold px-2 py-1 rounded-md text-sm">
                                        Change Banner
                                    </button>
                                </div>
                            </div>
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold mb-2">Account Settings</h3>
                                <hr className="my-2 border-t border-white/20" />

                                <Link
                                    href="/profile-settings"
                                    className="bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded-md text-white text-sm">
                                    Settings
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="w-px bg-white/20 ml-4 mr-16" style={{ minHeight: 320 }} />


                    {/* Customization Panel */}
                    <aside className="w-full lg:w-[380px] bg-black border border-[#FFA500] rounded-2xl p-6 text-white shadow-lg self-start">
                        <h2 className="text-2xl font-bold text-center mb-2 text-[#FFA500]">
                            Unleash Your Profile!
                        </h2>
                        <button className=" w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold rounded-xl py-2 mb-3 flex items-center justify-center relative overflow-visible hover:from-orange-500 hover:to-yellow-400 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#FFA500] transition" style={{height: '3.5rem'}}>

                            <span className="absolute top-1 left-1/2 transform -translate-x-1/2 z-10">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16.23 18L12 15.45L7.77 18L8.89 13.19L5.16 9.96L10.08 9.54L12 5L13.92 9.53L18.84 9.95L15.11 13.18L16.23 18ZM12 2C6.47 2 2 6.5 2 12C2 14.6522 3.05357 17.1957 4.92893 19.0711C5.85752 19.9997 6.95991 20.7362 8.17317 21.2388C9.38642 21.7413 10.6868 22 12 22C14.6522 22 17.1957 20.9464 19.0711 19.0711C20.9464 17.1957 22 14.6522 22 12C22 10.6868 21.7413 9.38642 21.2388 8.17317C20.7362 6.95991 19.9997 5.85752 19.0711 4.92893C18.1425 4.00035 17.0401 3.26375 15.8268 2.7612C14.6136 2.25866 13.3132 2 12 2Z" fill="black"/>
</svg>

  </span>

                            <span className="z-0 mt-4">Level UP Your Look!</span>
                        </button>

                        <p className="text-sm text-gray-400 text-center mb-4">
                            Make your profile truly yours with these awesome additions:
                        </p>
                        <ul className="flex flex-col gap-2 mb-2">
                            <li className="flex items-center gap-1 border border-[#FFA500] rounded-md px-3 py-2 hover:bg-[#1a1a1a] transition">
                                <span>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.21441 0.576997C5.09483 0.195524 6.04428 -0.000872845 7.00379 2.91599e-06C7.9633 0.000878677 8.91239 0.199008 9.79211 0.582088C10.6718 0.965167 11.4634 1.52502 12.1177 2.22687C12.7719 2.92872 13.2749 3.75759 13.5954 4.662C13.8654 5.42 13.7454 6.288 13.2804 6.944C13.0472 7.26931 12.7402 7.53465 12.3845 7.71823C12.0288 7.9018 11.6347 7.99837 11.2344 8H9.36441C9.00555 7.99872 8.65812 8.12615 8.38519 8.35915C8.11225 8.59214 7.93189 8.91527 7.87684 9.26989C7.82179 9.6245 7.8957 9.9871 8.08516 10.2919C8.27461 10.5967 8.56705 10.8234 8.90941 10.931C9.45941 11.136 9.84441 11.633 9.88141 12.217C9.91749 12.549 9.83625 12.8831 9.65178 13.1615C9.4673 13.4399 9.19122 13.6449 8.87141 13.741C8.26057 13.9146 7.62843 14.0018 6.99341 14C5.71076 13.9992 4.45298 13.646 3.35741 12.979C2.26609 12.3068 1.37835 11.3502 0.789418 10.2118C0.200481 9.07337 -0.0674336 7.79611 0.0144099 6.517C0.109411 5.23892 0.550517 4.01082 1.29042 2.96438C2.03033 1.91794 3.04112 1.09265 4.21441 0.576997ZM4.36441 7C4.56139 7 4.75645 6.9612 4.93844 6.88582C5.12042 6.81043 5.28578 6.69994 5.42507 6.56066C5.56436 6.42137 5.67485 6.25601 5.75023 6.07402C5.82561 5.89203 5.86441 5.69698 5.86441 5.5C5.86441 5.30301 5.82561 5.10796 5.75023 4.92597C5.67485 4.74398 5.56436 4.57862 5.42507 4.43934C5.28578 4.30005 5.12042 4.18956 4.93844 4.11418C4.75645 4.03879 4.56139 4 4.36441 4C3.96659 4 3.58505 4.15803 3.30375 4.43934C3.02245 4.72064 2.86441 5.10217 2.86441 5.5C2.86441 5.89782 3.02245 6.27935 3.30375 6.56066C3.58505 6.84196 3.96659 7 4.36441 7ZM10.3644 4C10.3644 4.39782 10.2064 4.77935 9.92507 5.06066C9.64377 5.34196 9.26223 5.5 8.86441 5.5C8.46659 5.5 8.08505 5.34196 7.80375 5.06066C7.52245 4.77935 7.36441 4.39782 7.36441 4C7.36441 3.60217 7.52245 3.22064 7.80375 2.93934C8.08505 2.65803 8.46659 2.5 8.86441 2.5C9.26223 2.5 9.64377 2.65803 9.92507 2.93934C10.2064 3.22064 10.3644 3.60217 10.3644 4ZM4.36441 10.5C4.62963 10.5 4.88398 10.3946 5.07152 10.2071C5.25905 10.0196 5.36441 9.76521 5.36441 9.5C5.36441 9.23478 5.25905 8.98043 5.07152 8.79289C4.88398 8.60535 4.62963 8.5 4.36441 8.5C4.09919 8.5 3.84484 8.60535 3.6573 8.79289C3.46977 8.98043 3.36441 9.23478 3.36441 9.5C3.36441 9.76521 3.46977 10.0196 3.6573 10.2071C3.84484 10.3946 4.09919 10.5 4.36441 10.5Z" fill="#F2AD17"/>
</svg>

                                </span>
                                <span>Custom Profile Themes</span>
                            </li>
                            <li className="flex items-center gap-1 border border-[#FFA500] rounded-md px-3 py-1 hover:bg-[#1a1a1a] transition">
                                <span>
                                    <svg width="17" height="20" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.99981 0.25C7.8009 0.25 7.61014 0.329018 7.46948 0.46967C7.32883 0.610322 7.24981 0.801088 7.24981 1V12.26C6.49983 11.6238 5.5524 11.2674 4.56904 11.2515C3.58568 11.2356 2.62726 11.5613 1.85714 12.173C1.08703 12.7847 0.552892 13.6446 0.345791 14.606C0.138691 15.5674 0.271442 16.5709 0.721417 17.4454C1.17139 18.32 1.91073 19.0113 2.81342 19.4018C3.7161 19.7922 4.72624 19.8574 5.67165 19.5864C6.61706 19.3154 7.43922 18.7249 7.99797 17.9155C8.55672 17.1062 8.81749 16.1281 8.73581 15.148C8.74415 15.0991 8.74883 15.0496 8.74981 15V5.75H13.9998C14.7292 5.75 15.4286 5.46027 15.9444 4.94454C16.4601 4.42882 16.7498 3.72935 16.7498 3C16.7498 2.27065 16.4601 1.57118 15.9444 1.05546C15.4286 0.539731 14.7292 0.25 13.9998 0.25H7.99981Z" fill="#F2AD17"/>
</svg>


                                </span>
                                <span>Profile Anthem/Music</span>
                            </li>
                            <li className="flex items-center gap-1 border border-[#FFA500] rounded-md px-3 py-1 hover:bg-[#1a1a1a] transition">
                                <span>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 20C6.03333 20 5.125 19.8167 4.275 19.45C3.425 19.0833 2.68333 18.5833 2.05 17.95C1.41667 17.3167 0.916667 16.575 0.55 15.725C0.183333 14.875 0 13.9667 0 13C0 11.65 0.35 10.4167 1.05 9.3C1.75 8.18333 2.66667 7.33333 3.8 6.75C4.13333 6.1 4.546 5.529 5.038 5.037C5.53 4.545 6.10067 4.13267 6.75 3.8C7.3 2.66667 8.14167 1.75 9.275 1.05C10.4083 0.35 11.65 0 13 0C13.9667 0 14.875 0.183333 15.725 0.55C16.575 0.916667 17.3167 1.41667 17.95 2.05C18.5833 2.68333 19.0833 3.425 19.45 4.275C19.8167 5.125 20 6.03333 20 7C20 8.41667 19.65 9.66667 18.95 10.75C18.25 11.8333 17.3333 12.6667 16.2 13.25C15.8667 13.9 15.4543 14.471 14.963 14.963C14.4717 15.455 13.9007 15.8673 13.25 16.2C12.6667 17.3333 11.8167 18.25 10.7 18.95C9.58333 19.65 8.35 20 7 20ZM7 18C7.55 18 8.07933 17.9167 8.588 17.75C9.09667 17.5833 9.56733 17.3333 10 17C9.03333 17 8.125 16.8167 7.275 16.45C6.425 16.0833 5.68333 15.5833 5.05 14.95C4.41667 14.3167 3.91667 13.575 3.55 12.725C3.18333 11.875 3 10.9667 3 10C2.66667 10.4333 2.41667 10.9043 2.25 11.413C2.08333 11.9217 2 12.4507 2 13C2 13.7 2.13333 14.35 2.4 14.95C2.66667 15.55 3.025 16.075 3.475 16.525C3.925 16.975 4.45 17.3333 5.05 17.6C5.65 17.8667 6.3 18 7 18ZM10 15C10.55 15 11.0877 14.9167 11.613 14.75C12.1383 14.5833 12.6173 14.3333 13.05 14C12.0667 14 11.15 13.8123 10.3 13.437C9.45 13.0617 8.70833 12.5577 8.075 11.925C7.44167 11.2923 6.93767 10.5507 6.563 9.7C6.18833 8.84933 6.00067 7.93267 6 6.95C5.66667 7.38333 5.41667 7.86267 5.25 8.388C5.08333 8.91333 5 9.45067 5 10C5 10.7 5.12933 11.35 5.388 11.95C5.64667 12.55 6.009 13.075 6.475 13.525C6.925 13.9917 7.45 14.354 8.05 14.612C8.65 14.87 9.3 14.9993 10 15ZM13 12C13.3 12 13.5877 11.975 13.863 11.925C14.1383 11.875 14.4173 11.8 14.7 11.7C15.0667 10.7 15.121 9.73733 14.863 8.812C14.605 7.88667 14.159 7.10767 13.525 6.475C12.891 5.84233 12.112 5.39633 11.188 5.137C10.264 4.87767 9.30133 4.932 8.3 5.3C8.2 5.58333 8.125 5.86267 8.075 6.138C8.025 6.41333 8 6.70067 8 7C8 7.7 8.12933 8.35 8.388 8.95C8.64667 9.55 9.009 10.075 9.475 10.525C9.925 10.9917 10.45 11.3543 11.05 11.613C11.65 11.8717 12.3 12.0007 13 12ZM17 10.05C17.3333 9.61667 17.5833 9.13767 17.75 8.613C17.9167 8.08833 18 7.55067 18 7C18 6.3 17.871 5.65 17.613 5.05C17.355 4.45 16.9923 3.925 16.525 3.475C16.075 3.00833 15.55 2.646 14.95 2.388C14.35 2.13 13.7 2.00067 13 2C12.4167 2 11.8707 2.08333 11.362 2.25C10.8533 2.41667 10.3827 2.66667 9.95 3C10.9333 3 11.85 3.18767 12.7 3.563C13.55 3.93833 14.2917 4.44233 14.925 5.075C15.5583 5.70767 16.0627 6.44933 16.438 7.3C16.8133 8.15067 17.0007 9.06733 17 10.05Z" fill="#F2AD17"/>
</svg>



                                </span>
                                <span>Animated Avatar Borders</span>
                            </li>
                            <li className="flex items-center gap-1 border border-[#FFA500] rounded-md px-3 py-1 hover:bg-[#1a1a1a] transition">
                                <span>
                                    <svg width="11" height="18" viewBox="0 0 11 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.5 1V4M1.5 1V7M9.5 1V7M5.5 15.5L2.5 17L3 13.5L1 11.5L4 11L5.5 8L7 11L10 11.5L8 13.5L8.5 17L5.5 15.5Z" stroke="#F2AD17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>



                                </span>
                                <span>Achievement Badge</span>
                            </li>
                            <li className="flex items-center gap-1 border border-[#FFA500] rounded-md px-3 py-1 hover:bg-[#1a1a1a] transition">
                                <span>
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 18V16H8V12.9C7.18333 12.7167 6.45433 12.371 5.813 11.863C5.17167 11.355 4.70067 10.7173 4.4 9.95C3.15 9.8 2.10433 9.25433 1.263 8.313C0.421667 7.37167 0.000666667 6.26733 0 5V4C0 3.45 0.196 2.97933 0.588 2.588C0.98 2.19667 1.45067 2.00067 2 2H4V0H14V2H16C16.55 2 17.021 2.196 17.413 2.588C17.805 2.98 18.0007 3.45067 18 4V5C18 6.26667 17.579 7.371 16.737 8.313C15.895 9.255 14.8493 9.80067 13.6 9.95C13.3 10.7167 12.8293 11.3543 12.188 11.863C11.5467 12.3717 10.8173 12.7173 10 12.9V16H14V18H4ZM4 7.8V4H2V5C2 5.63333 2.18333 6.20433 2.55 6.713C2.91667 7.22167 3.4 7.584 4 7.8ZM14 7.8C14.6 7.58333 15.0833 7.22067 15.45 6.712C15.8167 6.20333 16 5.63267 16 5V4H14V7.8Z" fill="#F2AD17"/>
</svg>



                                </span>
                                <span>Personal Milestones</span>
                            </li>
                        </ul>
                        <button className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded-xl py-1 flex items-center justify-center gap-1 hover:from-orange-500 hover:to-yellow-400 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#FFA500] transition">
                            <span>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.12505 12.15C6.55838 11.0499 7.07938 9.99162 7.68805 8.97495C8.29672 7.95828 8.98405 6.99995 9.75005 6.09995L8.45005 5.82495C8.11671 5.75828 7.79172 5.77495 7.47505 5.87495C7.15838 5.97495 6.88338 6.14162 6.65005 6.37495L3.50005 9.52495C3.25005 9.77495 3.15405 10.075 3.21205 10.425C3.27005 10.775 3.46605 11.0166 3.80005 11.15L6.12505 12.15ZM20.8251 2.39995C19.0584 2.31662 17.3794 2.65828 15.788 3.42495C14.1967 4.19162 12.7757 5.19995 11.525 6.44995C10.725 7.24995 10.0207 8.11662 9.41205 9.04995C8.80338 9.98328 8.27472 10.9666 7.82605 12C7.74272 12.2166 7.70105 12.4376 7.70105 12.663C7.70105 12.8883 7.78438 13.084 7.95105 13.25L11.076 16.375C11.2427 16.5416 11.4387 16.625 11.664 16.625C11.8894 16.625 12.11 16.5833 12.326 16.5C13.3594 16.05 14.3427 15.5206 15.276 14.912C16.2094 14.3033 17.076 13.5993 17.876 12.8C19.126 11.55 20.1344 10.1293 20.901 8.53795C21.6677 6.94662 22.009 5.26728 21.925 3.49995C21.925 3.36662 21.8917 3.23328 21.8251 3.09995C21.7584 2.96662 21.6751 2.84995 21.5751 2.74995C21.475 2.64995 21.3584 2.56662 21.225 2.49995C21.0917 2.43328 20.9584 2.39995 20.8251 2.39995ZM14.475 9.84995C14.0917 9.46662 13.9 8.99595 13.9 8.43795C13.9 7.87995 14.0917 7.40895 14.475 7.02495C14.8584 6.64095 15.3294 6.44928 15.888 6.44995C16.4467 6.45062 16.9174 6.64228 17.3 7.02495C17.6827 7.40762 17.8744 7.87862 17.875 8.43795C17.8757 8.99728 17.684 9.46795 17.3 9.84995C16.916 10.232 16.4454 10.4236 15.888 10.425C15.3307 10.4263 14.8597 10.2346 14.475 9.84995ZM12.175 18.2L13.175 20.525C13.3084 20.8583 13.55 21.0583 13.9 21.125C14.25 21.1916 14.55 21.1 14.8 20.85L17.95 17.7C18.1834 17.4666 18.35 17.1876 18.4501 16.863C18.5501 16.5383 18.5667 16.209 18.5 15.875L18.25 14.575C17.3334 15.3416 16.371 16.0293 15.363 16.638C14.355 17.2466 13.2924 17.7673 12.175 18.2ZM4.05005 16.0499C4.63338 15.4666 5.34172 15.1706 6.17505 15.162C7.00838 15.1533 7.71672 15.441 8.30005 16.025C8.88338 16.6089 9.17505 17.3173 9.17505 18.15C9.17505 18.9826 8.88338 19.691 8.30005 20.275C7.50005 21.0749 6.55405 21.55 5.46205 21.7C4.37005 21.85 3.27438 22 2.17505 22.15C2.32505 21.0499 2.47938 19.9543 2.63805 18.863C2.79672 17.7716 3.26738 16.834 4.05005 16.0499Z" fill="black"/>
</svg>

                            </span>
                            Explore Customizations
                        </button>
                    </aside>
                </section>
            </main>
        </div>
    );
}