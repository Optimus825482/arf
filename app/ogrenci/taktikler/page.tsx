"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { addXpAndBadge } from '@/lib/progress';
import { ChevronLeft, Zap, BrainCircuit, ArrowRight, Star, Info, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { getLoreQuestion } from '@/lib/lore';

// Ses oynatma (Yıldırım modundaki gibi)
const playSound = (type: 'correct' | 'wrong' | 'click' | 'success') => {
  try {
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(() => undefined);
  } catch {
    // Ignore
  }
};

interface Tactic {
  id: string;
  title: string;
  description: string;
  example: string;
  color: string;
  icon: React.ElementType;
  generateQuestion: () => { q: string; a: number; hint: string };
}

const TACTICS: Tactic[] = [
  {
    id: 'tactic-5-carpma',
    title: '5 ile Hızlı Çarpma',
    description: 'Bir sayıyı 5 ile çarpmak yerine, önce 10 ile çarpıp sonra ikiye bölebilirsin.',
    example: '18 x 5 ➔ 18 x 10 = 180 ➔ 180 / 2 = 90',
    color: 'from-emerald-500 to-teal-600',
    icon: Zap,
    generateQuestion: () => {
      const num = Math.floor(Math.random() * 40) + 10;
      const evenNum = num % 2 === 0 ? num : num + 1;
      return { 
        q: `${evenNum} x 5`, 
        a: evenNum * 5, 
        hint: `İpucu: ${evenNum}'in yarısı ${evenNum/2}'dir. Yanına 0 koy!` 
      };
    }
  },
  {
    id: 'tactic-11-carpma',
    title: '11 ile Çarpma',
    description: 'İki basamaklı bir sayıyı 11 ile çarparken, rakamları ayır ve toplamlarını ortaya yaz.',
    example: '25 x 11 ➔ 2 ... (2+5) ... 5 ➔ 275',
    color: 'from-purple-500 to-indigo-600',
    icon: BrainCircuit,
    generateQuestion: () => {
      const d1 = Math.floor(Math.random() * 8) + 1;
      const d2 = Math.floor(Math.random() * (9 - d1)) + 1;
      const num = d1 * 10 + d2;
      return { 
        q: `${num} x 11`, 
        a: num * 11, 
        hint: `İpucu: ${d1} ile ${d2}'yi toplayıp ortasına yaz.` 
      };
    }
  },
  {
    id: 'tactic-5-kare',
    title: 'Sonu 5 ile Biten Sayının Karesi',
    description: 'Sonu 5 olan iki basamaklı bir sayının karesini alırken, onlar basamağındaki rakamı bir fazlasıyla çarp, sonuna 25 ekle.',
    example: '35 x 35 ➔ 3 x 4 = 12 ➔ 1225',
    color: 'from-orange-500 to-red-600',
    icon: Star,
    generateQuestion: () => {
      const tens = Math.floor(Math.random() * 8) + 2;
      const num = tens * 10 + 5;
      return { 
        q: `${num} x ${num}`, 
        a: num * num, 
        hint: `İpucu: ${tens} x ${tens + 1} = ${tens * (tens + 1)} yapar. Sonuna 25 ekle!` 
      };
    }
  },
  {
    id: 'tactic-9-toplama',
    title: '9 ile Hızlı Toplama',
    description: 'Bir sayıya 9 eklemek için, 10 ekleyip 1 çıkarabilirsin.',
    example: '47 + 9 ➔ 47 + 10 = 57 ➔ 57 - 1 = 56',
    color: 'from-blue-500 to-cyan-600',
    icon: ArrowRight,
    generateQuestion: () => {
      const num = Math.floor(Math.random() * 80) + 15;
      return { 
        q: getLoreQuestion(num, 9, 'taktikler'), 
        a: num + 9, 
        hint: `İpucu: ${num} sayısına 10 ekle, sonra 1 çıkar.` 
      };
    }
  }
];

export default function TaktiklerPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeTactic, setActiveTactic] = useState<Tactic | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  
  // Pratik State
  const [question, setQuestion] = useState({ q: '', a: 0, hint: '' });
  const [userAnswer, setUserAnswer] = useState('');
  const [questionsLeft, setQuestionsLeft] = useState(5);
  const [showHint, setShowHint] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (practiceMode && activeTactic) {
      nextQuestion(activeTactic);
    }
  }, [practiceMode, activeTactic]);

  // Focus input when question changes
  useEffect(() => {
    if (practiceMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [question, practiceMode]);

  const startPractice = (tactic: Tactic) => {
    playSound('click');
    setActiveTactic(tactic);
    setQuestionsLeft(5);
    setPracticeMode(true);
  };

  const nextQuestion = (tactic: Tactic) => {
    setQuestion(tactic.generateQuestion());
    setUserAnswer('');
    setShowHint(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer) return;

    if (parseInt(userAnswer) === question.a) {
      playSound('correct');
      if (questionsLeft <= 1) {
        // Taktik testi bitti
        finishPractice();
      } else {
        setQuestionsLeft(l => l - 1);
        nextQuestion(activeTactic!);
      }
    } else {
      playSound('wrong');
      toast.error('Yanlış cevap, tekrar dene!');
      setUserAnswer('');
      inputRef.current?.focus();
    }
  };

  const finishPractice = async () => {
    playSound('success');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#f59e0b']
    });
    
    toast.success('Harika! Bu taktiği başarıyla uyguladın. +50 XP kazandın!');
    
    if (user?.uid) {
      await addXpAndBadge(user.uid, 50, null, 'taktikler', true);
    }
    
    setPracticeMode(false);
    setActiveTactic(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 p-4 md:p-8">
      {/* Background elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] mix-blend-screen"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex items-center mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-xl">
          <button 
            onClick={() => { playSound('click'); router.push('/ogrenci'); }}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="ml-4">
            <h1 className="text-2xl font-mono font-bold uppercase tracking-widest text-emerald-400">
              Taktik Merkezi
            </h1>
            <p className="text-sm font-mono text-slate-500">Zihinden hızlı hesaplama yollarını öğren</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!practiceMode ? (
            <motion.div 
              key="tactics-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {TACTICS.map((tactic) => (
                <div key={tactic.id} className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tactic.color} opacity-10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity`}></div>
                  
                  <div className="flex items-start gap-4 mb-4 relative z-10">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tactic.color} flex items-center justify-center shadow-lg`}>
                      <tactic.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">{tactic.title}</h2>
                      <p className="text-sm text-slate-400 leading-relaxed">{tactic.description}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-xl p-4 mb-6 border border-slate-700/50 relative z-10">
                    <div className="text-xs font-mono text-slate-500 mb-1 uppercase tracking-wider">Örnek</div>
                    <div className="font-mono text-emerald-400">{tactic.example}</div>
                  </div>

                  <button 
                    onClick={() => startPractice(tactic)}
                    className={`w-full py-3 rounded-xl bg-gradient-to-r ${tactic.color} text-white font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95`}
                  >
                    <Play className="w-4 h-4" /> Öğren & Dene
                  </button>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="practice-mode"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${activeTactic?.color} opacity-5`}></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      {activeTactic && <activeTactic.icon className="w-6 h-6 text-emerald-400" />}
                      {activeTactic?.title}
                    </h2>
                    <div className="hud-badge">
                      Kalan Soru: <span className="text-emerald-400">{questionsLeft}</span>
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <div className="text-5xl md:text-6xl font-mono font-bold text-white drop-shadow-lg tracking-wider bg-slate-900/50 py-8 rounded-2xl border border-slate-700/50">
                      {question.q} = ?
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="mb-6">
                    <input
                      ref={inputRef}
                      type="number"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-full text-center text-4xl font-mono bg-slate-900 border-2 border-slate-700 text-white rounded-2xl py-4 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Cevap"
                      autoFocus
                    />
                  </form>

                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => {
                        playSound('click');
                        setPracticeMode(false);
                      }}
                      className="text-slate-400 hover:text-white px-4 py-2 transition-colors font-mono text-sm uppercase"
                    >
                      Pes Et
                    </button>
                    
                    <button
                      onClick={() => setShowHint(true)}
                      className={`flex items-center gap-2 text-sm font-mono px-4 py-2 rounded-lg border transition-all ${
                        showHint 
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-500/30'
                      }`}
                    >
                      <Info className="w-4 h-4" /> 
                      {showHint ? question.hint : 'İpucu Göster'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
