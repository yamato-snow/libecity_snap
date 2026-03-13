import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const auth = await verifyAuthFromRequest(request);
    if (!auth.authorized || !auth.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const { csv } = await request.json();

    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ error: "CSVデータを入力してください" }, { status: 400 });
    }

    const names = csv
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    if (names.length === 0) {
      return NextResponse.json({ error: "有効な名前がありません" }, { status: 400 });
    }

    const result = await prisma.invitee.createMany({
      data: names.map((name: string) => ({ name })),
    });

    return NextResponse.json({ imported: result.count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
