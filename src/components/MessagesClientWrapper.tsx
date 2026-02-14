"use client";

import { Suspense, useEffect, useState } from "react";
import Toast from "@/components/Toast";
import MessagesPageContent from "@/components/ChatPage";

export default function MessagesClientWrapper() {
  const [showToast, setShowToast] = useState(true);

  
  useEffect(() => {
    return () => setShowToast(false);
  }, []);

  return (
    <>
     
    

      <Suspense fallback={null}>
        <MessagesPageContent />
      </Suspense>
    </>
  );
}
