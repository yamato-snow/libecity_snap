import { NextResponse } from "next/server";
import { verifyPin, verifyAdminPin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PINを入力してください" }, { status: 400 });
    }

    const isGuest = verifyPin(pin);
    const isAdmin = verifyAdminPin(pin);

    if (!isGuest && !isAdmin) {
      return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      role: isAdmin ? "admin" : "guest",
    });
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
