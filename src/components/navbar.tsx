"use client"
import Link from "next/link"
import { useRouter } from "next/navigation";

export default function Navbar() {
    const router = useRouter();
    return (
        <nav className="w-screen px-6 py-4 shadow-md shadow-gray-600 bg-white/10">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Logo */}
                <div className="flex items-center space-x-2">
                    <img src="/logo.png" alt="logo" className="h-16 w-20" />
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex items-center space-x-8">
                    <Link href="/" className="text-white text-xl font-semibold">
                        Home
                    </Link>
                    <Link href="#about-us" className="text-white text-xl font-semibold">
                        About Us
                    </Link>
                    <Link href="#faqs" className="text-white text-xl font-semibold">
                        FAQs
                    </Link>
                    <Link href="#contact-us" className="text-white text-xl font-semibold">
                        Contact Us
                    </Link>
                </nav>

                <div className="hidden md:flex items-center gap-2">
                    <div className="border-white/20 text-white text-xl hover:cursor-pointer bg-transparent"
                         onClick={() => router.push("/login")}>
                        Login |
                    </div>
                    <div className="border-white/20 text-white text-xl hover:cursor-pointer bg-transparent"
                         onClick={() => router.push("/signup")}>
                        Signup
                    </div>
                </div>
            </div>
        </nav>
    )
}