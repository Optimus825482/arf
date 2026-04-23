'use client';

import { motion } from 'motion/react';
import { BookOpen, Rocket, Zap, Trophy, Shield, ArrowLeft, Target, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { playSound } from '@/lib/audio';

export default function PilotElKitabi() {
  const sections = [
    {
      title: "Uçuş Öncesi Kontroller",
      icon: <Rocket className="w-6 h-6" />,
      color: "text-cyan-400",
      content: "Uzay görevine başlamadan önce rütbenizi belirleyen 'Sistem Kalibrasyonu'ndan geçtiniz. Bu test, sizin işlem hızınızı ve doğruluğunuzu ölçer."
    },
    {
      title: "Gelişim Sistemi (XP & Rütbe)",
      icon: <Zap className="w-6 h-6" />,
      color: "text-yellow-400",
      content: "Her başarılı cevap ve tamamlanan görev size XP kazandırır. 100 XP biriktirdiğinizde rütbeniz yükselir. Rütbe yükseldikçe daha karmaşık sistemlere erişim sağlarsınız."
    },
    {
      title: "Saha Eğitimi",
      icon: <Target className="w-6 h-6" />,
      color: "text-blue-400",
      content: "60 saniyelik simülasyonlarda reflekslerinizi test edin. Yanlış cevaplar kalkan enerjinizi (zamanınızı) hızlıca tüketir. Dikkatli olun!"
    },
    {
      title: "Yapay Zeka Görevleri",
      icon: <BrainCircuit className="w-6 h-6" />,
      color: "text-purple-400",
      content: "Derin uzaydan gelen, hikayeli ve karmaşık problemleri çözümleyin. Bu görevler yüksek XP ödülleri ve nadir madalyalar sunar."
    },
    {
      title: "Madalyalar & Başarılar",
      icon: <Trophy className="w-6 h-6" />,
      color: "text-emerald-400",
      content: "Zorlu hedeflere ulaşarak (Örn: Hiç hata yapmadan 20 soru bilmek) kalıcı madalyalar kazanın. Madalyalarınız profilinizde rütbenizin yanında parlar."
    },
    {
      title: "Gemi Özelleştirme",
      icon: <Shield className="w-6 h-6" />,
      color: "text-red-400",
      content: "Ana panodaki gemi simgesine tıklayarak garaja gidebilir ve uzay geminizin rengini rütbenize uygun şekilde özelleştirebilirsiniz."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 max-w-4xl mx-auto relative z-10 w-full">
      <header className="flex items-center justify-between mb-12">
        <Link href="/ogrenci" prefetch={false} onClick={() => playSound('click')} className="flex items-center gap-2 text-slate-400 hover:text-white transition group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition" />
          <span className="font-mono text-sm tracking-widest uppercase">Ana Üs</span>
        </Link>
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-cyan-400" />
          <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-wider">PİLOT EL KİTABI</h1>
        </div>
        <div className="w-20"></div> {/* Spacer for balance */}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-panel p-6 md:p-8 border-t-2 border-slate-700/50 hover:border-cyan-500/50 transition-all group"
          >
            <div className={`p-3 rounded-xl bg-slate-800/80 w-fit mb-6 group-hover:scale-110 transition ${section.color}`}>
              {section.icon}
            </div>
            <h3 className={`text-lg font-mono font-bold uppercase tracking-wide mb-4 ${section.color}`}>
              {section.title}
            </h3>
            <p className="text-slate-400 font-mono text-sm leading-relaxed">
              {section.content}
            </p>
          </motion.div>
        ))}
      </div>

      <footer className="mt-12 text-center">
        <div className="inline-block px-10 py-6 border border-dashed border-slate-700 rounded-3xl">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest leading-loose">
            &quot;BİLGİ, EN GÜÇLÜ KALKANDIR.&quot;<br/>
            - TUAV KOMUTANLIĞI
          </p>
        </div>
      </footer>
    </div>
  );
}
