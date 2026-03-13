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

    if (!nickname || typeof nickname !== "string" || !nickname.trim()) {
      return NextResponse.json({ error: "ニックネームを入力してください" }, { status: 400 });
    }

    if (!inviteeId || typeof inviteeId !== "number") {
      return NextResponse.json({ error: "参加者が指定されていません" }, { status: 400 });
    }

    const guest = await prisma.guest.findFirst({
      where: {
        nickname: nickname.trim(),
        inviteeId,
      },
      include: { invitee: { select: { id: true, name: true } } },
    });

    if (!guest) {
      return NextResponse.json(
        { error: "ニックネームが一致しません" },
        { status: 401 }
      );
    }

    return NextResponse.json({ guest });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
