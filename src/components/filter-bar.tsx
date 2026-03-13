"use client";

import type { Scene, Guest } from "@/types";

interface FilterBarProps {
  scenes: Scene[];
  guests: Guest[];
  selectedSceneId: number | null;
  selectedGuestId: number | null;
  onSceneChange: (id: number | null) => void;
  onGuestChange: (id: number | null) => void;
}

export function FilterBar({
  scenes,
  guests,
  selectedSceneId,
  selectedGuestId,
  onSceneChange,
  onGuestChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Scene filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onSceneChange(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${!selectedSceneId ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          すべて
        </button>
        {scenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => onSceneChange(scene.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${selectedSceneId === scene.id ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {scene.name}
          </button>
        ))}
      </div>

      {/* Guest filter */}
      <select
        value={selectedGuestId ?? ""}
        onChange={(e) => onGuestChange(e.target.value ? parseInt(e.target.value) : null)}
        className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
      >
        <option value="">投稿者: すべて</option>
        {guests.map((guest) => (
          <option key={guest.id} value={guest.id}>
            {guest.nickname}
          </option>
        ))}
      </select>
    </div>
  );
}
