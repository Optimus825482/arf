export function getRankName(level: number): string {
  if (level <= 1) return "Acemi Mürettebat";
  if (level === 2) return "Sinyal Analisti";
  if (level === 3) return "Motor Mühendisi";
  if (level === 4) return "Uzay Yürüyüş Eksperi";
  if (level === 5) return "Kıdemli Teğmen";
  if (level === 6) return "Yörünge Yüzbaşısı";
  if (level === 7) return "Savaş Harekat Binbaşısı";
  if (level === 8) return "Galaktik Yarbay";
  if (level === 9) return "Kozmik Albay";
  if (level === 10) return "FİLO GENERALİ";
  if (level >= 11 && level <= 15) return "YILDIZ KOMUTANI";
  if (level >= 16 && level <= 20) return "NEBULA EFENDİSİ";
  if (level >= 21 && level <= 30) return "GALAKTİK KORUYUCU";
  if (level >= 31 && level <= 50) return "EVRENSEL YÖNETİCİ";
  if (level > 50) return "KOZMİK VARLIK";
  return "Bilinmeyen Rütbe";
}
