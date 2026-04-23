/* eslint-disable */
"use client";

import { motion } from 'motion/react';
import { Settings, LogOut, Loader2, Save, ArrowLeft, User, Activity, Target, Zap, Divide, Shield, Download, Award, Star, BrainCircuit, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRankName } from '@/lib/ranks';
import TurkishFlag from '@/components/TurkishFlag';
import { toast } from 'sonner';
import { playSound } from '@/lib/audio';
import { useAuth } from '@/components/AuthProvider';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
import { authFetch } from '@/lib/apiClient';
import ParentOnboarding from '@/components/ParentOnboarding';

const SHOW_API_KEY_INPUT = false;
const StudentProgressChart = dynamic(() => import('@/components/StudentProgressChart'), { ssr: false, loading: () => <div className="text-slate-400 text-sm">Grafik yükleniyor...</div> });

function VeliMessageForm({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [msg, setMsg] = useState('');
  const [bonus, setBonus] = useState(0);
  const [sending, setSending] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true);
    try {
      const res = await authFetch('/api/student/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, message: msg, bonusXp: bonus })
      });
      if (res.ok) {
        toast.success(`${studentName} için talimat gönderildi!`, { icon: "🛸" });
        setMsg('');
        setBonus(0);
        playSound('correct');
      } else {
        const data = await res.json();
        toast.error(data.error || 'İletişim hatası.');
      }
    } catch {
      toast.error('Bağlantı koptu.');
    } finally {
      setSending(sending => false);
    }
  };

  return (
    <form onSubmit={sendMessage} className="flex flex-col sm:flex-row gap-3">
      <input 
        type="text" 
        value={msg}
        onChange={e => setMsg(e.target.value)}
        placeholder="Talimatınızı yazın (örn: İtki sistemlerine odaklan!)"
        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-yellow-500 outline-none"
      />
      <select 
        value={bonus}
        onChange={e => setBonus(Number(e.target.value))}
        className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-yellow-500 outline-none"
      >
        <option value={0}>Bonus Yok</option>
        <option value={25}>+25 XP</option>
        <option value={50}>+50 XP</option>
        <option value={100}>+100 XP</option>
      </select>
      <button 
        disabled={sending || !msg.trim()}
        type="submit"
        className="neon-btn-purple px-6 py-3 font-mono font-bold text-[10px] tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {sending ? <Loader2 className="w-3 h-3 animate-spin"/> : 'GÖNDER'}
      </button>
    </form>
  );
}

export default function VeliDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [briefings, setBriefings] = useState<Record<string, string>>({});
  const [briefingLoading, setBriefingLoading] = useState<Record<string, boolean>>({});
  const [planRefreshing, setPlanRefreshing] = useState<Record<string, boolean>>({});
  const [commanderMsg, setCommanderMsg] = useState<Record<string, string>>({});
  const [bonusXp, setBonusXp] = useState<Record<string, number>>({});
  const [sendingMsg, setSendingMsg] = useState<Record<string, boolean>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [parentName, setParentName] = useState<string | undefined>(undefined);

  
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const seenLocal = typeof window !== 'undefined' ? localStorage.getItem('parent_onboarding_seen_' + user.uid) : null;
        if (seenLocal === 'true') return;
        try {
          const snap = await getDoc(doc(db, 'parents', user.uid));
          if (cancelled) return;
          const data = snap.exists() ? snap.data() : null;
          if (data?.parentName) setParentName(data.parentName as string);
          if (!data?.onboardingSeen) setShowOnboarding(true);
        } catch {
          if (!cancelled) setShowOnboarding(true);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleParentOnboardingComplete = async (dontShowAgain: boolean) => {
    setShowOnboarding(false);
    if (dontShowAgain && user) {
      try { await updateDoc(doc(db, 'parents', user.uid), { onboardingSeen: true }); } catch {}
      try { localStorage.setItem('parent_onboarding_seen_' + user.uid, 'true'); } catch {}
    }
  };
  const handleParentOnboardingSkip = () => setShowOnboarding(false);

  const sendCommanderMessage = async (student: any) => {
    const msg = commanderMsg[student.id];
    if (!msg) {
      toast.error("Lütfen bir mesaj yazın.");
      return;
    }
    
    playSound('click');
    setSendingMsg(prev => ({ ...prev, [student.id]: true }));
    try {
      const res = await authFetch('/api/student/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          message: msg,
          bonusXp: bonusXp[student.id] || 0
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mesaj gönderilemedi');
      
      toast.success('Mesaj başarıyla iletildi.');
      playSound('correct');
      setCommanderMsg(prev => ({ ...prev, [student.id]: '' }));
      setBonusXp(prev => ({ ...prev, [student.id]: 0 }));
    } catch (e: any) {
      toast.error(e.message || 'Hata oluştu.');
      playSound('incorrect');
    } finally {
      setSendingMsg(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const refreshPlan = async (student: any) => {
    playSound('click');
    setPlanRefreshing(prev => ({ ...prev, [student.id]: true }));
    try {
      const res = await authFetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: student.id, action: 'reassess' }),
      });
      const data = await res.json();
      if (data.success) {
        setStudents(prev => prev.map(s => s.id === student.id ? {
          ...s,
          actionPlan: data.actionPlan,
          learningPath: data.learningPath,
          planVersion: data.version,
          planUpdatedAt: { toDate: () => new Date() },
        } : s));
        toast.success(data.aiError ? 'Plan güncellendi (AI kullanılamadı, mevcut plan korundu).' : 'AI yeni plan üretti.');
      } else {
        toast.error('Plan yenilenemedi.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Bağlantı hatası.');
    } finally {
      setPlanRefreshing(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const requestBriefing = async (student: any) => {
    playSound('click');
    setBriefingLoading(prev => ({ ...prev, [student.id]: true }));
    try {
      const res = await authFetch('/api/deepseek-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.username,
          performance: student.performance,
          badges: student.badgeNames,
          level: student.level,
          xp: student.xp,
          actionPlan: student.actionPlan,
          learningPath: student.learningPath
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bir hata oluştu');
      setBriefings(prev => ({ ...prev, [student.id]: data.briefing }));
      toast.success('Yapay zeka analizi tamamlandı.');
      playSound('correct');
    } catch (e: any) {
      toast.error(e.message || 'Analiz alınamadı.');
      playSound('incorrect');
    } finally {
      setBriefingLoading(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const fetchStudents = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch parent doc to get linkedPilots
      const parentRef = doc(db, "parents", user.uid);
      const parentSnap = await getDoc(parentRef);
      
      if (!parentSnap.exists()) {
        setStudents([]);
        return;
      }

      const linkedIds = parentSnap.data().linkedPilots || [];
      const stList: any[] = [];
      
      for (const stId of linkedIds) {
        const docRef = doc(db, "users", stId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) continue;

        const stData = { id: docSnap.id, ...docSnap.data() } as any;
        
        // Fetch performance
        const perfSnap = await getDocs(collection(db, `users/${stId}/performance`));
        let perf: any = {};
        perfSnap.forEach(d => { perf[d.id] = d.data(); });
        stData.performance = perf;

        // Fetch badges
        const badgeSnap = await getDocs(collection(db, `users/${stId}/badges`));
        const badgeList: any[] = [];
        badgeSnap.forEach(d => { badgeList.push(d.data().name); });
        stData.badgeNames = badgeList;

        stList.push(stData);
        if (stData.lastBriefing) {
          setBriefings(prev => ({ ...prev, [stId]: stData.lastBriefing }));
        }
      }
      
      setStudents(stList);

      // Fetch settings
      const settingsSnap = await authFetch('/api/settings?key=deepseek_api_key').then(r => r.json());
      if (settingsSnap.value) setApiKey(settingsSnap.value);

      toast.success("Gözlem telemetri verileri senkronize edildi.");
    } catch (error) {
      console.error(error);
      toast.error('Veri bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }
    fetchStudents();
  }, [user, authLoading, router]);

  const handleLinkPilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode || pairingCode.length !== 6) {
      toast.error("6 haneli geçerli bir kod girin.");
      return;
    }
    if (students.length >= 5) {
      toast.error("Maksimum 5 pilot takip edebilirsiniz.");
      return;
    }

    setLinking(true);
    try {
      const codeRef = doc(db, 'pairingCodes', pairingCode);
      const codeSnap = await getDoc(codeRef);
      
      if (!codeSnap.exists()) {
        toast.error("Geçersiz veya bulunamayan kod!");
        return;
      }

      const studentId = codeSnap.data().userId;
      if (students.some(s => s.id === studentId)) {
        toast.error("Bu pilot zaten listenizde!");
        return;
      }

      const parentRef = doc(db, 'parents', user!.uid);
      const parentSnap = await getDoc(parentRef);
      const currentLinks = parentSnap.data()?.linkedPilots || [];
      
      await updateDoc(parentRef, {
        linkedPilots: [...currentLinks, studentId]
      });

      toast.success("Pilot başarıyla gözlem listenize eklendi!");
      setPairingCode('');
      await fetchStudents();
      router.refresh();
    } catch (e) {
      toast.error("Bağlantı kurulurken hata oluştu.");
    } finally {
      setLinking(false);
    }
  };

  const handleLogout = async () => {
    playSound('click');
    await logout();
    window.location.href = '/';
  };

  const saveSettings = async () => {
    playSound('click');
    setSaving(true);
    try {
      const res = await authFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'deepseek_api_key', value: apiKey })
      });
      if (!res.ok) throw new Error("API kaydı başarısız");
      toast.success('Gemi sistem ayarları güncellendi!');
      playSound('correct');
    } catch (e) {
      toast.error('Kayıt başarısız oldu.');
      playSound('incorrect');
    } finally {
      setSaving(false);
    }
  };

  const generateReport = (student: any) => {
    playSound('click');
    const p = student.performance || {};
    const addSub = p['add_sub']?.totalAttempts > 0 ? Math.round((p['add_sub'].correctAttempts / p['add_sub'].totalAttempts) * 100) : 0;
    const mulDiv = p['mul_div']?.totalAttempts > 0 ? Math.round((p['mul_div'].correctAttempts / p['mul_div'].totalAttempts) * 100) : 0;
    const accuracy = p['classic']?.totalAttempts > 0 ? Math.round((p['classic'].correctAttempts / p['classic'].totalAttempts) * 100) : 0;
    const badgesString = student.badgeNames?.length > 0 ? student.badgeNames.join(', ') : 'Henuz kazanilmadi';

    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("T.U.K. - ARF GEMI PERSONEL RAPORU", 20, 20);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("--------------------------------------------------", 20, 30);
      doc.text(`PERSONEL: ${student.username.toUpperCase()}`, 20, 40);
      doc.text(`TARIH: ${new Date().toLocaleDateString('tr-TR')}`, 20, 50);
      
      doc.setFont("helvetica", "bold");
      doc.text("1. GENEL STATU", 20, 65);
      doc.setFont("helvetica", "normal");
      doc.text(`- Mevcut Seviye: ${student.level || 1}`, 25, 75);
      doc.text(`- Toplam Deneyim (XP): ${student.xp || 0}`, 25, 85);
      doc.text(`- Onur Nisanlari: ${badgesString}`, 25, 95);
      
      doc.setFont("helvetica", "bold");
      doc.text("2. TEKNIK YETKINLIK ANALIZI", 20, 110);
      doc.setFont("helvetica", "normal");
      doc.text(`- İletisim & Hiz (Genel Dogruluk): %${accuracy}`, 25, 120);
      doc.text(`- Kalkan Yonetimi (Toplama/Cikarma): %${addSub}`, 25, 130);
      doc.text(`- Itki Sistemleri (Carpma/Bolme): %${mulDiv}`, 25, 140);
      
      doc.setFont("helvetica", "bold");
      doc.text("3. SISTEM ONERISI", 20, 155);
      doc.setFont("helvetica", "normal");
      const advice = accuracy > 80 ? 'Pilot ustun performans gosteriyor. Zorluk artirilabilir.' : 'Murettebatin simulasyon egitimlerine katilmasi tavsiye edilir.';
      doc.text(advice, 25, 165);
      
      doc.text("--------------------------------------------------", 20, 180);
      doc.setFontSize(10);
      doc.text("TUK KOMUTA MERKEZI GUVENLIGIYLE IMZALANMISTIR.", 20, 190);
      
      doc.save(`ARF_Rapor_${student.username}.pdf`);
      toast.success('Personel raporu (PDF) indirildi.');
    });
  };

  if (authLoading || loading) return <div className="flex justify-center items-center h-screen relative z-10"><Loader2 className="w-12 h-12 animate-spin text-purple-400" /></div>;

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6 relative z-10">
      <header className="flex items-center justify-between bg-purple-900/10 backdrop-blur-md rounded-2xl p-4 border border-purple-500/20 mb-2">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-purple-400/50 p-2 hover:bg-slate-700 transition" onClick={() => playSound('click')}>
              <ArrowLeft className="w-full h-full text-purple-400" />
            </button>
          </Link>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-purple-400">GÖREV GÖZCÜSÜ</h2>
            <p className="hud-badge text-slate-400">Mürettebat İzleme Paneli</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-500/20 flex items-center gap-2">
             <TurkishFlag className="w-6 h-4 rounded-[2px]" />
             <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest hidden sm:inline">TUK - GÖZCÜ</span>
           </div>
           <button onClick={handleLogout} className="p-2 bg-red-900/40 text-red-400 rounded-lg hover:bg-red-900/60 transition" title="Çıkış Yap">
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </header>

      {/* Pilot Bağlama Bölümü */}
      <div className="glass-panel p-6 border-b-2 border-b-purple-500 mb-8">
         <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-purple-900/30 rounded-xl border border-purple-500/30">
                  <User className="w-6 h-6 text-purple-400" />
               </div>
               <div>
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest">YENİ PİLOT GÖZLEMİNE BAŞLA</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Pilotun 6 haneli eşleşme kodunu girin (Max 5)</p>
               </div>
            </div>
            
            <form onSubmit={handleLinkPilot} className="flex items-center gap-2 w-full md:w-auto">
               <input 
                  type="text" 
                  value={pairingCode}
                  onChange={e => setPairingCode(e.target.value.toUpperCase())}
                  placeholder="KOD..."
                  maxLength={6}
                  className="bg-slate-950 border border-slate-700 p-3 rounded-xl font-mono text-white focus:border-purple-500 w-32 text-center tracking-[0.2em] outline-none"
               />
               <button 
                  disabled={linking || students.length >= 5}
                  type="submit"
                  className="neon-btn-purple px-6 py-3 font-mono font-bold text-[10px] tracking-widest disabled:opacity-50"
               >
                  {linking ? <Loader2 className="w-4 h-4 animate-spin"/> : 'GÖZLEMLE'}
               </button>
            </form>
         </div>
      </div>

      {students.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 font-mono">
           Sisteme bağlı mürettebat kaydı bulunamadı. Lütfen yukarıdan pilot kodu ile bağlantı kurun.
        </div>
      ) : students.map((student) => {
         const p = student.performance || {};
         const addSub = p['add_sub']?.totalAttempts > 0 ? Math.round((p['add_sub'].correctAttempts / p['add_sub'].totalAttempts) * 100) : 0;
         const mulDiv = p['mul_div']?.totalAttempts > 0 ? Math.round((p['mul_div'].correctAttempts / p['mul_div'].totalAttempts) * 100) : 0;
         const accuracy = p['classic']?.totalAttempts > 0 ? Math.round((p['classic'].correctAttempts / p['classic'].totalAttempts) * 100) : 0;
         const mentalMath = student.metrics?.mentalMathScore ?? null;
         const scoreMap: Array<[string, number]> = [
           ['Toplama/Çıkarma', addSub || student.metrics?.addSubScore || 0],
           ['Çarpma/Bölme', mulDiv || student.metrics?.mulDivScore || 0],
           ...(mentalMath !== null ? [['Zihinden Hızlı', mentalMath] as [string, number]] : []),
         ];
         const weakest = scoreMap.reduce((w, c) => (c[1] < w[1] ? c : w), scoreMap[0] || ['—', 0]);
         const planUpdatedLabel = student.planUpdatedAt?.toDate
           ? student.planUpdatedAt.toDate().toLocaleDateString('tr-TR')
           : '—';
         const packageCompleted = student.dailyMissionProgress?.completedCount || 0;
         const packageTotal = student.dailyMissionProgress?.totalCount || student.dailyMissionPack?.missions?.length || 3;
         const packageDone = packageTotal > 0 && packageCompleted >= packageTotal;

         return (
          <div key={student.id} className="space-y-6 mb-12">
            {/* Üst Bilgi ve Rapor Butonu */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-3">
                <User className="w-6 h-6" /> {student.username} 
                <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full border border-white/10 uppercase">Mürettebat</span>
              </h3>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => generateReport(student)} 
                  className="flex items-center justify-center gap-2 text-xs font-mono font-bold bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 px-6 py-3 rounded-xl transition"
                >
                  <Download className="w-4 h-4" /> RAPOR ÜRET VE İNDİR
                </button>
              </div>
            </div>

            {/* KOMUTAN MESAJI PANELİ (YENİ) */}
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="glass-panel p-6 border-l-4 border-l-yellow-500 bg-yellow-500/5">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1 w-full">
                     <h4 className="text-xs font-mono font-bold text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> KOMUTAN TALİMATI GÖNDER
                     </h4>
                     <VeliMessageForm studentId={student.id} studentName={student.username} />
                  </div>
                  <div className="hidden lg:block w-px h-16 bg-white/10 mx-4"></div>
                  <div className="text-left md:text-right space-y-1">
                     <p className="text-[9px] font-mono text-slate-500 uppercase">Aktif Bonus Durumu</p>
                     <p className="text-xs font-mono text-slate-300">
                        {student.commanderMessage && !student.commanderMessage.read 
                          ? `BEKLEYEN: ${student.commanderMessage.message.substring(0, 20)}...` 
                          : 'YENİ TALİMAT BEKLENİYOR'}
                     </p>
                  </div>
               </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Seviye Kartı */}
              <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="glass-panel p-6 border-t-2 border-purple-500 flex flex-col items-center">
                 <div className="text-5xl font-mono font-bold neon-text-purple">S. {student.level || 1}</div>
                 <div className="text-[10px] font-mono font-bold text-purple-400 mb-2 uppercase tracking-tighter text-center">{getRankName(student.level || 1)}</div>
                 <div className="text-slate-500 font-mono text-[10px] uppercase mb-4 tracking-widest">{student.xp || 0} XP TOPLANDI</div>
                 <div className="w-full bg-slate-800 h-1.5 rounded-full mb-4">
                    <div className="bg-purple-500 h-full rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" style={{ width: `${(student.xp % 100)}%` }}></div>
                 </div>
                 <div className="mt-auto flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span className="text-[10px] font-mono text-slate-300">{student.badgeNames?.length || 0} Nişan</span>
                 </div>
              </motion.div>

              {/* Performans Kartı */}
              <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{delay:0.1}} className="md:col-span-2 glass-panel p-6 flex flex-col gap-6">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center flex-1">
                    <div className="text-center">
                        <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <div className="text-2xl font-mono font-bold text-white">%{accuracy}</div>
                        <div className="text-[8px] font-mono text-slate-500 uppercase">İSABET</div>
                    </div>
                    <div className="text-center">
                        <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <div className="text-2xl font-mono font-bold text-white">%{addSub}</div>
                        <div className="text-[8px] font-mono text-slate-500 uppercase">KALKAN (T/Ç)</div>
                    </div>
                    <div className="text-center">
                        <Divide className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-mono font-bold text-white">%{mulDiv}</div>
                        <div className="text-[8px] font-mono text-slate-500 uppercase">İTKİ (Ç/B)</div>
                    </div>
                    {mentalMath !== null && (
                      <div className="text-center">
                          <BrainCircuit className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                          <div className="text-2xl font-mono font-bold text-white">%{mentalMath}</div>
                          <div className="text-[8px] font-mono text-slate-500 uppercase">ZİHİNDEN HIZLI</div>
                      </div>
                    )}
                 </div>

                 <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3 text-[10px] font-mono">
                    <span className="bg-red-900/20 border border-red-500/30 text-red-300 px-2 py-1 rounded">
                      🎯 ODAK: {weakest[0]} (%{weakest[1]})
                    </span>
                    <span className="bg-slate-800/60 border border-white/10 text-slate-400 px-2 py-1 rounded">
                      Plan v{student.planVersion || 1} · {planUpdatedLabel}
                    </span>
                    <button
                      onClick={() => refreshPlan(student)}
                      disabled={!!planRefreshing[student.id]}
                      className="ml-auto bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/40 text-purple-300 px-3 py-1 rounded disabled:opacity-50 flex items-center gap-1"
                    >
                      {planRefreshing[student.id] ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                      PLANI YENİLE
                    </button>
                 </div>

                 {(student.actionPlan || student.learningPath) && (
                    <div className="border-t border-white/5 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {student.actionPlan && (
                          <div className="bg-blue-900/10 p-3 rounded-lg border border-blue-500/20">
                             <div className="text-[8px] font-mono font-bold text-blue-400 uppercase mb-1 text-left">AI Stratejik Plan</div>
                             <p className="text-[10px] font-mono text-slate-300 italic text-left">"{student.actionPlan}"</p>
                          </div>
                       )}
                       {student.learningPath && (
                          <div className="bg-purple-900/10 p-3 rounded-lg border border-purple-500/20">
                             <div className="text-[8px] font-mono font-bold text-purple-400 uppercase mb-1 text-left">Gelişim Rotası</div>
                             <p className="text-[10px] font-mono text-slate-300 leading-tight text-left">{student.learningPath}</p>
                          </div>
                       )}
                    </div>
                 )}
              </motion.div>
            </div>

            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{delay:0.15}} className="glass-panel p-6 border-t-2 border-emerald-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-mono text-emerald-400 font-bold uppercase tracking-wider">BUGÜN PAKET TAMAMLANDI MI?</h4>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">Günlük görev zinciri ilerleme durumu ve rapor oluşumu</p>
                </div>
                <span className={`px-3 py-2 rounded-full text-[10px] font-mono uppercase tracking-[0.25em] border ${packageDone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'}`}>
                  {packageDone ? 'Tamamlandi' : 'Devam Ediyor'}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2 text-[10px] font-mono uppercase tracking-[0.2em]">
                  <span className="text-slate-400">Günlük Paket İlerlemesi</span>
                  <span className="text-emerald-300">{packageCompleted}/{packageTotal}</span>
                </div>
                <div className="w-full bg-slate-900/80 border border-slate-700/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full" style={{ width: `${Math.min((packageCompleted / Math.max(packageTotal, 1)) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Son Görev Kaydı</p>
                  <p className="mt-2 text-sm font-mono text-slate-200">{student.dailyMissionProgress?.lastCompletedMode || 'Henüz kayıt yok'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Komutan Raporu</p>
                  <p className="mt-2 text-sm font-mono text-slate-200">{student.dailyMissionReport?.summary || 'Bugün için henüz tam paket raporu oluşmadı.'}</p>
                </div>
              </div>
            </motion.div>

            {/* GRAFİK BİLEŞENİ */}
            <StudentProgressChart userId={student.id} />

            {/* KOMUTAN MESAJI GÖNDER */}
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{delay:0.18}} className="glass-panel p-6 border-t-2 border-orange-500 mt-6">
              <h4 className="text-lg font-mono text-orange-400 font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" /> KOMUTAN MESAJI GÖNDER
              </h4>
              <div className="space-y-4">
                <textarea
                  value={commanderMsg[student.id] || ''}
                  onChange={(e) => setCommanderMsg(prev => ({ ...prev, [student.id]: e.target.value }))}
                  placeholder="Pilotuna bir görev emri veya motivasyon mesajı yaz..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500 transition-colors min-h-[100px]"
                />
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1 ml-1">XP Bonusu (Opsiyonel)</label>
                    <select
                      value={bonusXp[student.id] || 0}
                      onChange={(e) => setBonusXp(prev => ({ ...prev, [student.id]: Number(e.target.value) }))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                    >
                      <option value={0}>Bonus Yok</option>
                      <option value={10}>10 XP</option>
                      <option value={25}>25 XP</option>
                      <option value={50}>50 XP</option>
                      <option value={100}>100 XP</option>
                    </select>
                  </div>
                  <button
                    disabled={sendingMsg[student.id] || !commanderMsg[student.id]}
                    onClick={() => sendCommanderMessage(student)}
                    className="sm:w-48 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                  >
                    {sendingMsg[student.id] ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Zap className="w-4 h-4" /> MESAJI İLET</>}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* YAPAY ZEKA ANALİZİ BİLEŞENİ */}
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{delay:0.2}} className="glass-panel p-6 border-t-2 border-blue-500 mt-6">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                 <h4 className="text-lg font-mono text-blue-400 font-bold uppercase tracking-wider flex items-center gap-2">
                   <BrainCircuit className="w-5 h-5" /> DEEPSEEK YAPAY ZEKA ANALİZİ
                 </h4>
                 <button 
                   onClick={() => requestBriefing(student)} 
                   disabled={briefingLoading[student.id]}
                   className="neon-btn-purple px-6 py-2 font-mono font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                 >
                   {briefingLoading[student.id] ? <Loader2 className="w-4 h-4 animate-spin"/> : 'ANALİZ BAŞLAT'}
                 </button>
               </div>
               
               {briefings[student.id] && (
                 <div className="bg-slate-900/50 p-4 md:p-6 rounded-xl border border-blue-500/20 text-slate-300 font-sans text-sm leading-relaxed prose prose-invert max-w-none">
                   <ReactMarkdown>{briefings[student.id]}</ReactMarkdown>
                 </div>
               )}
               {!briefings[student.id] && !briefingLoading[student.id] && (
                 <div className="text-slate-500 font-mono text-xs text-center py-4">
                   Yapay zeka analizini başlatmak için yukarıdaki butona tıklayın.
                 </div>
               )}
            </motion.div>
          </div>
         );
      })}

      {SHOW_API_KEY_INPUT && (
      <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.3}} className="glass-panel p-8">
        <h2 className="text-xl font-mono text-white mb-6 font-bold flex items-center gap-3">
          <Settings className="w-6 h-6 text-slate-400" /> GEMİ SİSTEM AYARLARI 
        </h2>
        <div className="space-y-4">
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest">DeepSeek AI Protokol Anahtarı</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..." 
              className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button disabled={saving} onClick={saveSettings} className="neon-btn-purple px-10 py-3 shrink-0 flex items-center justify-center gap-2 font-mono font-bold">
               {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-5 h-5" /> KAYDET</>}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
            * Öğrencinin AI görev odasını aktif etmek için DeepSeek API anahtarı gereklidir. Bu anahtar güvenli sunucularımızda saklanır.
          </p>
        </div>
      </motion.div>
      )}
      {showOnboarding && (
        <ParentOnboarding
          parentName={parentName}
          onComplete={handleParentOnboardingComplete}
          onSkip={handleParentOnboardingSkip}
        />
      )}
    </div>
  );
}
