import { parseCounter } from "@/lib/countdown";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = (process.env.COUNTDOWN_API_BASE_URL ?? "https://codeutsava.nitrr.ac.in/server").replace(/\/$/, "");
  try {
    const upstream = await fetch(`${base}/getcounter/`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error(`Counter read returned HTTP ${upstream.status}`);
    const counter = parseCounter(await upstream.json());
    const upstreamTime = Date.parse(upstream.headers.get("date") ?? "");
    return Response.json({ counter, serverTime: Number.isFinite(upstreamTime) ? upstreamTime : Date.now() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[countdown]", error);
    return Response.json({ error: "The countdown service is unavailable. Please retry." }, {
      status: 502, headers: { "Cache-Control": "no-store" },
    });
  }
}
