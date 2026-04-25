import React from 'react';
import { Target, Zap, Cpu, Swords, Play, Lock } from 'lucide-react';

export default function MissionGrid() {
  const missions = [
    { 
      id: 'OP-ALPHA', 
      title: 'PRATİK', 
      desc: 'Temel matematik manevraları ve hızlı işlem simülasyonu.', 
      progress: 0, 
      total: 20, 
      icon: Target, 
      color: 'cyan',
      glow: 'shadow-cyan-500/20'
    },
    { 
      id: 'OP-BETA', 
      title: 'YILDIRIM', 
      desc: 'Zamana karşı yüksek yoğunluklu hız testleri.', 
      progress: 0, 
      total: 10, 
      icon: Zap, 
      color: 'red',
      glow: 'shadow-red-500/20'
    },
    { 
      id: 'OP-GAMMA', 
      title: 'AI GÖREV', 
      desc: 'Yapay zeka tarafından optimize edilmiş dinamik zorluk.', 
      progress: 0, 
      total: 5, 
      icon: Cpu, 
      color: 'cyan',
      glow: 'shadow-cyan-500/20'
    },
    { 
      id: 'OP-DELTA', 
      title: 'TAKTİKLER', 
      desc: 'İleri düzey analitik problem çözme ve strateji.', 
      progress: 0, 
      total: 8, 
      icon: Swords, 
      color: 'red',
      glow: 'shadow-red-500/20'
    }
  ];

  return (
    <section className="mt-12 mb-24">
      <div className="flex items-center gap-4 mb-8 px-2">
        <div className="flex gap-1.5">
          <div className="w-2 h-6 bg-cyan-400 rounded-sm shadow-[0_0_15px_rgba(34,211,238,0.6)]"></div>
          <div className="w-1 h-6 bg-cyan-400/20 rounded-sm"></div>
        </div>
        <div>
          <h3 className="font-headline text-xs font-black tracking-[0.4em] text-on-surface uppercase mb-0.5">GÖREV PAKETLERİ</h3>
          <p className="font-label text-[9px] text-cyan-400/40 tracking-widest uppercase">AKTİF OPERASYONLAR</p>
        </div>
        <div className="h-[1px] flex-grow bg-gradient-to-r from-cyan-400/30 to-transparent ml-6"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {missions.map((mission) => (
          <div key={mission.id} className={`relative group/card hud-module p-6 transition-all duration-500 hover:-translate-y-1 shadow-2xl ${mission.glow}`}>
            {/* HUD Corner Accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/10 group-hover/card:border-cyan-400/40 transition-colors"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/10 group-hover/card:border-cyan-400/40 transition-colors"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/10 group-hover/card:border-cyan-400/40 transition-colors"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/10 group-hover/card:border-cyan-400/40 transition-colors"></div>

            {/* Subtle Gradient Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${mission.color}-400/5 blur-[80px] -mr-16 -mt-16 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700`}></div>
            
            <div className="flex items-start justify-between mb-8 relative z-10">
              <div className="flex gap-5">
                <div className={`w-14 h-14 rounded-sm bg-surface-container flex items-center justify-center relative shadow-inner transition-all duration-500`}>
                  <mission.icon className={`w-7 h-7 text-${mission.color}-400 opacity-60 group-hover/card:opacity-100 group-hover/card:scale-110 transition-all duration-500`} />
                  {/* Icon Underglow */}
                  <div className={`absolute inset-0 bg-${mission.color}-400/20 blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity`}></div>
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-headline font-black text-lg tracking-wider text-on-surface uppercase">{mission.title}</h4>
                    <div className={`w-1.5 h-1.5 bg-${mission.color}-400/40 animate-pulse`}></div>
                  </div>
                  <p className="font-label text-[11px] text-on-surface-variant/60 leading-relaxed max-w-[220px] font-medium italic">{mission.desc}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-label text-[9px] tracking-[0.3em] text-white/10 uppercase group-hover/card:text-cyan-400/30 transition-colors">{mission.id}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-white/10"></div>)}
                </div>
              </div>
            </div>

            <div className="mt-auto relative z-10">
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-label text-[10px] tracking-[0.1em] text-on-surface-variant uppercase font-bold">OPERASYON TAMAMLANMA</span>
                </div>
                <span className="font-label text-[11px] tracking-[0.2em] text-on-surface font-black">
                  <span className="text-cyan-400">{mission.progress}</span> <span className="opacity-20">/</span> {mission.total}
                </span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest overflow-hidden mb-6 p-[1px] relative shadow-inner">
                <div 
                  className={`h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 opacity-30 group-hover/card:opacity-100 transition-all duration-1000 ease-out`}
                  style={{ width: `${Math.max(5, (mission.progress / mission.total) * 100)}%` }}
                >
                  <div className="absolute top-0 right-0 h-full w-4 bg-white/30 blur-sm"></div>
                </div>
              </div>
              
              <button className="w-full cyber-button-secondary hover:bg-cyan-400 hover:text-[#0c0e12] text-xs py-4 flex items-center justify-center gap-3 group/btn active:scale-[0.97]">
                {/* Button HUD effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                GÖREVE BAŞLA <Play className="w-4 h-4 fill-current group-hover/btn:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>
        ))}
        
        {/* Placeholder for locked missions */}
        <div className="relative group/card bg-[#0c0e12]/30 p-6 rounded-sm flex flex-center items-center justify-center min-h-[250px] overflow-hidden">
          <div className="flex flex-col items-center gap-4 opacity-20 group-hover/card:opacity-40 transition-opacity">
            <Lock className="w-10 h-10 text-on-surface" />
            <span className="font-label text-[10px] tracking-[0.5em] text-on-surface uppercase font-black">YAKINDA AKTİF OLACAK</span>
          </div>
          {/* HUD scanline over locked card */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] bg-[size:100%_4px] animate-[scanline_10s_linear_infinite] pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
}
