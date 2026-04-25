"use client";

import { motion } from 'motion/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { playSound } from '@/lib/audio';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AppLoader from '@/components/AppLoader';
import HudPanel from '@/components/HudPanel';
import TurkishFlag from '@/components/TurkishFlag';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      // Check role and redirect
      const checkRole = async () => {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          router.replace(userSnap.data()?.role === 'parent' ? '/veli' : '/ogrenci');
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

  if (loading) {
    return (
      <AppLoader
        variant="fullscreen"
        accent="cyan"
        title="Ana üs açılıyor"
        subtitle="Pilot kimliği doğrulanıyor"
        messages={[
          'Komuta kaydı taranıyor...',
          'Mürettebat profili aranıyor...',
          'Yıldız hattı açılıyor...',
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen items-center justify-center p-4 relative z-10 overflow-hidden bg-background">
      {/* Ambient Space Background Particles Simulation */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{ backgroundImage: "radial-gradient(1px 1px at 10% 20%, white, transparent), radial-gradient(1px 1px at 40% 60%, white, transparent), radial-gradient(1px 1px at 80% 30%, white, transparent), radial-gradient(1px 1px at 90% 80%, white, transparent), radial-gradient(2px 2px at 30% 90%, rgba(34, 211, 238, 0.5), transparent), radial-gradient(2px 2px at 70% 10%, rgba(34, 211, 238, 0.5), transparent)" }}></div>
      <div className="scanline-anim"></div>

      <main className="relative z-10 w-full max-w-lg px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <HudPanel className="mb-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
            
            {/* Top Badge */}
            <div className="flex items-center justify-center gap-2 mb-8 bg-[#282a2e] px-4 py-1.5 rounded-sm border border-[#ffb3ad]/10 shadow-[0_0_15px_rgba(34,211,238,0.05)] mx-auto w-fit">
              <TurkishFlag className="w-4 h-3 rounded-[2px]" />
              <span className="font-headline text-[10px] text-cyan-400 font-bold tracking-widest uppercase">TÜRK UZAY KUVVETLERİ</span>
              <TurkishFlag className="w-4 h-3 rounded-[2px]" />
            </div>

            {/* ARF Emblem & Logo */}
            <div className="relative mb-8 flex justify-center">
              <div className="absolute inset-0 bg-cyan-400/10 rounded-full blur-2xl scale-150"></div>
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                  filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
                }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="w-36 h-36 rounded-full border border-cyan-400/30 bg-[#0c0e12] flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(34,211,238,0.15)] overflow-hidden"
              >
                <div className="absolute inset-2 rounded-full border border-cyan-400/10 border-dashed"></div>
                <Image 
                  src="/icons/icon-512.png" 
                  alt="ARF Logo" 
                  width={85} 
                  height={85} 
                  className="relative z-10 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                  priority
                />
              </motion.div>

              {/* Orbit Rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border border-cyan-400/10 border-t-cyan-400/40 loader-ring"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full border border-cyan-400/5 border-b-cyan-400/30 loader-ring-reverse"></div>
            </div>

            {/* Text Content */}
            <div className="relative z-10">
              <h1 className="font-headline text-xl text-cyan-400 tracking-[0.15em] uppercase font-bold mb-3 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                HOŞ GELDİN PİLOT
              </h1>
              <p className="text-on-surface-variant text-xs mb-10 max-w-xs mx-auto font-body leading-relaxed tracking-wide">
                MATEMATİK GÖREVLERİNİ TAMAMLA, RÜTBE KAZAN VE GALAKSİYE HÜKMET.
              </p>
            </div>

            {/* Action Area */}
            <div className="w-full flex flex-col gap-4 relative z-10">
              <Link href="/auth" prefetch={false} onClick={() => playSound('click')} className="w-full">
                <button className="w-full bg-cyan-400 text-on-primary font-headline font-bold uppercase tracking-[0.2em] py-4.5 px-6 rounded-sm flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-500 relative overflow-hidden group/btn">
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
                  <Rocket className="w-5 h-5 group-hover/btn:-translate-y-1 group-hover/btn:translate-x-1 transition-transform duration-300" />
                  <span className="relative z-10">SİSTEME BAĞLAN</span>
                </button>
              </Link>
            </div>

            {/* Terminal Decorator */}
            <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center opacity-60">
              <div className="flex gap-4">
                <span className="font-label text-[8px] text-cyan-400/70 tracking-[0.2em]">SYS: ACTIVE</span>
                <span className="font-label text-[8px] text-cyan-400/70 tracking-[0.2em]">NET: SECURE</span>
              </div>
              <span className="font-label text-[8px] text-cyan-400/70 tracking-[0.2em]">V1.2.0-STABLE</span>
            </div>
          </HudPanel>
        </motion.div>

        {/* Footer Links */}
        <div className="mt-10 flex flex-col items-center gap-6">
          <div className="flex gap-6 text-[9px] font-label tracking-[0.2em] text-outline uppercase">
            <Link href="/privacy" className="hover:text-cyan-400 transition-colors duration-300">Gizlilik</Link>
            <span className="opacity-20">|</span>
            <Link href="/terms" className="hover:text-cyan-400 transition-colors duration-300">Kullanım</Link>
          </div>
          
          {/* Install Prompt Hint */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-2.5 bg-surface-container-high/40 px-4 py-2 rounded-sm border border-outline-variant/20 backdrop-blur-sm group hover:border-cyan-400/30 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-bounce" />
            <span className="text-[9px] font-label text-on-surface-variant uppercase tracking-[0.2em]">Ana Ekrana Ekle</span>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
