"use client";

import { useEffect, useState } from "react";

export function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/bg0.svg')] bg-no-repeat bg-center bg-cover text-white px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-3xl font-semibold">Mobile App Coming Soon</h1>
          <p className="text-xl">We're still building the mobile experience.</p>
          <p className="text-xl">
            For now, please use Echo on a laptop or desktop browser.
          </p>
          <p className="text-md">Stay tuned</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
