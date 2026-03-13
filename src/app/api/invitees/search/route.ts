import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const registeredOnly = searchParams.get("registeredOnly") === "true";

    if (!q || q.length === 0) {
      return NextResponse.json({ invitees: [] });
    }

    const guestFilter = registeredOnly
      ? { guests: { some: {} } }
      : { guests: { none: {} } };

    const invitees = await prisma.invitee.findMany({
      where: { name: { contains: q }, ...guestFilter },
      take: 10,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ invitees });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
