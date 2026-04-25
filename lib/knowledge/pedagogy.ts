/**
 * ARF Learning Strategy Knowledge Base (2025 Edition)
 * Bu doküman matematik öğrenme araştırmalarından türetilmiş oyun içi rota kuralları için referans kaynağıdır.
 * Çıktılar resmi mesleki görüş değil, ARF evrenine uygun destekleyici komuta sinyalleridir.
 */

export const PEDAGOGICAL_BASE = {
  scientificFrameworks: {
    neuroplasticity: {
      core_principle: "Synaptic Growth via Error",
      insight: "Hata yapıldığında beynin ventral ve dorsal ağları eşzamanlı aktifleşir. Bu, öğrenmenin en yoğun olduğu andır.",
      ai_action: "Hataları 'Nöral Bağlantı Kuruluyor' olarak kutla."
    },
    spatialTemporalReasoning: {
      method: "Spatial-Temporal (ST) Math",
      application: "Kavramları önce görsel/uzamsal modellerle (simülasyonlar) sun, sonra sembolik (sayısal) forma geç.",
      ai_action: "Zorlanma anında formül yerine 'Zihninde bu gemiyi parçalara ayır' görselleştirmesini öner."
    },
    cognitiveLoadManagement: {
      principle: "Intrinsic vs Extraneous Load",
      threshold: "FatigueRatio > 1.15",
      ai_action: "Bilişsel yükü %28 azaltmak için görevi 'mikro-görevlere' (chunking) böl."
    }
  },
  affectiveMetacognition: {
    anxiety_management: {
      detection: "Speed drop + High Accuracy (Perfectionist Anxiety)",
      intervention: "Hız yerine derinliğe odaklanmasını söyle. 'Bir matematikçi gibi düşünüyorsun, yavaş olman derinliğinden geliyor' de."
    },
    frustration_loop: {
      detection: "Consecutive errors + Immediate responses (Impulsive Frustration)",
      intervention: "Sistemi 30 saniye 'Kalibrasyon Modu'na al. Derin nefes egzersizi ve su içme önerisi sun."
    }
  },
  instructionalStrategies: {
    scaffolding: [
      "Sokratik Sorgulama: Cevabı verme, doğru cevaba giden ilk adımı sor.",
      "CPA Döngüsü: Concrete (Somut) -> Pictorial (Görsel) -> Abstract (Soyut).",
      "Productive Struggle: Öğrenci pes etmeden önce 3 farklı ipucu seviyesi (Hafif, Orta, Yönlendirici) sun."
    ],
    growthMindsetQuotes: [
      "Hata yapmak, beyninin antrenman yapmasıdır pilot!",
      "Hız değil, strateji seni General yapacak.",
      "Zihnindeki bu fırtına, yeni nöral yollar açıyor."
    ]
  },
  rag_index: {
    math_mastery: "Trachtenberg, Singapore Math, Kumon Adaptive Logic",
    learning_sources: "Jo Boaler (Stanford), John Sweller (Cognitive Load Theory), Piaget (CPA)"
  }
};
