'use client';
import React, { useEffect, useState } from 'react';

export default function LoadingAnimation({ onComplete }: { onComplete?: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoaded(true);
      if (onComplete) onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (isLoaded) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-container-lowest">
      {/* Radial Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.1)_0%,transparent_50%)]"></div>
      
      {/* Vector Rocket Logo Animation */}
      <div className="relative w-48 h-48 flex items-center justify-center animate-bounce">
        <svg viewBox="0 0 100 100" className="w-32 h-32 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
          {/* Flame Exhaust (Animated) */}
          <g className="animate-pulse origin-bottom">
            <path d="M 40 80 Q 50 100 60 80 Q 50 90 40 80 Z" fill="#EF4444" />
            <path d="M 45 80 Q 50 95 55 80 Q 50 85 45 80 Z" fill="#F59E0B" />
          </g>
          {/* Rocket Body */}
          <path d="M 50 10 L 30 70 L 40 80 L 60 80 L 70 70 Z" fill="#22D3EE" />
          {/* Cockpit / Inner body */}
          <path d="M 50 20 L 40 65 L 60 65 Z" fill="#0c0e12" />
          {/* White Star */}
          <polygon points="50,30 52,35 57,35 53,38 54,43 50,40 46,43 47,38 43,35 48,35" fill="white" />
          {/* Wings */}
          <path d="M 30 70 L 20 85 L 35 75 Z" fill="#0891B2" />
          <path d="M 70 70 L 80 85 L 65 75 Z" fill="#0891B2" />
        </svg>
      </div>

      {/* Loading Text & Bar */}
      <div className="mt-8 flex flex-col items-center w-64">
        <h2 className="font-headline text-cyan-400 font-bold tracking-[0.2em] mb-4 text-sm animate-pulse uppercase">
          SİSTEMLER BAŞLATILIYOR...
        </h2>
        
        {/* HUD Progress Bar */}
        <div className="w-full h-1 bg-surface-container-highest cyber-border relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-cyan-400 w-full origin-left animate-[scale-x_2s_ease-in-out_forwards] shadow-[0_0_10px_#22d3ee]"></div>
        </div>
        <div className="w-full flex justify-between mt-2">
          <span className="text-[8px] text-outline tracking-[0.1em] font-label">SYS.CHK</span>
          <span className="text-[8px] text-cyan-400 tracking-[0.1em] font-label animate-pulse">OK</span>
        </div>
      </div>
      
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-anim"></div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scale-x {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.7); }
          100% { transform: scaleX(1); }
        }
      `}} />
    </div>
  );
}
