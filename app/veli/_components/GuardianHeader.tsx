import { UserData } from '@/lib/types';

interface GuardianHeaderProps {
  studentData: UserData | null;
}

export default function GuardianHeader({ studentData }: GuardianHeaderProps) {
  const pilotName = studentData?.username ? studentData.username.toUpperCase() : "BEKLEMEDE";
  const pilotCode = studentData?.pairingCode || "N/A";

  return (
    <header className="fixed top-0 w-full z-50 hud-glass border-b border-white/5 backdrop-blur-md px-3 sm:px-4 py-3 transition-all duration-300">
      <div className="max-w-5xl mx-auto flex justify-between items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 p-1 rounded-sm flex shrink-0 items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-2xl">radar</span>
          </button>
          <div className="flex min-w-0 flex-col">
            <span className="font-label text-[9px] sm:text-[10px] tracking-[0.1em] text-outline uppercase mb-0.5 opacity-70 truncate">PİLOT KODU: {pilotCode}</span>
            <h1 className="font-headline uppercase text-base sm:text-lg font-bold text-cyan-400 tracking-normal neon-text-primary truncate">
              {pilotName} PANELİ
            </h1>
          </div>
        </div>
        
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="font-label text-[10px] text-cyan-400 uppercase tracking-widest font-bold">GÖZETLEME AKTİF</span>
            <span className="font-mono text-[9px] text-outline-variant uppercase">v4.0.0-PRO</span>
          </div>
          
          <button aria-label="Bildirimler" className="text-cyan-400 hover:text-cyan-300 transition-colors opacity-80 hover:opacity-100 p-2 rounded-sm hover:bg-white/5 relative">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#111417]"></span>
          </button>
          
          <div className="w-9 h-9 shrink-0 rounded-sm bg-surface-container-high border border-primary/30 flex items-center justify-center overflow-hidden cyber-border">
            <span className="material-symbols-outlined text-primary/70 text-lg">person</span>
          </div>
        </div>
      </div>
      <div className="scanning-line opacity-50"></div>
    </header>
  );
}
