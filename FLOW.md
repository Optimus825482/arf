# ARF Uygulama Akışı

Bu doküman, mevcut kod tabanına göre ARF uygulamasının güncel uçtan uca akışını anlatır. Amaç sadece ekranları listelemek değil; kullanıcı girişinden veri yazımına, görev üretiminden veli analizine kadar tüm operasyon zincirini tek yerde toplamaktır.

İlgili görsel diyagram: [arf-full-flow-2026-04-23.excalidraw](/mnt/d/arf/arf-full-flow-2026-04-23.excalidraw)

## 1. Sistem Başlangıcı

Uygulama [app/layout.tsx](/mnt/d/arf/app/layout.tsx:1) içinde ortak kabukla açılır.

- `AuthProvider`: Firebase Auth durumunu tüm uygulamaya sağlar.
- `ErrorBoundary`: arayüz seviyesindeki beklenmeyen hataları yakalar.
- `Toaster`: kullanıcı bildirimlerini gösterir.
- `StarsBackground`: ortak görsel arka planı sağlar.
- `PWAInstaller`: production ortamında servis worker kaydı yapar.

Bu nedenle tüm ana akışlar şu sırayla başlar:

1. Uygulama yüklenir.
2. Firebase istemcisi başlatılır.
3. `AuthProvider` kullanıcı oturumunu çözer.
4. Ekran, kullanıcının oturum ve rol bilgisine göre yönlenir.

## 2. Giriş ve Rol Yönlendirme

### 2.1 Ana Sayfa

[app/page.tsx](/mnt/d/arf/app/page.tsx:1)

1. Kullanıcı `/` sayfasına gelir.
2. Eğer aktif oturum yoksa kullanıcı `Sisteme Bağlan` butonuyla `/auth` sayfasına gider.
3. Eğer aktif oturum varsa:
   - `users/{uid}` kontrol edilir.
   - Doküman varsa kullanıcı `/ogrenci` sayfasına yönlendirilir.
   - Aksi halde `parents/{uid}` kontrol edilir.
   - Doküman varsa kullanıcı `/veli` sayfasına yönlendirilir.

### 2.2 Auth Ekranı

[app/auth/page.tsx](/mnt/d/arf/app/auth/page.tsx:1)

1. Kullanıcı Google ile giriş yapar.
2. Firebase Auth başarılı döner.
3. Sistem önce kullanıcının mevcut kayıtlı rolü olup olmadığını kontrol eder:
   - `users/{uid}` varsa öğrenci olarak `/ogrenci`
   - `parents/{uid}` varsa veli olarak `/veli`
4. Hiç kayıt yoksa kayıt tamamlama akışı başlar.

## 3. Kayıt Oluşturma Akışı

### 3.1 Öğrenci Kaydı

`/auth` içinde rol `student` seçilirse:

1. Benzersiz 6 haneli `pairingCode` üretilir.
2. `users/{uid}` dokümanı oluşturulur.
3. Başlangıç alanları yazılır:
   - `username`
   - `role: student`
   - `pairingCode`
   - `level: 1`
   - `xp: 0`
   - `shipColor`
   - `createdAt`, `updatedAt`
4. `pairingCodes/{code}` dokümanı oluşturulur.
5. Öğrenci `/ogrenci` sayfasına yönlendirilir.

### 3.2 Veli Kaydı

`/auth` içinde rol `parent` seçilirse:

1. Veli 6 haneli öğrenci eşleştirme kodu girer.
2. `pairingCodes/{code}` doğrulanır.
3. Koddan ilgili `studentId` bulunur.
4. `parents/{uid}` dokümanı oluşturulur.
5. `linkedPilots` alanına öğrenci UID eklenir.
6. Veli `/veli` sayfasına yönlendirilir.

Not: Mevcut kodda veli-öğrenci ilişkisinin bazı API kontrolleri `linkedPilots` ile, bazıları ise öğrencideki `parentEmail` ile çalışıyor. Bu yüzden akış dokümanında ikisini de veri ilişki katmanında gösteriyoruz.

## 4. Öğrenci Ana Akışı

### 4.1 Öğrenci Dashboard İlk Yükleme

[app/ogrenci/page.tsx](/mnt/d/arf/app/ogrenci/page.tsx:1)

1. Kullanıcı oturumu yoksa `/auth` sayfasına döner.
2. `users/{uid}` Firestore dokümanı okunur.
3. Eğer `level` yoksa veya `0` ise kullanıcı `/ogrenci/seviye` sayfasına gönderilir.
4. Veri varsa dashboard state'i yüklenir.
5. Eğer onboarding daha önce görülmediyse onboarding modal açılır.
6. Arka planda günlük görev paketi için `GET /api/missions` çağrılır.
7. Aynı anda sessiz plan tazeleme koşulları kontrol edilir:
   - son plan güncellemesi üzerinden yeterli süre geçmiş mi
   - XP artışı yeterli mi
   - gerekirse `POST /api/student { action: "reassess" }`

### 4.2 Öğrenci Dashboard Üzerindeki Aktif Bileşenler

Dashboard şu işlevleri tek ekranda toplar:

- rütbe ve XP görünümü
- garaj ve gemi rengi seçimi
- veli ile paylaşılacak eşleştirme kodu
- komutan mesajı okuma ve bonus XP alma
- günlük görev paketi
- görev sıralaması ve kilit mantığı
- gün sonu görev raporu
- madalyalar ve el kitabı bağlantıları

## 5. İlk Kalibrasyon ve Seviye Tespiti

[app/ogrenci/seviye/page.tsx](/mnt/d/arf/app/ogrenci/seviye/page.tsx:1)

Bu ekran öğrencinin ilk zorunlu yerleştirme akışıdır.

1. Öğrenci 15 soruluk kalibrasyon testine başlar.
2. Sistem şu tiplerde sonuç toplar:
   - toplama
   - çıkarma
   - çarpma
   - bölme
   - zihinden hızlı işlem
3. Sonuçlar `POST /api/student` ile gönderilir:
   - `action: "placement"`
   - `uid`
   - `results`
4. API tarafında:
   - doğruluk
   - hız
   - add/sub skoru
   - mul/div skoru
   - mental math skoru hesaplanır
5. Eğer DeepSeek API anahtarı varsa AI şu çıktıları üretmeye çalışır:
   - önerilen seviye
   - `actionPlan`
   - `learningPath`
6. Fallback olarak yerel seviye belirleme devreye girer.
7. `users/{uid}` dokümanı güncellenir:
   - `level`
   - `xp`
   - `metrics`
   - `actionPlan`
   - `learningPath`
   - `planUpdatedAt`
   - `planVersion`
8. Öğrenci sonuç ekranını görür ve `/ogrenci` sayfasına döner.

## 6. Günlük Görev Paketi Akışı

[app/api/missions/route.ts](/mnt/d/arf/app/api/missions/route.ts:1)

Dashboard açıldığında öğrenci için günlük görev paketi istenir.

### 6.1 İstemci Tarafı

1. Dashboard `authFetch('/api/missions')` çağrısı yapar.
2. `authFetch` Firebase ID token'ını `Authorization: Bearer ...` olarak ekler.
3. Sunucu cevabı `missionPack` state'ine yazılır.

### 6.2 Sunucu Tarafı

1. Token doğrulanır.
2. Rate limit uygulanır.
3. `users/{uid}` dokümanı okunur.
4. Aynı güne ait geçerli `dailyMissionPack` varsa doğrudan geri döner.
5. Yoksa önce fallback görev paketi üretilir.
6. Sonra varsa DeepSeek ile AI görev paketi denenir.
7. Paket `users/{uid}` içine kaydedilir:
   - `dailyMissionPack`
   - `missionPackGeneratedAt`
8. İstemciye günlük görev kartları döner.

### 6.3 Oluşan Varsayılan Görev Tipleri

[lib/missions.ts](/mnt/d/arf/lib/missions.ts:1)

Varsayılan görev dizisi genelde şu sıradadır:

1. `pratik` -> `/ogrenci/pratik`
2. `yildirim` -> `/ogrenci/yildirim`
3. `gorev` -> `/ogrenci/gorev`

Ek olarak sistemde bağımsız öğrenme ekranı olarak `/ogrenci/taktikler` de bulunur.

## 7. Görev Oynanış Akışları

### 7.1 Pratik Modu

[app/ogrenci/pratik/page.tsx](/mnt/d/arf/app/ogrenci/pratik/page.tsx:1)

1. Öğrenci metrikleri `getStudentMetrics` ile okunur.
2. Soru zorluğu öğrenci seviyesi ve performansına göre ayarlanır.
3. 60 saniyelik oyun başlar.
4. Her cevap lokal olarak toplanır.
5. Oyun bitince:
   - kategori bazlı performans güncellenir
   - toplam skor kadar XP hesaplanır
   - varsa badge verilir
   - görev mission pack içinden açıldıysa `completeMission` çağrılır

### 7.2 Yıldırım Modu

[app/ogrenci/yildirim/page.tsx](/mnt/d/arf/app/ogrenci/yildirim/page.tsx:1)

1. Öğrenci metrikleri yüklenir.
2. Her soru için kısa süreli zamanlayıcı çalışır.
3. Can mantığı vardır.
4. Doğru cevaplar combo ve skor üretir.
5. Oyun bitince:
   - performans kategorileri güncellenir
   - skor tabanlı XP verilir
   - görev açılışı mission pack üzerinden geldiyse tamamlanma kaydı yazılır

### 7.3 AI Görev Modu

[app/ogrenci/gorev/page.tsx](/mnt/d/arf/app/ogrenci/gorev/page.tsx:1)

1. Ekran açıldığında `POST /api/deepseek` ile AI soru istenir.
2. Soru seçenekli görev olarak döner.
3. Öğrenci cevap verir.
4. Doğruysa yüksek XP ve özel badge akışı tetiklenir.
5. Yanlışsa açıklama gösterilir, performans yine kaydedilir.
6. Mission pack üzerinden açıldıysa `completeMission` çağrılır.

### 7.4 Taktik Merkezi

[app/ogrenci/taktikler/page.tsx](/mnt/d/arf/app/ogrenci/taktikler/page.tsx:1)

1. Öğrenci hızlı zihinden işlem taktiklerinden birini seçer.
2. 5 soruluk mini pratik akışı çalışır.
3. Başarılı tamamlanırsa doğrudan XP verilir.
4. Bu ekran mission pack’in zorunlu zincirinden ayrı, yardımcı öğrenme ekranı gibi çalışır.

## 8. İlerleme, XP ve Rozet Yazımı

[lib/progress.ts](/mnt/d/arf/lib/progress.ts:1)

Oyun ekranları sonunda ortak ilerleme fonksiyonu kullanılır.

### 8.1 `addXpAndBadge`

Bu fonksiyon şunları yapar:

1. `users/{uid}` dokümanını okur.
2. Aynı kategori tekrarına göre spam azaltmalı XP uygular.
3. Yeni XP ve seviye hesaplar.
4. Kullanıcı dokümanına `xp`, `level`, `lastCategory`, `updatedAt` yazar.
5. `users/{uid}/performance/{perfId}` alt koleksiyonunu günceller.
6. Gerekirse badge yazar:
   - manuel badge
   - XP eşiği badge'leri
   - performans eşiği badge'leri
7. `users/{uid}/daily_stats/{today}` anlık özetini günceller.
8. günlük görev istatistiklerini artırır.

### 8.2 Görev Tamamlama API'si

[app/api/missions/complete/route.ts](/mnt/d/arf/app/api/missions/complete/route.ts:1)

Mission pack içinden açılan görevler ayrıca bu API ile işaretlenir.

1. Token doğrulanır.
2. Rate limit uygulanır.
3. Hızlı tekrar/hile kontrolü yapılır.
4. `dailyMissionPack` içindeki ilgili görev `completedAt` ile işaretlenir.
5. `dailyMissionProgress` güncellenir.
6. İlk başarılı tamamlama ise ek `missionBonusXp` verilir.
7. Tüm görevler bittiyse `dailyMissionReport` oluşturulur.

Sonuç: öğrencinin genel XP akışı ile mission pack zinciri birbirine bağlanmış olur.

## 9. Öğrenci İçin Sessiz AI Plan Tazeleme

Bu akış hem dashboard arka planında hem de veli panelinden manuel olarak tetiklenebilir.

[app/api/student/route.ts](/mnt/d/arf/app/api/student/route.ts:1)

`action: "reassess"` çağrısında:

1. mevcut kullanıcı metrikleri okunur
2. `performance` alt koleksiyonu özetlenir
3. mevcut `actionPlan` ve `learningPath` alınır
4. DeepSeek ile yeni odak planı üretilmeye çalışılır
5. eski plan `planHistory/{version}` içine arşivlenir
6. yeni plan `users/{uid}` içine yazılır
7. `planVersion` artırılır

Bu sayede öğrenci gelişimine göre rota zamanla yeniden şekillenir.

## 10. Komutan Mesajı ve Bonus XP Akışı

### 10.1 Veli Tarafı

[app/veli/page.tsx](/mnt/d/arf/app/veli/page.tsx:1) ve [app/api/student/message/route.ts](/mnt/d/arf/app/api/student/message/route.ts:1)

1. Veli panelinden öğrenciye mesaj yazar.
2. İsterse bonus XP ekler.
3. `POST /api/student/message` çağrılır.
4. Sunucu:
   - token doğrular
   - rate limit uygular
   - ilgili öğrenciyi bulur
   - yetki kontrolü yapar
   - `commanderMessage` alanını yazar

### 10.2 Öğrenci Tarafı

Öğrenci dashboard mesajı okuduğunda:

1. mesaj `read: true` olarak işaretlenir
2. bonus XP varsa kullanıcı XP'sine eklenir
3. gerekirse yeni seviye hesaplanır

## 11. Veli Ana Akışı

[app/veli/page.tsx](/mnt/d/arf/app/veli/page.tsx:1)

### 11.1 İlk Yükleme

1. Oturum yoksa `/auth`
2. `parents/{uid}` dokümanı okunur
3. onboarding kontrol edilir
4. `linkedPilots` listesi çekilir
5. Her öğrenci için:
   - `users/{studentId}` ana dokümanı
   - `performance` alt koleksiyonu
   - `badges` alt koleksiyonu okunur
6. İsteğe bağlı ayarlar için `GET /api/settings?key=deepseek_api_key`

### 11.2 Veli Panelindeki Ana İşlemler

Veli paneli şu operasyonları yönetir:

- öğrenci eşleştirme koduyla yeni pilot bağlama
- öğrencilerin seviye ve XP takibi
- performans grafiklerini görüntüleme
- AI briefing isteme
- plan yenileme
- komutan mesajı gönderme
- bonus XP gönderme
- PDF rapor üretme
- API anahtarı ayarlama

## 12. AI Briefing Akışı

[app/api/deepseek-briefing/route.ts](/mnt/d/arf/app/api/deepseek-briefing/route.ts:1)

1. Veli bir öğrenci için briefing ister.
2. İstek doğrulanır ve `linkedPilots` yetki kontrolü yapılır.
3. DeepSeek API anahtarı bulunur.
4. Öğrenciye ait seviye, XP, performans, badge, plan verileri prompt içine konur.
5. DeepSeek ebeveyne yönelik rapor üretir.
6. Çıktı:
   - `users/{studentId}.lastBriefing`
   - `lastBriefingAt`
   olarak kaydedilir.
7. Markdown briefing veli panelinde gösterilir.

## 13. Ayarlar Akışı

[app/api/settings/route.ts](/mnt/d/arf/app/api/settings/route.ts:1)

Bu katman ağırlıklı olarak veli/üst yetkili kullanımına yöneliktir.

1. `GET /api/settings?key=...`
   - belirli ayarı döner
2. `POST /api/settings`
   - ayarı günceller
3. Tipik kullanım:
   - `deepseek_api_key`

Bu ayar hem briefing hem görev üretimi hem de plan üretimi için ortak bağımlılıktır.

## 14. Veri Modeli Özeti

### 14.1 Ana Koleksiyonlar

- `users`
- `parents`
- `pairingCodes`
- `settings`

### 14.2 Öğrenci Alt Koleksiyonları

- `users/{uid}/performance`
- `users/{uid}/badges`
- `users/{uid}/daily_stats`
- `users/{uid}/planHistory`

### 14.3 Öğrenci Ana Dokümanında Dolaşan Kritik Alanlar

- `username`
- `level`
- `xp`
- `metrics`
- `actionPlan`
- `learningPath`
- `pairingCode`
- `dailyMissionPack`
- `dailyMissionProgress`
- `dailyMissionReport`
- `commanderMessage`
- `lastBriefing`

## 15. Dış Servisler ve Güvenlik Katmanı

### 15.1 Firebase

- Firebase Auth: istemci oturumu
- Firestore Client SDK: bazı istemci veri okumaları ve yazımları
- Firebase Admin SDK: güvenli API route yazımları

### 15.2 DeepSeek

Şu akışlarda kullanılır:

- yerleştirme analizi
- plan yenileme
- günlük görev paketi üretimi
- veli briefing üretimi
- AI görev sorusu üretimi

### 15.3 Güvenlik Katmanları

- `verifyRequest`
- `Authorization: Bearer <idToken>`
- `rateLimit`
- rol / ebeveyn ilişki kontrolleri
- görev tamamlama hız kontrolü

## 16. Uçtan Uca Özet Akış

En sık çalışan tam senaryo şöyledir:

1. Kullanıcı ana sayfaya gelir.
2. Google ile giriş yapar.
3. Rolü yoksa kayıt olur.
4. Öğrenci ise ilk kalibrasyon testini tamamlar.
5. Sistem seviye, plan ve öğrenme rotasını oluşturur.
6. Dashboard günlük görev paketini çağırır.
7. Öğrenci görevleri sırayla oynar.
8. Her görev performans, XP, badge ve mission progress verilerini günceller.
9. Gün sonunda görev raporu oluşur.
10. Veli bağlıysa öğrenciyi panelden izler.
11. Veli AI briefing ister, mesaj yollar, bonus XP verebilir.
12. Sistem öğrencinin yeni performansına göre planı yeniden şekillendirir.

## 17. Mevcut Dokümanda Dikkat Edilen Gerçek Kod Davranışları

Bu revizyonda özellikle aşağıdaki eksikler giderildi:

- onboarding ve ilk seviye testi eklendi
- `pairingCode` üretimi ve veli eşleşmesi detaylandırıldı
- mission pack üretimi ve cache mantığı eklendi
- görevlerin `completeMission` ile ayrıca işaretlenmesi gösterildi
- `progress` katmanındaki XP, badge ve performance yazımları eklendi
- veli tarafındaki briefing, mesaj, plan yenileme ve PDF akışı eklendi
- settings ve DeepSeek bağımlılıkları ayrı katman olarak gösterildi

## 18. Diyagram Notu

Metinle birebir uyumlu görsel sürüm şu dosyadadır:

- [arf-full-flow-2026-04-23.excalidraw](/mnt/d/arf/arf-full-flow-2026-04-23.excalidraw)

İstersen bir sonraki adımda bunun ikinci bir sürümünü de hazırlayabilirim:

1. sadece teknik backend akışı odaklı
2. sadece kullanıcı deneyimi odaklı
3. sunumluk renk kodlu sade yönetici diyagramı
