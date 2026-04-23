"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Zap, Heart, ShieldAlert, Trophy, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { playSound } from '@/lib/audio';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { getStudentMetrics, addXpAndBadge } from '@/lib/progress';
import HelpButton from '@/components/HelpButton';
import { completeMission } from '@/lib/missionProgress';
import { getLoreQuestion } from '@/lib/lore';
import { authFetch } from '@/lib/apiClient';
import type { StudentMetrics } from '@/lib/types';
import type { MissionCard } from '@/lib/missions';
import AppLoader from '@/components/AppLoader';

function YildirimModuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const missionId = searchParams.get('mission');
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(5); // 5 seconds per question
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  
  const [question, setQuestion] = useState({ q: '', options: [] as number[], a: 0, category: '' });
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [missionSaved, setMissionSaved] = useState(false);
  const [missionReward, setMissionReward] = useState<{ bonusXp: number; allCompleted: boolean } | null>(null);
  const [nextMission, setNextMission] = useState<Pick<MissionCard, 'id' | 'route'> | null>(null);
  const [finalXpData, setFinalXpData] = useState<{currentXp: number, level: number, earnedXp: number} | null>(null);
  
  // Batch collection for Firebase
  const [pendingResults, setPendingResults] = useState<Array<{category: string; correct: boolean}>>([]); 

  useEffect(() => {
    if (!user || !missionId) return;
    const fetchNextMission = async () => {
      try {
        const res = await authFetch('/api/missions');
        const data = await res.json();
        if (res.ok && data.missions) {
          const currentIndex = data.missions.findIndex((m: MissionCard) => m.id === missionId);
          if (currentIndex !== -1 && currentIndex < data.missions.length - 1) {
            setNextMission(data.missions[currentIndex + 1]);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Next mission check failed", e);
        }
      }
    };
    fetchNextMission();
  }, [user, missionId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }

    const loadData = async () => {
      const data = await getStudentMetrics(user.uid);
      setMetrics(data);
      setInitialLoading(false);
    };
    loadData();
  }, [user, authLoading, router]);

  const generateQuestion = useCallback(() => {
    const m = metrics || { addSubScore: 50, mulDivScore: 50, speedScore: 50, level: 1 };
    
    const lvl = m.level || 1;
    const addSubWeight = Math.max(10, 100 - (m.addSubScore || 50) + (lvl * 2)); 
    const mulDivWeight = Math.max(10, 100 - (m.mulDivScore || 50) + (lvl * 5));
    const mixedWeight = lvl > 3 ? (lvl * 10) : 0;
    
    const totalW = addSubWeight + mulDivWeight + mixedWeight;
    const r = Math.random() * totalW;
    
    let op: string = '', n1: number = 0, n2: number = 0, a: number = 0, category: string = '';

    if (r < addSubWeight) {
      category = '+';
      op = Math.random() < 0.5 ? '+' : '-';
      const maxNum = Math.min(500, Math.floor(10 + (lvl * 10) + ((m.addSubScore || 50) / 3)));
      n1 = Math.floor(Math.random() * maxNum) + 1;
      n2 = Math.floor(Math.random() * maxNum) + 1;
      if (op === '-' && n2 > n1) [n1, n2] = [n2, n1];
    } else if (r < addSubWeight + mulDivWeight) {
      category = 'x';
      op = Math.random() < 0.5 ? 'x' : '÷';
      const maxMult = Math.min(20, Math.floor(5 + (lvl / 2) + ((m.mulDivScore || 50) / 15)));
      n1 = Math.floor(Math.random() * maxMult) + 1;
      n2 = Math.floor(Math.random() * maxMult) + 1;
      if (op === '÷') n1 = n2 * (Math.floor(Math.random() * maxMult) + 1);
    } else {
      category = 'mixed';
      const type = Math.floor(Math.random() * 2);
      if (type === 0) {
        const n1_m = Math.floor(Math.random() * 5) + 1;
        const n2_m = Math.floor(Math.random() * 5) + 1;
        const n3_m = Math.floor(Math.random() * 3) + 2;
        op = `(${n1_m} + ${n2_m}) x ${n3_m}`;
        a = (n1_m + n2_m) * n3_m;
      } else {
        const n1_m = Math.floor(Math.random() * 5) + 2;
        const n2_m = Math.floor(Math.random() * 5) + 2;
        const n3_m = Math.floor(Math.random() * 10) + 1;
        op = `(${n1_m} x ${n2_m}) - ${n3_m}`;
        a = (n1_m * n2_m) - n3_m;
      }
    }

    if (!category.includes('mixed')) {
      if (op === '+') a = n1 + n2;
      if (op === '-') { a = n1 - n2; category = '-'; }
      if (op === 'x') a = n1 * n2;
      if (op === '÷') { a = n1 / n2; category = '÷'; }
    }

    const options = new Set<number>();
    options.add(a);
    const optionCount = Math.min(4, 3 + Math.floor(lvl / 10)); // Keep options lower for speed
    
    while(options.size < optionCount) {
       const spread = Math.max(5, Math.floor(a / 5));
       const offset = Math.floor(Math.random() * spread * 2) - spread;
       if (offset !== 0) options.add(a + offset);
    }
    const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

    let displayQuestion = '';
    if (category === 'mixed') {
      displayQuestion = op;
    } else {
      // Lore metnini oluştur
      displayQuestion = getLoreQuestion(n1, n2, op);
    }

    setQuestion({ q: displayQuestion, options: shuffledOptions, a, category });
  }, [metrics]);

  const endGame = useCallback(async () => {
    playSound('incorrect');
    setGameState('end');
    setSaving(true);
    
    if (user) {
      for (const result of pendingResults) {
        await addXpAndBadge(user.uid, 0, null, result.category, result.correct);
      }

      // 10 XP per score point
      const xpEarned = score * 10;
      let badge = null;
      if (score >= 50) badge = { id: 'yildirim_tanrisi', name: 'Yıldırım Tanrısı' };
      else if (score >= 30) badge = { id: 'firtina_getiren', name: 'Fırtına Getiren' };
      else if (score >= 15) badge = { id: 'seri_kivilcim', name: 'Seri Kıvılcım' };

      const xpResult = await addXpAndBadge(user.uid, xpEarned, badge, 'speed_run', true);

      let totalEarned = xpEarned;

      if (missionId && !missionSaved) {
        const missionData = await completeMission(missionId, {
          mode: 'yildirim',
          score,
          xpEarned,
          success: score >= 5,
        });
        const bonus = missionData.missionBonusXp || 0;
        totalEarned += bonus;
        setMissionReward({
          bonusXp: bonus,
          allCompleted: !!missionData.allCompleted,
        });
        setMissionSaved(true);
      }

      setFinalXpData({
        currentXp: xpResult.currentXp,
        level: xpResult.newLevel,
        earnedXp: totalEarned
      });
    }
    
    setPendingResults([]);
    setSaving(false);
    if (score >= 10) confetti({ particleCount: score * 5, spread: 80, origin: { y: 0.6 } });
  }, [missionId, missionSaved, pendingResults, score, user]);

  const startGame = () => {
    playSound('click');
    setScore(0);
    setCombo(0);
    setLives(3);
    setTimeLeft(5);
    setPendingResults([]);
    generateQuestion();
    setGameState('playing');
    setLastCorrect(null);
    setMissionSaved(false);
    setMissionReward(null);
  };

  const handleWrongAnswer = useCallback((timeout: boolean = false) => {
    playSound('incorrect');
    setCombo(0);
    setLastCorrect(false);
    
    if (!timeout) {
      setPendingResults(prev => [...prev, { category: question.category, correct: false }]);
    }
    
    if (lives <= 1) {
      setLives(0);
      endGame();
    } else {
      setLives(l => l - 1);
      toast.error(timeout ? "Süre Bitti!" : "Yanlış Cevap!", { position: 'bottom-center' });
      // Reset timer and generate new question so they aren't stuck
      setTimeLeft(5);
      setTimeout(() => {
        generateQuestion();
        setLastCorrect(null);
      }, 300);
    }
  }, [endGame, generateQuestion, lives, question.category]);

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | undefined;
    if (gameState === 'playing' && timeLeft > 0) {
      t = setInterval(() => setTimeLeft((l) => l - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      handleWrongAnswer(true);
    }
    return () => clearInterval(t);
  }, [timeLeft, gameState, handleWrongAnswer]);

  const handleAnswer = (ans: number) => {
    if (gameState !== 'playing') return;
    
    const correct = ans === question.a;
    
    if (correct) {
      playSound('correct');
      setLastCorrect(true);
      setPendingResults(prev => [...prev, { category: question.category, correct: true }]);
      setCombo(c => c + 1);
      
      const pointsToAdd = combo > 5 ? 2 : 1; // Double points after 5 combo
      setScore(s => s + pointsToAdd);
      
      // Reset timer based on combo: as combo gets higher, max time gets lower!
      let nextTime = 5;
      if (combo > 10) nextTime = 4;
      if (combo > 20) nextTime = 3;
      if (combo > 30) nextTime = 2; // INSANE MODE
      
      setTimeLeft(nextTime);
      
      setTimeout(() => {
        generateQuestion();
        setLastCorrect(null);
      }, 300);
    } else {
      handleWrongAnswer(false);
    }
  };

  if (initialLoading) {
    return (
      <AppLoader
        variant="fullscreen"
        accent="purple"
        title="Yildirim harekati hazirlaniyor"
        subtitle="Refleks koridoru basinclaniyor"
        messages={[
          'Yuksek hiz senaryolari cagriliyor...',
          'Sure protokolleri ayarlaniyor...',
          'Yildirim rotasi aciliyor...',
        ]}
      />
    );
  }

  if (gameState === 'start') {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4 relative z-10 w-full max-w-lg mx-auto">
        <div className="absolute top-8 right-8">
           <HelpButton 
             title="Yıldırım Harekâtı Rehberi"
             content={[
               "Sadece gerçek as pilotların hayatta kalabileceği bir mod.",
               "Her soru için sadece 5 saniyen var. Hızlı düşün, anında cevapla!",
               "Arka arkaya doğru bildikçe (Combo) süre daha da azalır ancak kazancın artar.",
               "3 canın var. Süre biterse veya yanlış bilirsen 1 can kaybedersin."
             ]}
             tips={[
               "Seri katlamak puanlarını x2 yapar.",
               "Önceliğin doğruluğa ver, süreyi stres yapma!"
             ]}
           />
        </div>
        <div className="glass-panel text-center p-8 rounded-3xl w-full border-t-2 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.15)] relative">
          <Zap className="w-20 h-20 text-purple-400 mx-auto mb-6 mt-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-pulse" />
          <h1 className="text-3xl font-mono font-bold uppercase tracking-[0.1em] text-purple-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] mb-8">YILDIRIM HAREKÂTI</h1>
          
          <div className="bg-slate-900/50 rounded-xl p-4 md:p-6 mb-8 text-left border border-slate-700/50">
             <h3 className="hud-badge mb-3 flex items-center text-red-400 border-red-500/30"><ShieldAlert className="w-4 h-4 mr-2" /> DİKKAT</h3>
             <p className="font-mono text-slate-300 text-sm leading-relaxed p-2 bg-slate-800/40 rounded-lg border-l-2 border-l-red-500">
               &quot;Soru başına 5 saniyen var. Yanlış cevap veya süre aşımı hasar verir. Seriyi bozma pilot!&quot;
             </p>
          </div>
          
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((_, i) => (
              <Heart key={i} className="w-8 h-8 text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            ))}
          </div>

          <button onClick={startGame} className="w-full neon-btn-outline border-purple-500 text-purple-300 hover:bg-purple-900/40 py-5 text-xl tracking-widest font-bold">YILDIRIMI ÇAĞIR</button>
          <Link href="/ogrenci" prefetch={false} className="mt-6 inline-block font-mono text-xs uppercase text-slate-500 hover:text-red-400 transition tracking-widest">Geri Dön</Link>
        </div>
      </div>
    );
  }

  if (gameState === 'end') {
    const lvl = finalXpData?.level || metrics?.level || 1;
    const curXp = finalXpData?.currentXp || metrics?.xp || 0;
    const prevLevelXp = 62 * Math.pow(lvl - 1, 2);
    const nextLevelXp = 62 * Math.pow(lvl, 2);
    const progress = Math.min(100, Math.max(0, ((curXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100));

    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4 relative z-10 w-full max-w-sm mx-auto">
        <div className="glass-panel text-center p-8 rounded-3xl w-full border-t-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          {missionReward && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4"
            >
              <p className="text-sm font-mono font-bold uppercase tracking-widest text-purple-300">YILDIRIM KUTLAMASI</p>
              <p className="mt-2 text-xs font-mono text-slate-200">
                {missionReward.bonusXp > 0 ? `Paket bonusu: +${missionReward.bonusXp} XP` : 'Gorev kaydi islendi.'}
              </p>
              {missionReward.allCompleted && <p className="mt-2 text-xs font-mono text-yellow-300">Tum gunluk gorev zinciri tamamlandi.</p>}
            </motion.div>
          )}
          <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
          <h1 className="text-xl font-mono font-bold uppercase mb-2 text-slate-300 tracking-widest">Sistem Devre Dışı</h1>
          <p className="text-6xl font-mono font-bold text-purple-400 mb-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">{score}</p>
          
          <div className="bg-slate-950/50 p-5 rounded-2xl mb-6 border border-white/5 space-y-4">
             <div>
               <div className="flex justify-between text-[10px] font-mono mb-2 uppercase tracking-tighter">
                 <span className="text-slate-400">Rutbe Ilerlemesi (Sv. {lvl})</span>
                 <span className="text-purple-400">%{Math.round(progress)}</span>
               </div>
               <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-white/5">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                 />
               </div>
             </div>
             <p className="text-purple-400 font-mono font-bold tracking-widest text-xs">+{finalXpData?.earnedXp || score * 10} XP KAZANILDI</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {nextMission && (
              <button 
                onClick={() => {
                  playSound('click');
                  router.push(`${nextMission.route}?mission=${nextMission.id}`);
                }}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold py-4 rounded-2xl transition flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
              >
                Sıradaki Göreve Geç <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button onClick={startGame} disabled={saving} className="w-full border border-purple-500/50 text-purple-400 hover:bg-purple-950/30 py-4 text-sm tracking-widest font-bold rounded-2xl transition">TEKRAR DENE</button>
            <Link href="/ogrenci" prefetch={false} className="w-full block bg-slate-800/40 hover:bg-slate-700/50 transition border border-white/5 rounded-2xl py-4 font-mono font-bold text-slate-400 uppercase text-xs tracking-widest">ANA ÜSSE DÖN</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-3xl mx-auto justify-center relative z-10">
      <header className="flex items-center justify-between bg-purple-900/10 backdrop-blur-md rounded-2xl p-4 border border-purple-500/20 mb-8">
        <div className="flex gap-2">
           {[...Array(3)].map((_, i) => (
             <Heart key={i} className={`w-8 h-8 transition-all ${i < lives ? 'text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-slate-700'}`} />
           ))}
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex flex-col items-center">
             <span className="hud-badge text-[10px]">SKOR</span>
             <div className="text-2xl font-mono font-bold text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">{score}</div>
           </div>
           <div className="flex flex-col items-center border-l border-purple-500/30 pl-4">
             <span className="hud-badge text-[10px] text-yellow-400 border-yellow-500/30">COMBO</span>
             <div className="text-xl font-mono font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">x{combo}</div>
           </div>
        </div>
      </header>

      {/* Lightning Timer Bar */}
      <div className="w-full h-3 bg-slate-800 rounded-full mb-8 overflow-hidden border border-slate-700">
        <motion.div 
          className={`h-full ${timeLeft < 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-purple-500'}`}
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / (combo > 30 ? 2 : combo > 20 ? 3 : combo > 10 ? 4 : 5)) * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }}
          key={timeLeft} // Ensure it re-animates smoothly per tick
        />
      </div>

      <motion.div 
        key={score}
        animate={{ 
          scale: lastCorrect === true ? [1, 1.05, 1] : 1,
          borderColor: lastCorrect === true ? "#a855f7" : (lastCorrect === false ? "#ef4444" : (timeLeft < 3 ? "#ef4444" : "#a855f7"))
        }}
        className={`glass-panel py-16 rounded-3xl mb-8 flex flex-col items-center justify-center text-center border-t-2 transition-colors duration-300 relative overflow-hidden ${timeLeft < 3 ? 'animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)] border-red-500' : 'shadow-[0_0_30px_rgba(168,85,247,0.1)]'}`}
      >
        <div className="text-7xl md:text-[100px] font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 leading-none tracking-widest font-mono">
          {question.q}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {question.options.map((opt, i) => (
          <motion.button 
            key={i} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(opt)} 
            className="neon-btn-outline border-purple-500/50 text-white hover:bg-purple-900/30 py-6 px-4 text-3xl md:text-5xl font-mono tracking-widest rounded-2xl"
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function YildirimModu() {
  return (
    <Suspense
      fallback={
        <AppLoader
          variant="fullscreen"
          accent="purple"
          title="Yildirim modulu yukleniyor"
          subtitle="Savunma refleksleri devreye aliniyor"
          messages={['Yildirim koridoru senkronize ediliyor...']}
        />
      }
    >
      <YildirimModuContent />
    </Suspense>
  );
}
