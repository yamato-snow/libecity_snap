import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export function verifyPin(pin: string): boolean {
  return pin === process.env.EVENT_PIN;
}

export function verifyAdminPin(pin: string): boolean {
  return pin === process.env.ADMIN_PIN;
}

export async function getSessionFromCookie(): Promise<{
  pin: string;
  guestId: number;
  nickname: string;
} | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

async function verifyGuestId(guestId: unknown): Promise<number | undefined> {
  if (typeof guestId !== "number" || !Number.isInteger(guestId)) return undefined;
  const guest = await prisma.guest.findUnique({ where: { id: guestId }, select: { id: true } });
  return guest ? guest.id : undefined;
}

export async function verifyAuthFromRequest(
  request: Request
): Promise<{ authorized: boolean; guestId?: number; isAdmin?: boolean }> {
  // Check Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    try {
      const decoded = JSON.parse(atob(authHeader.replace("Bearer ", "")));
      if (decoded.pin === process.env.EVENT_PIN || decoded.pin === process.env.ADMIN_PIN) {
        const verifiedGuestId = await verifyGuestId(decoded.guestId);
        return {
          authorized: true,
          guestId: verifiedGuestId,
          isAdmin: decoded.pin === process.env.ADMIN_PIN,
        };
      }
    } catch {
      // Invalid auth header
    }
  }

  // Fallback to cookie
  const session = await getSessionFromCookie();
  if (session && (session.pin === process.env.EVENT_PIN || session.pin === process.env.ADMIN_PIN)) {
    const verifiedGuestId = await verifyGuestId(session.guestId);
    return {
      authorized: true,
      guestId: verifiedGuestId,
      isAdmin: session.pin === process.env.ADMIN_PIN,
    };
  }

  return { authorized: false };
}
