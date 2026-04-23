# 🔍 ARF - Teknik Analiz ve Denetim Raporu

Bu dosya, uygulamanın mantık hatalarını, güvenlik açıklarını ve geliştirilmesi gereken eksik noktalarını özetler.

## 1. 🛡️ Güvenlik ve Yetkilendirme
*   **Firestore Kuralları (`firestore.rules`):** Kurallar şu an çok esnek olabilir. `request.auth.uid` doğrulaması yapılmadan veri yazılmasına izin verilmemelidir. Özellikle XP ve Seviye (`level`) verileri istemci tarafından (client-side) doğrudan güncellenmemeli.
*   **API Güvenliği:** `/api` rotalarında Firebase Admin SDK kullanılarak `Authorization: Bearer <token>` kontrolü yapılmalıdır. Mevcut yapıda bir kullanıcı kendi ID'si yerine başkasının ID'si ile istek atarak veri manipülasyonu yapabilir.
*   **Hile Koruması:** Matematik görevlerinin tamamlanma süresi ve doğruluğu sadece istemcide hesaplanıp gönderilmemeli; sunucu tarafında (server-side) mantıksal bir zaman kontrolü yapılmalıdır.

## 2. 🧠 Yapay Zeka (AI) Entegrasyonu
*   **API Limitleri:** `xpDelta >= 100` tetikleyicisi, öğrenci hızlı XP toplarsa çok sık AI isteği atılmasına (Rate Limit) neden olabilir. Buna bir "cooldown" (soğuma süresi) eklenmelidir.
*   **Hata Yakalama (Fallback):** DeepSeek API yanıt vermediğinde sistemin öğrenciye sunacağı "statik/acil durum" görev paketleri daha detaylı hale getirilmelidir.
*   **Veri Optimizasyonu:** AI'ya gönderilen performans verisi (telemetri) çok biriktiğinde token sınırını aşabilir. Sadece son 20 operasyonun gönderilmesi sağlanmalıdır.

## 3. 🎮 Oyunlaştırma ve Matematik Mantığı
*   **XP Spam Engelleme:** Aynı görevin üst üste yapılması durumunda kazanılan XP'nin azalması (diminishing returns) mekanizması eklenmelidir.
*   **Granüler Zorluk:** Zorluk seviyesi sadece genel bir skor üzerinden değil, işlem bazlı (toplama için ayrı, çarpma için ayrı) hesaplanmalıdır.
*   **Rütbe Tutarlılığı:** `lib/commander.ts` içindeki 1200 XP barajı, görev başına verilen 40-50 XP ile çok hızlı aşılabilir. Rütbe atlama zorluğu logaritmik olarak artırılmalıdır.

## 4. 💻 Kod Kalitesi ve Performans
*   **Ses Sistemi (`lib/audio.ts`):** `playSound` fonksiyonu tarayıcı kısıtlamalarına (autoplay policy) takılabilir. Fonksiyonun `silent fail` yapması ve hata fırlatmaması sağlanmalıdır.
*   **Ağır Animasyonlar:** `StarsBackground.tsx` düşük donanımlı cihazlarda (eski telefonlar) işlemciyi yorar. Bu da öğrencinin hız testindeki (Yıldırım modu) performansını yapay olarak düşürür. Bir "Düşük Grafik Modu" eklenmesi önerilir.
*   **Eksik Modül:** Yıldırım modunda hile yapılmasını engellemek için `server-side validation` modülü sisteme dahil edilmelidir.

---
**Not:** Bu analiz 23 Nisan 2026 tarihinde Gemini CLI tarafından oluşturulmuştur.
