"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Loader2, Sparkles, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { playSound } from '@/lib/audio';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { addXpAndBadge, getStudentMetrics } from '@/lib/progress';
import { handleSystemError } from '@/lib/errors';
import HelpButton from '@/components/HelpButton';
import { authFetch } from '@/lib/apiClient';
import { completeMission } from '@/lib/missionProgress';
import type { MissionCard } from '@/lib/missions';

function UzayGoreviContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const missionId = searchParams.get('mission');
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<{question:string, options:string[], correctAnswer:string, explanation:string, hint?:string, category?:string} | null>(null);
  const [selected, setSelected] = useState('');
  
  const showHintToast = () => {
    if (!question?.hint) {
      toast.info("Yapay zeka bu görev için özel bir ipucu hazırlamamış.", { icon: '🤖' });
      return;
    }
    playSound('click');
    toast.info(`Yapay Zeka İpucu: ${question.hint}`, { duration: 5000, icon: '💡' });
  };
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResultBlock, setShowResultBlock] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [missionSaved, setMissionSaved] = useState(false);
  const [missionReward, setMissionReward] = useState<{ bonusXp: number; allCompleted: boolean } | null>(null);
  const [nextMission, setNextMission] = useState<Pick<MissionCard, 'id' | 'route'> | null>(null);
  const [finalXpData, setFinalXpData] = useState<{currentXp: number, level: number, earnedXp: number} | null>(null);

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

  const fetchQuestion = useCallback(async (lvl: number) => {
    setLoading(true);
    setErrorMsg('');
    setShowExplanation(false);
    setShowResultBlock(false);
    setSelected('');
    setIsEvaluating(false);
    try {
      const perfMetrics = user ? await getStudentMetrics(user.uid) : null;
      
      const res = await authFetch('/api/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          level: lvl,
          performanceHistory: perfMetrics 
        })
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
        handleSystemError(new Error(data.error), { title: 'Yapay Zeka Protokol Hatası', action: 'API Anahtarınızı Veli Paneli üzerinden kontrol edin.' });
      } else {
        setQuestion(data);
        playSound('click');
      }
    } catch (e) {
      setErrorMsg("İletişim koptu.");
      handleSystemError(e, { title: 'Veri İletim Hatası', action: 'İnternet bağlantınızı kontrol edin.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current && !question && !loading && !errorMsg) {
      hasFetched.current = true;
      fetchQuestion(1);
    }
  }, [fetchQuestion, question, loading, errorMsg]);

  const submitAnswer = async (ans: string) => {
    playSound('click');
    setSelected(ans);
    setIsEvaluating(true);
    
    await new Promise(r => setTimeout(r, 1000));
    
    setShowExplanation(true);
    const correct = ans === question?.correctAnswer;

    if (correct) {
      playSound('levelUp');
      setIsCorrect(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      
      if (user) {
         const xpResult = await addXpAndBadge(user.uid, 50, {id:'uzay_operasyon_generali', name: 'Uzay Operasyon Generali'}, question?.category || 'boss_deepseek', true);
         
         let totalEarned = 50;

         if (missionId && !missionSaved) {
           const missionData = await completeMission(missionId, {
             mode: 'gorev',
             score: 1,
             xpEarned: 50,
             success: true,
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
      toast.success("Görev başarıyla tamamlandı!");
    } else {
      playSound('incorrect');
      setIsCorrect(false);
      if (user) {
         const xpResult = await addXpAndBadge(user.uid, 0, null, question?.category || 'boss_deepseek', false);
         
         let totalEarned = 0;

         if (missionId && !missionSaved) {
           const missionData = await completeMission(missionId, {
             mode: 'gorev',
             score: 0,
             xpEarned: 0,
             success: false,
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
    }

    setTimeout(() => {
      setShowResultBlock(true);
    }, 1500);
  };

  if (errorMsg) {
    return (
      <div className="flex justify-center items-center h-screen p-6 relative z-10">
        <div className="glass-panel max-w-lg p-8 rounded-3xl text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          <h2 className="text-xl font-mono text-white mb-2 uppercase tracking-wide">Görev İletişimi Koptu</h2>
          <p className="text-slate-400 mb-8 font-mono text-sm leading-relaxed">{errorMsg}</p>
          <Link href="/ogrenci" prefetch={false} className="neon-btn-purple px-8 py-4 inline-block tracking-widest text-sm w-full">ANA ÜSSE DÖN</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-4xl mx-auto justify-center relative z-10 w-full">
      <header className="flex items-center justify-between border-b border-purple-500/20 pb-4 mb-8">
        <Link href="/ogrenci" prefetch={false} className="hud-badge text-slate-500 hover:text-white transition">İptal Et</Link>
        <div className="flex items-center text-[10px] font-mono tracking-widest font-bold bg-purple-900/40 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-full">
          <BrainCircuit className="w-4 h-4 mr-2" /> YAPAY ZEKA GÖREVİ
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={showHintToast}
             disabled={loading || !question}
             className="p-2 bg-yellow-900/30 text-yellow-500 rounded-lg border border-yellow-500/30 hover:bg-yellow-900/40 transition disabled:opacity-50"
             title="Yapay Zeka İpucu İste"
           >
             <Lightbulb className="w-5 h-5" />
           </button>
           <HelpButton 
            title="Yapay Zeka Görevi"
            content={["Derin uzay analizleri için yapay zeka tarafından hazırlanan karmaşık problemleri çözmen gerekiyor."]}
            tips={["Her doğru cevap 50 XP değerindedir.", "Hata yaparsan açıklama kısmını dikkatlice oku."]}
          />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loader"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center py-24"
          >
            <div className="relative">
               <Loader2 className="w-16 h-16 animate-spin text-purple-400 mb-6 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
               <div className="absolute inset-0 border-4 border-t-purple-500 border-r-cyan-500 border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
            </div>
            <p className="hud-badge text-purple-400 animate-pulse mt-4">Sinyal Aranıyor...</p>
          </motion.div>
        ) : question ? (
          <motion.div 
            key="question"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            <motion.div 
              animate={{ 
                scale: showExplanation ? (isCorrect ? [1, 1.02, 1] : 1) : 1,
                borderColor: showExplanation ? (isCorrect ? "#22c55e" : "#ef4444") : "#a855f7"
              }}
              className="glass-panel p-8 md:p-12 rounded-3xl border-t-2 transition-colors duration-500"
            >
               <div className="absolute top-4 left-6 flex items-center gap-2">
                 <span className="flex h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"></span>
               </div>
               <h2 className="text-xl md:text-2xl font-mono text-white leading-relaxed font-bold tracking-wide break-words">{question.question}</h2>
            </motion.div>

            {!showResultBlock ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.options.map((opt, i) => {
                  let btnClass = "p-6 md:p-8 border rounded-2xl text-2xl font-mono transition-all text-white ";
                  if (!showExplanation) {
                    if (isEvaluating && opt === selected) {
                       btnClass += "bg-white/20 border-white/60 animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105 z-10";
                    } else {
                       btnClass += "bg-slate-800/40 hover:bg-purple-900/30 border-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer";
                    }
                  } else {
                     if (opt === question.correctAnswer) {
                       btnClass += "bg-green-600/40 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]";
                     } else if (opt === selected && opt !== question.correctAnswer) {
                       btnClass += "bg-red-600/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]";
                     } else {
                       btnClass += "bg-slate-800/20 border-slate-700/50 opacity-50";
                     }
                  }

                  return (
                    <button 
                      key={i}
                      disabled={showExplanation}
                      onClick={() => submitAnswer(opt)}
                      className={btnClass}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={`p-8 md:p-10 rounded-3xl border-2 shadow-2xl relative overflow-hidden ${isCorrect ? 'bg-green-950/40 border-green-500/50' : 'bg-red-950/40 border-red-500/50'}`}
              >
                <div className="absolute -inset-2 bg-gradient-to-br from-white/5 to-transparent blur-lg z-0"></div>
                <div className="relative z-10">
                   {missionReward && (
                     <motion.div
                       initial={{ opacity: 0, y: 14, scale: 0.96 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       className="mb-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4"
                     >
                       <p className="text-sm font-mono font-bold uppercase tracking-widest text-cyan-300">ANLIK KOMUTA KUTLAMASI</p>
                       <p className="mt-2 text-xs font-mono text-slate-200">
                         {missionReward.bonusXp > 0 ? `Paket bonusu: +${missionReward.bonusXp} XP` : 'Görev zinciri kaydı işlendi.'}
                       </p>
                       {missionReward.allCompleted && <p className="mt-2 text-xs font-mono text-yellow-300">Komutan raporu günlük merkezde açıldı.</p>}
                     </motion.div>
                   )}
                   <div className="flex items-center mb-6">
                     {isCorrect ? <Sparkles className="w-8 h-8 text-green-400 mr-3 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"/> : <AlertTriangle className="w-8 h-8 text-red-400 mr-3 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]"/>}
                     <h3 className="text-xl font-mono uppercase tracking-widest font-bold text-white">{isCorrect ? 'GÖREV BAŞARILI (+50 XP)' : 'SİSTEM HATASI'}</h3>
                   </div>
                   <p className="text-sm font-mono text-slate-300 mb-8 pb-8 border-b border-white/10 leading-relaxed">
                     {question.explanation}
                   </p>
                   <div className="flex flex-col md:flex-row gap-4">
                     {nextMission ? (
                        <button 
                          onClick={() => {
                            playSound('click');
                            router.push(`${nextMission.route}?mission=${nextMission.id}`);
                          }}
                          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                        >
                          SIRADAKİ GÖREV <ArrowRight className="w-4 h-4" />
                        </button>
                     ) : (
                        <button onClick={() => fetchQuestion(1)} className="flex-1 neon-btn-purple py-4 font-mono font-bold tracking-widest text-xs">
                          YENİ GÖREV İSTE
                        </button>
                     )}
                     <Link href="/ogrenci" prefetch={false} className="flex-1 text-center bg-slate-800 hover:bg-slate-700 transition rounded-xl py-4 font-mono font-bold text-white tracking-widest text-xs border border-white/10 flex items-center justify-center">
                       ANA ÜS
                     </Link>
                   </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function UzayGorevi() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen relative z-10"><Loader2 className="w-12 h-12 animate-spin text-purple-400" /></div>}>
      <UzayGoreviContent />
    </Suspense>
  );
}
