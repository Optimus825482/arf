/* eslint-disable */
"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Rocket, Trophy, Clock, Zap, Loader2, Lightbulb, ArrowRight } from 'lucide-react';
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

function PratikOyunuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const missionId = searchParams.get('mission');
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState({ q: '', options: [] as number[], a: 0, category: '' });
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [combo, setCombo] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [showFastBonus, setShowFastBonus] = useState(false);
  const [missionSaved, setMissionSaved] = useState(false);
  const [missionReward, setMissionReward] = useState<{ bonusXp: number; allCompleted: boolean } | null>(null);
  const [nextMission, setNextMission] = useState<Pick<MissionCard, 'id' | 'route'> | null>(null);
  const [finalXpData, setFinalXpData] = useState<{currentXp: number, level: number, earnedXp: number} | null>(null);
  // Batch: collect answers locally, write to Firestore once at end
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

  const getHintText = () => {
    switch (question.category) {
      case '+': return "İpucu: Büyük sayıdan başlayarak küçük sayıyı üzerine ekle.";
      case '-': return "İpucu: Onluk bozarak çıkarma kuralını hatırla.";
      case 'x': return "İpucu: Sayıları parçalayarak çarpmayı dene (Örn: 12x4 = 10x4 + 2x4).";
      case '÷': return "İpucu: Tam tersi olan çarpma işlemini düşün.";
      case 'mixed': return "İpucu: İşlem önceliği kuralı: Önce parantez içindekiler!";
      default: return "İpucu: Şıkları inceleyerek son rakam üzerinden tahmin yürüt.";
    }
  };

  const showHintToast = () => {
    playSound('click');
    toast.info(getHintText(), { duration: 4000, icon: '💡' });
  };

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
    
    // Dynamic Difficulty weights based on performance and level
    const addSubWeight = Math.max(10, 100 - (m.addSubScore || 50) + (m.level * 2)); 
    const mulDivWeight = Math.max(10, 100 - (m.mulDivScore || 50) + (m.level * 5));
    // Mixed operations weight grows with level
    const mixedWeight = m.level > 3 ? (m.level * 10) : 0;
    
    const totalW = addSubWeight + mulDivWeight + mixedWeight;
    const r = Math.random() * totalW;
    
    let op: string = '', n1: number = 0, n2: number = 0, a: number = 0, category: string = '';

    if (r < addSubWeight) {
      category = '+';
      op = Math.random() < 0.5 ? '+' : '-';
      const maxNum = Math.min(1000, Math.floor(20 + (m.level * 15) + ((m.addSubScore || 50) / 2)));
      n1 = Math.floor(Math.random() * maxNum) + 1;
      n2 = Math.floor(Math.random() * maxNum) + 1;
      if (op === '-' && n2 > n1) [n1, n2] = [n2, n1];
    } else if (r < addSubWeight + mulDivWeight) {
      category = 'x';
      op = Math.random() < 0.5 ? 'x' : '÷';
      const maxMult = Math.min(30, Math.floor(5 + (m.level) + ((m.mulDivScore || 50) / 10)));
      n1 = Math.floor(Math.random() * maxMult) + 1;
      n2 = Math.floor(Math.random() * maxMult) + 1;
      if (op === '÷') n1 = n2 * (Math.floor(Math.random() * maxMult) + 1);
    } else {
      // Mixed Operation: (a + b) x c or Similar
      category = 'mixed';
      const type = Math.floor(Math.random() * 2);
      if (type === 0) {
        // (n1 + n2) * n3
        const n1_m = Math.floor(Math.random() * 10) + 1;
        const n2_m = Math.floor(Math.random() * 10) + 1;
        const n3_m = Math.floor(Math.random() * 5) + 2;
        op = `(${n1_m} + ${n2_m}) x ${n3_m}`;
        a = (n1_m + n2_m) * n3_m;
      } else {
        // (n1 * n2) - n3
        const n1_m = Math.floor(Math.random() * 6) + 2;
        const n2_m = Math.floor(Math.random() * 6) + 2;
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

    let options = new Set<number>();
    options.add(a);
    // Number of options scales with level up to 6
    const optionCount = Math.min(6, 4 + Math.floor(m.level / 5));
    
    while(options.size < optionCount) {
       const spread = Math.max(10, Math.floor(a / 5));
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

  const endGame = async () => {
    playSound('levelUp');
    setGameState('end');
    setSaving(true);
    
    if (user) {
      // Batch write: first record all per-category performance
      for (const result of pendingResults) {
        await addXpAndBadge(user.uid, 0, null, result.category, result.correct);
      }

      // Then award XP + badge for overall score
      const xpEarned = score * 5;
      let badge = null;
      if (score >= 25) badge = { id: 'isik_hizinin_otesi', name: 'Işık Hızının Ötesi' };
      else if (score >= 20) badge = { id: 'isik_hizi_pilotu', name: 'Işık Hızı Pilotu' };
      else if (score >= 12) badge = { id: 'radar_sistem_uzmani', name: 'Radar Sistem Uzmanı' };

      const xpResult = await addXpAndBadge(user.uid, xpEarned, badge, 'classic', true);

      let totalEarned = xpEarned;

      if (missionId && !missionSaved) {
        const missionData = await completeMission(missionId, {
          mode: 'pratik',
          score,
          xpEarned,
          success: score > 0,
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
    confetti({ particleCount: score * 10, spread: 100, origin: { y: 0.6 } });
    toast.success("Eğitim Tamamlandı!");
  };

  const startGame = () => {
    playSound('click');
    setScore(0);
    setCombo(0);
    setTimeLeft(60);
    setPendingResults([]);
    generateQuestion();
    setQuestionStartTime(Date.now());
    setGameState('playing');
    setLastCorrect(null);
    setMissionSaved(false);
    setMissionReward(null);
  };

  useEffect(() => {
    let t: any;
    if (gameState === 'playing' && timeLeft > 0) {
      t = setInterval(() => setTimeLeft(l => l - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      endGame();
    }
    return () => clearInterval(t);
  }, [timeLeft, gameState]);

  const handleAnswer = (ans: number) => {
    const correct = ans === question.a;
    setLastCorrect(correct);
    
    // Batch: collect result locally instead of writing to Firestore
    setPendingResults(prev => [...prev, { category: question.category, correct }]);

    if (correct) {
      playSound('correct');
      
      const responseTime = Date.now() - questionStartTime;
      const isFast = responseTime < 3000; // Under 3 seconds
      
      let pointsToAdd = 1;
      
      if (isFast) {
        setCombo(c => c + 1);
        setShowFastBonus(true);
        setTimeout(() => setShowFastBonus(false), 1000);
        
        // Bonus point for every 3 combos
        if ((combo + 1) % 3 === 0) {
            pointsToAdd += 1;
            toast.success("⚡ YILDIRIM SERİSİ! +1 Ekstra Puan", { icon: '⚡' });
        }
      } else {
        setCombo(0);
      }
      
      setScore(s => s + pointsToAdd);
      setTimeout(() => {
        generateQuestion();
        setQuestionStartTime(Date.now());
        setLastCorrect(null);
      }, 300);
    } else {
      playSound('incorrect');
      setCombo(0);
      setTimeLeft(l => Math.max(0, l - 5));
      toast.error("Hasar Alındı! -5 Saniye", { position: 'bottom-center' });
      setTimeout(() => setLastCorrect(null), 500);
    }
  };

  const getBriefing = () => {
    const m = metrics || { addSubScore: 50, mulDivScore: 50, speedScore: 50 };
    if (m.speedScore < 40) return { title: "Düşük Reaksiyon", text: "Sinyaller yavaş geliyor pilot. Şıklardan hızlıca eleme yaparak zaman kazan!" };
    if (m.mulDivScore < 40) return { title: "Motor Isınması", text: "Çarpma ve bölme işlemlerinde iticiler tekliyor. Ritmik sayma tekniklerini hatırla." };
    return { title: "Stratejik Hazırlık", text: "Hız ve doğruluk arasındaki dengeyi kur. Yanlış cevaplar kalkanlarını (zamanını) eritir!" };
  };

  if (initialLoading) return <div className="flex justify-center items-center h-screen relative z-10"><Loader2 className="w-12 h-12 animate-spin text-cyan-400" /></div>;

  if (gameState === 'start') {
    const briefing = getBriefing();
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4 relative z-10 w-full max-w-lg mx-auto">
        <div className="absolute top-8 right-8">
           <HelpButton 
             title="Saha Eğitimi Rehberi"
             content={[
               "Saha Eğitimi, pilotların temel hayatta kalma yeteneklerini test eder.",
               "60 saniye içinde mümkün olduğunca fazla matematik sorusuna doğru cevap vererek puan topla.",
               "Topladığın puanlar (skor), görev sonunda rütbeni yükseltecek olan XP puanlarına dönüşür."
             ]}
             tips={[
               "Yanlış cevaplar sana 5 saniye kaybettirir, dikkatli ol!",
               "Zorluk seviyesi rütbene göre otomatik olarak ayarlanır.",
               "Hızlı cevap vermek 'Hız Puanını' (Processing Speed) yükseltir."
             ]}
           />
        </div>
        <div className="glass-panel text-center p-8 rounded-3xl w-full border-t-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.1)] relative">
          <Rocket className="w-16 h-16 text-cyan-400 mx-auto mb-6 mt-4" />
          <h1 className="text-3xl font-mono font-bold uppercase tracking-[0.1em] neon-text-cyan mb-8">Saha Eğitimi</h1>
          <div className="bg-slate-900/50 rounded-xl p-4 md:p-6 mb-8 text-left border border-slate-700/50">
             <h3 className="hud-badge mb-3 flex items-center text-cyan-400"><Zap className="w-4 h-4 mr-2" /> BRİFİNG: {briefing.title}</h3>
             <p className="font-mono text-slate-300 text-sm leading-relaxed p-2 bg-slate-800/40 rounded-lg border-l-2 border-l-cyan-500">"{briefing.text}"</p>
          </div>
          <p className="text-slate-500 mb-6 font-mono text-xs uppercase tracking-widest text-center">Hedef 60s. Yanlış = -5s.</p>
          <button onClick={startGame} className="w-full neon-btn-blue py-5 text-xl tracking-widest font-bold">MOTÖRÜ ATEŞLE</button>
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
        <div className="glass-panel text-center p-8 rounded-3xl w-full border-t-2 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
          {missionReward && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4"
            >
              <p className="text-sm font-mono font-bold uppercase tracking-widest text-emerald-300">GÖREV RAPORU ALINDI</p>
              <p className="mt-2 text-xs font-mono text-slate-200">
                {missionReward.bonusXp > 0 ? `Paket bonusu: +${missionReward.bonusXp} XP` : 'Operasyon kaydı işlendi.'}
              </p>
              {missionReward.allCompleted && <p className="mt-2 text-xs font-mono text-yellow-300">Tüm günlük rota tamamlandı!</p>}
            </motion.div>
          )}
          
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          <h1 className="text-xl font-mono font-bold uppercase mb-2 text-slate-300 tracking-widest">Eğitim Sonu</h1>
          <p className="text-6xl font-mono font-bold neon-text-cyan mb-4">{score}</p>
          
          <div className="bg-slate-950/50 p-5 rounded-2xl mb-6 border border-white/5 space-y-4">
             <div>
               <div className="flex justify-between text-[10px] font-mono mb-2 uppercase tracking-tighter">
                 <span className="text-slate-400">Rütbe İlerlemesi (Sv. {lvl})</span>
                 <span className="text-cyan-400">%{Math.round(progress)}</span>
               </div>
               <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-white/5">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                 />
               </div>
             </div>
             <p className="text-green-400 font-mono font-bold tracking-widest text-xs">+{finalXpData?.earnedXp || score * 5} XP KAZANILDI</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {nextMission && (
              <button 
                onClick={() => {
                  playSound('click');
                  router.push(`${nextMission.route}?mission=${nextMission.id}`);
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold py-4 rounded-2xl transition flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
              >
                Sıradaki Göreve Geç <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button onClick={startGame} disabled={saving} className="w-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30 py-4 text-sm tracking-widest font-bold rounded-2xl transition">TEKRAR UÇ</button>
            <Link href="/ogrenci" prefetch={false} className="w-full block bg-slate-800/40 hover:bg-slate-700/50 transition border border-white/5 rounded-2xl py-4 font-mono font-bold text-slate-400 uppercase text-xs tracking-widest">ANA ÜSSE DÖN</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-3xl mx-auto justify-center relative z-10">
      <header className="flex items-center justify-between bg-blue-900/10 backdrop-blur-md rounded-2xl p-4 border border-blue-500/20 mb-8">
        <div className="flex items-center gap-4">
           <div className="flex flex-col items-center">
             <span className="hud-badge text-[10px]">SKOR</span>
             <div className="text-2xl font-mono font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{score}</div>
           </div>
           <div className="flex flex-col items-center border-l border-blue-500/30 pl-4">
             <span className="hud-badge text-[10px] text-yellow-400 border-yellow-500/30">COMBO</span>
             <div className="text-xl font-mono font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">x{combo}</div>
           </div>
        </div>
        <div className="flex flex-col items-center">
             <span className="hud-badge text-[10px]">SÜRE</span>
             <div className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>00:{timeLeft.toString().padStart(2, '0')}</div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={showHintToast}
             className="p-3 bg-yellow-900/20 text-yellow-400 rounded-xl border border-yellow-500/30 hover:bg-yellow-900/40 transition" 
             title="İpucu Al"
           >
             <Lightbulb className="w-5 h-5" />
           </button>
           <HelpButton 
              title="Oynanış"
              content={["Doğru sonuca dokunarak ilerle. Her doğru cevap puanını artırır ve süreni korur."]}
              tips={["Kararsız kalma, en yakın sonucu tahmin et!", "Vakit daraldığında kırmızı alarm devreye girer."]}
           />
        </div>
      </header>

      <motion.div 
        key={score}
        animate={{ 
          scale: lastCorrect === true ? [1, 1.02, 1] : 1,
          borderColor: lastCorrect === true ? "#22c55e" : (lastCorrect === false ? "#ef4444" : "#06b6d4")
        }}
        className="glass-panel py-10 md:py-16 px-6 rounded-3xl mb-8 flex flex-col items-center justify-center text-center border-t-2 transition-colors duration-300 relative overflow-hidden min-h-[300px]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05),transparent)]"></div>
        {showFastBonus && (
           <motion.div 
             initial={{ opacity: 0, y: 20, scale: 0.8 }}
             animate={{ opacity: [0, 1, 1, 0], y: -30, scale: 1.2 }}
             transition={{ duration: 0.8 }}
             className="absolute top-4 text-yellow-400 font-bold tracking-widest text-lg z-20 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
           >
             ⚡ HIZLI CEVAP!
           </motion.div>
        )}

        <div className="relative z-10 w-full max-w-2xl mx-auto">
           {question.category !== 'mixed' ? (
              <div className="space-y-4">
                 <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="h-1 w-8 bg-cyan-500/30 rounded-full"></span>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.3em]">Harekât Verisi</span>
                    <span className="h-1 w-8 bg-cyan-500/30 rounded-full"></span>
                 </div>
                 <h2 className="text-xl md:text-2xl font-mono text-white leading-relaxed tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                   {question.q}
                 </h2>
              </div>
           ) : (
              <div className="text-7xl md:text-[100px] font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 leading-none tracking-widest font-mono">
                {question.q}
              </div>
           )}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {question.options.map((opt, i) => (
          <motion.button 
            key={i} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(opt)} 
            className="neon-btn-outline py-6 px-4 text-3xl md:text-5xl font-mono tracking-widest rounded-2xl"
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function PratikOyunu() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen relative z-10"><Loader2 className="w-12 h-12 animate-spin text-cyan-400" /></div>}>
      <PratikOyunuContent />
    </Suspense>
  );
}
