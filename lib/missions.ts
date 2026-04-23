import { getDifficultyProfile, type StudentSnapshot } from "./commander";

export type MissionMode = "pratik" | "yildirim" | "gorev" | "taktikler";

export interface MissionCard {
  id: string;
  title: string;
  mode: MissionMode;
  route: string;
  focus: string;
  difficulty: string;
  xpReward: number;
  estimatedMinutes: number;
  briefing: string;
  motivation: string;
  accent: "cyan" | "red" | "emerald" | "purple";
  completedAt?: string;
  success?: boolean;
}

export interface DailyMissionPack {
  date: string;
  generatedAt: string;
  title: string;
  commanderNote: string;
  motivationMessage: string;
  missions: MissionCard[];
}

export interface MissionStudentData extends StudentSnapshot {
  username?: string;
  actionPlan?: string;
  learningPath?: string;
}

function buildFallbackMissions(data: MissionStudentData): MissionCard[] {
  const metrics = data.metrics || {};
  const difficulty = getDifficultyProfile(data);

  const focusArea =
    (metrics.addSubScore ?? 100) <= (metrics.mulDivScore ?? 100)
      ? "Toplama ve çıkarma dengesi"
      : "Çarpma ve bölme refleksi";

  const speedFocus = (metrics.speedScore ?? 0) < 60 ? "Refleks hızı" : "Basınçlı karar verme";
  const commanderFocus =
    difficulty.tier === "commander_trial"
      ? "Komutanlık seviyesi karma problem"
      : "Hikayeli kritik görev";

  return [
    {
      id: "focus-drill",
      title: "Sistem Kalibrasyonu",
      mode: "pratik",
      route: "/ogrenci/pratik",
      focus: focusArea,
      difficulty: difficulty.label,
      xpReward: 35,
      estimatedMinutes: 6,
      briefing: `Yapay zeka analizlerine göre gemi işlemcinde ${focusArea.toLowerCase()} alanında bir sapma tespit edildi. Bu görev, çekirdek aritmetik sistemini optimize etmek için tasarlandı. Sakin ve isabetli adımlarla ilerle.`,
      motivation: "Komutanlar önce en zayıf halkayı güçlendirir. Temel aritmetik sağlam değilse, galakside hayatta kalamazsın.",
      accent: "cyan",
    },
    {
      id: "speed-run",
      title: "Işık Hızı Koridoru",
      mode: "yildirim",
      route: "/ogrenci/yildirim",
      focus: speedFocus,
      difficulty: difficulty.tier === "adaptive_recovery" ? "Dengeli hız" : "Yüksek tempo",
      xpReward: 40,
      estimatedMinutes: 4,
      briefing: `Asteroid kuşağındayız! Bu bölümde sadece doğru cevap yetmez, aynı zamanda ışık hızında karar vermelisin. ${speedFocus.toLowerCase()} performansın bugünkü terfi dosyanı doğrudan etkileyecek.`,
      motivation: "Hızlı düşünmek bir yetenek değil, disiplinli bir reflekstir. Ritmini koru ve saniyelere hükmet!",
      accent: "red",
    },
    {
      id: "commander-brief",
      title: "Kritik Sektör Harekatı",
      mode: "gorev",
      route: "/ogrenci/gorev",
      focus: commanderFocus,
      difficulty:
        difficulty.tier === "commander_trial" ? "Komutanlık Sınavı" : "AI Destekli Operasyon",
      xpReward: 55,
      estimatedMinutes: 8,
      briefing: `Komuta merkezi, sana ${commanderFocus.toLowerCase()} içeren çok aşamalı bir senaryo gönderdi. Yakıt seviyeni (XP) artırmak ve rütbeni yükseltmek için bu stratejik operasyonu başarıyla tamamlaman gerekiyor.`,
      motivation: "Gerçek komutanlar kaosun içinde sükunetini koruyanlardır. Sorunu parçala, analiz et ve kararı sen ver. Pilot, kokpit senin!",
      accent: "purple",
    },
  ];
}

export function buildFallbackMissionPack(data: MissionStudentData): DailyMissionPack {
  const today = new Date().toISOString().split("T")[0];
  const name = data.username || "Pilot";
  const difficulty = getDifficultyProfile(data);
  const learningPath = data.learningPath || "Temel operasyon sirasi bekleniyor";

  return {
    date: today,
    generatedAt: new Date().toISOString(),
    title: `${name} Icin Gunluk Gorev Paketi`,
    commanderNote: `Bugunku paket ${difficulty.label.toLowerCase()} duzeyine gore hazirlandi. Onerilen rota: ${learningPath}.`,
    motivationMessage:
      difficulty.tier === "commander_trial"
        ? "Bugun sana kolay zafer verilmedi. Komutanliga yaklasiyorsan bunu kanitlamalisin."
        : "Her gorev kokpite biraz daha yaklastirir. Disiplinli ilerle, sistem seni izliyor.",
    missions: buildFallbackMissions(data),
  };
}
