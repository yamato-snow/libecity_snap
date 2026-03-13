"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/hooks/use-session";
import { useUploadQueue } from "@/hooks/use-upload-queue";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { PinInput } from "@/components/pin-input";
import { NicknameForm } from "@/components/nickname-form";
import { LoginChoice } from "@/components/login-choice";
import { InviteeSearch } from "@/components/invitee-search";
import { WelcomeScreen } from "@/components/welcome-screen";
import { AppShell } from "@/components/app-shell";
// UploadFab is now integrated into BottomNav
import { ActionSheet } from "@/components/action-sheet";
import { SceneBottomSheet } from "@/components/scene-bottom-sheet";
import { UploadToast } from "@/components/upload-toast";
import { SuccessAnimation } from "@/components/success-animation";
import { PhotoGrid } from "@/components/photo-grid";
import { PhotoModal } from "@/components/photo-modal";
import type { Scene } from "@/types";

type Step = "pin" | "loginChoice" | "nameSearch" | "nickname" | "reloginNameSearch" | "reloginNickname" | "main";

interface PhotoItem {
  id: string;
  url: string;
  guest?: { nickname: string };
  scene?: { name: string };
  uploadedAt?: string;
}

export default function Home() {
  const { session, loading, saveSession, clearSession, getAuthHeader } = useSession();
  const isOnline = useOnlineStatus();
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [selectedInvitee, setSelectedInvitee] = useState<{ id: number; name: string } | null>(null);
  const [reloginInvitee, setReloginInvitee] = useState<{ id: number; name: string } | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<number>(1);
  const [recentPhotos, setRecentPhotos] = useState<PhotoItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  // New UI states
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showSceneSheet, setShowSceneSheet] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastUploadCount, setLastUploadCount] = useState(0);

  // Fetch all recent photos (community feed)
  const fetchRecentPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/photos?limit=12`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setRecentPhotos(data.photos);
      }
    } catch {
      // Silently fail
    }
  }, [getAuthHeader]);

  const { queue, addFiles, clearCompleted, stats } = useUploadQueue({
    getAuthHeader,
    sceneId: selectedSceneId,
    onUploadComplete: fetchRecentPhotos,
  });

  // Track batch completion for success animation
  useEffect(() => {
    if (stats.total > 0 && stats.done + stats.error === stats.total && stats.done > 0 && stats.error === 0) {
      setLastUploadCount(stats.done);
      setShowSuccess(true);
    }
  }, [stats.total, stats.done, stats.error]);

  // Restore session on load
  useEffect(() => {
    if (loading) return;
    if (session?.guestId) {
      setPin(session.pin);
      setStep("main");
    } else if (session?.pin) {
      setPin(session.pin);
      setStep("loginChoice");
    }
  }, [loading, session]);

  // Fetch scenes when authenticated
  useEffect(() => {
    if (step !== "main") return;
    const fetchScenes = async () => {
      try {
        const res = await fetch("/api/scenes", { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          setScenes(data.scenes);
          if (data.scenes.length > 0 && !data.scenes.find((s: Scene) => s.id === selectedSceneId)) {
            setSelectedSceneId(data.scenes[0].id);
          }
        }
      } catch {
        // Retry later
      }
    };
    fetchScenes();
    fetchRecentPhotos();
  }, [step, getAuthHeader, fetchRecentPhotos, selectedSceneId]);

  const handlePinSubmit = async (enteredPin: string) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: enteredPin }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    setPin(enteredPin);
    setStep("loginChoice");
  };

  const handleNicknameSubmit = async (nickname: string) => {
    const res = await fetch("/api/guests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${btoa(JSON.stringify({ pin }))}`,
      },
      body: JSON.stringify({ nickname, inviteeId: selectedInvitee?.id }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    const data = await res.json();

    saveSession({
      pin,
      guestId: data.guest.id,
      nickname: data.guest.nickname,
      inviteeId: selectedInvitee?.id,
      inviteeName: selectedInvitee?.name,
    });
    setStep("main");
  };

  const handleReloginVerify = async (nickname: string) => {
    if (!reloginInvitee) {
      throw new Error("参加者が選択されていません");
    }

    const res = await fetch("/api/guests/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${btoa(JSON.stringify({ pin }))}`,
      },
      body: JSON.stringify({ nickname, inviteeId: reloginInvitee.id }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    const data = await res.json();
    saveSession({
      pin,
      guestId: data.guest.id,
      nickname: data.guest.nickname,
      inviteeId: reloginInvitee.id,
      inviteeName: reloginInvitee.name,
    });
    setReloginInvitee(null);
    setStep("main");
  };

  // New flow: files selected → show scene sheet → confirm → upload
  const handleFilesSelected = (files: File[]) => {
    setPendingFiles(files);
    setShowSceneSheet(true);
  };

  const handleSceneConfirm = () => {
    addFiles(pendingFiles);
    setPendingFiles([]);
    setShowSceneSheet(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // Auth flow
  if (step === "pin") {
    return (
      <WelcomeScreen>
        <PinInput onSubmit={handlePinSubmit} />
      </WelcomeScreen>
    );
  }

  if (step === "loginChoice") {
    return (
      <WelcomeScreen>
        <LoginChoice
          onNewUser={() => setStep("nameSearch")}
          onRelogin={() => {
            setReloginInvitee(null);
            setStep("reloginNameSearch");
          }}
        />
      </WelcomeScreen>
    );
  }

  if (step === "nameSearch") {
    return (
      <WelcomeScreen>
        <InviteeSearch
          getAuthHeader={() => ({
            Authorization: `Bearer ${btoa(JSON.stringify({ pin }))}`,
          })}
          onSelect={(invitee) => {
            setSelectedInvitee(invitee);
            setStep("nickname");
          }}
          onBack={() => setStep("loginChoice")}
        />
      </WelcomeScreen>
    );
  }

  if (step === "nickname") {
    // Guard: selectedInvitee must be set before entering nickname step
    if (!selectedInvitee) {
      setStep("nameSearch");
      return null;
    }
    return (
      <WelcomeScreen>
        <div className="flex flex-col items-center gap-1 mb-2">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-emerald-500">{selectedInvitee.name}</span> さんとして登録
          </p>
        </div>
        <NicknameForm onSubmit={handleNicknameSubmit} />
        <div className="flex flex-col items-center gap-3 mt-4">
          <button
            onClick={() => {
              setSelectedInvitee(null);
              setStep("nameSearch");
            }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            戻る
          </button>
        </div>
      </WelcomeScreen>
    );
  }

  if (step === "reloginNameSearch") {
    return (
      <WelcomeScreen>
        <InviteeSearch
          getAuthHeader={() => ({
            Authorization: `Bearer ${btoa(JSON.stringify({ pin }))}`,
          })}
          onSelect={(invitee) => {
            setReloginInvitee(invitee);
            setStep("reloginNickname");
          }}
          onBack={() => setStep("loginChoice")}
          registeredOnly
        />
      </WelcomeScreen>
    );
  }

  if (step === "reloginNickname") {
    if (!reloginInvitee) {
      setStep("reloginNameSearch");
      return null;
    }
    return (
      <WelcomeScreen>
        <div className="flex flex-col items-center gap-1 mb-2">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-emerald-500">{reloginInvitee.name}</span> さんとして再ログイン
          </p>
        </div>
        <NicknameForm
          onSubmit={handleReloginVerify}
          title="ニックネーム確認"
          description="登録済みのニックネームを入力してください"
          submitLabel="ログイン"
          loadingLabel="確認中..."
        />
        <div className="flex flex-col items-center gap-3 mt-4">
          <button
            onClick={() => {
              setReloginInvitee(null);
              setStep("reloginNameSearch");
            }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            戻る
          </button>
        </div>
      </WelcomeScreen>
    );
  }

  // Main view
  return (
    <AppShell activeTab="camera" onCameraPress={() => setShowActionSheet(true)}>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white text-center text-sm py-1 px-4">
          オフラインです。接続が戻ると自動で再開します
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">
                {session?.nickname}さん
              </h1>
              <button
                onClick={() => {
                  clearSession();
                  setStep("pin");
                  setPin("");
                  setSelectedInvitee(null);
                  setReloginInvitee(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ログアウト
              </button>
            </div>
            <p className="text-xs text-gray-500">写真を撮って共有しよう</p>
          </div>
          {/* Current scene chip */}
          <button
            onClick={() => setShowSceneSheet(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-500 text-sm font-medium rounded-full"
          >
            {scenes.find((s) => s.id === selectedSceneId)?.name || "シーン"}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </header>

      {/* Community photo feed */}
      <div className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-4">
        {recentPhotos.length > 0 ? (
          <>
            <h2 className="text-sm font-medium text-gray-500">みんなの写真</h2>
            <PhotoGrid photos={recentPhotos} onPhotoClick={setSelectedPhoto} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium mb-1">まだ写真がありません</p>
            <p className="text-sm text-gray-400">下のカメラボタンから撮影しましょう</p>
          </div>
        )}
      </div>

      {/* Action Sheet (camera/gallery picker) */}
      <ActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onFiles={handleFilesSelected}
      />

      {/* Scene Bottom Sheet */}
      <SceneBottomSheet
        isOpen={showSceneSheet}
        scenes={scenes}
        selectedSceneId={selectedSceneId}
        fileCount={pendingFiles.length}
        onSceneChange={setSelectedSceneId}
        onConfirm={handleSceneConfirm}
        onClose={() => {
          setShowSceneSheet(false);
          setPendingFiles([]);
        }}
      />

      {/* Upload Toast */}
      <UploadToast
        queue={queue}
        stats={stats}
        onClearCompleted={clearCompleted}
      />

      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccess}
        count={lastUploadCount}
        onComplete={() => {
          setShowSuccess(false);
          clearCompleted();
        }}
      />

      {/* Photo modal */}
      {selectedPhoto && (
        <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </AppShell>
  );
}
