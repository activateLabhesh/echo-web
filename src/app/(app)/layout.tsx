// src/app/(app)/layout.tsx
"use client";

import Sidebar from "@/components/Sidebar";
import { VoiceCallProvider } from "@/contexts/VoiceCallContext";
import { FriendNotificationProvider } from "@/contexts/FriendNotificationContext";
import { MessageNotificationProvider } from "@/contexts/MessageNotificationContext";
import FloatingVoiceWindow from "@/components/FloatingVoiceWindow";
import RouteChangeLoader from "@/components/RouteChangeLoader";
import "../globals.css";
import { UserProvider } from "@/components/UserContext";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <FriendNotificationProvider>
        <MessageNotificationProvider>
          <VoiceCallProvider>
            <RouteChangeLoader>
              <div className="flex h-screen bg-black overflow-hidden relative">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">{children}</main>
                <FloatingVoiceWindow />
              </div>
            </RouteChangeLoader>
          </VoiceCallProvider>
        </MessageNotificationProvider>
      </FriendNotificationProvider>
    </UserProvider>
  );
}
