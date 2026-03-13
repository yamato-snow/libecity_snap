import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";
import { deleteS3Object } from "@/lib/s3";

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
    const guestId = parseInt(id, 10);
    if (isNaN(guestId)) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const guest = await prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) {
      return NextResponse.json({ error: "ゲストが見つかりません" }, { status: 404 });
    }

    const photos = await prisma.photo.findMany({
      where: { guestId },
      select: { storagePath: true },
    });

    // Delete from S3 (allow partial failures)
    await Promise.allSettled(
      photos.map((p) => deleteS3Object(p.storagePath))
    );

    // Delete from DB in transaction: photos first, then guest
    await prisma.$transaction([
      prisma.photo.deleteMany({ where: { guestId } }),
      prisma.guest.delete({ where: { id: guestId } }),
    ]);

    return NextResponse.json({ success: true, deletedPhotos: photos.length });
  } catch (error) {
    console.error("Guest delete error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
