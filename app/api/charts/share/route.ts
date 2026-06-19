import { NextRequest, NextResponse } from "next/server";
import { MAX_SHARE_IMAGE_BYTES, saveShare } from "@/lib/chartShareStore";
import { enforceRateLimit } from "@/lib/rateLimit";

const MAX_JSON_BODY_BYTES = Math.ceil(MAX_SHARE_IMAGE_BYTES * 1.4);
const MAX_IMAGE_DATA_CHARS = Math.ceil(MAX_SHARE_IMAGE_BYTES * 1.4);
const VALID_RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"]);

function sanitizeSymbol(value: unknown) {
  return String(value || "SNAPCHART")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.=:_-]/g, "")
    .slice(0, 32);
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "chart-share", 20, 5 * 60 * 1000);
  if (limited) return limited;

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_JSON_BODY_BYTES) {
    return NextResponse.json(
      { error: "Snapshot image is too large" },
      { status: 413 }
    );
  }

  try {
    const payload = await request.json().catch(() => null);
    const symbol = sanitizeSymbol(payload?.symbol);
    const range = String(payload?.range || "1y").trim();
    const imageData = String(payload?.imageData || "");

    if (!imageData) {
      return NextResponse.json(
        { error: "imageData is required" },
        { status: 400 }
      );
    }
    if (imageData.length > MAX_IMAGE_DATA_CHARS) {
      return NextResponse.json(
        { error: "Snapshot image is too large" },
        { status: 413 }
      );
    }
    if (!VALID_RANGES.has(range)) {
      return NextResponse.json(
        { error: "Invalid chart range" },
        { status: 400 }
      );
    }

    const id = saveShare({ symbol, range, imageData });

    return NextResponse.json({
      id,
      url: `${request.nextUrl.origin}/chart/${id}`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("too large")) {
      return NextResponse.json(
        { error: "Snapshot image is too large" },
        { status: 413 }
      );
    }
    if (error instanceof Error && error.message.includes("Invalid image")) {
      return NextResponse.json(
        { error: "Invalid image payload" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save snapshot" },
      { status: 500 }
    );
  }
}
