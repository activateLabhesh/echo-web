import { Suspense } from "react";
import MessagesPageContent from "@/components/ChatPage";
import Loader from "@/components/Loader";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={<Loader fullscreen text="Loading messages…" size="md" />}
    >
      <MessagesPageContent />
    </Suspense>
  );
}
