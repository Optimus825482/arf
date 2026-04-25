"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Sparkles, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
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
import AppLoader from '@/components/AppLoader';

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
         await addXpAndBadge(user.uid, 50, {id:'uzay_operasyon_generali', name: 'Uzay Operasyon Generali'}, question?.category || 'boss_deepseek', true);

         if (missionId && !missionSaved) {
           const missionData = await completeMission(missionId, {
             mode: 'gorev',
             score: 1,
             xpEarned: 50,
             success: true,
           });
           const bonus = missionData.missionBonusXp || 0;
           setMissionReward({
             bonusXp: bonus,
             allCompleted: !!missionData.allCompleted,
           });
           setMissionSaved(true);
         }

      }
      toast.success("Görev başarıyla tamamlandı!");
    } else {
      playSound('incorrect');
      setIsCorrect(false);
      if (user) {
         await addXpAndBadge(user.uid, 0, null, question?.category || 'boss_deepseek', false);

         if (missionId && !missionSaved) {
           const missionData = await completeMission(missionId, {
             mode: 'gorev',
             score: 0,
             xpEarned: 0,
             success: false,
           });
           const bonus = missionData.missionBonusXp || 0;
           setMissionReward({
             bonusXp: bonus,
             allCompleted: !!missionData.allCompleted,
           });
           setMissionSaved(true);
         }

      }
    }

    setTimeout(() => {
      setShowResultBlock(true);
    }, 1500);
  };

  if (errorMsg) {
    return (
      <div className="flex justify-center items-center h-screen p-6 relative z-10">
        <div className="hud-module max-w-lg p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-secondary mx-auto mb-4 drop-shadow-[0_0_15px_rgba(255,179,173,0.45)]" />
          <h2 className="text-xl font-mono text-white mb-2 uppercase tracking-wide">Görev İletişimi Koptu</h2>
          <p className="text-slate-400 mb-8 font-mono text-sm leading-relaxed">{errorMsg}</p>
          <Link href="/ogrenci" prefetch={false} className="cyber-button-primary inline-block w-full text-sm">ANA ÜSSE DÖN</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-4xl mx-auto justify-center relative z-10 w-full">
      <header className="flex items-center justify-between bg-surface-container-lowest/40 pb-4 mb-8">
        <Link href="/ogrenci" prefetch={false} className="hud-badge text-slate-500 hover:text-white transition">İptal Et</Link>
        <div className="flex items-center text-[10px] font-mono tracking-widest font-bold bg-primary/10 text-primary px-4 py-2 rounded-sm">
          <BrainCircuit className="w-4 h-4 mr-2" /> YAPAY ZEKA GÖREVİ
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={showHintToast}
             disabled={loading || !question}
             className="p-2 bg-tertiary-container/10 text-tertiary-container rounded-sm hover:bg-tertiary-container/20 transition disabled:opacity-50"
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
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AppLoader
              variant="panel"
              accent="cyan"
              title="Yapay zeka sinyali araniyor"
              subtitle="Derin uzay problemi uretiliyor"
              messages={[
                'Deepseek paketi baglanti kuruyor...',
                'Gorev senaryosu sifreleniyor...',
                'Sinyal netlestiriliyor...',
              ]}
            />
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
                borderColor: showExplanation ? (isCorrect ? "#22c55e" : "#ef4444") : "#22d3ee"
              }}
              className="hud-module p-8 md:p-12 transition-colors duration-500"
            >
               <div className="absolute top-4 left-6 flex items-center gap-2">
                 <span className="flex h-1.5 w-1.5 bg-primary animate-pulse"></span>
               </div>
               <h2 className="text-xl md:text-2xl font-mono text-white leading-relaxed font-bold tracking-wide break-words">{question.question}</h2>
            </motion.div>

            {!showResultBlock ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.options.map((opt, i) => {
                  let btnClass = "p-6 md:p-8 rounded-sm text-2xl font-mono transition-all text-white ";
                  if (!showExplanation) {
                    if (isEvaluating && opt === selected) {
                       btnClass += "bg-white/20 border-white/60 animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105 z-10";
                    } else {
                       btnClass += "bg-surface-container-low/70 hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.18)] cursor-pointer";
                    }
                  } else {
                     if (opt === question.correctAnswer) {
                       btnClass += "bg-cyan-500/30 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.35)]";
                     } else if (opt === selected && opt !== question.correctAnswer) {
                       btnClass += "bg-red-600/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]";
                     } else {
                       btnClass += "bg-surface-container-low/30 opacity-50";
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
                className={`p-8 md:p-10 rounded-sm shadow-2xl relative overflow-hidden ${isCorrect ? 'bg-cyan-950/40' : 'bg-red-950/40'}`}
              >
                <div className="absolute -inset-2 bg-gradient-to-br from-white/5 to-transparent blur-lg z-0"></div>
                <div className="relative z-10">
                   {missionReward && (
                     <motion.div
                       initial={{ opacity: 0, y: 14, scale: 0.96 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       className="mb-5 rounded-sm bg-cyan-500/10 p-4"
                     >
                       <p className="text-sm font-mono font-bold uppercase tracking-widest text-cyan-300">ANLIK KOMUTA KUTLAMASI</p>
                       <p className="mt-2 text-xs font-mono text-slate-200">
                         {missionReward.bonusXp > 0 ? `Paket bonusu: +${missionReward.bonusXp} XP` : 'Görev zinciri kaydı işlendi.'}
                       </p>
                       {missionReward.allCompleted && <p className="mt-2 text-xs font-mono text-secondary">Komutan raporu günlük merkezde açıldı.</p>}
                     </motion.div>
                   )}
                   <div className="flex items-center mb-6">
                     {isCorrect ? <Sparkles className="w-8 h-8 text-cyan-400 mr-3 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"/> : <AlertTriangle className="w-8 h-8 text-red-400 mr-3 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]"/>}
                     <h3 className="text-xl font-mono uppercase tracking-widest font-bold text-white">{isCorrect ? 'GÖREV BAŞARILI (+50 XP)' : 'SİSTEM HATASI'}</h3>
                   </div>
                   <p className="text-sm font-mono text-slate-300 mb-8 pb-8 bg-surface-container-lowest/30 leading-relaxed">
                     {question.explanation}
                   </p>
                   <div className="flex flex-col md:flex-row gap-4">
                     {nextMission ? (
                        <button 
                          onClick={() => {
                            playSound('click');
                            router.push(`${nextMission.route}?mission=${nextMission.id}`);
                          }}
                          className="flex-1 cyber-button-primary flex items-center justify-center gap-2 text-xs"
                        >
                          SIRADAKİ GÖREV <ArrowRight className="w-4 h-4" />
                        </button>
                     ) : (
                        <button onClick={() => fetchQuestion(1)} className="flex-1 cyber-button-primary py-4 text-xs">
                          YENİ GÖREV İSTE
                        </button>
                     )}
                     <Link href="/ogrenci" prefetch={false} className="flex-1 text-center cyber-button-secondary py-4 text-xs flex items-center justify-center">
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
    <Suspense
      fallback={
        <AppLoader
          variant="fullscreen"
          accent="cyan"
          title="AI gorev modulu yukleniyor"
          subtitle="Derin uzay senaryosu aciliyor"
          messages={['Komuta zekasi problem alanini kuruyor...']}
        />
      }
    >
      <UzayGoreviContent />
    </Suspense>
  );
}
