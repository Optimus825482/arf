/**
 * Matematik işlemlerini uzay temalı hikaye metinlerine (Lore) dönüştüren yardımcı fonksiyonlar.
 */

const loreTemplates: Record<string, string[]> = {
  '+': [
    "Kalkanlara %n1 birim güç verildi, %n2 birim daha eklenirse toplam kalkan gücü kaç olur?",
    "Gemimiz %n1 ışık yılı yol aldıktan sonra %n2 ışık yılı daha ilerledi. Toplam mesafe nedir?",
    "Ambarımızda %n1 adet enerji kapsülü vardı, keşif ekibi %n2 adet daha buldu. Toplam kaç kapsülümüz oldu?",
    "Motorlara %n1 birim yakıt pompalandı, %n2 birim daha eklenince yakıt seviyesi kaça ulaştı?"
  ],
  '-': [
    "Gemimizde %n1 galon su vardı, mürettebat %n2 galonunu tüketti. Geriye kaç galon su kaldı?",
    "%n1 adet düşman gemisinden %n2 tanesi imha edildi. Radarda kaç düşman gemisi kaldı?",
    "Gidilecek %n1 ışık yılı yolumuz vardı, %n2 ışık yılını tamamladık. Kalan mesafe ne kadardır?",
    "Kalkan gücü %n1 seviyesindeydi, isabet aldığımız için %n2 birim azaldı. Yeni güç seviyesi nedir?"
  ],
  '*': [
    "Her biri %n2 birim enerji üreten %n1 adet reaktörümüz var. Toplam enerji üretimi nedir?",
    "%n1 adet keşif robotu, her biri %n2 adet örnek topladı. Toplam kaç örnek elde ettik?",
    "Filomuzda %n1 adet gemi var ve her birinde %n2 adet kargo bölmesi bulunuyor. Toplam bölme sayısı kaçtır?",
    "Işık hızının %n2 katına çıkabilen gemimiz, bu hızı %n1 saniye boyunca korursa kaç birim yol alır?"
  ],
  '/': [
    "%n1 adet kristal, %n2 adet gemi arasında eşit paylaştırılacak. Her gemiye kaç kristal düşer?",
    "%n1 birimlik enerji rezervi, %n2 saat boyunca eşit tüketilecek. Saatlik enerji harcaması nedir?",
    "%n1 kişilik mürettebat, %n2 gruba ayrılacaktır. Her grupta kaç kişi bulunur?",
    "%n1 ışık yılı mesafe, gemimizin %n2 birimlik yakıtıyla gidilecek. Birim yakıt başına kaç ışık yılı gidilir?"
  ],
  'taktikler': [
    "Hiper-sıçrama motorları için %n1 birim plazma gerekiyor. Başmühendis bu miktarı %n2 katına çıkarmamız gerektiğini hesapladı. Toplam ne kadar plazma hazırlamalıyız?",
    "Yıldız üssündeki %n1 adet kargo modülünün her birinde %n2 adet nano-robot bulunuyor. Üsteki toplam nano-robot sayısı kaçtır?",
    "Kozmik bir fırtınada geminin ana işlemcisi %n1 birim veri işledi. Eğer fırtına %n2 kat daha şiddetli olsaydı kaç birim veri işlenmesi gerekirdi?",
    "Gezegenler arası ticaret rotasında %n1 adet istasyon var. Her istasyon %n2 birim vergi alıyor. Tüm rota boyunca ödenecek toplam miktar nedir?",
    "Uzay istasyonunun kütleçekim jeneratörü %n1 birim enerjiyle çalışıyor. Verimliliği artırmak için bunu %n2 katına çıkarmalıyız. Yeni enerji seviyesi ne olur?"
  ]
};

/**
 * Verilen sayıları ve işlemi kullanarak uzay temalı bir soru metni oluşturur.
 * 
 * @param n1 İlk sayı
 * @param n2 İkinci sayı
 * @param op İşlem türü (+, -, *, /)
 * @returns Hikayeleştirilmiş soru metni
 */
export function getLoreQuestion(n1: number, n2: number, op: string): string {
  // Operatörü normalize et
  let normalizedOp: string = '+';
  if (op === 'taktikler') {
    normalizedOp = 'taktikler';
  } else if (op === '+' || op === '-' || op === '*' || op === '/') {
    normalizedOp = op;
  } else if (op === 'x') {
    normalizedOp = '*';
  } else if (op === '÷') {
    normalizedOp = '/';
  }
  
  const templates = loreTemplates[normalizedOp] || loreTemplates['+'];
  const randomIndex = Math.floor(Math.random() * templates.length);
  const template = templates[randomIndex];

  return template
    .replace('%n1', n1.toString())
    .replace('%n2', n2.toString());
}
