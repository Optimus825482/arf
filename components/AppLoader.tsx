"use client";

import { useEffect, useState } from 'react';
import AnimatedArfLogo from '@/components/AnimatedArfLogo';

type LoaderVariant = 'fullscreen' | 'panel' | 'inline';
type LoaderAccent = 'cyan' | 'purple' | 'amber';

interface AppLoaderProps {
  variant?: LoaderVariant;
  accent?: LoaderAccent;
  title?: string;
  subtitle?: string;
  messages?: string[];
  className?: string;
}

const DEFAULT_MESSAGES = [
  'Kuvvet kalkanlari kalibre ediliyor...',
  'Telemetri verileri isleniyor...',
  'Komuta yapay zekasi baglanti kuruyor...',
  'Yorunge hesaplari dogrulaniyor...',
];

export default function AppLoader({
  variant = 'fullscreen',
  accent = 'cyan',
  title = 'ARF sistemleri hazirlaniyor',
  subtitle = 'Komuta cekirdegi senkronize ediliyor',
  messages = DEFAULT_MESSAGES,
  className = '',
}: AppLoaderProps) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    const interval = window.setInterval(() => {
      setTextIndex((prev) => (prev + 1) % messages.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [messages]);

  const containerClasses =
    variant === 'fullscreen'
      ? 'min-h-screen w-full'
      : variant === 'panel'
        ? 'w-full min-h-[18rem] rounded-[2rem] border border-white/10 bg-slate-950/45'
        : 'w-full min-h-[8rem] rounded-2xl border border-white/10 bg-slate-950/35';

  const logoSize =
    variant === 'fullscreen' ? 'w-36 h-36' : variant === 'panel' ? 'w-24 h-24' : 'w-16 h-16';

  return (
    <div className={`relative isolate overflow-hidden ${containerClasses} ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_40%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.12),transparent_35%)]" />
      <div className="absolute inset-0 loader-grid opacity-50" />
      <div className="absolute inset-0 loader-noise opacity-30" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <AnimatedArfLogo className={logoSize} accent={accent} />

        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.45em] text-slate-500">
            Turk Uzay Kuvvetleri Akademisi
          </p>
          <h2 className="font-mono text-xl font-bold uppercase tracking-[0.18em] text-white md:text-2xl">
            {title}
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-300/90">
            {subtitle}
          </p>
        </div>

        <div className="min-h-6 rounded-full border border-white/10 bg-slate-900/50 px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-300 transition-opacity duration-500">
            {messages[textIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
