'use client';

import React from 'react';
import StatusCard from './_components/StatusCard';
import MissionGrid from './_components/MissionGrid';
import { Terminal, Shield, Activity, Wifi, Battery, Menu } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

export default function OgrenciPage() {
  const { userData: studentData, loading } = useUserData();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040608] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-cyan-400 animate-pulse" />
          <p className="font-label text-xs tracking-[0.3em] text-cyan-400 uppercase font-black">SİSTEM YÜKLENİYOR...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#040608] text-on-surface font-sans selection:bg-cyan-400 selection:text-[#040608] relative overflow-hidden">
      {/* Premium HUD Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Subtle Cyber Grid */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {/* Animated HUD Scanline */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(34,211,238,0.03)_50%,transparent_100%)] bg-[size:100%_10px] animate-[scanline_10s_linear_infinite]"></div>
        
        {/* Ambient Glows */}
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-cyan-900/10 blur-[120px] rounded-sm"></div>
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-cyan-900/10 blur-[120px] rounded-sm"></div>
      </div>

      {/* Modern HUD Header / Top Bar */}
      <header className="sticky top-0 z-50 hud-glass border-b border-white/5 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-cyan-400/10 rounded-sm border border-cyan-400/20">
            <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="font-headline text-lg font-black tracking-[0.2em] uppercase text-on-surface">ARF <span className="text-cyan-400">OS</span> v4.0</h1>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-label text-[10px] tracking-[0.3em] uppercase text-on-surface-variant font-black">
          <div className="flex items-center gap-2 text-cyan-400">
            <Wifi className="w-3 h-3" /> LINK: AKTIF
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-cyan-400" /> SİSTEM: OPTİMİZE
          </div>
          <div className="flex items-center gap-2">
            <Battery className="w-3 h-3 text-cyan-400" /> ENERJİ: 100%
          </div>
        </div>

        <button className="p-2 hover:bg-white/5 rounded-sm transition-colors md:hidden">
          <Menu className="w-6 h-6 text-on-surface" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Dashboard Left Side: Profile & Stats */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-8">
            <div className="flex items-center gap-3 mb-4 px-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="font-label text-[10px] tracking-[0.5em] text-cyan-400 uppercase font-black">
                {studentData?.firstName ? `${studentData.firstName}_PROFİL` : 'PROFİL_MODÜLÜ'}
              </span>
            </div>
            <StatusCard data={studentData} />
            
            {/* Quick Stats or Activity Log can go here */}
            <div className="hidden lg:block p-6 rounded-sm border border-white/5 bg-white/[0.02] hud-glass">
              <h4 className="font-headline text-[10px] font-black tracking-[0.3em] text-on-surface uppercase mb-4 border-b border-white/5 pb-2">SON AKTİVİTELER</h4>
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3 items-center opacity-60">
                    <div className="w-1.5 h-1.5 rounded-sm bg-cyan-400"></div>
                    <p className="font-label text-[9px] tracking-wider uppercase">OP-ALPHA TAMAMLANDI - <span className="text-cyan-400">50 XP</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dashboard Right Side: Missions & Tasks */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="flex items-center gap-3 mb-4 px-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-label text-[10px] tracking-[0.5em] text-cyan-400 uppercase font-black">OPERASYON_MERKEZİ</span>
            </div>
            <MissionGrid studentData={studentData} />
          </div>
        </div>
      </div>
      
      {/* Decorative Bottom Corner Elements */}
      <div className="fixed bottom-8 left-8 opacity-20 pointer-events-none hidden md:block">
        <p className="font-label text-[8px] tracking-[0.5em] uppercase font-black text-cyan-400 mb-1">SİSTEM GÜVENLİĞİ: SEVİYE 5</p>
        <div className="h-[2px] w-24 bg-gradient-to-r from-cyan-400 to-transparent"></div>
      </div>
    </main>
  );
}

