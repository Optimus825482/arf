"use client";

import { motion, AnimatePresence } from 'motion/react';
import { Star, Flag, Loader2, Award, Zap, Paintbrush, LogOut, BookOpen, ShieldCheck, Gauge, ArrowRight, Orbit, CheckCircle2, Lock, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRankName } from '@/lib/ranks';
import TurkishFlag from '@/components/TurkishFlag';
import { playSound } from '@/lib/audio';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Onboarding from '@/components/Onboarding';
import { authFetch } from '@/lib/apiClient';
import { getCommanderProgress, getDifficultyProfile } from '@/lib/commander';
import MissionLaunchModal from '@/components/MissionLaunchModal';
import LoreLoader from '@/components/LoreLoader';
import type { DailyMissionPack, MissionCard } from '@/lib/missions';
import type { UserData } from '@/lib/types';

export default function OgrenciDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<UserData | null>(null);
  const [showGarage, setShowGarage] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [missionPack, setMissionPack] = useState<DailyMissionPack | null>(null);
  const [missionLoading, setMissionLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<MissionCard | null>(null);
  const [resetCountdown, setResetCountdown] = useState('');
  const [clearingMessage, setClearingMessage] = useState(false);

  const handleReadMessage = async () => {
    if (!user || !studentData) return;
    playSound('click');
    setClearingMessage(true);
    try {
      const updates: Record<string, unknown> = {};
      
      // Commander message read logic
      if (studentData.commanderMessage && !studentData.commanderMessage.read) {
        const bonus = studentData.commanderMessage.bonusXp || 0;
        if (bonus > 0) {
          // Use addXpAndBadge if we want to follow the level formula, 
          // but for a simple bonus updateDoc is faster if we don't care about the complexity here.
          // However, consistency is better. Let's use a simpler approach for bonus.
          const newXp = (studentData.xp || 0) + bonus;
          const newLevel = Math.floor(Math.sqrt(newXp / 62)) + 1;
          updates.xp = newXp;
          updates.level = newLevel;
          toast.success(`Komutan Bonusu: +${bonus} XP alındı!`, { icon: "🎁" });
          playSound('levelUp');
        }
        updates.commanderMessage = { ...studentData.commanderMessage, read: true };
      }

      // If we also want to clear actionPlan or mark it as "seen"
      // updates.actionPlanSeen = true; 

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', user.uid), updates);
        setStudentData(prev => prev ? { ...prev, ...updates } : prev);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(e);
      }
      toast.error("Mesaj güncellenemedi.");
    } finally {
      setClearingMessage(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }

    const fetchStudentData = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
           const d = docSnap.data();
           if (!d.level || d.level === 0 || d.placementDone === false) {
             router.replace('/ogrenci/seviye');
           } else {
             setStudentData(d);
             // Check onboarding
             const onboardingSeenLocal = localStorage.getItem(`onboarding_seen_${user.uid}`);
             if (!d.onboardingSeen && !onboardingSeenLocal) {
                setShowOnboarding(true);
             }
             toast.success("Mürettebat paneli yüklendi.", { icon: "🚀" });

             // Sessiz AI plan tazeleyici (Öğrenci görmez, arka planda planı günceller)
             try {
                const planUpdatedAt = d.planUpdatedAt?.toDate ? d.planUpdatedAt.toDate() : null;
                const lastPlanXp = d.lastPlanXp ?? 0;
                const xp = d.xp || 0;
                const msSince = planUpdatedAt ? (Date.now() - planUpdatedAt.getTime()) : 999999999;
                const hoursSince = msSince / 3600000;
                const daysSince = msSince / 86400000;
                const xpDelta = xp - lastPlanXp;

                // 4 saatlik cooldown (soğuma süresi) ve tetikleyici şartlar
                const cooldownPassed = hoursSince >= 4;
                const shouldReassess = cooldownPassed && (daysSince >= 7 || xpDelta >= 100);

                if (shouldReassess) {
                   authFetch('/api/student', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ uid: user.uid, action: 'reassess' }),
                   }).then(async (r) => {
                      if (r.ok) {
                         await updateDoc(doc(db, 'users', user.uid), { 
                           lastPlanXp: xp,
                           planUpdatedAt: serverTimestamp() // Güncelleme zamanını kaydet
                         });
                      }
                   }).catch(() => { /* sessiz hata */ });
                }
             } catch { /* sessiz hata */ }
           }
        }
      } catch {
        toast.error("Veri bağlantısı kurulamadı!");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchMissionPack = async () => {
      try {
        setMissionLoading(true);
        const res = await authFetch('/api/missions');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gorev paketi alinamadi');
        setMissionPack(data);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(error);
        }
        toast.error('Gorev merkezi baglantisi kurulamadi.');
      } finally {
        setMissionLoading(false);
      }
    };

    fetchMissionPack();
  }, [user]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const diffMs = nextMidnight.getTime() - now.getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      setResetCountdown(`${hours}s ${minutes}dk`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOnboardingComplete = async (dontShowAgain: boolean) => {
    playSound('correct');
    setShowOnboarding(false);
    if (dontShowAgain && user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { 
          onboardingSeen: true,
          updatedAt: serverTimestamp() 
        });
        localStorage.setItem(`onboarding_seen_${user.uid}`, 'true');
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Error updating onboarding status", error);
        }
      }
    }
  };

  const handleOnboardingSkip = () => {
    playSound('click');
    setShowOnboarding(false);
  };

  const handleLogout = async () => {
    playSound('click');
    await logout();
    window.location.href = '/';
  };

  const updateColor = async (color: string) => {
     playSound('click');
     if(!user) return;
     try {
        await updateDoc(doc(db, 'users', user.uid), { 
          shipColor: color,
          updatedAt: serverTimestamp() 
        });
        setStudentData((prev) => (prev ? { ...prev, shipColor: color } : prev));
        toast.success("Gemi rengi güncellendi!");
        setShowGarage(false);
     } catch {
        toast.error("Hata oluştu.");
     }
  };

  if (authLoading || loading) return <LoreLoader />;

  const daily = studentData?.dailyTasks || { count: 0, xp: 0 };
  const shipColor = studentData?.shipColor || 'bg-cyan-500';
  const difficulty = getDifficultyProfile(studentData || undefined);
  const commander = getCommanderProgress(studentData || undefined);
  const completedMissionCount = missionPack?.missions?.filter((mission) => mission.completedAt).length || 0;
  const firstIncompleteIndex = missionPack?.missions?.findIndex((mission) => !mission.completedAt) ?? -1;
  const allMissionsCompleted = !!missionPack?.missions?.length && completedMissionCount === missionPack.missions.length;
  const dailyMissionReport = studentData?.dailyMissionReport;

  const accentStyles: Record<string, string> = {
    cyan: 'from-cyan-500/15 to-blue-500/10 border-cyan-500/30',
    red: 'from-red-500/15 to-orange-500/10 border-red-500/30',
    emerald: 'from-emerald-500/15 to-teal-500/10 border-emerald-500/30',
    purple: 'from-purple-500/15 to-indigo-500/10 border-purple-500/30',
  };

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6 relative z-10 w-full">
      <MissionLaunchModal
        mission={selectedMission}
        locked={
          !!selectedMission &&
          !selectedMission.completedAt &&
          !!missionPack?.missions &&
          missionPack.missions.findIndex((mission) => mission.id === selectedMission.id) > -1 &&
          missionPack.missions.findIndex((mission) => mission.id === selectedMission.id) !== firstIncompleteIndex
        }
        onClose={() => setSelectedMission(null)}
        onLaunch={(mission) => router.push(`${mission.route}?mission=${mission.id}`)}
      />

      {/* ONBOARDING */}
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding 
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        )}
      </AnimatePresence>

      {/* GARAJ MODAL */}
      <AnimatePresence>
        {showGarage && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="glass-panel p-8 max-w-sm w-full relative">
                <h2 className="text-xl font-mono text-cyan-400 mb-6 font-bold flex items-center"><Paintbrush className="mr-2"/> Gemi Rengi Seç</h2>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={()=>updateColor('bg-cyan-500')} className="h-16 rounded-xl bg-cyan-500 border border-white/20 hover:scale-105 transition flex items-center justify-center shrink-0">🚀 Mavi</button>
                   <button onClick={()=>updateColor('bg-purple-500')} className="h-16 rounded-xl bg-purple-500 border border-white/20 hover:scale-105 transition flex items-center justify-center shrink-0">🚀 Mor</button>
                   <button onClick={()=>updateColor('bg-red-500')} className="h-16 rounded-xl bg-red-500 border border-white/20 hover:scale-105 transition flex items-center justify-center shrink-0">🚀 Kırmızı</button>
                   <button onClick={()=>updateColor('bg-emerald-500')} className="h-16 rounded-xl bg-emerald-500 border border-white/20 hover:scale-105 transition flex items-center justify-center shrink-0">🚀 Yeşil</button>
                </div>

                <div className="border-t border-slate-700 pt-6">
                   <h3 className="text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">GÖZCÜ EŞLEŞME KODU</h3>
                   <div className="bg-slate-950 p-4 rounded-xl border border-dashed border-cyan-500/50 flex flex-col items-center">
                      <span className="text-3xl font-mono font-bold text-white tracking-[0.3em]">{studentData?.pairingCode || '------'}</span>
                      <p className="text-[9px] text-slate-500 mt-2 text-center uppercase">VELİNİZ BU KODU GİREREK SİZİ TAKİP EDEBİLİR</p>
                   </div>
                </div>
                <button onClick={() => { playSound('click'); setShowGarage(false); }} className="mt-8 w-full border border-slate-500 text-slate-300 py-3 rounded-lg font-mono hover:bg-slate-800 transition">VAZGEÇ</button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row items-center justify-between bg-blue-900/10 backdrop-blur-md rounded-2xl p-4 border border-blue-500/20 mb-2 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={handleLogout} className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-blue-400 p-2 hover:bg-red-900/40 hover:border-red-500 hover:text-red-400 transition" title="Çıkış Yap">
             <LogOut className="w-full h-full text-slate-400" />
          </button>
          <div className="flex items-center gap-3">
             <div onClick={()=>setShowGarage(true)} className={`w-10 h-10 ${shipColor} rounded-lg flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition border border-white/20`} title="Gemi Garajı">
                🚀
             </div>
             <div>
               <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400">{getRankName(studentData?.level || 1)}</h2>
               <p className="hud-badge text-slate-400">{studentData?.username?.toUpperCase()} (SV. {studentData?.level || 1})</p>
             </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
          <div className="bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-500/20 flex items-center gap-2">
            <TurkishFlag className="w-6 h-4 rounded-[2px]" />
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest hidden sm:inline">TUK - ARF</span>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-blue-500/10 flex items-center gap-2">
            <span className="text-yellow-400 text-lg"><Zap className="w-4 h-4" /></span>
            <span className="text-xl font-mono text-white">{studentData?.xp || 0} XP</span>
          </div>
        </div>
      </header>

      {/* HOLOGRAFİK İLETİŞİM PANELİ */}
      <AnimatePresence>
        {((studentData?.commanderMessage && !studentData.commanderMessage.read) || studentData?.actionPlan) && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            className="overflow-hidden"
          >
            <div className="relative group p-[1px] rounded-2xl bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-orange-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)] mb-4">
              <div className="relative bg-slate-950/90 backdrop-blur-xl rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 border border-white/5">
                {/* Hologram Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(34,211,238,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] pointer-events-none rounded-2xl"></div>
                
                <div className="flex-1 space-y-4 relative z-10 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.3em]">Gelen İletişim Hattı</span>
                    </div>
                    {studentData.commanderMessage?.bonusXp && !studentData.commanderMessage.read ? (
                      <div className="bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-orange-400" />
                        <span className="text-[10px] font-mono font-bold text-orange-300 uppercase">+{studentData.commanderMessage.bonusXp} XP BONUS</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {studentData.actionPlan && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <Orbit className="w-4 h-4" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest">AI Stratejik Rota</span>
                        </div>
                        <p className="text-sm font-mono text-slate-300 leading-relaxed italic border-l-2 border-cyan-500/30 pl-3">
                          &quot;{studentData.actionPlan}&quot;
                        </p>
                      </div>
                    )}
                    
                    {studentData.commanderMessage && !studentData.commanderMessage.read && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-orange-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Komuta Merkezi Mesajı</span>
                        </div>
                        <p className="text-sm font-mono text-slate-300 leading-relaxed border-l-2 border-orange-500/30 pl-3">
                          {studentData.commanderMessage.text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  disabled={clearingMessage}
                  onClick={handleReadMessage}
                  className="w-full md:w-32 h-12 md:h-20 shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group-hover:border-cyan-500/30 relative z-10"
                >
                  {clearingMessage ? (
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Anlaşıldı</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sol Sütun: Görev Paneli */}
        <div className="lg:col-span-2 space-y-6">
          <div className="text-center md:text-left pt-4 pb-4">
            <motion.h1 
              initial={{scale: 0.9}} animate={{scale: 1}}
              className="text-3xl md:text-4xl font-mono font-bold mb-4 uppercase tracking-[0.1em] neon-text-blue"
            >
              Gorev Merkezi
            </motion.h1>
            <p className="hud-badge text-slate-400 w-full md:w-auto overflow-hidden text-clip whitespace-nowrap">AI paketini incele, briefing al ve goreve cik.</p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_35%),rgba(8,15,28,0.85)] p-6 md:p-8">
            <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-cyan-300">
                    <Orbit className="h-4 w-4" />
                    Gunluk AI Paketi
                  </p>
                  <h2 className="text-2xl font-mono font-bold uppercase tracking-[0.08em] text-white">
                    {missionPack?.title || 'Bugunluk Gorev Paketi Hazirlaniyor'}
                  </h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">Durum</p>
                  <p className="text-sm font-mono text-cyan-300">{difficulty.label}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.3fr_0.9fr]">
                <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5">
                  <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">Komutan Notu</p>
                  <p className="text-sm leading-7 text-slate-100">
                    {missionLoading ? 'Komuta yapay zekasi bugunku rota dosyasini derliyor...' : missionPack?.commanderNote}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5">
                  <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">Motivasyon</p>
                  <p className="text-sm leading-7 text-cyan-100">
                    {missionLoading ? 'Bugunluk moral mesaji hazirlaniyor...' : missionPack?.motivationMessage}
                  </p>
                  <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-yellow-300">Ertesi Gün Sıfırlanma</p>
                    <p className="mt-1 text-sm font-mono text-slate-200">Yeni günlük paket yaklaşık {resetCountdown || 'hesaplaniyor'} sonra açılacak.</p>
                    <p className="mt-1 text-[10px] font-mono text-slate-500">Takvim günü değiştiğinde görev zinciri otomatik yenilenir.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {missionLoading && (
              <div className="glass-panel p-8 text-center font-mono text-slate-400">
                AI gorev paketi yukleniyor...
              </div>
            )}

            {!missionLoading && missionPack?.missions?.map((mission, index) => (
              (() => {
                const missionIndex = missionPack.missions.findIndex((item) => item.id === mission.id);
                const locked = !mission.completedAt && firstIncompleteIndex !== -1 && missionIndex > firstIncompleteIndex;
                return (
              <motion.button
                key={mission.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => {
                  if (locked) {
                    playSound('click');
                    toast.error('Bu gorev kilitli. Once siradaki gorevi tamamla.');
                    return;
                  }
                  playSound('click');
                  setSelectedMission(mission);
                }}
                className={`group relative overflow-hidden rounded-[1.7rem] border bg-gradient-to-br p-6 text-left transition ${locked ? 'opacity-55' : 'hover:-translate-y-1'} ${accentStyles[mission.accent] || accentStyles.cyan}`}
              >
                <div className="absolute inset-y-0 right-0 w-32 bg-white/5 blur-2xl transition group-hover:translate-x-2" />
                <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-300">
                        {mission.mode}
                      </span>
                      {mission.completedAt && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Tamamlandi
                        </span>
                      )}
                      {locked && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.25em] text-yellow-200">
                          <Lock className="h-3 w-3" />
                          Kilitli
                        </span>
                      )}
                      <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">
                        {mission.focus}
                      </span>
                    </div>
                    <h3 className="text-xl font-mono font-bold uppercase tracking-[0.08em] text-white">{mission.title}</h3>
                    <p className="max-w-2xl text-sm leading-7 text-slate-300">{mission.briefing}</p>
                  </div>

                  <div className="flex min-w-[170px] flex-col items-start gap-3 rounded-[1.2rem] border border-white/10 bg-slate-950/35 p-4 md:items-end">
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">{mission.difficulty}</p>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-white">+{mission.xpReward} XP</p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400">{mission.estimatedMinutes} dk</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-white">
                      {locked ? 'Sirayi Bekliyor' : mission.completedAt ? 'Tekrar Oyna' : 'Brifingi Ac'}
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </motion.button>
                );
              })()
            ))}
          </div>
        </div>

        {/* Sağ Sütun: Günlük Hedefler ve Özet */}
        <div className="space-y-6">
           {allMissionsCompleted && (
             <div className="glass-panel p-6 relative overflow-hidden border border-emerald-500/20">
               <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-yellow-400"></div>
               <h3 className="hud-badge mb-4 flex items-center">
                 <FileText className="w-4 h-4 mr-2 text-emerald-400" /> GUNUN KOMUTAN RAPORU
               </h3>
               <p className="text-sm font-mono text-white uppercase tracking-widest">{dailyMissionReport?.title || 'Gun Sonu Komutan Raporu'}</p>
               <p className="mt-3 text-sm leading-7 text-slate-300">
                 {dailyMissionReport?.summary || 'Bugunku paket eksiksiz tamamlandi. Sistem seni istikrarli ve gorev disiplinine uygun olarak kaydetti.'}
               </p>
               <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                 <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                   <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Tamamlanan</p>
                   <p className="text-lg font-mono font-bold text-emerald-300">{completedMissionCount}</p>
                 </div>
                 <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                   <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Paket Bonusu</p>
                   <p className="text-lg font-mono font-bold text-yellow-300">+45 XP</p>
                 </div>
                 <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                   <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Durum</p>
                   <p className="text-lg font-mono font-bold text-cyan-300">Temiz Tamamlandi</p>
                 </div>
               </div>
             </div>
           )}

           <div className="glass-panel p-6 relative overflow-hidden border border-cyan-500/20">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="hud-badge mb-2 flex items-center">
                    <Gauge className="w-4 h-4 mr-2 text-cyan-400" /> DINAMIK ZORLUK
                  </h3>
                  <p className="text-sm font-mono text-white uppercase tracking-widest">{difficulty.label}</p>
                  <p className="text-[10px] text-slate-400 font-mono leading-relaxed mt-2">{difficulty.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-mono uppercase">Yogunluk</p>
                  <p className="text-2xl font-mono font-bold text-cyan-400">{difficulty.intensity}/4</p>
                </div>
              </div>
              <div className="w-full bg-slate-900/80 border border-slate-700/50 h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${difficulty.intensity * 25}%` }}
                  className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.45)]"
                />
              </div>
           </div>

           <div className="glass-panel p-6 relative overflow-hidden border border-yellow-500/20">
             <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 blur-3xl rounded-full"></div>
             <h3 className="hud-badge mb-4 flex items-center">
               <ShieldCheck className="w-4 h-4 mr-2 text-yellow-400" /> KOMUTANLIK DOSYASI
             </h3>
             <div className="flex items-center justify-between gap-4 mb-3">
               <div>
                 <p className="text-sm font-mono text-white uppercase tracking-widest">{commander.title}</p>
                 <p className="text-[10px] text-slate-400 font-mono mt-1">{commander.nextStep}</p>
               </div>
               <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${commander.eligible ? 'bg-emerald-900/30 text-emerald-300 border-emerald-500/40' : 'bg-slate-900/60 text-yellow-300 border-yellow-500/30'}`}>
                 %{commander.progress}
               </span>
             </div>
             <div className="w-full bg-slate-900/80 border border-slate-700/50 h-2 rounded-full overflow-hidden mb-4">
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${commander.progress}%` }}
                 className="bg-gradient-to-r from-yellow-500 to-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(250,204,21,0.45)]"
               />
             </div>
             <div className="space-y-2">
               {commander.checks.map((check) => (
                 <div key={check.label} className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wide">
                   <span className={check.passed ? 'text-emerald-300' : 'text-slate-400'}>{check.label}</span>
                   <span className={check.passed ? 'text-emerald-400' : 'text-yellow-300'}>{check.value}</span>
                 </div>
               ))}
             </div>
           </div>

           <div className="glass-panel p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <h3 className="hud-badge mb-4 w-full flex items-center relative z-10"><Flag className="w-4 h-4 mr-2 text-emerald-400"/> GÜNLÜK GEMİ GÖREVLERİ</h3>
              
              <div className="space-y-5 relative z-10">
                <div>
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-[11px] font-mono text-slate-300">Gunluk Paket Tamamlama</span>
                     <span className="text-[11px] font-mono text-emerald-400 font-bold">{completedMissionCount}/{missionPack?.missions?.length || 3}</span>
                   </div>
                   <div className="w-full bg-slate-900/80 border border-slate-700/50 h-2 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }} 
                       animate={{ width: `${Math.min(((completedMissionCount / (missionPack?.missions?.length || 3)) * 100), 100)}%` }} 
                       className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                     />
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-[11px] font-mono text-slate-300">Uzay Ganimeti (100 XP)</span>
                     <span className="text-[11px] font-mono text-yellow-400 font-bold">{daily.xp}/100</span>
                   </div>
                   <div className="w-full bg-slate-900/80 border border-slate-700/50 h-2 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }} 
                       animate={{ width: `${Math.min(((daily.xp || 0) / 100) * 100, 100)}%` }} 
                       className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
                     />
                   </div>
                </div>
              </div>
           </div>

           <div className="glass-panel p-6">
             <h3 className="hud-badge mb-4 flex items-center">
               <Award className="w-4 h-4 mr-2 text-yellow-500" /> ÜNVAN & SİSTEMLER
             </h3>
             <div className="space-y-3">
               <Link href="/ogrenci/madalyalar" prefetch={false} className="w-full block" onClick={() => playSound('click')}>
                 <button className="w-full py-4 rounded-xl border border-yellow-500/30 bg-yellow-900/10 hover:bg-yellow-900/30 flex items-center justify-center gap-3 transition">
                   <Star className="w-5 h-5 text-yellow-500 animate-pulse" />
                   <span className="font-mono text-[10px] tracking-widest text-yellow-400 font-bold uppercase">Madalya Odası</span>
                 </button>
               </Link>
               <Link href="/ogrenci/el-kitabi" prefetch={false} className="w-full block" onClick={() => playSound('click')}>
                 <button className="w-full py-4 rounded-xl border border-cyan-500/30 bg-cyan-900/10 hover:bg-cyan-900/30 flex items-center justify-center gap-3 transition">
                   <BookOpen className="w-5 h-5 text-cyan-400" />
                   <span className="font-mono text-[10px] tracking-widest text-cyan-400 font-bold uppercase">Pilot El Kitabı</span>
                 </button>
               </Link>
             </div>
           </div>
        </div>
      </div>

    </div>
  );
}
