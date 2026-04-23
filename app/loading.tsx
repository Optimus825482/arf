import AppLoader from '@/components/AppLoader';

export default function Loading() {
  return (
    <AppLoader
      variant="fullscreen"
      accent="cyan"
      title="ARF yukumleniyor"
      subtitle="Komuta omurgasi devreye aliniyor"
      messages={[
        'Ana us verileri cagriliyor...',
        'Sefer haritalari aciliyor...',
        'Pilot sistemleri esleniyor...',
      ]}
    />
  );
}
