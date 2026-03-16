import { NextRequest, NextResponse } from "next/server";
import { saveShare } from "@/lib/chartShareStore";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    const symbol = String(payload?.symbol || "SNAPCHART").trim().toUpperCase();
    const range = String(payload?.range || "1y").trim();
    const imageData = String(payload?.imageData || "");

    if (!imageData) {
      return NextResponse.json(
        { error: "imageData is required" },
        { status: 400 }
      );
    }

    const id = saveShare({ symbol, range, imageData });

    return NextResponse.json({
      id,
      url: `${request.nextUrl.origin}/chart/${id}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save snapshot" },
      { status: 500 }
    );
  }
}
