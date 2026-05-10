import { NextRequest, NextResponse } from "next/server";

/* In-memory store — videos posted by the injected script */
let pending: { ts: number; videos: unknown[] } | null = null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    pending = { ts: Date.now(), videos: body.videos || [] };
    return NextResponse.json({ ok: true, count: pending.videos.length }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET() {
  if (!pending || Date.now() - pending.ts > 60_000) {
    return NextResponse.json({ ok: false, videos: [] }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
  const data = pending;
  pending = null; // consume once
  return NextResponse.json({ ok: true, videos: data.videos }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
