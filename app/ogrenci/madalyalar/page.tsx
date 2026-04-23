/* eslint-disable */
"use client";

import { motion } from 'motion/react';
import { ArrowLeft, Loader2, Award, Zap, ShieldAlert, Star, Target, BrainCircuit, Rocket, Flame, Radio, Shield, Crown, Crosshair, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { playSound } from '@/lib/audio';

export default function MadalyaOdasi() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);

  const badgeConfig: Record<string, any> = {
      'isik_hizi_pilotu': {
          name: "Işık Hızı Pilotu",
          icon: <Zap className="w-10 h-10 text-yellow-400" />,
          desc: "Saha eğitiminde 20 barajını aşarak ışık hızına ulaşan pilotlar içindir.",
          rarity: "EFSANEVİ",
          requirement: "Pratik modunda 20+ skor",
          color: "border-yellow-500/50 bg-yellow-950/20 text-yellow-400"
      },
      'radar_sistem_uzmani': {
          name: "Radar Sistem Uzmanı",
          icon: <Radio className="w-10 h-10 text-cyan-400" />,
          desc: "Saha eğitiminde 12 barajını aşan pilotlara verilir.",
          rarity: "HAZİNE",
          requirement: "Pratik modunda 12+ skor",
          color: "border-cyan-500/50 bg-cyan-950/20 text-cyan-400"
      },
      'kalkan_ustasi': {
          name: "Kalkan Ustası",
          icon: <ShieldAlert className="w-10 h-10 text-green-400" />,
          desc: "Toplama ve çıkarma simülasyonlarında sarsılmaz bir isabet sergileyen ustalara verilir.",
          rarity: "DESTANSI",
          requirement: "%95+ Isabet (50+ Deneme)",
          color: "border-green-500/50 bg-green-950/20 text-green-400"
      },
      'kuantum_islemci': {
          name: "Kuantum İşlemci",
          icon: <BrainCircuit className="w-10 h-10 text-blue-400" />,
          desc: "Çarpma ve bölme işlemlerinde kuantum hızında çözüm üreten pilotlar içindir.",
          rarity: "DESTANSI",
          requirement: "%90+ Isabet (30+ Deneme)",
          color: "border-blue-500/50 bg-blue-950/20 text-blue-400"
      },
      'nebula_kasifi': {
          name: "Nebula Kaşifi",
          icon: <Rocket className="w-10 h-10 text-purple-400" />,
          desc: "Bilinmeyen nebulaları keşfeden cesur kaşiflere verilir.",
          rarity: "NADİR",
          requirement: "1000+ Toplam XP",
          color: "border-purple-500/50 bg-purple-950/20 text-purple-400"
      },
      'uzay_operasyon_generali': {
          name: "Uzay Operasyon Generali",
          icon: <Award className="w-10 h-10 text-red-500" />,
          desc: "Yapay zeka operasyonlarını başarıyla koordine eden komutanlara verilir.",
          rarity: "PRESTİJ",
          requirement: "Yapay Zeka Görevi Tamamlama",
          color: "border-red-500/50 bg-red-950/20 text-red-400"
      },
      'kara_delik_madencisi': {
          name: "Kara Delik Madencisi",
          icon: <Flame className="w-10 h-10 text-orange-600" />,
          desc: "En zorlu uzay görevlerini başarıyla tamamlayan pilotlara verilir.",
          rarity: "HAZİNE",
          requirement: "Yapay Zeka Görev Başarısı",
          color: "border-orange-600/50 bg-orange-950/20 text-orange-500"
      },
      'galaksi_koruyucusu': {
          name: "Galaksi Koruyucusu",
          icon: <Shield className="w-10 h-10 text-indigo-400" />,
          desc: "Uygulamada yüksek istikrar ve disiplin gösteren muhafızlara verilir.",
          rarity: "DESTANSI",
          requirement: "100+ Toplam Deneme (%80+ Isabet)",
          color: "border-indigo-500/50 bg-indigo-950/20 text-indigo-300"
      },
      'matematik_ustadi': {
          name: "Matematik Üstadı",
          icon: <Target className="w-10 h-10 text-pink-400" />,
          desc: "Karmaşık ve çok adımlı matematik işlemlerini hatasız çözen üstatlara verilir.",
          rarity: "EFSANEVİ",
          requirement: "Mixed Operasyon Başarısı",
          color: "border-pink-500/50 bg-pink-950/20 text-pink-400"
      },
      'yildiz_kesifcisi': {
          name: "Yıldız Keşifçisi",
          icon: <Star className="w-10 h-10 text-white" />,
          desc: "Eğitim modlarında temel başarı sağlayan keşif ekipleri içindir.",
          rarity: "YAYGIN",
          requirement: "Herhangi bir başarı",
          color: "border-slate-500/50 bg-slate-800/20 text-slate-300"
      },
      'isik_hizinin_otesi': {
          name: "Işık Hızının Ötesi",
          icon: <Crown className="w-10 h-10 text-amber-300" />,
          desc: "Saha eğitiminde 25 barajını aşarak ışığı geçen efsanevi pilotlara verilir.",
          rarity: "MİTİK",
          requirement: "Pratik modunda 25+ skor",
          color: "border-amber-400/50 bg-amber-950/20 text-amber-300"
      },
      'mutlak_dogruluk': {
          name: "Mutlak Doğruluk",
          icon: <Crosshair className="w-10 h-10 text-emerald-400" />,
          desc: "Genel isabette %95 üzeri doğruluk sağlayan nişancılar içindir.",
          rarity: "EFSANEVİ",
          requirement: "%95+ Genel İsabet (100+ Deneme)",
          color: "border-emerald-500/50 bg-emerald-950/20 text-emerald-400"
      },
      'kozmik_fatih': {
          name: "Kozmik Fatih",
          icon: <Globe className="w-10 h-10 text-sky-400" />,
          desc: "500 denemeyi aşarak kozmik bir güç haline gelen fatihlere verilir.",
          rarity: "PRESTİJ",
          requirement: "500+ Toplam Deneme",
          color: "border-sky-500/50 bg-sky-950/20 text-sky-300"
      }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }

    const fetchBadges = async () => {
      try {
         const badgeSnap = await getDocs(collection(db, `users/${user.uid}/badges`));
         const list: string[] = [];
         badgeSnap.forEach(d => {
             list.push(d.id);
         });
         setEarnedBadges(list);
      } catch (e) {
         toast.error("Rozet verileri alınamadı!");
      } finally {
         setLoading(false);
      }
    };

    fetchBadges();
  }, [user, authLoading, router]);

  if (authLoading || loading) return <div className="flex justify-center items-center h-screen relative z-10"><Loader2 className="w-12 h-12 animate-spin text-cyan-400" /></div>;

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-8 relative z-10 w-full">
      <header className="flex flex-col md:flex-row items-center justify-between bg-blue-900/10 backdrop-blur-md rounded-3xl p-6 border border-blue-500/20 mb-2 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Link href="/ogrenci" prefetch={false}>
            <button className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border border-blue-400/50 p-2 hover:bg-slate-700 transition" onClick={() => playSound('click')}>
              <ArrowLeft className="w-full h-full text-cyan-400" />
            </button>
          </Link>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Madalya Odası</h2>
            <p className="hud-badge text-slate-500">TUK ARF Mürettebat Başarı Kayıtları</p>
          </div>
        </div>
        <div className="bg-yellow-900/20 px-6 py-2 rounded-2xl border border-yellow-500/30 flex items-center gap-3">
           <Award className="w-5 h-5 text-yellow-500 animate-bounce" />
           <span className="text-xl font-mono font-bold text-yellow-400">{earnedBadges.length} / {Object.keys(badgeConfig).length}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(badgeConfig).map((id, i) => {
          const isEarned = earnedBadges.includes(id);
          const b = badgeConfig[id];
          
          return (
            <motion.div 
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-panel p-8 flex flex-col items-center text-center relative group overflow-hidden transition-all duration-500 ${isEarned ? `border-2 ${b.color} scale-100` : 'opacity-40 grayscale blur-[1px]'}`}
            >
              {/* Arka Plan Efekti */}
              {isEarned && <div className="absolute -inset-10 bg-white/5 blur-3xl rotate-45 pointer-events-none group-hover:bg-white/10 transition-all"></div>}
              
              <div className={`mb-6 p-4 rounded-full border border-white/5 bg-slate-900/50 shadow-2xl relative ${isEarned ? 'animate-none' : ''}`}>
                 {b.icon}
                 {isEarned && <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>}
              </div>

              <div className="text-[9px] font-mono font-bold tracking-[0.2em] mb-2 opacity-60 uppercase">{b.rarity}</div>
              <h3 className="text-lg font-mono font-bold text-white mb-3 uppercase tracking-wider">{b.name}</h3>
              <p className="text-xs font-mono text-slate-400 leading-relaxed mb-6">
                 {isEarned ? b.desc : "Bu madalyanın detayları komuta merkezi tarafından kilitlenmiştir."}
              </p>
              
              <div className="bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2 mb-6 w-full text-[10px] font-mono text-slate-400">
                <span className="text-cyan-500 font-bold">GEREKSİNİM:</span> {b.requirement}
              </div>

              {isEarned ? (
                 <div className="mt-auto px-4 py-1.5 rounded-full bg-white/10 text-[9px] font-mono font-bold text-white tracking-widest uppercase border border-white/10">
                    AKTİF NİŞAN
                 </div>
              ) : (
                 <div className="mt-auto flex items-center gap-2 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    <Loader2 className="w-3 h-3" /> VERİ BEKLENİYOR
                 </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="glass-panel p-8 border-l-4 border-l-cyan-500">
         <h3 className="text-sm font-mono font-bold text-cyan-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Radio className="w-4 h-4" /> Komutandan Mesaj
         </h3>
         <p className="text-xs font-mono text-slate-400 italic leading-relaxed">
           "Mürettebatın başarısı, her bir personelin madalya odasındaki azmiyle ölçülür. Bu nişanlar sadece görsel birer ödül değil, Türk Uzay Kuvvetleri'ndeki rütbenizin ve yetkinliğinizin sarsılmaz kanıtlarıdır. Tümünü toplamak için uçuşa devam edin!"
         </p>
      </div>
    </div>
  );
}
