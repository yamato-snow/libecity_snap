import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { PHOTOS_PER_PAGE } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const sceneId = searchParams.get("sceneId");
    const guestId = searchParams.get("guestId");
    const limit = parseInt(searchParams.get("limit") || String(PHOTOS_PER_PAGE));

    const where: Record<string, unknown> = {};
    if (sceneId) where.sceneId = parseInt(sceneId);
    if (guestId) where.guestId = parseInt(guestId);

    const photos = await prisma.photo.findMany({
      where,
      include: {
        guest: { select: { id: true, nickname: true } },
        scene: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const photosWithUrls = await Promise.all(
      items.map(async (photo) => ({
        ...photo,
        url: await getPresignedDownloadUrl(photo.storagePath),
      }))
    );

    return NextResponse.json({
      photos: photosWithUrls,
      nextCursor,
    });
  } catch (error) {
    console.error("Photos fetch error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
