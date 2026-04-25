'use client';

import React from 'react';
import GuardianHeader from './_components/GuardianHeader';
import PilotStats from './_components/PilotStats';
import AIBriefing from './_components/AIBriefing';
import PerformanceChart from './_components/PerformanceChart';
import ActionRow from './_components/ActionRow';
import GuardianBottomNav from './_components/GuardianBottomNav';
import LoadingAnimation from '@/components/ui/LoadingAnimation';

export default function GuardianDashboard() {
  return (
    <>
      <LoadingAnimation />
      <div className="bg-[#040608] text-on-surface font-sans selection:bg-cyan-400 selection:text-[#040608] min-h-screen flex flex-col pb-24 relative overflow-hidden">
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

        <GuardianHeader />
        
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-24 pb-8 flex flex-col gap-8 relative z-10">
          <PilotStats 
            name="Ahmet Yılmaz"
            code="MÜR-7429"
            status="Aktif"
            lastSeen="2 saat önce"
            streak="7 gün"
            successRate="87%"
            todayMinutes="45 dk"
          />
          
          <AIBriefing />
          
          <PerformanceChart />
          
          <ActionRow />
        </main>

        <GuardianBottomNav />
      </div>
    </>
  );
}
