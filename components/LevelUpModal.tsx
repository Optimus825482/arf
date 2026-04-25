"use client";

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { getRankName } from '@/lib/ranks';
import { Award, Zap } from 'lucide-react';
import { playSound } from '@/lib/audio';

interface LevelUpModalProps {
  level: number;
  onClose: () => void;
}

export default function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  useEffect(() => {
    playSound('levelUp');
    
    // Konfeti animasyonu
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 150 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -50 }}
          transition={{ type: "spring", damping: 15 }}
          className="hud-module p-8 md:p-12 max-w-lg w-full text-center relative overflow-hidden shadow-[0_0_60px_rgba(34,211,238,0.18)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_70%)] pointer-events-none" />
          
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-sm flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.35)] mb-6 relative z-10"
          >
            <Award className="w-12 h-12 text-white drop-shadow-md" />
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-primary mb-2 tracking-widest uppercase filter drop-shadow-[0_0_15px_rgba(34,211,238,0.55)] relative z-10">
            Seviye Atladın!
          </h2>
          
          <div className="hud-module bg-slate-950/50 p-4 mb-8 relative z-10">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mb-1">
              Yeni Rütbe
            </p>
            <p className="text-cyan-400 font-bold text-2xl font-mono tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
              {getRankName(level)}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="neon-btn-cyan w-full py-4 text-lg font-bold tracking-widest flex items-center justify-center gap-2 relative z-10"
          >
            <Zap className="w-5 h-5 animate-pulse" /> DEVAM ET
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
