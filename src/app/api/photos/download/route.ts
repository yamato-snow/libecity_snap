import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";
import { getPresignedDownloadUrl } from "@/lib/s3";

export async function GET(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json({ error: "写真IDが必要です" }, { status: 400 });
    }

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { storagePath: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "写真が見つかりません" }, { status: 404 });
    }

    // Fetch from S3 server-side (no CORS issues)
    const url = await getPresignedDownloadUrl(photo.storagePath);
    const s3Res = await fetch(url);

    if (!s3Res.ok) {
      return NextResponse.json({ error: "写真の取得に失敗しました" }, { status: 502 });
    }

    const blob = await s3Res.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": blob.type || "image/jpeg",
        "Content-Disposition": `attachment; filename="${photoId}.jpg"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
