/* eslint-disable */
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Satellite, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/audio';
import { getRankName } from '@/lib/ranks';
import { toast } from 'sonner';
import { authFetch } from '@/lib/apiClient';
import { useAuth } from '@/components/AuthProvider';
import AppLoader from '@/components/AppLoader';

export default function SabitKalibrasyon() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<{q:string, a:number, type:string}[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{type:string, correct:boolean, time:number}[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Akıllı Soru Sekansı: Her grup farklı bir bilişsel metriği ölçer
    const initialQuestions = [
      // GRUP 1: Baz Hız ve Isınma (Motor Reflex)
      { q: "4 + 3", a: 7, type: '+' },
      { q: "10 - 4", a: 6, type: '-' },
      { q: "5 + 5", a: 10, type: '+' },
      
      // GRUP 2: İşlem Algılama ve Geçiş Hızı (Switching Cost)
      // Burada aniden işlem tipi değiştirilerek beynin uyum hızı ölçülür
      { q: "3 x 4", a: 12, type: 'x' },
      { q: "15 + 6", a: 21, type: '+' },
      { q: "20 ÷ 5", a: 4, type: '÷' },
      { q: "18 - 9", a: 9, type: '-' },
      
      // GRUP 3: Çarpım Tablosu ve Otomatizasyon (Fluency)
      { q: "6 x 7", a: 42, type: 'x' },
      { q: "8 x 4", a: 32, type: 'x' },
      { q: "54 ÷ 6", a: 9, type: '÷' },
      
      // GRUP 4: Bilişsel Yük ve Stres Altında Karar (Stress Test)
      // Sayılar büyütülerek işlem hızı düşüşü ölçülür
      { q: "24 + 37", a: 61, type: '+' },
      { q: "100 - 45", a: 55, type: '-' },
      { q: "12 x 5", a: 60, type: 'x' },
      
      // GRUP 5: Zihinden Hızlı Karar (Mental Math Refleks)
      { q: "9 x 9", a: 81, type: 'mm' },
      { q: "72 ÷ 8", a: 9, type: 'mm' },
      { q: "13 + 14", a: 27, type: 'mm' },
      
      // GRUP 6: Konsantrasyon ve Dayanıklılık (Endurance)
      // Test sonunda karma ve dikkat gerektiren sorular
      { q: "150 - 25", a: 125, type: '-' },
      { q: "7 x 11", a: 77, type: 'x' },
      { q: "64 ÷ 4", a: 16, type: '÷' }
    ];
    setQuestions(initialQuestions);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer) return;

    const isCorrect = parseInt(answer) === questions[currentQuestion].a;
    const timeTaken = Date.now() - (startTime || Date.now());

    if (isCorrect) playSound('correct');
    else playSound('click');

    const newResults = [...results, {
      type: questions[currentQuestion].type,
      correct: isCorrect,
      time: timeTaken
    }];
    
    setResults(newResults);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(c => c + 1);
      setAnswer('');
      setStartTime(Date.now());
    } else {
      finishCalibration(newResults);
    }
  };

  const [metrics, setMetrics] = useState<any>(null);
  const [actionPlan, setActionPlan] = useState('');
  const [learningPath, setLearningPath] = useState('');

  const finishCalibration = async (finalResults: any[]) => {
    if (!user) return;
    setLoading(true);

    let addSubC = 0, addSubT = 0, mulDivC = 0, mulDivT = 0, timeT = 0;
    
    finalResults.forEach((r: any) => {
       timeT += r.time;
       if (r.type === '+' || r.type === '-') { addSubT++; if (r.correct) addSubC++; }
       if (r.type === 'x' || r.type === '÷') { mulDivT++; if (r.correct) mulDivC++; }
    });
    
    const addSubScore = addSubT ? Math.round((addSubC / addSubT) * 100) : 0;
    const mulDivScore = mulDivT ? Math.round((mulDivC / mulDivT) * 100) : 0;
    const accuracy = Math.round(((addSubC + mulDivC) / finalResults.length) * 100);
    const avgTimeMs = timeT / finalResults.length;
    
    let speedScore = Math.round(100 - ((avgTimeMs - 2000) / 100)); 
    if (speedScore > 100) speedScore = 100;
    if (speedScore < 0) speedScore = 0;

    const calculatedMetrics = { accuracy, speedScore, addSubScore, mulDivScore };
    
    try {
      const res = await authFetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'placement', results: finalResults, uid: user.uid })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionPlan(data.actionPlan);
        setLearningPath(data.learningPath);
        if (data.aiError) {
          toast.warning('AI analizi şu an ulaşılamıyor; temel seviye tespiti uygulandı.');
        }
        setMetrics(calculatedMetrics);
        playSound('levelUp');
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#06b6d4', '#a855f7'] });
      } else {
        toast.error(data.error || 'Seviye kaydedilemedi. Lütfen tekrar deneyin.');
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Placement error:", e);
      }
      toast.error('Bağlantı hatası. Sonuçlar kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  if (metrics) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4 relative z-10 w-full animate-in fade-in duration-700">
        <div className="glass-panel max-w-md w-full p-10 text-center space-y-6 border-t-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          <div>
            <h1 className="text-3xl font-mono font-bold text-white uppercase tracking-wider mb-1">ANALİZ TAMAMLANDI</h1>
            <p className="text-yellow-400 font-mono text-xl font-bold tracking-widest">{getRankName(metrics.accuracy >= 80 ? 3 : (metrics.accuracy >= 50 ? 2 : 1))}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Hız Puanı</span>
              <span className="text-2xl font-mono font-bold text-cyan-400">{metrics.speedScore}</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Doğruluk</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">%{metrics.accuracy}</span>
            </div>
          </div>

          {(actionPlan || learningPath) && (
            <div className="text-left space-y-4 py-2 border-y border-white/5">
              {actionPlan && (
                <div>
                  <h3 className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest mb-1">STRATEJİK PLAN</h3>
                  <p className="text-xs text-slate-300 font-mono italic leading-relaxed">"{actionPlan}"</p>
                </div>
              )}
              {learningPath && (
                <div>
                  <h3 className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest mb-1">GELİŞİM ROTASI</h3>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed">{learningPath}</p>
                </div>
              )}
            </div>
          )}

          <p className="text-slate-400 font-mono text-[10px] leading-relaxed italic opacity-70">
            "Sistem artık seni tanıyor pilot. Rütbene uygun görevler kokpitine iletildi."
          </p>

          <button 
            onClick={() => { playSound('click'); router.replace('/ogrenci'); }}
            className="w-full neon-btn-blue py-5 tracking-widest font-bold text-lg"
          >
            ANA ÜSSE GİRİŞ YAP
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4 relative z-10 w-full">
         <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="glass-panel max-w-lg w-full p-10 text-center space-y-6">
            <h1 className="text-3xl font-mono font-bold uppercase tracking-wide text-cyan-400">ARF Sistem Kalibrasyonu</h1>
            <p className="text-slate-300 font-mono text-sm leading-relaxed">
              ARF Uzay Gemisine hoş geldin! Türk Uzay Kuvvetleri standartlarına girmek üzeresin. Ana bilgisayarın seni tanıması ve sana uygun görev programını oluşturması için bir sistem testinden geçmen gerekiyor.
            </p>
            <button onClick={() => { playSound('click'); setStarted(true); setStartTime(Date.now()); }} className="neon-btn-cyan w-full py-4 tracking-widest font-mono font-bold">
              KONTROLLERİ BAŞLAT
            </button>
         </motion.div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  if (loading) {
    return (
      <AppLoader
        variant="fullscreen"
        accent="amber"
        title="Telemetri analiz ediliyor"
        subtitle="Rutbe ve gorev profili hesaplanıyor"
        messages={[
          'Kalibrasyon sonuclari isleniyor...',
          'Matematik refleksleri olculuyor...',
          'Pilot sinifi ataniyor...',
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 relative z-10 w-full">
      <div className="absolute top-8 w-full max-w-md px-4">
        <div className="flex items-center justify-between hud-badge text-slate-500 mb-2">
           <span className="flex items-center gap-2"><Rocket className="w-4 h-4 text-cyan-500"/> SİSTEM KALİBRASYONU</span>
           <span className="text-cyan-400 font-mono">SEKANS {currentQuestion + 1} / {questions.length}</span>
        </div>
        <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden border border-white/5">
           <div className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full transition-all duration-300" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}></div>
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentQuestion}
          initial={{ scale: 0.8, opacity: 0, x: 20 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0.9, opacity: 0, x: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="glass-panel p-10 md:p-14 rounded-3xl max-w-md w-full text-center border-t-2 border-t-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.1)] relative overflow-hidden"
        >
          <div className="absolute top-4 left-4 flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Motor Kod: {questions[currentQuestion].type === '+' || questions[currentQuestion].type === '-' ? 'ALFA' : 'BETA'}</span>
          </div>

          <h1 className="text-7xl font-bold mt-4 mb-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-widest font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            {questions[currentQuestion].q}
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <input 
              autoFocus
              type="number" 
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              className="w-full text-center bg-slate-900/80 border-2 border-cyan-500/30 rounded-2xl py-6 text-5xl font-black font-mono focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] text-white transition-all placeholder:text-slate-700"
              placeholder="ROTA GİR"
            />
            <button type="submit" className="w-full neon-btn-blue py-5 text-xl tracking-widest">
              ONAYLA VE ATEŞLE
            </button>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
