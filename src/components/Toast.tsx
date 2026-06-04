import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "info" | "success" | "error";
  duration?: number;
  onClose: () => void;
}

export default function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    info: {
      bg: "from-yellow-400/90 to-yellow-300/90",

      text: "text-black",
    },
    success: {
      bg: "from-green-500/90 to-emerald-500/90",

      text: "text-white",
    },
    error: {
      bg: "from-red-500/90 to-rose-500/90",

      text: "text-white",
    },
  }[type];

  return (
    <div className="animate-toast-in pointer-events-auto">
      <div
        className={`
          relative overflow-hidden
          bg-gradient-to-r ${styles.bg}
          ${styles.text}
          backdrop-blur-md
          px-5 py-4
          rounded-xl
          shadow-2xl
          min-w-[320px]
          flex items-start gap-3
          border border-white/20
        `}
      >
        {/* Glow */}
        <div className="absolute inset-0 opacity-30 blur-xl bg-white" />
        {/* Message */}
        <p className="relative flex-1 font-medium leading-snug">{message}</p>

        {/* Close */}
        <button
          onClick={onClose}
          className="relative ml-2 opacity-70 hover:opacity-100 transition"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
