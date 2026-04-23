import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminAuth";
import { FieldValue } from "firebase-admin/firestore";
import { verifyRequest, unauthorized, forbidden } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";

/**
 * Veliden öğrenciye (pilot) mesaj ve XP bonusu gönderen API rotası.
 * Bu mesaj öğrencinin panelinde "Komutan Mesajı" olarak görünecektir.
 */
export async function POST(req: Request) {
  try {
    const db = getAdminDb();

    // 1. Yetki Kontrolü
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();

    const body = await req.json();
    const { studentId, message, bonusXp } = body;

    if (!studentId || !message) {
      return NextResponse.json({ error: "Öğrenci ID ve mesaj gereklidir." }, { status: 400 });
    }

    // 2. Hız Sınırı (Rate Limit)
    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 10, // Veli mesajları için daha düşük limit
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    // 3. Öğrenci Verisini Getir ve Veli Kontrolü Yap
    const studentRef = db.doc("users/" + studentId);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
    }

    const studentData = studentSnap.data();
    const parentEmail = studentData?.parentEmail;

    // Sadece öğrencinin kendi velisi mesaj gönderebilir
    if (!parentEmail || !authed.email || parentEmail.toLowerCase() !== authed.email.toLowerCase()) {
      return forbidden();
    }

    // 4. Mesajı ve Bonusu Kaydet
    // commanderMessage alanına objeyi yazıyoruz
    await studentRef.update({
      commanderMessage: {
        text: message,
        bonusXp: Number(bonusXp) || 0,
        sentAt: FieldValue.serverTimestamp(),
        read: false,
        fromName: "Komutan (Veli)"
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ 
      success: true, 
      message: "Mesaj başarıyla iletildi. Pilot bir sonraki uçuşunda görecektir." 
    });

  } catch (error) {
    console.error("Veli mesajı gönderilirken hata oluştu:", error);
    return NextResponse.json({ error: "Mesaj gönderilemedi." }, { status: 500 });
  }
}
