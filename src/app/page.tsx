'use client';
import React, { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import SharkWithEyes from "@/components/shark";
import AOS from "aos";
import "aos/dist/aos.css";
import { useRouter } from "next/navigation";
import Modal from 'react-modal';
Modal.setAppElement('body');

export default function Home() {
  const router = useRouter();
  const [faq, setfaq] = useState<number | null>(null);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [name, setname] = useState<string>()
  const [email, setemail] = useState<string>()
  const [message, setmessage] = useState<string>()
  const [showPopup, setShowPopup] = useState(false);
  const[targetHref, setTargetHref] = useState<string | null>(null) ;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check screen size
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize(); // initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');

      if (!target || !(target instanceof HTMLAnchorElement)) return;

      const href = target.getAttribute('href');

      if (href && isMobile) {
        e.preventDefault();
        setTargetHref(href);
        setShowPopup(true);
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
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

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (isMobile && showPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showPopup, isMobile]);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
    });
  }, []);
  return (
    <>
      {/* Landing page */}
      <section>
        <div className="min-h-screen w-screen flex flex-col bg-[url('/bg0.svg')] bg-no-repeat bg-center bg-cover">

          {/* Responsive Navbar */}
          <div className={`overflow-x-hidden transition-transform duration-300 fixed top-0 left-0 w-full z-50 ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`}>
            <Navbar />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col md:flex-row items-center justify-between px-6 md:px-12 py-12 gap-10">

            {/* Left Section (Text) */}
            <div className='w-full md:w-1/2 text-white text-center md:text-left lg:pl-10'>
              <h1 className="pt-72 md:pt-16 text-[28px] sm:text-[36px] md:text-[45px] lg:text-[60px] font-semibold leading-tight md:pl-10">
                Say it once. <br />Echo it forever.
              </h1>
              <p className='mt-4 text-base sm:text-lg md:text-xl lg:text-xl md:pl-10'>
                Your space to connect,<br />
                collaborate, and echo your voice—<br />
                louder, clearer, and together.
              </p>

              {/* Buttons */}
              <div className='hidden md:flex flex-col sm:flex-row items-center justify-center md:justify-start mt-8 gap-4 md:pl-10'>

                <div className='card-wrapper-1 h-[60px] w-[120px] cursor-pointer'
                     onClick={() => router.push('/login')}>
                  <div className='card-content-1 flex items-center justify-center text-xs'>
                    <div className='max-w-[80%] text-center text-lg font-bold'>Login</div>
                  </div>
                </div>
                <div className='card-wrapper-2 h-[60px] w-[120px] cursor-pointer'
                     onClick={() => router.push('/signup')}>
                  <div className='card-content-2 flex items-center justify-center text-xs'>
                    <div className='max-w-[80%] text-center text-lg font-bold'>Signup</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section (Shark) */}
            <div className="hidden md:block w-full md:w-1/2 text-center">
              <SharkWithEyes />
            </div>
          </div>
        </div>
      </section>

      {/* Explore Echo space */}
      <div id='about-us' className='overflow-x-hidden w-screen'>
        <div className="sm:h-[310vh] md:h-[290vh] lg:h-[230vh] bg-[url('/bg.png')] bg-no-repeat bg-top bg-[length:100%_100%] flex flex-col">
          <section className='px-4 md:px-8'>

            <h1 className='pt-5 font-semibold text-3xl md:text-5xl text-white text-center font-poppins'>Explore Echo Spaces</h1>
            <p className='text-center mt-4 mb-4 text-base md:text-xl font-medium text-white'>
              Discover vibrant spaces tailored to your passions—from project <br className="hidden md:block" />
              repos to gaming squads, study zones to hackathons.
            </p>

            <div className='w-full lg:h-[70vh] lg:w-[70vw] mx-auto mt-8 flex flex-col gap-6 lg:gap-3'>

              <div className='flex flex-col lg:flex-row items-center lg:h-[40%] w-full gap-3 lg:items-start'>
                <div data-aos="fade-down" className="border-[4px] rounded-md border-[#1C5889] h-[150px] lg:h-[100%] w-[70%] lg:w-[30%] bg-[url('/techonology.png')]  bg-no-repeat bg-cover text-white font-bold text-lg flex items-center pl-5 transition-transform duration-100 hover:!scale-110 hover:!shadow-xl cursor-pointer">TECHNOLOGY</div>
                <div data-aos="fade-down" data-aos-delay="100" className="border-[4px] border-[#1C5889] h-[150px] lg:h-[85%] w-[70%] lg:w-[30%] bg-[url('/gaming_1.jpg')]  bg-no-repeat bg-cover bg-center text-white font-semibold text-lg flex items-end justify-end pr-5 pb-5 transition-transform duration-100 hover:!scale-110 hover:!shadow-xl cursor-pointer">GAMING</div>
                <div data-aos="fade-down" data-aos-delay="200" className="border-[4px] rounded-md border-[#FCBA4B] h-[150px] lg:h-[75%] w-[70%] lg:w-[40%] bg-[url('/study.png')]  bg-no-repeat bg-cover bg-center text-white font-semibold text-xl flex items-center justify-end pr-7 transition-transform duration-100 hover:!scale-110 hover:!shadow-xl cursor-pointer">STUDY</div>
              </div>

              <div className='flex flex-col lg:flex-row items-center lg:h-[60%] w-full gap-3 lg:items-stretch'>
                <div data-aos="fade-right" data-aos-delay="300" className="border-[4px] rounded-md border-[#1C5889] h-[150px] lg:h-[100%] w-[70%] lg:w-[30%] bg-[url('/contactus.png')]  bg-no-repeat bg-cover bg-center text-white font-bold text-lg flex items-end justify-end pr-5 pb-5 transition-transform duration-100 hover:!scale-110 hover:shadow-xl cursor-pointer">CONTACT US</div>
                <div data-aos="fade-up" data-aos-delay="400" className="border-[4px] rounded-md border-[#1C5889] h-[150px] lg:h-auto w-[70%] lg:w-[30%] lg:-mt-8 bg-[url('/hackathons.png')]  bg-no-repeat bg-cover bg-center text-white font-bold text-lg pt-5 pl-5 transition-transform duration-100 hover:!scale-110 hover:!shadow-xl cursor-pointer">HACKATHONS</div>

                <div className='flex flex-col w-full lg:w-[40%] lg:h-[100%] gap-3'>

                  <div className='flex flex-col lg:flex-row items-center lg:items-start lg:w-[100%] lg:h-[100%] gap-3'>
                    <div data-aos="fade-left" data-aos-delay="500" className="border-[4px] rounded-md border-[#FCBA4B] h-[150px] w-[70%] lg:h-[33%] lg:w-[60%] lg:-mt-12 bg-[url('/projectrepos.png')]  bg-no-repeat bg-cover bg-center text-white font-bold text-lg flex items-end justify-center transition-transform duration-100 hover:!scale-110 hover:!shadow-xl cursor-pointer">PROJECT REPOS</div>
                    <div data-aos="fade-left" data-aos-delay="600" className="border-[4px] rounded-md border-[#FCBA4B] h-[150px] w-[70%] lg:h-[33%] lg:w-[40%] lg:-mt-12 bg-[url('/aboutus.png')]  bg-no-repeat bg-cover bg-center text-white font-semibold text-lg flex items-center justify-center transition-transform duration-100 hover:!scale-110 hover:!shadow-xl cursor-pointer">ABOUT<br /> US</div>
                  </div>
                  <div data-aos="fade-up" data-aos-delay="700" className="border-[4px] rounded-md border-[#FCBA4B] h-[150px] w-[70%] lg:h-[100%] lg:w-[100%] lg:-mt-48 mx-auto bg-[url('/popular.png')]  bg-no-repeat bg-cover bg-center text-white font-bold text-xl flex items-center justify-center transition-transform duration-100 hover:!scale-110 hover:!shadow-xl cursor-pointer">POPULAR</div>

                </div>
              </div>
            </div>
          </section>

          <section className='mt-20 flex flex-col lg:flex-row items-center justify-between px-6 md:px-8'>
            {/* Text Content */}
            <div className='text-center lg:text-left mt-8 lg:mt-0 max-w-xl md:pl-12'>
              <h1 className='text-[#FFC64A] font-semibold text-2xl md:text-[52px] md:leading-[70px]'>
                Build Your Space. <br />Stay in Touch.
              </h1>
              <p className='text-white text-base md:text-[20px] mt-4'>
                Create and customize servers <br />on web — chat effortlessly with your community on mobile.
              </p>
            </div>

            {/* Image Container */}
            <div className='relative w-[70vw] lg:w-[60%] max-w-[700px] h-[300px] md:h-[500px] lg:h-[600px] ml-14 md:ml-0'>
              <img
                src="websample.svg"
                alt="Web Sample"
                className='absolute z-10 w-full h-auto object-contain top-20 -left-10'
              />
              <img
                src="phonesample.svg"
                alt="Phone Sample"
                className='absolute z-20 w-1/2 md:w-1/3 h-[50vw] lg:h-[70vh] object-contain top-20 md:top-28 left-[80%] transform -translate-x-1/2'
              />
            </div>
          </section>

        </div>
      </div>

      <div className="relative min-h-[225vh] bg-[url('/bg3.svg')] bg-no-repeat bg-cover bg-top flex flex-col w-screen overflow-x-hidden">
        {/* FAQ'S */}
        <section id='faqs' className='min-h-[100vh] overflow-x-hidden'>
          <div className='absolute top-10 left-[30vw] flex gap-3 md:gap-7'>
            <div
            className="-translate-y-1/2 -ml-4 md:-ml-6 rotate-180"
            style={{
              width: 40,
              height: 0,
              borderTop: '18px solid transparent',
              borderBottom: '18px solid transparent',
              borderRight: '28px solid #FFAF00'
            }}
          />
          <div
            className="-translate-y-1/2 -ml-4 md:-ml-6 rotate-180"
            style={{
              width: 40,
              height: 0,
              borderTop: '18px solid transparent',
              borderBottom: '18px solid transparent',
              borderRight: '28px solid #FFAF00'
            }}
          />
          <div
            className="-translate-y-1/2 -ml-4 md:-ml-6 rotate-180"
            style={{
              width: 40,
              height: 0,
              borderTop: '18px solid transparent',
              borderBottom: '18px solid transparent',
              borderRight: '28px solid #FFAF00'
            }}
          />

          </div>
          <h1 className='text-center mt-20 text-[#FFAF00] font-semibold text-3xl underline'>FAQs</h1>
          <img src="circles.png" alt="circles"  className='absolute z-0 h-60 w-40 md:h-72 md:w-72 top-40 md:top-5 left-[56vw]'/>
          <div className='flex flex-col items-center md:flex-row mt-20 justify-center gap-10'>
            <div
              onClick={() => setfaq(0)}
              className={`border w-[50vw] h-[25vh] md:h-[50vh] md:w-[15vw] text-white text-center font-bold text-xl cursor-pointer transition-all duration-500
              ${faq == 0 ? 'bg-[#4590E0] md:w-[30vw]' : 'bg-[#DF9817CC]'}
              flex flex-col justify-center items-center relative overflow-hidden`}
            >
              <div
                className={`transition-all duration-500 px-5 w-full ${faq == 0 ? 'mt-1' : 'flex justify-center items-center h-full'
                  }`}
              >
                How do I join or create a space?
              </div>

              <div
                className={`transition-all duration-500 px-4 ${faq == 0 ? 'max-h-40 opacity-100 pt-7' : 'max-h-0 opacity-0'
                  } overflow-hidden text-sm text-center`}
              >
                <p>
                  Click the "+" button to create a space or enter a code/invite link to join one.
                </p>
              </div>
            </div>
            <div
              onClick={() => setfaq(1)}
              className={`border w-[50vw] h-[25vh] md:h-[50vh] md:w-[15vw] text-white text-center font-bold text-xl cursor-pointer transition-all duration-500
              ${faq == 1 ? 'bg-[#4590E0] md:w-[30vw]' : 'bg-[#DF9817CC]'}
              flex flex-col justify-center items-center relative overflow-hidden`}
            >
              <div
                className={`transition-all duration-500 px-5 w-full ${faq == 1 ? 'mt-1' : 'flex justify-center items-center h-full'
                  }`}
              >
                Is my voice data secure?
              </div>

              <div
                className={`transition-all duration-500 px-4 ${faq == 1 ? 'max-h-40 opacity-100 pt-7' : 'max-h-0 opacity-0'
                  } overflow-hidden text-sm text-center`}
              >
                <p>
                  Click the "+" button to create a space or enter a code/invite link to join one.
                </p>
              </div>
            </div>
            <div
              onClick={() => setfaq(2)}
              className={`border w-[50vw] h-[25vh] md:h-[50vh] md:w-[15vw] text-white text-center font-bold text-xl cursor-pointer transition-all duration-500
              ${faq == 2 ? 'bg-[#4590E0] md:w-[30vw]' : 'bg-[#DF9817CC]'}
              flex flex-col justify-center items-center relative overflow-hidden`}
            >
              <div
                className={`transition-all duration-500 px-5 w-full ${faq == 2 ? 'mt-1' : 'flex justify-center items-center h-full'
                  }`}
              >
                Why can't others hear me?
              </div>

              <div
                className={`transition-all duration-500 px-4 ${faq == 2 ? 'max-h-40 opacity-100 pt-7' : 'max-h-0 opacity-0'
                  } overflow-hidden text-sm text-center`}
              >
                <p>
                  Click the "+" button to create a space or enter a code/invite link to join one.
                </p>
              </div>
            </div>
            <div
              onClick={() => setfaq(3)}
              className={`border w-[50vw] h-[25vh] md:h-[50vh] md:w-[15vw] text-white text-center font-bold text-xl cursor-pointer transition-all duration-500
              ${faq == 3 ? 'bg-[#4590E0] md:w-[30vw]' : 'bg-[#DF9817CC]'}
              flex flex-col justify-center items-center relative overflow-hidden`}
            >
              <div
                className={`transition-all duration-500 px-5 w-full ${faq == 3 ? 'mt-1' : 'flex justify-center items-center h-full'
                  }`}
              >
                How do I start a chat?
              </div>

              <div
                className={`transition-all duration-500 px-4 ${faq == 3 ? 'max-h-40 opacity-100 pt-7' : 'max-h-0 opacity-0'
                  } overflow-hidden text-sm text-center`}
              >
                <p>
                  Click the "+" button to create a space or enter a code/invite link to join one.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* CONTACT US */}
        <section id='contact-us' className='mt-40 flex flex-grow min-h-[100vh] overflow-x-hidden'>
          <div className='w-[70vw] h-[560px] py-5 border mx-auto bg-gradient-to-b from-[#274D76] to-[#00142A]'>
            <h1 className=' mt-5 text-center text-[#EFCA53] font-bold text-xl md:text-3xl'>Contact Us</h1>

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
            <div className='flex justify-center items-center gap-5 md:gap-10'>
              <a href="https://www.instagram.com/ieeecs_vit/?hl=en" target='blank'><img src="instagram.svg" alt="instagram" className='h-5 w-5 md:h-12 md:w-12 cursor-pointer' /></a>
              <a href="https://x.com/ieeecsvit" target='blank'><img src="x.svg" alt="x" className='h-5 w-5 md:h-12 md:w-12 cursor-pointer' /></a>
              <a href="https://www.linkedin.com/company/ieee-cs-vit/?originalSubdomain=in" target='blank'><img src="linkedin.svg" alt="linkedin" className='h-5 w-5 md:h-12 md:w-12 cursor-pointer' /></a>
              <a href="https://www.facebook.com/ieeecsvit" target='blank'><img src="facebook.svg" alt="facebook" className='h-5 w-5 md:h-12 md:w-12 cursor-pointer' /></a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 bg-gradient-to-b from-[#0E345E] to-[#6F90D1] text-white">
          {/* ECHO Header */}
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-[45vw] h-px bg-white"></div>
              <h2 className="text-xl font-bold tracking-wider">ECHO</h2>
              <div className="w-[45vw] h-px bg-white"></div>
            </div>
          </div>

          {/* Main Footer Content */}
          <div className="px-6 py-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_0.5fr_1fr] gap-8">
              {/* Logo Section */}
              <div className="space-y-4 flex flex-col items-center">
                <div className="flex items-center space-x-3">
                  <img src="ieeecs.svg" alt="logo" />
                </div>
                <p className="text-sm text-white">Activate Your Knowledge</p>
              </div>

              {/* Menu Section */}
              <div className="space-y-4 flex flex-col items-center">
                <h3 className="text-lg font-semibold text-[#EFCA53]">Menu</h3>
                <nav className="space-y-2">
                  <a href="#" className="block text-sm text-white hover:text-white transition-colors">
                    About
                  </a>
                  <a href="#" className="block text-sm text-white hover:text-white transition-colors">
                    Events
                  </a>
                  <a href="#" className="block text-sm text-white hover:text-white transition-colors">
                    Team
                  </a>
                  <a href="#" className="block text-sm text-white hover:text-white transition-colors">
                    Content
                  </a>
                </nav>
              </div>

              {/* Contact Section */}
              <div className="space-y-4 flex flex-col items-center">
                <h3 className="text-lg font-semibold text-[#EFCA53]">Contact us</h3>
                <div className="space-y-2">
                  <a className="block text-sm text-white transition-colors"
                  >
                    ieeecs@vit.ac.in
                  </a>
                  <a className="block text-sm text-white transition-colors">
                    +91 93803 02937
                  </a>
                </div>
              </div>
              <Modal
                  isOpen={showPopup}
                  onRequestClose={() => setShowPopup(false)}
                  contentLabel="Navigation Confirmation"
                  className="bg-white p-6 rounded-xl shadow-xl max-w-md mx-auto mt-40 outline-none"
                  overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
              >
                <h2 className="text-lg font-semibold mb-4">Do you want to continue?</h2>
                <div className="flex justify-end gap-4">
                  <button
                      onClick={() => {
                        setShowPopup(false);
                        if (targetHref) router.push(targetHref);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Yes
                  </button>
                  <button
                      onClick={() => setShowPopup(false)}
                      className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                  >
                    No
                  </button>
                </div>
              </Modal>

              {/* VIT Chapter Section */}
              <div className='flex justify-center md:items-center md:justify-end'>
                <h3 className="text-lg font-semibold text-white">VIT Chapter</h3>
              </div>
              <div className="space-y-4 flex flex-col md:flex-row items-center">
                <p className="text-xs text-white leading-relaxed">
                  We have at IEEECS, nurture the coders and leaders of tomorrow. We empower and support new ideas giving
                  them a platform to shine. IEEECS has been a home to great ideas capable of bringing change to the world.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

