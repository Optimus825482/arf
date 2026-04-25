import React from 'react';
import { Target, Zap, Shield, Lock, Star } from 'lucide-react';

export default function MedalsSection() {
  const medals = [
    { id: 'M-01', name: 'Keskin Nişancı', icon: Target, color: 'text-cyan-400', glow: 'shadow-cyan-400/20' },
    { id: 'M-02', name: 'Işık Hızı', icon: Zap, color: 'text-secondary', glow: 'shadow-secondary/20' },
    { id: 'M-03', name: 'Kusursuz', icon: Shield, color: 'text-cyan-300', glow: 'shadow-cyan-300/20' },
    { id: 'M-04', name: 'Kilitli', icon: Lock, color: 'text-slate-600', locked: true },
  ];

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-6 px-1">
        <div className="flex items-center gap-1">
          <div className="w-1 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
          <div className="w-1 h-2 bg-cyan-400/40 rounded-full"></div>
        </div>
        <h3 className="font-headline text-xs font-bold tracking-[0.2em] text-on-surface uppercase">BAŞARI VE MADALYALAR</h3>
        <div className="h-[1px] flex-grow bg-gradient-to-r from-cyan-400/20 to-transparent ml-4"></div>
      </div>

      <div className="flex overflow-x-auto gap-5 pb-6 hide-scrollbar snap-x">
        {medals.map((medal) => (
          <div 
            key={medal.id}
            className={`snap-start flex-shrink-0 w-28 h-32 hud-glass rounded-sm border border-white/5 relative group transition-all duration-300 ${medal.locked ? 'opacity-40 grayscale' : 'hover:border-cyan-400/30'}`}
          >
            {/* HUD Corner Decorators */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/30"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/30"></div>
            
            <div className="absolute top-2 left-2 flex items-center gap-1 opacity-40">
              <span className="font-label text-[7px] tracking-[0.1em] text-cyan-400">{medal.id}</span>
            </div>

            <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
              <div className={`relative ${!medal.locked ? medal.glow : ''}`}>
                <medal.icon className={`w-10 h-10 ${medal.color} ${!medal.locked ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]' : ''}`} />
                {!medal.locked && (
                  <div className="absolute -top-1 -right-1">
                    <Star className="w-3 h-3 text-cyan-400 fill-cyan-400 animate-pulse" />
                  </div>
                )}
              </div>
              <span className={`font-label text-[9px] text-center uppercase tracking-[0.1em] leading-tight ${medal.locked ? 'text-slate-500' : 'text-on-surface/80 group-hover:text-cyan-400'}`}>
                {medal.name}
              </span>
            </div>

            {/* Hover Scanline Effect */}
            {!medal.locked && (
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/0 via-cyan-400/5 to-cyan-400/0 translate-y-full group-hover:animate-[scan_2s_linear_infinite] pointer-events-none"></div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
