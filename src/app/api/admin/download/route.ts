import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";
import { getPresignedDownloadUrl } from "@/lib/s3";

export async function GET(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized || !auth.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const photos = await prisma.photo.findMany({
      include: {
        guest: { select: { nickname: true } },
        scene: { select: { name: true } },
      },
      orderBy: { uploadedAt: "asc" },
    });

    const downloadUrls = await Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        fileName: `${photo.scene.name}_${photo.guest.nickname}_${photo.id}.jpg`,
        url: await getPresignedDownloadUrl(photo.storagePath),
      }))
    );

    return NextResponse.json({ photos: downloadUrls, total: photos.length });
  } catch (error) {
    console.error("Admin download error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
