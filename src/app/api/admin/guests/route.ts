import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized || !auth.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const guests = await prisma.guest.findMany({
      include: { _count: { select: { photos: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ guests });
  } catch (error) {
    console.error("Guest list error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
