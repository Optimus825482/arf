export interface StudentSnapshot {
  level?: number;
  xp?: number;
  dailyTasks?: {
    count?: number;
    xp?: number;
  };
  metrics?: {
    accuracy?: number;
    speedScore?: number;
    addSubScore?: number;
    mulDivScore?: number;
    mentalMathScore?: number;
  };
}

export interface DifficultyProfile {
  tier: "adaptive_recovery" | "steady_flight" | "advanced_ops" | "commander_trial";
  label: string;
  description: string;
  intensity: number;
  addSubIntensity: number; // Toplama-Çıkarma için 1-10 arası zorluk
  mulDivIntensity: number; // Çarpma-Bölme için 1-10 arası zorluk
}

export interface CommanderProgress {
  title: string;
  progress: number;
  eligible: boolean;
  nextStep: string;
  checks: Array<{ label: string; passed: boolean; value: string }>;
}

export function getDifficultyProfile(data?: StudentSnapshot): DifficultyProfile {
  const metrics = data?.metrics || {};
  const level = data?.level || 1;
  const accuracy = metrics.accuracy ?? 0;
  const speed = metrics.speedScore ?? 0;
  const mental = metrics.mentalMathScore ?? 0;
  
  const addSubScore = metrics.addSubScore ?? 50;
  const mulDivScore = metrics.mulDivScore ?? 50;

  const combined = Math.round(accuracy * 0.45 + speed * 0.35 + mental * 0.2);

  // İşlem bazlı granüler zorluk hesaplama (1-10 arası)
  // Skor düşükse zorluk düşük, skor yüksekse zorluk yüksek başlar
  const addSubIntensity = Math.min(10, Math.max(1, Math.floor(addSubScore / 10) + (level > 5 ? 1 : 0)));
  const mulDivIntensity = Math.min(10, Math.max(1, Math.floor(mulDivScore / 10) + (level > 7 ? 1 : 0)));

  if (level >= 10 && combined >= 85 && speed >= 80) {
    return {
      tier: "commander_trial",
      label: "Komutanlık Sınavı",
      description: "Kısa süreli, yüksek baskılı ve karışık operasyonlar açılır.",
      intensity: 4,
      addSubIntensity,
      mulDivIntensity,
    };
  }

  if (level >= 6 && combined >= 72) {
    return {
      tier: "advanced_ops",
      label: "İleri Operasyon",
      description: "Daha büyük sayılar, karmaşık adımlar ve daha az hata toleransı.",
      intensity: 3,
      addSubIntensity,
      mulDivIntensity,
    };
  }

  if (combined >= 50) {
    return {
      tier: "steady_flight",
      label: "Dengeli Uçuş",
      description: "Zorluk düzeyi ilerlemene göre kademeli artar.",
      intensity: 2,
      addSubIntensity,
      mulDivIntensity,
    };
  }

  return {
    tier: "adaptive_recovery",
    label: "Destekli Toparlanma",
    description: "Sistem önce zayıf alanı güçlendirir, sonra hızı yükseltir.",
    intensity: 1,
    addSubIntensity,
    mulDivIntensity,
  };
}

export function getCommanderProgress(data?: StudentSnapshot): CommanderProgress {
  const metrics = data?.metrics || {};
  const level = data?.level || 1;
  const xp = data?.xp || 0;
  const dailyCount = data?.dailyTasks?.count || 0;
  const accuracy = metrics.accuracy ?? 0;
  const speed = metrics.speedScore ?? 0;
  const mental = metrics.mentalMathScore ?? 0;

  const checks = [
    { label: "Rütbe", passed: level >= 10, value: `Sv. ${level}/10` },
    { label: "Doğruluk", passed: accuracy >= 85, value: `%${accuracy}` },
    { label: "İşlem hızı", passed: speed >= 80, value: `${speed}/100` },
    { label: "Zihinden refleks", passed: mental >= 75, value: `${mental}/100` },
    { label: "Günlük disiplin", passed: dailyCount >= 3, value: `${dailyCount}/3 görev` },
    { label: "Tecrübe", passed: xp >= 1000, value: `${xp}/1000 XP` },
  ];

  const passedCount = checks.filter((item) => item.passed).length;
  const progress = Math.round((passedCount / checks.length) * 100);
  const eligible = passedCount === checks.length;

  let nextStep = "Tum yeterlilikler tamamlandi. Komutanlik denemesi acilabilir.";
  const firstMissing = checks.find((item) => !item.passed);
  if (firstMissing) {
    nextStep = `${firstMissing.label} esigini gecmeden komutanlik verilmez.`;
  }

  return {
    title: eligible ? "Komutanliga Hazir" : "Komutanlik Adayligi",
    progress,
    eligible,
    nextStep,
    checks,
  };
}
