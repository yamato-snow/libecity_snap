"use client";

import { BottomNav } from "@/components/bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  activeTab: "camera" | "album";
  onCameraPress?: () => void;
}

export function AppShell({ children, activeTab, onCameraPress }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col pb-28">
      {children}
      <BottomNav activeTab={activeTab} onCameraPress={onCameraPress} />
    </div>
  );
}
