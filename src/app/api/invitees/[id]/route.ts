import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized || !auth.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { id } = await params;
    const inviteeId = parseInt(id, 10);
    if (isNaN(inviteeId)) {
      return NextResponse.json({ error: "無効な参加者IDです" }, { status: 400 });
    }

    const invitee = await prisma.invitee.findUnique({
      where: { id: inviteeId },
      include: { _count: { select: { guests: true } } },
    });

    if (!invitee) {
      return NextResponse.json({ error: "参加者が見つかりません" }, { status: 404 });
    }

    if (invitee._count.guests > 0) {
      return NextResponse.json(
        { error: `この参加者には${invitee._count.guests}名のゲストが紐づいています。\n先にゲストを削除してください。` },
        { status: 409 }
      );
    }

    await prisma.invitee.delete({ where: { id: inviteeId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
