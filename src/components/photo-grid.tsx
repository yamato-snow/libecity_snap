"use client";

import Image from "next/image";

interface PhotoItem {
  id: string;
  url: string;
  guest?: { nickname: string };
  scene?: { name: string };
}

interface PhotoGridProps {
  photos: PhotoItem[];
  onPhotoClick?: (photo: PhotoItem) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function PhotoGrid({
  photos,
  onPhotoClick,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>まだ写真がありません</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {photos.map((photo) => {
        const isSelected = selectMode && selectedIds?.has(photo.id);
        return (
          <button
            key={photo.id}
            onClick={() => {
              if (selectMode) {
                onToggleSelect?.(photo.id);
              } else {
                onPhotoClick?.(photo);
              }
            }}
            className="relative aspect-square overflow-hidden rounded-sm bg-gray-100
                       hover:opacity-90 transition-opacity"
          >
            <Image
              src={photo.url}
              alt={`Photo by ${photo.guest?.nickname || "guest"}`}
              fill
              sizes="33vw"
              className={`object-cover transition-transform duration-150 ${
                isSelected ? "scale-90" : ""
              }`}
            />
            {/* Selection overlay */}
            {selectMode && (
              <>
                {isSelected && (
                  <div className="absolute inset-0 bg-emerald-500/20" />
                )}
                <div className="absolute top-1.5 right-1.5 z-10">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-black/30 border-white"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
