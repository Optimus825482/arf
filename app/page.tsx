"use client";

import { motion } from 'motion/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket } from 'lucide-react';
import Link from 'next/link';
import TurkishFlag from '@/components/TurkishFlag';
import ArfLogo from '@/components/ArfLogo';
import { playSound } from '@/lib/audio';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      // Check role and redirect
      const checkRole = async () => {
        const studentSnap = await getDoc(doc(db, 'users', user.uid));
        if (studentSnap.exists()) {
          router.replace('/ogrenci');
          return;
        } 
        
        const parentSnap = await getDoc(doc(db, 'parents', user.uid));
        if (parentSnap.exists()) {
          router.replace('/veli');
        }
      };
      checkRole();
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col flex-1 min-h-screen items-center justify-center p-4 relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-lg w-full p-10 text-center space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 to-red-500"></div>
        <div className="flex justify-center mb-4 relative z-10 pt-4">
          <div className="flex items-center gap-2 mb-2 text-red-500 text-sm font-bold tracking-widest font-mono uppercase bg-red-950/30 px-4 py-1.5 rounded-full border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <TurkishFlag className="w-5 h-3.5 rounded-[2px]" /> TÜRK UZAY KUVVETLERİ
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full"></div>
             <ArfLogo className="w-24 h-24 shrink-0 relative z-10 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <h1 className="text-5xl font-mono font-bold uppercase tracking-[0.2em] neon-text-cyan flex items-center justify-center gap-4">
            <span className="h-1 w-6 bg-cyan-500/50 rounded-full"></span>
            ARF
            <span className="h-1 w-6 bg-cyan-500/50 rounded-full"></span>
          </h1>
          <p className="hud-badge text-slate-300 border-red-500/30 font-bold bg-red-950/20 uppercase tracking-widest">ARF Uzay Gemisine Hoş Geldin!</p>
        </div>

        <div className="mt-8 pt-4 relative z-10">
          <Link href="/auth" prefetch={false} onClick={() => playSound('click')}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full relative flex items-center justify-center gap-4 p-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl transition-all group overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.3)]"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <Rocket className="w-6 h-6 group-hover:animate-bounce" />
              <span className="font-mono font-black text-xl uppercase tracking-widest">Sisteme Bağlan</span>
            </motion.button>
          </Link>
          <p className="text-[10px] text-slate-500 font-mono mt-4 uppercase">Kayıtlı değilsen otomatik olarak kayıt işlemine yönlendirileceksin.</p>
        </div>

        <div className="pt-6 mt-2 border-t border-white/5 relative z-10 space-y-4">
          <div className="flex items-center justify-center gap-3 flex-wrap text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
            <Link href="/privacy" prefetch={false} className="hover:text-cyan-300 transition-colors">
              Gizlilik Bildirimi
            </Link>
            <span className="text-slate-700">|</span>
            <Link href="/terms" prefetch={false} className="hover:text-cyan-300 transition-colors">
              Kullanim Kosullari
            </Link>
            <span className="text-slate-700">|</span>
            <a href="mailto:ikinciyenikitap54@gmail.com" className="hover:text-cyan-300 transition-colors">
              Iletisim
            </a>
          </div>

          <div className="text-center space-y-1">
            <p className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-cyan-400">
              ARF
            </p>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
              Turk Uzay Kuvvetleri Akademisi Matematik Platformu
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
