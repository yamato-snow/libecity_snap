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
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const sceneId = parseInt(id, 10);
    if (isNaN(sceneId)) {
      return NextResponse.json(
        { error: "無効なシーンIDです" },
        { status: 400 }
      );
    }

    // Check if scene exists
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      include: { _count: { select: { photos: true } } },
    });

    if (!scene) {
      return NextResponse.json(
        { error: "シーンが見つかりません" },
        { status: 404 }
      );
    }

    // Prevent deletion if photos are associated
    if (scene._count.photos > 0) {
      return NextResponse.json(
        {
          error: `このシーンには${scene._count.photos}枚の写真が紐づいています。先に写真を削除してください。`,
        },
        { status: 409 }
      );
    }

    await prisma.scene.delete({ where: { id: sceneId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
