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
}

export function PhotoGrid({ photos, onPhotoClick }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>まだ写真がありません</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {photos.map((photo) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick?.(photo)}
          className="relative aspect-square overflow-hidden rounded-sm bg-gray-100
                     hover:opacity-90 transition-opacity"
        >
          <Image
            src={photo.url}
            alt={`Photo by ${photo.guest?.nickname || "guest"}`}
            fill
            sizes="33vw"
            className="object-cover"
          />
        </button>
      ))}
    </div>
  );
}
