export interface Invitee {
  id: number;
  name: string;
  createdAt: string;
}

export interface Guest {
  id: number;
  nickname: string;
  inviteeId?: number;
  invitee?: { id: number; name: string };
  createdAt: string;
}

export interface Scene {
  id: number;
  name: string;
  sortOrder: number;
}

export interface Photo {
  id: string;
  guestId: number;
  sceneId: number;
  storagePath: string;
  uploadedAt: string;
  guest?: Guest;
  scene?: Scene;
}

export interface Session {
  pin: string;
  guestId: number;
  nickname: string;
  inviteeId?: number;
  inviteeName?: string;
}

export interface UploadQueueItem {
  id: string;
  file: Blob;
  fileName: string;
  sceneId: number;
  status: "pending" | "uploading" | "done" | "error";
  retryCount: number;
  error?: string;
}
