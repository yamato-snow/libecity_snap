import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const scenes = await prisma.scene.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ scenes });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized || !auth.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { name, sortOrder } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "シーン名を入力してください" }, { status: 400 });
    }

    const scene = await prisma.scene.create({
      data: { name: name.trim(), sortOrder: sortOrder ?? 0 },
    });

    return NextResponse.json({ scene }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
