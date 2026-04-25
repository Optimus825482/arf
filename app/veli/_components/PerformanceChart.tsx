import React from 'react';

export default function PerformanceChart() {
  const days = [
    { label: 'Pzt', value: 60, active: false },
    { label: 'Sal', value: 75, active: false },
    { label: 'Çar', value: 40, active: false },
    { label: 'Per', value: 85, active: false },
    { label: 'Cum', value: 70, active: false },
    { label: 'Cmt', value: 30, active: false },
    { label: 'Paz', value: 95, active: true },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <div className="w-1.5 h-1.5 rounded-sm bg-cyan-400 animate-pulse"></div>
        <span className="font-label text-[10px] tracking-[0.4em] text-cyan-400 uppercase font-black">PERFORMANS_VERİSİ</span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-400/20 to-transparent"></div>
      </div>
      
      <div className="relative rounded-sm overflow-hidden border border-white/5 bg-white/[0.02] hud-glass p-8 min-h-[300px] flex flex-col justify-end group">
        {/* HUD Elements */}
        <div className="absolute top-0 left-0 p-4 flex gap-4 opacity-20 pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] text-cyan-400 font-bold uppercase">SCAN_MODE: ACTIVE</span>
            <span className="font-mono text-[9px] text-cyan-400 font-bold uppercase">REF_INDEX: 7429_Y</span>
          </div>
        </div>

        {/* Decorative grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 pb-12 pointer-events-none opacity-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-[1px] bg-primary"></div>
          ))}
        </div>
        
        {/* Y Axis Labels */}
        <div className="absolute left-3 top-6 bottom-12 flex flex-col justify-between text-[8px] font-mono text-outline-variant">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Bars Container */}
        <div className="flex justify-between items-end h-[160px] pl-8 w-full relative z-10 gap-2 md:gap-6">
          {days.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-3">
              <div 
                className={`w-full max-w-[32px] bg-gradient-to-t from-primary/5 to-primary/${day.active ? '100' : '50'} rounded-t-sm border-t border-primary/40 relative group/bar transition-all duration-700 ease-out hover:scale-x-110`}
                style={{ height: `${day.value}%` }}
              >
                {/* Value tooltip on hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 bg-surface-container-highest border border-primary/30 px-2 py-1 rounded-sm text-[10px] text-primary font-mono transition-all z-20 shadow-xl scale-90 group-hover/bar:scale-100 whitespace-nowrap">
                  VALUE: {day.value}%
                </div>
                
                {/* Glow effect for active or hovered bar */}
                <div className={`absolute inset-0 shadow-[0_0_20px_rgba(34,211,238,${day.active ? '0.3' : '0'})] rounded-t-sm group-hover/bar:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-shadow`}></div>
                
                {/* Animated scanning line on each bar */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/40 animate-pulse"></div>
              </div>
              <span className={`text-[10px] font-label uppercase tracking-[0.2em] transition-colors ${day.active ? 'text-primary font-bold' : 'text-outline-variant opacity-60'}`}>
                {day.label}
              </span>
            </div>
          ))}
        </div>
        
        {/* Bottom decorative bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      </div>
    </section>
  );
}
