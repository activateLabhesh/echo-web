"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";


interface NavigationLoadingContextValue {
  /** Call from any page once its data is fully loaded */
  setPageReady: () => void;
  /** Whether a route transition is in progress */
  isNavigating: boolean;
}

const NavigationLoadingContext =
  createContext<NavigationLoadingContextValue>({ setPageReady: () => {}, isNavigating: false });

/** Pages call this hook to signal they're done loading data. */
export function usePageReady() {
  const ctx = useContext(NavigationLoadingContext);
  return ctx.setPageReady;
}

/** Check if a navigation transition is in progress */
export function useIsNavigating() {
  const ctx = useContext(NavigationLoadingContext);
  return ctx.isNavigating;
}

// ===================== VISITED ROUTES CACHE =====================
const visitedRoutes = new Set<string>();

/** Returns true if this route has been visited before (instant transition) */
export function useIsCachedRoute() {
  const pathname = usePathname();
  return visitedRoutes.has(pathname);
}

// ===================== COMPONENT =====================
export default function RouteChangeLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showBar, setShowBar] = useState(false);

  const loadingRef = useRef(false);
  const autoTimer = useRef<NodeJS.Timeout | null>(null);
  const fadeTimer = useRef<NodeJS.Timeout | null>(null);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  // Mark initial route as visited
  useEffect(() => {
    visitedRoutes.add(pathname);
  }, []);

  const clearTimers = useCallback(() => {
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    if (fadeTimer.current) { clearTimeout(fadeTimer.current); fadeTimer.current = null; }
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
  }, []);

  const dismiss = useCallback(() => {
    if (!loadingRef.current) return;
    clearTimers();
    loadingRef.current = false;
    setProgress(100);
    setIsNavigating(false);

    // Fade out the progress bar
    fadeTimer.current = setTimeout(() => {
      setShowBar(false);
      setProgress(0);
    }, 300);
  }, [clearTimers]);

  const setPageReady = useCallback(() => {
    if (!loadingRef.current) return;
    setTimeout(dismiss, 50);
  }, [dismiss]);

  // Detect route change
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      const wasCached = visitedRoutes.has(pathname);
      prevPathname.current = pathname;
      visitedRoutes.add(pathname);
      clearTimers();

      if (wasCached) {
        // Cached route — ultra-fast bar flash, no content skeleton
        loadingRef.current = true;
        setShowBar(true);
        setProgress(0);
        setIsNavigating(false); // no skeleton for cached routes

        let p = 0;
        progressTimer.current = setInterval(() => {
          p += Math.random() * 30 + 20;
          if (p > 95) p = 95;
          setProgress(p);
        }, 40);

        autoTimer.current = setTimeout(dismiss, 200);
      } else {
        // First visit — show skeleton + progress bar
        loadingRef.current = true;
        setShowBar(true);
        setIsNavigating(true);
        setProgress(0);

        let p = 0;
        progressTimer.current = setInterval(() => {
          p += Math.random() * 8 + 2;
          if (p > 85) p = 85;
          setProgress(p);
        }, 100);

        // Auto dismiss after 2s max
        autoTimer.current = setTimeout(dismiss, 2000);
      }
    }

    return clearTimers;
  }, [pathname, dismiss, clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      loadingRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <NavigationLoadingContext.Provider value={{ setPageReady, isNavigating }}>
      
      {showBar && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none">
          <div
            className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-all ease-out"
            style={{
              width: `${progress}%`,
              transitionDuration: progress === 100 ? "150ms" : "200ms",
            }}
          />
        </div>
      )}
      {children}
    </NavigationLoadingContext.Provider>
  );
}
