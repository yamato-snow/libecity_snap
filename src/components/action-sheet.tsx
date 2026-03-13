"use client";

import { useRef } from "react";

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onFiles: (files: File[]) => void;
}

export function ActionSheet({ isOpen, onClose, onFiles }: ActionSheetProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFiles(Array.from(files));
      onClose();
    }
    if (e.target) e.target.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-45 animate-fade-in" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-8 pb-safe animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

        <div className="flex flex-col gap-3">
          {/* Camera option */}
          <label className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 cursor-pointer active:bg-emerald-100 transition-colors">
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800">カメラで撮る</p>
              <p className="text-xs text-gray-500">その場で写真を撮影</p>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleChange}
              className="hidden"
            />
          </label>

          {/* Gallery option */}
          <label className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors">
            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800">ギャラリーから選ぶ</p>
              <p className="text-xs text-gray-500">複数枚を一度に選択可能</p>
            </div>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-gray-500 font-medium rounded-2xl hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
