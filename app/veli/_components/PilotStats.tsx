import { UserData } from '@/lib/types';

interface PilotStatsProps {
  studentData: UserData | null;
}

export default function PilotStats({ studentData }: PilotStatsProps) {
  if (!studentData) return null;

  const name = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim() || studentData.username || "Bilinmeyen Pilot";
  const level = studentData.level || 1;
  const xp = studentData.xp || 0;
  const nextLevelXp = level * 1000;
  const xpProgress = Math.min((xp / nextLevelXp) * 100, 100);
  
  // Başarı oranı ve diğer metrikler
  const successRate = studentData.metrics?.accuracy 
    ? `${Math.round(studentData.metrics.accuracy * 100)}%` 
    : "87%"; // Fallback
  
  const streak = "7 GÜN"; // Bu veri henüz DB'de yok, şimdilik statik
  const todayMinutes = studentData.dailyTasks?.count 
    ? `${studentData.dailyTasks.count * 2} DK` // Örnek hesaplama
    : "0 DK";

  // Rütbe belirleme
  const getRank = (lvl: number) => {
    if (lvl < 5) return "KADET";
    if (lvl < 15) return "PİLOT";
    return "YILDIZ ÇAVUŞU";
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <div className="w-1.5 h-1.5 rounded-sm bg-cyan-400 animate-pulse"></div>
        <span className="font-label text-[10px] tracking-[0.24em] sm:tracking-[0.4em] text-cyan-400 uppercase font-black">MÜRETTEBAT_DURUMU</span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-400/20 to-transparent"></div>
      </div>
      
      <div className="relative rounded-sm overflow-hidden border border-white/5 bg-white/[0.02] hud-glass group">
        <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
          <span className="font-label text-[9px] tracking-[0.2em] text-cyan-400 font-bold uppercase">
            {'SEC-02 // BIO_DATA'}
          </span>
        </div>
        
        <div className="p-4 sm:p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-sm bg-surface-container-highest border border-primary/20 flex items-center justify-center neon-glow relative">
                <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-400 rounded-sm border-4 border-[#191c1f]"></div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="bg-surface-container-highest border border-primary/20 text-primary font-label text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-sm flex shrink-0 items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-sm bg-primary animate-pulse"></span>
                    SEVİYE {level}
                  </span>
                  <span className="text-on-surface-variant text-[10px] font-label uppercase tracking-wider opacity-70">
                    AKTİF // {studentData.gradeLevel || 'GÖREV_BELİRSİZ'}
                  </span>
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface uppercase tracking-normal sm:tracking-wide neon-text-primary break-words">
                  {name}
                </h2>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-1">
              <span className="font-label text-[10px] tracking-[0.1em] text-on-surface-variant uppercase">RÜTBE SEVİYESİ</span>
              <span className="font-headline text-xl font-bold text-tertiary-container uppercase tracking-widest">{getRank(level)}</span>
            </div>
          </div>

          {/* Progress Bar (Experience) */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <span className="font-label text-[10px] tracking-[0.2em] text-primary uppercase font-bold">Deneyim Puanı (XP)</span>
              <span className="font-mono text-xs text-on-surface-variant">
                <span className="text-primary font-bold">{xp.toLocaleString()}</span> / {nextLevelXp.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full bg-surface-container-highest rounded-sm overflow-hidden cyber-border">
              <div 
                className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-sm relative transition-all duration-1000 ease-out"
                style={{ width: `${xpProgress}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/30 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface-container-highest/30 backdrop-blur-sm rounded-sm p-4 cyber-border text-center group/card transition-all hover:bg-surface-container-highest/50">
              <span className="material-symbols-outlined text-tertiary-container text-xl mb-1 group-hover/card:scale-110 transition-transform">local_fire_department</span>
              <p className="font-label text-[10px] tracking-[0.15em] text-on-surface-variant uppercase mb-1 opacity-70">Seri</p>
              <p className="font-headline text-lg font-bold text-on-surface uppercase">{streak}</p>
            </div>
            <div className="bg-surface-container-highest/30 backdrop-blur-sm rounded-sm p-4 cyber-border text-center group/card transition-all hover:bg-surface-container-highest/50">
              <span className="material-symbols-outlined text-primary text-xl mb-1 group-hover/card:scale-110 transition-transform">check_circle</span>
              <p className="font-label text-[10px] tracking-[0.15em] text-on-surface-variant uppercase mb-1 opacity-70">Başarı</p>
              <p className="font-headline text-lg font-bold text-primary uppercase">{successRate}</p>
            </div>
            <div className="bg-surface-container-highest/30 backdrop-blur-sm rounded-sm p-4 cyber-border text-center group/card transition-all hover:bg-surface-container-highest/50">
              <span className="material-symbols-outlined text-secondary-fixed-dim text-xl mb-1 group-hover/card:scale-110 transition-transform">timer</span>
              <p className="font-label text-[10px] tracking-[0.15em] text-on-surface-variant uppercase mb-1 opacity-70">Süre</p>
              <p className="font-headline text-lg font-bold text-on-surface uppercase">{todayMinutes}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
