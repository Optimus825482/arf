'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X, HelpCircle, Lightbulb } from 'lucide-react';
import { playSound } from '@/lib/audio';

interface HelpButtonProps {
  title: string;
  content: string[];
  tips?: string[];
}

export default function HelpButton({ title, content, tips }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    playSound('click');
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button 
        onClick={toggle}
        className="p-2 rounded-full bg-slate-800/80 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white transition shadow-[0_0_15px_rgba(6,182,212,0.1)] group"
        title="Yardım"
      >
        <HelpCircle className="w-5 h-5 group-hover:scale-110 transition" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel max-w-md w-full p-8 relative border-t-2 border-cyan-500"
            >
              <button 
                onClick={toggle}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Info className="w-6 h-6 text-cyan-400" />
                </div>
                <h2 className="text-xl font-mono font-bold text-white uppercase tracking-wider">{title}</h2>
              </div>

              <div className="space-y-4 mb-6">
                {content.map((p, i) => (
                  <p key={i} className="text-slate-300 font-mono text-sm leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>

              {tips && tips.length > 0 && (
                <div className="bg-cyan-950/30 p-4 rounded-xl border border-cyan-500/20">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
                    <Lightbulb className="w-4 h-4" /> Pilot İpuçları
                  </h3>
                  <ul className="space-y-2">
                    {tips.map((t, i) => (
                      <li key={i} className="text-[11px] font-mono text-slate-400 flex items-start gap-2">
                        <span className="text-cyan-500 mt-1">•</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button 
                onClick={toggle}
                className="mt-8 w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-sm uppercase tracking-widest rounded-xl border border-slate-700 transition"
              >
                Anladım
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
