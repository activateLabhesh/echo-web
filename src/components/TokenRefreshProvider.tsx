"use client";

import { usePathname } from "next/navigation";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

export function TokenRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // List of routes that don't require authentication
  const publicRoutes = [
    "/",
    "/register",
    "/reset-password",
    "/forgot-password",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Only run token refresh on authenticated routes
  if (!isPublicRoute) {
    useTokenRefresh();
  }

  return <>{children}</>;
}
