import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { getPresignedUploadUrl } from "@/lib/s3";
import { verifyAuthFromRequest } from "@/lib/auth";
import { MAX_FILE_SIZE } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized || !auth.guestId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { sceneId, contentType, fileSize } = await request.json();

    if (!sceneId || typeof sceneId !== "number") {
      return NextResponse.json({ error: "シーンを選択してください" }, { status: 400 });
    }

    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    // Check upload date restriction
    if (process.env.UPLOAD_RESTRICTION_ENABLED === "true") {
      const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE;
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const jstNow = new Date(now.getTime() + jstOffset);
      const today = jstNow.toISOString().split("T")[0];
      if (today !== eventDate) {
        return NextResponse.json(
          { error: "アップロードはイベント当日のみ可能です" },
          { status: 403 }
        );
      }
    }

    // Generate UUID for the photo
    const photoId = uuidv4();
    const storagePath = `photos/${photoId}.jpg`;

    // Get presigned URL for direct S3 upload
    const uploadUrl = await getPresignedUploadUrl(
      storagePath,
      contentType || "image/jpeg"
    );

    // Create photo record in DB
    const photo = await prisma.photo.create({
      data: {
        id: photoId,
        guestId: auth.guestId,
        sceneId,
        storagePath,
      },
    });

    return NextResponse.json({
      uploadUrl,
      photo,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
