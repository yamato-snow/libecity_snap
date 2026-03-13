"use client";

import type { Scene } from "@/types";

interface SceneSelectorProps {
  scenes: Scene[];
  selectedId: number;
  onChange: (id: number) => void;
}

export function SceneSelector({ scenes, selectedId, onChange }: SceneSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {scenes.map((scene) => (
        <button
          key={scene.id}
          onClick={() => onChange(scene.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${
              selectedId === scene.id
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        >
          {scene.name}
        </button>
      ))}
    </div>
  );
}
