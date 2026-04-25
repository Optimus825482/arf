import React from 'react';
import Image from 'next/image';
import { Bell, Settings, Terminal } from 'lucide-react';

export default function DashboardHeader() {
  return (
    <header className="fixed top-0 w-full z-50 hud-glass border-b border-cyan-400/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex justify-between items-center px-4 md:px-8 py-3 h-20">
      {/* HUD Scanline Effect inside header */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
      
      <div className="flex items-center gap-4 relative z-10">
        <div className="relative group">
          {/* Avatar Ring Animation */}
          <div className="absolute -inset-1.5 border border-cyan-400/20 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none"></div>
          <div className="absolute -inset-1 border border-cyan-400/40 rounded-full animate-[spin-reverse_15s_linear_infinite] pointer-events-none"></div>
          
          <div className="w-12 h-12 rounded-full bg-[#0c0e12] overflow-hidden border-2 border-cyan-400/50 flex-shrink-0 relative z-10 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            <Image 
              src="/icons/icon-192.png"
              alt="Pilot Avatar"
              width={36}
              height={36}
              className="grayscale brightness-150 contrast-125"
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-cyan-400 border-2 border-[#0c0e12] rounded-full z-20 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Terminal className="w-2 h-2 text-cyan-400/60" />
              <span className="font-label text-[7px] md:text-[8px] tracking-[0.2em] text-cyan-400/70 uppercase">PILOT ID: ARF-7429</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-cyan-400/30"></div>
            <span className="font-label text-[7px] md:text-[8px] tracking-[0.2em] text-cyan-400 font-bold uppercase animate-pulse">SYSTEM ONLINE</span>
          </div>
          <h1 className="font-headline uppercase tracking-[0.25em] text-xs md:text-sm font-black text-on-surface drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            KONTROL <span className="text-cyan-400">MERKEZİ</span>
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-1 md:gap-3 relative z-10">
        <div className="hidden md:flex items-center gap-4 mr-4 px-4 py-1.5 border-l border-r border-white/5 bg-white/5 rounded-sm">
          <div className="flex flex-col items-end">
            <span className="font-label text-[7px] text-cyan-400/60">SEKTÖR</span>
            <span className="font-headline text-[10px] font-bold tracking-widest text-on-surface">GALAKSİ-7</span>
          </div>
          <div className="w-[1px] h-6 bg-white/10"></div>
          <div className="flex flex-col items-end">
            <span className="font-label text-[7px] text-cyan-400/60">SİNYAL</span>
            <div className="flex gap-0.5 mt-0.5">
              {[1, 2, 3, 4].map(i => <div key={i} className={`w-1 h-2 rounded-full ${i <= 3 ? 'bg-cyan-400' : 'bg-cyan-400/20'}`}></div>)}
            </div>
          </div>
        </div>

        <button className="text-cyan-400/60 hover:text-cyan-400 transition-all p-2.5 rounded-sm hover:bg-cyan-400/10 relative group border border-transparent hover:border-cyan-400/20">
          <Bell className="w-5 h-5 group-hover:animate-bounce" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-cyan-400 rounded-full border-2 border-[#0c0e12] animate-pulse"></span>
        </button>
        <button className="text-cyan-400/60 hover:text-cyan-400 transition-all p-2.5 rounded-sm hover:bg-cyan-400/10 border border-transparent hover:border-cyan-400/20">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Header Accent Line */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"></div>
    </header>
  );
}
