"use client";

interface SuccessAnimationProps {
  show: boolean;
  count: number;
  onComplete: () => void;
}

export function SuccessAnimation({ show, count, onComplete }: SuccessAnimationProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onComplete}
    >
      <div
        className="bg-white rounded-3xl p-8 shadow-xl flex flex-col items-center gap-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Checkmark circle */}
        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-center text-gray-800 font-bold text-lg">
          {count}枚アップロード完了！
        </p>
        <button
          onClick={onComplete}
          className="mt-2 px-8 py-2.5 bg-emerald-500 text-white font-medium rounded-full hover:bg-emerald-600 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
