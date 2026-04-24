/**
 * ARF Akademik Pedagojik Bilgi Deposu (RAG - 2025 Guncellemesi)
 * Bu dosya, Stanford, NYU ve CLT arastirmalarina dayali bilimsel verileri icerir.
 */

export const PEDAGOGICAL_BASE = {
  scientificFoundations: {
    cognitiveLoadTheory: {
      source: "Mao et al. (2024)",
      principle: "Segmentation & Chunking",
      insight: "Bilginin segmentlere ayrilmasi bilissel yuku %28 azaltir, kaliciligi %34 artirir.",
      application: "Gorevleri 15 dakikalik mikro-modullere bol."
    },
    visualMathematics: {
      source: "Jo Boaler (Stanford)",
      principle: "Multimodal Brain Activation",
      insight: "Matematiksel dusunme sirasinda beynin 5 farkli agi (2'si gorsel) aktiflesir.",
      application: "Sayilari gorsel modellerle (Number Visuals) destekle."
    },
    growthMindset: {
      source: "NYU Research (2024)",
      principle: "Error Normalization",
      insight: "Hata yapildiginda beyinde yeni sinapslar olusur. Hata, ogrenmenin en verimli anidir.",
      application: "Yanlis cevaplarda 'Sistem gelisiyor, sinapslar yenileniyor' mesajini kullan."
    }
  },
  persona: {
    name: "ARF Rehberlik Sistemi",
    role: "Bilissel Telemetri Uzmani ve Pedagog",
    tone: "Bilimsel, empatik, buyume zihniyeti (growth mindset) odakli",
    voice: "Bir komutandan ziyade, pilotun potansiyelini aciga cikaran bir mentor."
  },
  interventions: {
    fatigue: {
      trigger: "FatigueRatio > 1.15",
      action: "Bilissel asiri yuklenme tespiti. Sistemi 'Sogutma Modu'na al ve su icmesini/derin nefes almasini oner."
    },
    switchingCost: {
      trigger: "PerceptionScore < 60",
      action: "Islem gecislerinde duraksama. Singapur Matematigi 'Bar Modelleme' teknigini hatirlat."
    },
    anxiety: {
      trigger: "SpeedScore drop with HighAccuracy",
      action: "Mukemmelliyetci kaygi tespiti. 'Hata yapmak beyin icin yakittir' hatırlatması yap."
    }
  },
  methods: {
    singaporeMath: "CPA (Concrete-Pictorial-Abstract) dongusuyle kavramsal derinlik sagla.",
    trachtenberg: "Zihinsel aritmetik icin 11, 5 ve 9 ile carpma kisayollarini ogret.",
    growthQuotes: [
      "Hata yaptiginda beynin buyuyor pilot!",
      "Hizin degil, derinligin onemli. Bir matematikci gibi dusunuyorsun.",
      "Telemetri verilerin harika bir gelisim trendi gosteriyor."
    ]
  }
};
