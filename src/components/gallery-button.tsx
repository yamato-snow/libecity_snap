"use client";

import { useRef } from "react";

interface GalleryButtonProps {
  onSelect: (files: File[]) => void;
  disabled?: boolean;
}

export function GalleryButton({ onSelect, disabled }: GalleryButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onSelect(Array.from(files));
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <label
      className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl
                  text-lg font-bold cursor-pointer transition-colors
                  ${
                    disabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white text-emerald-500 border-2 border-emerald-500 hover:bg-emerald-50 active:bg-emerald-100"
                  }`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      ギャラリーから選ぶ
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </label>
  );
}
