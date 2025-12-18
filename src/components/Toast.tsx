import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-yellow-400';
  const textColor = type === 'error' || type === 'success' ? 'text-white' : 'text-black';

  return (
    <div className="animate-slide-in">
      <div className={`${bgColor} ${textColor} px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`${textColor} hover:opacity-80 transition-opacity`}
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}