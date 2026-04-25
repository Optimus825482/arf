import React from 'react';

interface AIBriefingProps {
  analysisReady?: boolean;
  message?: string;
}

export default function AIBriefing({ 
  analysisReady = true, 
  message = "Pilot çarpma işlemlerinde %23 gelişim gösterdi. Bölme konusunda ek görev öneriliyor." 
}: AIBriefingProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <div className="w-1.5 h-1.5 rounded-sm bg-cyan-400 animate-pulse"></div>
        <span className="font-label text-[10px] tracking-[0.4em] text-cyan-400 uppercase font-black">AI_STRATEJİK_BRİFİNG</span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-400/20 to-transparent"></div>
      </div>
      
      <div className="relative rounded-sm overflow-hidden border border-cyan-500/20 bg-white/[0.02] hud-glass group shadow-[0_0_30px_rgba(34,211,238,0.08)]">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/10 rounded-sm blur-[80px] pointer-events-none"></div>
        
        {/* HUD Elements */}
        <div className="absolute top-0 right-0 p-2 opacity-30 pointer-events-none">
          <span className="font-label text-[8px] tracking-[0.2em] text-cyan-400 uppercase">ANALYSIS_CORE // v.1.0</span>
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-start gap-5">
            <div className="hidden sm:flex w-12 h-12 rounded-sm bg-cyan-500/10 border border-cyan-500/30 items-center justify-center shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.22)]">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">psychology</span>
            </div>
            
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface uppercase tracking-wider mb-2 flex items-center gap-2">
                  {analysisReady ? "DeepSeek AI Analizi Tamamlandı" : "Veri İşleniyor..."}
                  {analysisReady && <span className="w-2 h-2 bg-cyan-400 rounded-sm animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]"></span>}
                </h3>
                <p className="text-on-surface-variant text-sm font-body leading-relaxed max-w-3xl italic opacity-90 border-l-2 border-cyan-500/30 pl-4 py-1">
                  &ldquo;{message}&rdquo;
                </p>
              </div>

              <div className="flex flex-wrap gap-3 mt-1">
                <button className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-label text-[10px] uppercase tracking-[0.15em] px-5 py-2.5 rounded-sm transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.12)] active:scale-95">
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  DETAYLI ANALİZİ AÇ
                </button>
                <div className="flex items-center gap-4 ml-auto text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest hidden sm:flex">
                  <span>SİNYAL GÜCÜ: %98</span>
                  <span>GÜVEN ARALIĞI: %94</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scanning line for AI effect */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-[scan_3s_linear_infinite]"></div>
      </div>
    </section>
  );
}
