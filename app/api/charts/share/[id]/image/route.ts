import { NextRequest, NextResponse } from "next/server";
import { getShareImageBuffer, getShare } from "@/lib/chartShareStore";

const FALLBACK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yXJkAAAAASUVORK5CYII=";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const fallback = Buffer.from(FALLBACK_PNG_BASE64, "base64");
  const share = getShare(params.id);
  if (!share) {
    return NextResponse.json(
      { error: "Snapshot not found" },
      { status: 404 }
    );
  }

  const buffer = getShareImageBuffer(params.id);
  if (!buffer) {
    return new NextResponse(fallback, {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
        "content-length": String(fallback.length),
      },
    });
  }

  return new NextResponse(buffer, {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store",
      "content-length": String(buffer.length),
    },
  });
}
