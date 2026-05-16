"use client";

import React, { createContext, useContext, useState } from 'react';
import { X } from 'lucide-react';

interface ImageModalContextType {
  openImage: (url: string) => void;
  closeImage: () => void;
}

const ImageModalContext = createContext<ImageModalContextType | undefined>(undefined);

export const ImageModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const openImage = (url: string) => {
    setImageUrl(url);
  };

  const closeImage = () => {
    setImageUrl(null);
  };

  return (
    <ImageModalContext.Provider value={{ openImage, closeImage }}>
      {children}
      {imageUrl && (
        <div 
          className="fixed inset-0 bg-black z-[9999] flex items-center justify-center p-4"
          onClick={closeImage}
        >
          {/* Close button */}
          <button 
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-[10000]"
            onClick={(e) => {
              e.stopPropagation();
              closeImage();
            }}
            aria-label="Close"
          >
            <X size={32} />
          </button>
          
          {/* Image container */}
          <div 
            className="flex items-center justify-center max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={imageUrl} 
              alt="attachment full-size" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </ImageModalContext.Provider>
  );
};

export const useImageModal = () => {
  const context = useContext(ImageModalContext);
  if (!context) {
    throw new Error('useImageModal must be used within ImageModalProvider');
  }
  return context;
};
