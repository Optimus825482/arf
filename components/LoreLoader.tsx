import AppLoader from '@/components/AppLoader';

export default function LoreLoader() {
  return (
    <AppLoader
      variant="fullscreen"
      accent="cyan"
      title="ARF sistemleri hazirlaniyor"
      subtitle="Gorev merkezi kokpit baglantisi kuruluyor"
      messages={[
        'Kuvvet kalkanlari kontrol ediliyor...',
        'AI baglantisi kuruluyor...',
        'Motor sicakliklari optimize ediliyor...',
        'Yorunge hesaplamalari yapiliyor...',
        'Derin uzay sensorleri aktif...',
        'Gorev paketleri senkronize ediliyor...',
      ]}
    />
  );
}
