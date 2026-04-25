import React from 'react';

interface GuardianHeaderProps {
  title?: string;
  code?: string;
}

export default function GuardianHeader({ title = "GÖZCÜ PANELİ", code = "MÜR-7429" }: GuardianHeaderProps) {
  return (
    <header className="fixed top-0 w-full z-50 hud-glass border-b border-white/5 backdrop-blur-md px-4 py-3 transition-all duration-300">
      <div className="max-w-5xl mx-auto flex justify-between items-center px-2">
        <div className="flex items-center gap-3">
          <button className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 p-1 rounded-sm flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-2xl">radar</span>
          </button>
          <div className="flex flex-col">
            <span className="font-label text-[10px] tracking-[0.1em] text-outline uppercase mb-0.5 opacity-70">GÖZETİM KODU: {code}</span>
            <h1 className="font-headline uppercase tracking-[0.05em] text-lg font-bold text-cyan-400 tracking-tighter neon-text-primary">
              {title}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="font-label text-[10px] text-cyan-400 uppercase tracking-widest font-bold">SİSTEM ÇALIŞIYOR</span>
            <span className="font-mono text-[9px] text-outline-variant uppercase">v2.4.0-STABLE</span>
          </div>
          
          <button aria-label="Bildirimler" className="text-cyan-400 hover:text-cyan-300 transition-colors opacity-80 hover:opacity-100 p-2 rounded-sm hover:bg-white/5 relative">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#111417]"></span>
          </button>
          
          <div className="w-9 h-9 rounded-sm bg-surface-container-high border border-primary/30 flex items-center justify-center overflow-hidden cyber-border">
            <span className="material-symbols-outlined text-primary/70 text-lg">person</span>
          </div>
        </div>
      </div>
      <div className="scanning-line opacity-50"></div>
    </header>
  );
}
