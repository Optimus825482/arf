import { NextResponse } from "next/server";
import { getAdminDb, verifyRequest, unauthorized } from "@/lib/adminAuth";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Öğrencinin komutan mesajını okundu olarak işaretleyen API rotası.
 */
export async function POST(req: Request) {
  try {
    const db = getAdminDb();
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();

    const studentRef = db.doc("users/" + authed.uid);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      return NextResponse.json({ error: "Pilot bulunamadı." }, { status: 404 });
    }

    const studentData = studentSnap.data();
    if (studentData?.commanderMessage) {
      await studentRef.update({
        "commanderMessage.read": true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mesaj okundu işlenirken hata:", error);
    return NextResponse.json({ error: "TUK Protokol Hatası" }, { status: 500 });
  }
}
