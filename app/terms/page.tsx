import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kullanim Kosullari | ARF',
  description: 'ARF uygulamasi icin kullanim kosullari.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-10 relative z-10">
      <div className="mx-auto max-w-4xl glass-panel p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-mono font-bold uppercase tracking-widest text-cyan-400">
            Kullanim Kosullari
          </h1>
          <Link href="/" prefetch={false} className="text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            Ana Sayfaya Don
          </Link>
        </div>

        <div className="space-y-8 text-slate-300 leading-7">
          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">1. Kabul</h2>
            <p>
              ARF uygulamasini kullanan her kullanici, bu kullanim kosullarini okumus ve kabul etmis sayilir. Uygulamayi
              kullanmaya devam etmeniz, bu kosullari kabul ettiginiz anlamina gelir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">2. Hizmetin Kapsami</h2>
            <p>
              ARF, egitim ve gelisim odakli bir dijital deneyim sunar. Uygulama; matematik pratikleri, gorev senaryolari,
              veli takibi, yapay zeka destekli ozetler ve benzeri ozellikleri zaman icinde degistirme, gelistirme veya
              kaldirma hakkini sakli tutar.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">3. Kullanici Sorumlulugu</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Kullanici hesabini dogru ve iyi niyetli sekilde kullanmak</li>
              <li>Yetkisiz erisim, suistimal veya sistem bozucu davranislardan kacinmak</li>
              <li>Eslestirme kodlari, rol ve erisim bilgilerini sorumlu sekilde kullanmak</li>
              <li>Uygulamayi egitim amacina aykiri veya zarar verici bicimde kullanmamak</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">4. Hesap ve Erisim</h2>
            <p>
              Hesap olusturma, giris ve rol bazli yonlendirme sistem tarafindan yonetilir. Guvenlik veya teknik nedenlerle
              belirli hesaplara ait erisimler sinirlandirilabilir, askiya alinabilir veya yeniden duzenlenebilir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">5. Yapay Zeka Ciktilari</h2>
            <p>
              Uygulamada yer alan yapay zeka tabanli ozetler, tavsiyeler ve briefingler destekleyici niteliktedir. Bunlar
              kesin, resmi veya profesyonel uzman gorusu yerine gecmez. Nihai degerlendirme kullanicinin kendi takdirinde
              olmalidir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">6. Hizmet Kesintileri</h2>
            <p>
              Teknik bakim, ucuncu taraf servis kesintisi, guvenlik onlemleri veya beklenmeyen arizalar sebebiyle hizmette
              gecici kesintiler yasabilir. Bu tur durumlarda mutlak ve kesintisiz erisim garantisi verilmez.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">7. Fikri Haklar</h2>
            <p>
              Uygulamanin tasarimi, yazi icerikleri, oyunlastrima yapisi, yazilim mantigi ve ilgili gorseller aksi
              belirtilmedikce uygulama sahipligi kapsamindadir. Yetkisiz kopyalama, dagitma veya ticari kullanim uygun
              degildir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">8. Degisiklik Hakki</h2>
            <p>
              Bu kullanim kosullari onceden bildirim yapilmaksizin guncellenebilir. Guncel metin uygulamada yayinlandigi
              andan itibaren gecerlidir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">9. Yuruturluk</h2>
            <p>
              Uygulamayi kullanmaya devam eden tum kullanicilar, guncel kullanim kosullarini kabul etmis sayilir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
