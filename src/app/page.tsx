'use client';
import React, { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import SharkWithEyes from "@/components/shark";
import AOS from "aos";
import "aos/dist/aos.css";
import { useRouter } from "next/navigation";
import Modal from 'react-modal';
import Loader from "@/components/Loader";
import { FaGoogle } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/Toast";
Modal.setAppElement('body');

export default function Home() {
  const [showLoadingToast, setShowLoadingToast] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [faq, setfaq] = useState<number | null>(null);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [name, setname] = useState<string>();
  const [email, setemail] = useState<string>();
  const [message, setmessage] = useState<string>();
  const [showPopup, setShowPopup] = useState(false);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`,
        queryParams: {
          hd: "vitstudent.ac.in",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Error initiating Google sign-in:", error);
    }
  };
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setScrollY(currentScrollY);

      if (currentScrollY < 10) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]); 

  useEffect(() => {
    if (loading) {
      setShowLoadingToast(true);
    } else {
      setShowLoadingToast(false);
    }
  }, [loading]);

  useEffect(() => {
    document.body.style.overflow = loading ? "hidden" : "";
  }, [loading]);

  useEffect(() => {
    // Check screen size
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize(); // initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");

      if (!target || !(target instanceof HTMLAnchorElement)) return;

      const href = target.getAttribute("href");

      if (href && isMobile) {
        e.preventDefault();
        setTargetHref(href);
        setShowPopup(true);
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, [isMobile]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const match = hash.match(/access_token=([^&]+)/);
      const token = match ? match[1] : null;

      if (token) {
        router.replace(`/reset-password?token=${token}`);
      }
    }
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 10) {
        setShowNavbar(true);
        setLastScrollY(window.scrollY);
        return;
      }
      if (window.scrollY > lastScrollY) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (isMobile && showPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [showPopup, isMobile]);

  useEffect(() => {
    AOS.init({ duration: 800, once: true });

    const timer = setTimeout(() => {
      setLoading(false);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="relative w-screen overflow-x-hidden">
        <div
          className="fixed inset-0 bg-[url('/bg1.webp')] bg-cover bg-center -z-20 transition-transform duration-500"
          aria-hidden="true"
        />
        {/* NAVBAR */}
        <div
          className={`fixed top-0 left-0 w-full z-50 transition-transform duration-300 ${
            showNavbar ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <Navbar />
        </div>

        {/* LANDING SECTION */}
        <section className="min-h-screen flex items-center justify-between px-6 md:px-12 lg:px-24">
          <div className="w-full md:w-1/2 text-white">
            <h1
              className="text-[36px] md:text-[60px] font-semibold leading-tight"
              data-aos="fade-right"
            >
              Say it once. <br /> Echo it forever.
            </h1>
            <p
              className="mt-4 text-lg md:text-xl opacity-90"
              data-aos="fade-right"
              data-aos-delay="100"
            >
              Your space to connect, collaborate, and echo your voice—louder,
              clearer, and together.
            </p>
            <button
              onClick={handleGoogleSignIn}
              className="mt-8 flex items-center gap-3 bg-white text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg"
            >
              <FaGoogle className="text-xl text-[#4285F4]" />
              <span>Sign in with Google</span>
            </button>
          </div>
          <div className="hidden md:block w-1/2" data-aos="zoom-in">
            <SharkWithEyes />
          </div>
        </section>

        {/* EXPLORE SPACES SECTION */}
        <section
          id="about-us"
          className="relative min-h-screen py-20 px-4 md:px-8"
        >
          <h2 className="text-3xl md:text-5xl font-semibold text-white text-center mb-4">
            Explore Echo Spaces
          </h2>
          <p className="text-center text-white/80 mb-12 max-w-2xl mx-auto">
            Discover vibrant spaces tailored to your passions—from project repos
            to gaming squads, study zones to hackathons.
          </p>

          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:h-[300px]">
              <div
                data-aos="fade-down"
                className="md:col-span-4 border-[4px] rounded-xl border-[#1C5889] bg-[url('/techonology.png')] bg-cover bg-center text-white font-bold text-xl flex items-end p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl cursor-pointer"
              >
                TECHNOLOGY
              </div>
              <div
                data-aos="fade-down"
                data-aos-delay="100"
                className="md:col-span-3 border-[4px] rounded-xl border-[#1C5889] bg-[url('/gaming_1.jpg')] bg-cover bg-center text-white font-bold text-xl flex items-end justify-end p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl cursor-pointer"
              >
                GAMING
              </div>
              <div
                data-aos="fade-down"
                data-aos-delay="200"
                className="md:col-span-5 border-[4px] rounded-xl border-[#FCBA4B] bg-[url('/study.png')] bg-cover bg-center text-white font-bold text-xl flex items-center justify-end p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl cursor-pointer"
              >
                STUDY
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:min-h-[400px]">
              <div
                data-aos="fade-right"
                data-aos-delay="300"
                className="md:col-span-4 border-[4px] rounded-xl border-[#1C5889] bg-[url('/contactus.png')] bg-cover bg-center text-white font-bold text-xl flex items-end justify-end p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl cursor-pointer min-h-[200px]"
              >
                CONTACT US
              </div>

              <div
                data-aos="fade-up"
                data-aos-delay="400"
                className="md:col-span-3 border-[4px] rounded-xl border-[#1C5889] bg-[url('/hackathons.png')] bg-cover bg-center text-white font-bold text-xl p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl cursor-pointer min-h-[200px]"
              >
                HACKATHONS
              </div>

              <div className="md:col-span-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 h-1/2">
                  <div
                    data-aos="fade-left"
                    data-aos-delay="500"
                    className="border-[4px] rounded-xl border-[#FCBA4B] bg-[url('/projectrepos.png')] bg-cover bg-center text-white font-bold text-lg flex items-end justify-center pb-4 transition-all duration-300 hover:scale-[1.05] cursor-pointer"
                  >
                    PROJECT REPOS
                  </div>
                  <div
                    data-aos="fade-left"
                    data-aos-delay="600"
                    className="border-[4px] rounded-xl border-[#FCBA4B] bg-[url('/aboutus.png')] bg-cover bg-center text-white font-bold text-lg flex items-center justify-center text-center transition-all duration-300 hover:scale-[1.05] cursor-pointer"
                  >
                    ABOUT US
                  </div>
                </div>

                <div
                  data-aos="fade-up"
                  data-aos-delay="700"
                  className="h-1/2 border-[4px] rounded-xl border-[#FCBA4B] bg-[url('/popular.png')] bg-cover bg-center text-white font-bold text-2xl flex items-center justify-center transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl cursor-pointer min-h-[150px]"
                >
                  POPULAR
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 flex flex-col lg:flex-row items-center justify-between px-0 md:px-8">
          {/* Text Content */}
          <div className="text-center lg:text-left mt-8 lg:mt-0 max-w-xl md:pl-12">
            <h1 className="text-white font-semibold text-2xl md:text-[52px] md:leading-[70px]">
              Build Your Space. <br />
              Stay in Touch.
            </h1>
            <p className="text-white text-base md:text-[20px] mt-4">
              Create and customize servers <br />
              on web — chat effortlessly with your community on mobile.
            </p>
          </div>

          {/* Image Container */}
          <div className="relative w-[70vw] lg:w-[60%] max-w-[700px] h-[300px] md:h-[500px] lg:h-[600px] ml-14 md:ml-0">
            <img
              src="websample.svg"
              alt="Web Sample"
              className="absolute z-10 w-full h-auto object-contain top-20 -left-10"
            />
            <img
              src="phonesample.svg"
              alt="Phone Sample"
              className="absolute z-20 w-1/2 md:w-1/3 h-[50vw] lg:h-[70vh] object-contain top-20 md:top-28 left-[80%] transform -translate-x-1/2"
            />
          </div>
        </section>
      </div>

      {/* FAQ'S SECTION */}
      <section id="faqs" className="relative py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-16">
            <h2 className="text-white font-bold text-4xl mb-2">
              Frequently Asked Questions
            </h2>
            <div className="w-24 h-1 bg-[#FFAF00] rounded-full" />
          </div>

          <div className="flex flex-col md:flex-row gap-4 h-auto md:h-[400px]">
            {[
              {
                q: "How do I join?",
                a: "Click the '+' button to create a space or enter a code to join.",
              },
              {
                q: "Is it secure?",
                a: "Yes, we use end-to-end encryption for all your voice data.",
              },
              {
                q: "Mic not working?",
                a: "Ensure you've granted microphone permissions in your browser settings.",
              },
              {
                q: "Mobile App?",
                a: "Currently, you can use our responsive web app on any mobile device.",
              },
            ].map((item, index) => (
              <div
                key={index}
                onClick={() => setfaq(faq === index ? null : index)}
                className={`relative flex-1 group cursor-pointer transition-all duration-700 ease-in-out overflow-hidden rounded-3xl border border-white/10 backdrop-blur-xl
            ${
              faq === index
                ? "flex-[2.5] bg-blue-500/20 border-blue-400/50"
                : "hover:bg-white/5 bg-white/5"
            }
          `}
              >
                {faq === index && (
                  <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(59,130,246,0.3)] pointer-events-none" />
                )}

                <div className="p-8 h-full flex flex-col justify-center">
                  <h3
                    className={`text-xl font-bold transition-colors duration-300 ${
                      faq === index ? "text-blue-300" : "text-white"
                    }`}
                  >
                    {item.q}
                  </h3>

                  <div
                    className={`mt-4 text-gray-200 transition-all duration-500 ${
                      faq === index
                        ? "opacity-100 max-h-40"
                        : "opacity-0 max-h-0"
                    }`}
                  >
                    <p className="leading-relaxed border-l-2 border-blue-400 pl-4">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT US */}
      <section
        id="contact-us"
        className="mt-40 flex flex-grow min-h-[100vh] overflow-x-hidden"
      >
        <div className="w-[70vw] h-[560px] py-5 border mx-auto bg-white/10 backdrop-blur-md rounded-xl border-white/20">
          <h1 className="text-white text-center font-bold text-4xl mb-2">
            CONTACT US
          </h1>
          <div className="w-24 h-1 flex-center bg-[#FFAF00] rounded-full" />

          <form className="max-w-md mx-auto mt-5 p-8 space-y-6">
            <div>
              <input
                id="name"
                type="text"
                onChange={(e) => setname(e.target.value)}
                className="w-full bg-[#4687CC] text-white rounded px-3 py-2 focus:outline-none focus:ring-blue-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <input
                id="email"
                type="email"
                onChange={(e) => setemail(e.target.value)}
                className="w-full bg-[#4687CC] text-white rounded px-3 py-2 focus:outline-none focus:ring-blue-500"
                placeholder="Your email"
              />
            </div>
            <div>
              <textarea
                id="message"
                onChange={(e) => setmessage(e.target.value)}
                className="w-full bg-[#4687CC] text-white rounded px-3 py-2 focus:outline-none focus:ring-blue-500"
                placeholder="Your message"
                rows={4}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#EFCA53] rounded-lg font-semibold py-2 hover:bg-[#94803d] transition"
            >
              Submit
            </button>
          </form>
          <div className="flex justify-center items-center gap-5 md:gap-10">
            <a
              href="https://www.instagram.com/ieeecs_vit/?hl=en"
              target="blank"
            >
              <img
                src="instagram.svg"
                alt="instagram"
                className="h-5 w-5 md:h-12 md:w-12 cursor-pointer"
              />
            </a>
            <a href="https://x.com/ieeecsvit" target="blank">
              <img
                src="x.svg"
                alt="x"
                className="h-5 w-5 md:h-12 md:w-12 cursor-pointer"
              />
            </a>
            <a
              href="https://www.linkedin.com/company/ieee-cs-vit/?originalSubdomain=in"
              target="blank"
            >
              <img
                src="linkedin.svg"
                alt="linkedin"
                className="h-5 w-5 md:h-12 md:w-12 cursor-pointer"
              />
            </a>
            <a href="https://www.facebook.com/ieeecsvit" target="blank">
              <img
                src="facebook.svg"
                alt="facebook"
                className="h-5 w-5 md:h-12 md:w-12 cursor-pointer"
              />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      {/* FOOTER */}
      <footer className="mt-20 relative border-t border-white/10 bg-[#020617]/80 backdrop-blur-md">
        {/* Decorative Divider */}
        <div className="flex items-center justify-center -translate-y-1/2">
          <div className="flex items-center w-full px-4 max-w-7xl">
            <div className="flex-grow h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="px-6 text-xs font-black tracking-[0.3em] text-white uppercase">
              Echo
            </span>
            <div className="flex-grow h-px bg-gradient-to-l from-transparent via-white/20 to-transparent"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-12">
          {/* Brand Section */}
          <div className="space-y-6 flex flex-col items-center md:items-start lg:col-span-1">
            <img src="ieeecs.svg" alt="logo" className="h-12 w-auto" />
            <p className="text-xs text-blue-200/40 uppercase tracking-widest font-bold">
              Activate Your Knowledge
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <h3 className="text-sm font-black text-white  uppercase tracking-tighter">
              Quick Menu
            </h3>
            <nav className="flex flex-col space-y-2 text-center md:text-left">
              {["About", "Events", "Team", "Content"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm text-white/60 hover:text-[#EFCA53] transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <h3 className="text-sm font-black text-white  uppercase tracking-tighter">
              Direct Lines
            </h3>
            <div className="flex flex-col space-y-2 text-center md:text-left">
              <a
                href="mailto:ieeecs@vit.ac.in"
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                ieeecs@vit.ac.in
              </a>
              <span className="text-sm text-white/60">+91 8700945939</span>
            </div>
          </div>

          {/* Chapter Text */}
          <div className="md:col-span-1 lg:col-span-2 space-y-4 text-center md:text-right">
            <h3 className="text-sm font-black text-white uppercase tracking-tighter">
              The VIT Chapter
            </h3>
            <p className="text-xs text-white/40 leading-relaxed font-medium">
              We at IEEECS nurture the coders and leaders of tomorrow.
              Supporting new ideas and giving them a platform to shine, our home
              is where great ideas transform the world.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}