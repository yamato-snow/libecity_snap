import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized || !auth.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const invitees = await prisma.invitee.findMany({
      orderBy: { id: "asc" },
      include: {
        guests: { select: { id: true, nickname: true } },
      },
    });

    return NextResponse.json({ invitees });
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

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
    }

    const invitee = await prisma.invitee.create({
      data: { name: name.trim() },
    });

    return NextResponse.json({ invitee }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
