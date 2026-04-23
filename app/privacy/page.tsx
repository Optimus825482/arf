import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gizlilik Bildirimi | ARF',
  description: 'ARF uygulamasi icin gizlilik bildirimi.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-10 relative z-10">
      <div className="mx-auto max-w-4xl glass-panel p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-mono font-bold uppercase tracking-widest text-cyan-400">
            Gizlilik Bildirimi
          </h1>
          <Link href="/" className="text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            Ana Sayfaya Don
          </Link>
        </div>

        <div className="space-y-8 text-slate-300 leading-7">
          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">1. Amac</h2>
            <p>
              Bu gizlilik bildirimi, ARF uygulamasini kullanan ogrenci, veli ve diger kullanicilardan hangi bilgilerin
              toplandigini, bu bilgilerin nasil kullanildigini ve korunmasi icin hangi temel prensiplerin uygulandigini
              aciklamak amaciyla hazirlanmistir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">2. Toplanan Veriler</h2>
            <p>Uygulama kapsaminda asagidaki veriler islenebilir:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Google girisi sirasinda alinan temel hesap bilgileri</li>
              <li>Ogrenci kullanici adi, seviye, XP, performans ve gorev gecmisi</li>
              <li>Veli-ogrenci eslestirme kodlari ve bagli pilot listesi</li>
              <li>Yapay zeka destekli analizler icin olusturulan ogrenme plani ve ozet performans verileri</li>
              <li>Teknik guvenlik, hata tespiti ve servis surekliligi icin gerekli sinirli sistem verileri</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">3. Verilerin Kullanimi</h2>
            <p>Toplanan veriler su amaclarla kullanilir:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Kullanici girisini saglamak ve oturum yonetimini surdurmek</li>
              <li>Ogrenciye kisilestirilmis gorev, zorluk seviyesi ve geri bildirim sunmak</li>
              <li>Velilere ogrenci gelisimi hakkinda ozet bilgi, briefing ve rapor saglamak</li>
              <li>Uygulamanin guvenli, kararlı ve gelistirilebilir sekilde calismasini saglamak</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">4. Ucuncu Taraf Hizmetler</h2>
            <p>
              ARF, kimlik dogrulama, veri saklama ve yapay zeka ozellikleri icin Firebase ve benzeri servisleri
              kullanabilir. Bu servisler kendi teknik altyapilarina uygun sekilde veri isleyebilir. Kullanilan servislerin
              kendi politika ve kosullari da ayrica gecerlidir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">5. Veri Guvenligi</h2>
            <p>
              Uygulama kapsaminda verilerin korunmasi icin makul teknik ve idari onlemler uygulanir. Buna ragmen internet
              uzerinden iletilen hicbir sistemin tamamen risksiz oldugu garanti edilemez.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">6. Cocuk Kullanici ve Veli Iliskisi</h2>
            <p>
              Uygulama egitim amacli bir deneyim sundugu icin ogrenci ve veli profilleri ayri roller uzerinden
              yonetilmektedir. Veli paneli yalnizca ilgili ogrenci ile kurulan eslestirme baglantisi kapsaminda bilgi
              goruntulemelidir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">7. Degisiklikler</h2>
            <p>
              Bu gizlilik bildirimi zaman zaman guncellenebilir. Guncel surum uygulama icinde yayinlandigi andan itibaren
              gecerlilik kazanir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-mono uppercase tracking-wider text-white">8. Iletisim</h2>
            <p>
              Uygulama ile ilgili gizlilik sorulariniz veya talepleriniz icin uygulama gelistiricisi ile iletisime
              gecebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
