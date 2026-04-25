'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, Target, ShieldCheck, Sparkles, X, ChevronRight, ChevronLeft, Check, BrainCircuit, Activity } from 'lucide-react';

interface ParentOnboardingProps {
  parentName?: string;
  onComplete: (dontShowAgain: boolean) => void;
  onSkip: (dontShowAgain: boolean) => void;
}

const steps = [
  {
    title: "Görev Gözlem Merkezi",
    description: "ARF Komuta Merkezine hoş geldiniz. Bu panel üzerinden pilotunuzun matematik görevlerindeki performansını anlık telemetri verileriyle takip edebilirsiniz.",
    icon: <Radar className="w-16 h-16 text-cyan-400" />,
    color: "from-cyan-500/20 to-cyan-950/20",
  },
  {
    title: "Bilişsel Analiz Laboratuvarı",
    description: "Sadece doğru cevapları değil; işlem algı hızını, odaklanma kapasitesini ve zihinsel yorulma endeksini ölçüyoruz. Çocuğunuzun çalışma ritmini telemetri verileriyle keşfedin.",
    icon: <BrainCircuit className="w-16 h-16 text-cyan-400" />,
    color: "from-cyan-500/20 to-cyan-950/20",
  },
  {
    title: "Stratejik Performans Verileri",
    description: "Dinamik zorluk seviyeleri, isabet oranları ve işlem bazlı (T/Ç, Ç/B) görev sinyalleri. Pilotun hangi teknik sistemlerde güç kazandığını anlık görün.",
    icon: <Activity className="w-16 h-16 text-cyan-400" />,
    color: "from-cyan-500/20 to-cyan-950/20",
  },
  {
    title: "Komuta Destekli Gelişim Rotası",
    description: "Komuta bilgisayarı, pilotun zorlandığı rotaları izleyerek her hafta kişiselleştirilmiş bir görev planı ve gelişim yolu oluşturur.",
    icon: <Sparkles className="w-16 h-16 text-secondary" />,
    color: "from-red-500/20 to-red-950/20",
  },
  {
    title: "Hedef ve Motivasyon",
    description: "Pilotunuza özel 'Komutan Talimatları' ve XP bonusları göndererek motivasyonunu artırabilir, kazandığı onur nişanlarını inceleyebilirsiniz.",
    icon: <Target className="w-16 h-16 text-secondary" />,
    color: "from-red-500/20 to-red-950/20",
  },
  {
    title: "Güvenli Veri Hattı",
    description: "Tüm performans verileri uçtan uca şifrelenmiş olarak saklanır. Pilotunuzun eğitimi ve gelişimi için her şey hazır. Operasyon başlasın!",
    icon: <ShieldCheck className="w-16 h-16 text-cyan-400" />,
    color: "from-cyan-500/20 to-cyan-950/20",
  },
];

export default function ParentOnboarding({ parentName, onComplete, onSkip }: ParentOnboardingProps) {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const next = () => {
    if (isLast) onComplete(dontShowAgain);
    else setStep(step + 1);
  };
  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`hud-module relative w-full max-w-lg bg-gradient-to-br ${current.color} bg-slate-950/90 shadow-2xl p-8`}
        >
          <button
            onClick={() => onSkip(dontShowAgain)}
            aria-label="Kapat"
            className="absolute top-4 right-4 p-2 rounded-sm text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <motion.div
              key={step}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6"
            >
              {current.icon}
            </motion.div>

            <motion.h2
              key={`t-${step}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl md:text-3xl font-bold text-white mb-3 font-mono"
            >
              {step === 0 && parentName ? `Hoş Geldin, ${parentName}!` : current.title}
            </motion.h2>

            <motion.p
              key={`d-${step}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-slate-300 text-sm md:text-base leading-relaxed mb-8"
            >
              {step === 0 && parentName ? current.description : current.description}
            </motion.p>

            <div className="flex gap-1.5 mb-8">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 transition-all ${
                    i === step ? 'w-8 bg-cyan-400' : i < step ? 'w-1.5 bg-cyan-400/60' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <div
              className="flex items-center gap-2 cursor-pointer group mb-6 select-none"
              onClick={() => setDontShowAgain((value) => !value)}
              role="checkbox"
              aria-checked={dontShowAgain}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setDontShowAgain((value) => !value);
                }
              }}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center transition ${
                  dontShowAgain ? 'bg-cyan-500' : 'bg-slate-800 group-hover:bg-cyan-500/20'
                }`}
              >
                {dontShowAgain && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs text-slate-400 font-mono">Bir daha gösterme</span>
            </div>

            <div className="flex gap-3 w-full">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex-1 flex items-center justify-center gap-2 rounded-sm bg-white/5 hover:bg-white/10 text-white px-4 py-3 text-sm font-mono transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Geri
                </button>
              )}
              <button
                onClick={next}
                className="flex-1 flex items-center justify-center gap-2 rounded-sm bg-primary hover:bg-cyan-300 text-slate-950 px-4 py-3 text-sm font-mono font-bold transition"
              >
                {isLast ? 'Tamam, Başlayalım' : 'Devam'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {!isLast && (
              <button
                onClick={() => onSkip(dontShowAgain)}
                className="mt-3 text-xs text-slate-500 hover:text-slate-300 font-mono transition"
              >
                Tanıtımı atla
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
