"use client";

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@/types";

const SESSION_KEY = "libecity-snap-session";

function getStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Fallback: try cookie
  try {
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith("session="));
    if (cookie) return JSON.parse(decodeURIComponent(cookie.split("=")[1]));
  } catch {}
  return null;
}

function storeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    document.cookie = `session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    localStorage.removeItem(SESSION_KEY);
    document.cookie = "session=; path=/; max-age=0";
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(getStoredSession());
    setLoading(false);
  }, []);

  const saveSession = useCallback((newSession: Session) => {
    storeSession(newSession);
    setSession(newSession);
  }, []);

  const clearSession = useCallback(() => {
    storeSession(null);
    setSession(null);
  }, []);

  const getAuthHeader = useCallback((): Record<string, string> => {
    if (!session) return {};
    return {
      Authorization: `Bearer ${btoa(JSON.stringify({ pin: session.pin, guestId: session.guestId }))}`,
    };
  }, [session]);

  return { session, loading, saveSession, clearSession, getAuthHeader };
}
