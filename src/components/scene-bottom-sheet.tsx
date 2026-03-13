"use client";

import { SceneSelector } from "@/components/scene-selector";
import type { Scene } from "@/types";

interface SceneBottomSheetProps {
  isOpen: boolean;
  scenes: Scene[];
  selectedSceneId: number;
  fileCount: number;
  onSceneChange: (id: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function SceneBottomSheet({
  isOpen,
  scenes,
  selectedSceneId,
  fileCount,
  onSceneChange,
  onConfirm,
  onClose,
}: SceneBottomSheetProps) {
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

        <h3 className="text-lg font-bold text-gray-800 mb-1">
          {fileCount > 0 ? "どのシーンの写真ですか？" : "シーンを選択"}
        </h3>
        {fileCount > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            {fileCount}枚の写真を選択中
          </p>
        )}
        {fileCount === 0 && (
          <p className="text-sm text-gray-500 mb-4">
            次に撮る写真のシーンを選んでください
          </p>
        )}

        <div className="mb-6">
          <SceneSelector
            scenes={scenes}
            selectedId={selectedSceneId}
            onChange={onSceneChange}
          />
        </div>

        {fileCount > 0 ? (
          <button
            onClick={onConfirm}
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl
                       hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
          >
            {fileCount}枚をアップロード
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl
                       hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
          >
            決定
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full mt-2 py-3 text-gray-500 font-medium rounded-2xl hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
