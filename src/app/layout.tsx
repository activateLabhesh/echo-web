import type { Metadata } from "next";
import "../app/globals.css";
import { MinimizedCallBar } from "@/components/MinimizedCallBar";
import { MobileBlocker } from "@/components/MobileBlocker";
import { TokenRefreshProvider } from "@/components/TokenRefreshProvider";
import { ToastProvider } from "@/contexts/ToastContext";

export const metadata: Metadata = {
  title: {
    default: "Echo",
    template: "%s • Echo",
  },
  description:
    "Echo is a real-time communication platform by IEEE Computer Society VIT, featuring servers, channels, voice calls, and instant messaging for seamless collaboration.",
  applicationName: "Echo",
  metadataBase: new URL("https://echo.ieeecsvit.com"),
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  keywords: [
    "Echo",
    "IEEE CS VIT",
    "IEEE Computer Society VIT",
    "real-time chat",
    "voice channels",
    "messaging platform",
    "collaboration tool",
    "Discord alternative",
  ],
  authors: [
    { name: "IEEE Computer Society VIT" },
  ],
  creator: "IEEE Computer Society VIT",
  publisher: "IEEE Computer Society VIT",
  openGraph: {
    title: "Echo",
    description:
      "Echo is a modern real-time communication platform built by IEEE Computer Society VIT with voice, text, and server-based collaboration.",
    url: "https://echo.ieeecsvit.com",
    siteName: "Echo",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TokenRefreshProvider>
          <MobileBlocker>
            <ToastProvider>
              {children}
            </ToastProvider>
            <MinimizedCallBar />
          </MobileBlocker>
        </TokenRefreshProvider>
      </body>
    </html>
  );
}