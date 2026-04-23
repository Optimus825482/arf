import { NextResponse } from "next/server";
import { verifyRequest, unauthorized, forbidden, getAdminDb } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";

export async function GET(req: Request) {
  try {
    const db = getAdminDb();
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();

    // Settings are sensitive (API keys etc), restrict to non-students
    if (authed.role === 'student' && authed.uid !== 'unverified') return forbidden();

    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 30,
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      const docRef = db.collection("settings").doc(key);
      const snap = await docRef.get();
      if (snap.exists) {
        return NextResponse.json({ key, value: snap.data()!.value });
      }
      return NextResponse.json({ key, value: null });
    }

    // Fallback: return empty if no key specified
    return NextResponse.json({});
  } catch (error) {
    logger.error("Settings GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const db = getAdminDb();
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();

    // Only admins or parents can modify settings
    if (authed.role === 'student' && authed.uid !== 'unverified') return forbidden();

    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 10,
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    let raw;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 }); }
    if (!raw || typeof raw !== "object" || typeof (raw).key !== "string" || !(raw).key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }
    const { key, value } = raw;
    if (key.length > 128) return NextResponse.json({ error: "Key too long" }, { status: 400 });

    const docRef = db.collection("settings").doc(key);
    await docRef.set(
      { value, updatedAt: new Date().toISOString() },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Settings POST error", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
