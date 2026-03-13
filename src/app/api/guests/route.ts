import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { nickname, inviteeId } = await request.json();

    if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
      return NextResponse.json({ error: "ニックネームを入力してください" }, { status: 400 });
    }

    const trimmed = nickname.trim();
    if (trimmed.length > 20) {
      return NextResponse.json({ error: "ニックネームは20文字以内にしてください" }, { status: 400 });
    }

    // Check if nickname already exists (for session recovery)
    const existing = await prisma.guest.findUnique({
      where: { nickname: trimmed },
      include: { invitee: { select: { id: true, name: true } } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "そのニックネームは既に使われています。\n別のニックネームをお試しください。" },
        { status: 409 }
      );
    }

    // Require inviteeId for new guest creation
    if (!inviteeId) {
      return NextResponse.json(
        { error: "参加者との紐づけが必要です。\n「初めての方」から登録してください。" },
        { status: 400 }
      );
    }

    // Verify invitee exists
    const invitee = await prisma.invitee.findUnique({
      where: { id: Number(inviteeId) },
      include: { guests: { select: { id: true } } },
    });
    if (!invitee) {
      return NextResponse.json(
        { error: "参加者が見つかりません" },
        { status: 404 }
      );
    }

    // Enforce one guest per invitee
    if (invitee.guests.length > 0) {
      return NextResponse.json(
        { error: "この参加者は既に登録済みです。\n再ログインからログインしてください。" },
        { status: 409 }
      );
    }

    // Create new guest linked to invitee
    const guest = await prisma.guest.create({
      data: {
        nickname: trimmed,
        inviteeId: Number(inviteeId),
      },
      include: { invitee: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ guest, recovered: false }, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "そのニックネームはすでに使われています" },
        { status: 409 }
      );
    }
    console.error("Guest creation error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const guests = await prisma.guest.findMany({
      orderBy: { nickname: "asc" },
      select: { id: true, nickname: true },
    });

    return NextResponse.json({ guests });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
