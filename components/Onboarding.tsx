'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Play, BrainCircuit, Flag, Award, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { playSound } from '@/lib/audio';

interface OnboardingProps {
  onComplete: (dontShowAgain: boolean) => void;
  onSkip: () => void;
}

const steps = [
  {
    title: "ARF Komuta Merkezine Hoş Geldin!",
    description: "Tebrikler Pilot! Türk Uzay Kuvvetleri'nin en gelişmiş eğitim gemisi ARF'e seçildin. Galaktik bir matematik macerasına hazır mısın?",
    icon: <Rocket className="w-16 h-16 text-cyan-400" />,
    color: "from-cyan-500/20 to-blue-500/20"
  },
  {
    title: "Saha Eğitimi",
    description: "Hız ve doğruluk her şeydir! Saha Eğitimi'nde matematik yeteneklerini keskinleştir, her doğru cevapta uzayda daha hızlı ilerle.",
    icon: <Play className="w-16 h-16 text-cyan-400" />,
    color: "from-cyan-500/20 to-blue-500/20"
  },
  {
    title: "Yapay Zeka Görevleri",
    description: "Komuta bilgisayarı sana özel hikayeli görevler hazırlar. Bu görevleri tamamlayarak hem XP kazan hem de geminin sistemlerini onar.",
    icon: <BrainCircuit className="w-16 h-16 text-purple-400" />,
    color: "from-purple-500/20 to-indigo-500/20"
  },
  {
    title: "Günlük Hedefler ve Rütbe",
    description: "Günlük hedeflerini tamamlayarak ekstra ödüller kazan. XP topladıkça rütben yükselecek ve yeni sistemlerin kilidini açacaksın.",
    icon: <Flag className="w-16 h-16 text-emerald-400" />,
    color: "from-emerald-500/20 to-teal-500/20"
  },
  {
    title: "Madalya Odası",
    description: "Başarılarınla gurur duy! Kazandığın madalyaları Madalya Odası'nda sergileyebilir ve ilerlemeni takip edebilirsin.",
    icon: <Award className="w-16 h-16 text-yellow-400" />,
    color: "from-yellow-500/20 to-orange-500/20"
  }
];

export default function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const nextStep = () => {
    playSound('click');
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(dontShowAgain);
    }
  };

  const prevStep = () => {
    playSound('click');
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg glass-panel overflow-hidden rounded-3xl border-t-2 border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        <button 
          onClick={onSkip}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className={`p-8 md:p-12 text-center bg-gradient-to-br ${steps[currentStep].color} transition-colors duration-500`}
          >
            <div className="flex justify-center mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              {steps[currentStep].icon}
            </div>
            
            <h2 className="text-2xl md:text-3xl font-mono font-bold text-white mb-4 uppercase tracking-wider">
              {steps[currentStep].title}
            </h2>
            
            <p className="text-slate-300 font-mono text-sm md:text-base leading-relaxed mb-8">
              {steps[currentStep].description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="p-6 bg-slate-900/50 border-t border-white/5 space-y-6">
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700'}`} 
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setDontShowAgain(!dontShowAgain)}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${dontShowAgain ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 group-hover:border-cyan-500'}`}>
                {dontShowAgain && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 group-hover:text-cyan-400 transition">Bir daha gösterme</span>
            </div>

            <div className="flex gap-4">
              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className="p-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              
              <button 
                onClick={nextStep}
                className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)] transition flex items-center gap-2"
              >
                {currentStep === steps.length - 1 ? 'BAŞLA' : 'SIRADAKİ'}
                {currentStep !== steps.length - 1 && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
