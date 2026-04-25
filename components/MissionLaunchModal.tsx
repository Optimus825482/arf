'use client';

import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Flag, Sparkles, X } from 'lucide-react';
import { playSound } from '@/lib/audio';
import type { MissionCard } from '@/lib/missions';

interface MissionLaunchModalProps {
  mission: MissionCard | null;
  locked?: boolean;
  onClose: () => void;
  onLaunch: (mission: MissionCard) => void;
}

const accentMap = {
  cyan: 'from-cyan-500/20 to-cyan-950/20 text-cyan-300',
  red: 'from-red-500/20 to-red-950/20 text-red-300',
};

export default function MissionLaunchModal({ mission, locked = false, onClose, onLaunch }: MissionLaunchModalProps) {
  return (
    <AnimatePresence>
      {mission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className={`hud-module relative w-full max-w-2xl overflow-hidden bg-gradient-to-br ${accentMap[mission.accent]} shadow-[0_0_50px_rgba(15,23,42,0.5)]`}
          >
            <button
              onClick={() => {
                playSound('click');
                onClose();
              }}
              className="absolute right-4 top-4 z-10 rounded-sm bg-slate-950/40 p-2 text-slate-300 transition hover:bg-slate-900"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-8 p-8 md:p-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-slate-300">
                  <Flag className="h-4 w-4" />
                  Gorev Oncesi Brifing
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-mono font-bold uppercase tracking-[0.08em] text-white">{mission.title}</h2>
                  <p className="text-sm font-mono uppercase tracking-[0.25em] text-slate-300">{mission.focus} · {mission.difficulty}</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-[1.4fr_0.9fr]">
                <div className="rounded-sm bg-slate-950/35 p-5">
                  <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-400">Komutandan Mesaj</p>
                  <p className="text-sm leading-7 text-slate-100">{mission.briefing}</p>
                </div>
                <div className="rounded-sm bg-slate-950/35 p-5">
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-400">
                    <Sparkles className="h-4 w-4" />
                    Motivasyon
                  </p>
                  <p className="text-sm leading-7 text-slate-100">{mission.motivation}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-sm bg-slate-950/30 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">Odul</p>
                    <p className="text-xl font-mono font-bold text-white">+{mission.xpReward} XP</p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-300">Ilk tamamlamada +15 paket bonusu</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">Sure</p>
                    <p className="text-xl font-mono font-bold text-white">{mission.estimatedMinutes} dk</p>
                  </div>
                </div>

                <button
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    playSound('correct');
                    onLaunch(mission);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-4 text-sm font-mono font-bold uppercase tracking-[0.25em] text-slate-950 transition hover:shadow-[0_0_18px_rgba(34,211,238,0.35)] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {locked ? 'Onceki Gorevi Bitir' : 'Gorevi Baslat'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
