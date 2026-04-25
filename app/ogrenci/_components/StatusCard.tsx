import React from 'react';
import { Shield, Flame, Target, Zap, Clock, Activity } from 'lucide-react';
import { UserData } from '@/lib/types';
import { getRankName } from '@/lib/ranks';

interface StatusCardProps {
  data: UserData | null;
}

export default function StatusCard({ data }: StatusCardProps) {
  const level = data?.level || 1;
  const xp = data?.xp || 0;
  const rank = getRankName(level);
  
  // Basit bir XP hesaplama: Her seviye 1000 XP (Geliştirilebilir)
  const nextLevelXp = level * 1000;
  const currentLevelProgressXp = xp % 1000;
  const progressPercent = Math.min(100, Math.max(5, (currentLevelProgressXp / 1000) * 100));

  return (
    <section className="relative rounded-sm overflow-hidden hud-glass group shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      {/* HUD Decorative Brackets */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/40"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/40"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/40"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/40"></div>
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      <div className="p-6 md:p-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
          <div className="relative mx-auto md:mx-0">
            {/* Animated Rings */}
            <div className="absolute -inset-4 border border-cyan-400/10 rounded-sm animate-[spin_12s_linear_infinite]"></div>
            <div className="absolute -inset-2 border border-cyan-400/20 rounded-sm animate-[spin-reverse_8s_linear_infinite]"></div>
            <div className="absolute inset-0 bg-cyan-400/10 blur-2xl rounded-sm animate-pulse"></div>
            
            <div className="w-20 h-20 rounded-sm bg-[#0c0e12] flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
              <Shield className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
              <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-cyan-400 text-[#0c0e12] rounded-sm text-[12px] font-black flex items-center justify-center border-2 border-[#0c0e12] shadow-lg">LVL {level}</div>
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Activity className="w-3 h-3 text-cyan-400/60 animate-pulse" />
              <span className="font-label text-[9px] tracking-[0.4em] text-cyan-400/60 uppercase font-bold">OPERASYONEL RÜTBE</span>
              <div className="h-[1px] w-12 bg-gradient-to-r from-cyan-400/40 to-transparent hidden md:block"></div>
            </div>
            <h2 className="font-headline text-2xl md:text-3xl font-black tracking-tighter text-on-surface uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] leading-none italic">
              {rank.split(' ')[0]} <span className="text-cyan-400">{rank.split(' ').slice(1).join(' ')}</span>
            </h2>
          </div>
        </div>

        {/* XP Progress Section */}
        <div className="mb-10 p-5 bg-white/[0.03] rounded-sm relative overflow-hidden group/xp">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
          
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 animate-bounce" />
              <span className="font-label text-[11px] tracking-[0.25em] text-cyan-400 uppercase font-black">DENEYİM PROTOKOLÜ</span>
            </div>
            <span className="font-label text-[11px] tracking-[0.1em] text-on-surface-variant font-medium">
              <span className="text-cyan-400 font-black text-sm">{xp.toLocaleString()}</span> <span className="opacity-40">/</span> {((level + 1) * 1000).toLocaleString()} XP
            </span>
          </div>
          
          <div className="h-3.5 w-full bg-[#0c0e12] rounded-sm overflow-hidden border border-white/10 relative p-[2px]">
            <div 
              className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all duration-1500 ease-out rounded-sm"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
        </div>

        {/* Tactical Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {[
            { icon: Flame, label: 'SERİ', value: '1 GÜN', color: 'text-secondary', shadow: 'shadow-red-500/20' },
            { icon: Target, label: 'İSABET', value: `${data?.metrics?.accuracy || 0}%`, color: 'text-cyan-400', shadow: 'shadow-cyan-500/20' },
            { icon: Clock, label: 'BİLGİ', value: data?.gradeLevel || 'N/A', color: 'text-cyan-400', shadow: 'shadow-cyan-500/20' },
            { icon: Shield, label: 'GÖZCÜ KODU', value: data?.pairingCode || '---', color: 'text-primary', shadow: 'shadow-primary/20' }
          ].map((stat, i) => (
            <div key={i} className={`bg-[#0c0e12] rounded-sm p-3 md:p-4 text-center group/stat transition-all duration-300 hover:-translate-y-1 shadow-lg ${stat.shadow} ${i === 3 ? 'border border-primary/30' : ''}`}>
              <div className="relative mb-2 md:mb-3">
                <stat.icon className={`w-4 h-4 md:w-5 md:h-5 mx-auto ${stat.color} opacity-70 group-hover/stat:opacity-100 group-hover/stat:scale-110 transition-all duration-300`} />
                <div className={`absolute inset-0 blur-lg ${stat.color} opacity-0 group-hover/stat:opacity-30 transition-opacity`}></div>
              </div>
              <p className="font-label text-[7px] md:text-[9px] tracking-[0.2em] md:tracking-[0.3em] text-on-surface-variant uppercase mb-1 font-bold">{stat.label}</p>
              <p className="font-headline text-[10px] md:text-sm font-black text-on-surface tracking-widest italic">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

