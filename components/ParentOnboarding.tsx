'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, BarChart3, Target, ShieldCheck, Sparkles, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface ParentOnboardingProps {
  parentName?: string;
  onComplete: (dontShowAgain: boolean) => void;
  onSkip: () => void;
}

const steps = [
  {
    title: "Görev Gözlemcisi Paneline Hoş Geldin!",
    description: "Selam Komutan! Bu panel, çocuğunuzun ARF uzay görevlerindeki ilerlemesini canlı olarak takip edebileceğin komuta merkezidir.",
    icon: <Radar className="w-16 h-16 text-cyan-400" />,
    color: "from-cyan-500/20 to-blue-500/20",
  },
  {
    title: "Performans Göstergeleri",
    description: "Toplama/çıkarma, çarpma/bölme, hız ve doğruluk metriklerini kart ve grafiklerde görebilirsin. Hangi alanda güçlü, hangisinde desteğe ihtiyacı var — hepsi burada.",
    icon: <BarChart3 className="w-16 h-16 text-emerald-400" />,
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    title: "AI Destekli Brifing",
    description: "Yapay zeka, çocuğunuzun son performansına göre sana özel aksiyon planı ve öğrenme yolu hazırlar. Evde birlikte hangi konuya odaklanmanız gerektiğini söyler.",
    icon: <Sparkles className="w-16 h-16 text-purple-400" />,
    color: "from-purple-500/20 to-indigo-500/20",
  },
  {
    title: "Hedefler ve Rütbeler",
    description: "Çocuğunuzun kazandığı madalyaları, günlük görevlerini ve rütbe ilerlemesini görebilirsin. Başarıları birlikte kutlayın!",
    icon: <Target className="w-16 h-16 text-yellow-400" />,
    color: "from-yellow-500/20 to-orange-500/20",
  },
  {
    title: "Güvenlik ve Gizlilik",
    description: "Tüm veriler güvenli sunucularımızda saklanır. Sadece sizin hesabınıza bağlı pilotlar görüntülenir. Her şey hazır — görevler başlasın!",
    icon: <ShieldCheck className="w-16 h-16 text-sky-400" />,
    color: "from-sky-500/20 to-cyan-500/20",
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
          className={`relative w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br ${current.color} bg-slate-950/90 backdrop-blur-xl shadow-2xl p-8`}
        >
          <button
            onClick={onSkip}
            aria-label="Kapat"
            className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
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
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-8 bg-cyan-400' : i < step ? 'w-1.5 bg-cyan-400/60' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            {isLast && (
              <div
                className="flex items-center gap-2 cursor-pointer group mb-6 select-none"
                onClick={() => setDontShowAgain(!dontShowAgain)}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                    dontShowAgain ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 group-hover:border-cyan-500'
                  }`}
                >
                  {dontShowAgain && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs text-slate-400 font-mono">Bir daha gösterme</span>
              </div>
            )}

            <div className="flex gap-3 w-full">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-4 py-3 text-sm font-mono transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Geri
                </button>
              )}
              <button
                onClick={next}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-3 text-sm font-mono font-bold transition"
              >
                {isLast ? 'Tamam, Başlayalım' : 'Devam'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {!isLast && (
              <button
                onClick={onSkip}
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
