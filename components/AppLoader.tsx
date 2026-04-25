"use client";

import { useEffect, useState } from 'react';
import AnimatedArfLogo from '@/components/AnimatedArfLogo';

type LoaderVariant = 'fullscreen' | 'panel' | 'inline';
type LoaderAccent = 'cyan' | 'red';

/** Her mesaj isteğe bağlı bir "sistem kodu" ile etiketlenebilir */
export interface LoaderMessage {
  text: string;
  code?: string;
}

interface AppLoaderProps {
  variant?: LoaderVariant;
  accent?: LoaderAccent;
  title?: string;
  subtitle?: string;
  /** String dizisi veya {text, code} dizisi kabul edilir */
  messages?: string[] | LoaderMessage[];
  /** İlerleme yüzdesi (0-100). Verilmezse belirsiz (indeterminate) mod */
  progress?: number;
  className?: string;
}

// ─── UYGULAMA AKIŞINA ÖZEL MESAJLAR ────────────────────────────────────────

const DEFAULT_MESSAGES: LoaderMessage[] = [
  { text: 'Komuta çekirdeği başlatılıyor…',       code: 'SYS-01' },
  { text: 'Pilot kimliği doğrulanıyor…',           code: 'AUTH-02' },
  { text: 'Telemetri sensörleri kalibre ediliyor…', code: 'SEN-03' },
  { text: 'Görev paketi hazırlanıyor…',            code: 'MIS-04' },
  { text: 'Yıldız haritası güncelleniyor…',        code: 'NAV-05' },
  { text: 'AI briefing modülü bağlanıyor…',        code: 'AI-06' },
  { text: 'Kuvvet kalkanları aktive ediliyor…',    code: 'DEF-07' },
  { text: 'Yörünge hesapları doğrulanıyor…',       code: 'ORB-08' },
];

// ─── SCAN LINES BİLEŞENİ ──────────────────────────────────────────────────
function ScanLines() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(34,211,238,0.018) 2px,
          rgba(34,211,238,0.018) 4px
        )`,
      }}
    />
  );
}

// ─── CORNER BRACKETS ──────────────────────────────────────────────────────
function CornerBrackets({ color = '#22d3ee' }: { color?: string }) {
  const s = { stroke: color, strokeWidth: 2, fill: 'none', opacity: 0.35 };
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* top-left */}
      <polyline points="2,12 2,2 12,2" {...s} />
      {/* top-right */}
      <polyline points="88,2 98,2 98,12" {...s} />
      {/* bottom-left */}
      <polyline points="2,88 2,98 12,98" {...s} />
      {/* bottom-right */}
      <polyline points="88,98 98,98 98,88" {...s} />
    </svg>
  );
}

// ─── SİSTEM DURUM SATIRLARI ───────────────────────────────────────────────
const STATUS_ROWS = [
  { label: 'MOTOR',   ok: true  },
  { label: 'KALKAN',  ok: true  },
  { label: 'NAVİGASYON', ok: true },
  { label: 'AI CORE', ok: null  }, // null = bekliyor
];

// ─── ANA BILEŞEN ──────────────────────────────────────────────────────────
export default function AppLoader({
  variant = 'fullscreen',
  accent = 'cyan',
  title = 'ARF sistemleri hazırlanıyor',
  subtitle = 'Komuta çekirdeği senkronize ediliyor',
  messages: messagesProp,
  progress,
  className = '',
}: AppLoaderProps) {
  // Mesajları normalize et
  const messages: LoaderMessage[] = messagesProp
    ? messagesProp.map((m) =>
        typeof m === 'string' ? { text: m } : m
      )
    : DEFAULT_MESSAGES;

  const [msgIdx, setMsgIdx] = useState(0);
  const [dots, setDots]     = useState('');
  const [tick, setTick]     = useState(0);       // saniye sayacı
  const [statusIdx, setStatusIdx] = useState(0); // kaçıncı sistem hazır

  // Mesaj döngüsü
  useEffect(() => {
    if (messages.length < 2) return;
    const id = window.setInterval(
      () => setMsgIdx((p) => (p + 1) % messages.length),
      2000,
    );
    return () => clearInterval(id);
  }, [messages.length]);

  // "..." animasyonu
  useEffect(() => {
    const id = window.setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 420);
    return () => clearInterval(id);
  }, []);

  // Saniye sayacı + status satırları
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setStatusIdx((s) => Math.min(s + 1, STATUS_ROWS.length));
    }, 900);
    return () => clearInterval(id);
  }, []);

  // ─── LAYOUT HESAPLARI ────────────────────────────────────────────────────
  const isFullscreen = variant === 'fullscreen';
  const isPanel      = variant === 'panel';

  const containerCls = isFullscreen
    ? 'min-h-screen w-full'
    : isPanel
      ? 'w-full min-h-[18rem] rounded-sm bg-slate-950/50'
      : 'w-full min-h-[8rem] rounded-sm bg-slate-950/40';

  const logoSize = isFullscreen ? 'w-40 h-40' : isPanel ? 'w-24 h-24' : 'w-16 h-16';

  const accentColor = accent === 'cyan' ? '#22d3ee'
    : accent === 'red' ? '#ffb3ad'
    : '#ffb3ad';

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative isolate overflow-hidden ${containerCls} ${className}`}
      role="status"
      aria-label="Yükleniyor"
      aria-live="polite"
    >
      {/* ── Arka Plan Katmanları ── */}
      <div className="absolute inset-0 bg-[#05070A]" />

      {/* Radyal gradyanlar */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 50% 10%, rgba(34,211,238,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 40% 50% at 80% 80%, rgba(255,179,173,0.06) 0%, transparent 60%)
          `,
        }}
      />

      {/* Grid dokusu */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        }}
      />

      {/* Scan lines */}
      {isFullscreen && <ScanLines />}

      {/* Corner brackets */}
      {isFullscreen && <CornerBrackets color={accentColor} />}

      {/* ── HUD Üst Şerit ── */}
      {isFullscreen && (
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-5 py-2 border-b border-white/[0.06]">
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-slate-500">
            T.U.K. — AKADEMİ SİSTEMİ v1.0
          </span>
          <span
            className="font-mono text-[9px] tracking-widest"
            style={{ color: accentColor }}
          >
            SYS:{String(tick).padStart(3, '0')}
          </span>
        </div>
      )}

      {/* ── İçerik Alanı ── */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-6 py-16 text-center">

        {/* Logo */}
        <div className="relative">
          <AnimatedArfLogo className={logoSize} glowColor={accentColor} />
        </div>

        {/* Başlık Grubu */}
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.45em] text-slate-500">
            Türk Uzay Kuvvetleri Akademisi
          </p>
          <h2
            className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.4)] md:text-2xl"
          >
            {title}
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: accentColor }}>
            {subtitle}
          </p>
        </div>

        {/* ── İlerleme Çubuğu ── */}
        <div className="w-full max-w-xs space-y-1.5">
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
            {progress !== undefined ? (
              /* Belirli ilerleme */
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, progress)}%`,
                  background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})`,
                  boxShadow: `0 0 8px ${accentColor}`,
                }}
              />
            ) : (
              /* Belirsiz (indeterminate) — sonsuz kayma */
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  width: '40%',
                  background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                  animation: 'arf-progress-slide 1.6s ease-in-out infinite',
                }}
              />
            )}
          </div>
          {progress !== undefined && (
            <p className="text-right font-mono text-[9px] tracking-widest text-slate-500">
              {progress}%
            </p>
          )}
        </div>

        {/* ── Aktif Mesaj ── */}
        <div
          className="flex items-center gap-2 rounded-sm bg-slate-950/50 px-4 py-2"
        >
          {messages[msgIdx].code && (
            <span
              className="font-mono text-[8px] tracking-[0.2em] opacity-50"
              style={{ color: accentColor }}
            >
              [{messages[msgIdx].code}]
            </span>
          )}
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
            {messages[msgIdx].text}{dots}
          </p>
        </div>

        {/* ── Sistem Durum Satırları (sadece fullscreen) ── */}
        {isFullscreen && (
          <div className="absolute bottom-10 inset-x-0 flex justify-center gap-4 flex-wrap px-6">
            {STATUS_ROWS.map((row, i) => {
              const ready = i < statusIdx;
              const waiting = i === statusIdx;
              return (
                <div key={row.label} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: ready
                        ? accentColor
                        : waiting
                          ? '#ffb3ad'
                          : '#334155',
                      boxShadow: ready ? `0 0 5px ${accentColor}` : 'none',
                      animation: waiting ? 'arf-pulse-glow 0.8s ease-in-out infinite' : 'none',
                    }}
                  />
                  <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
                    {row.label}
                  </span>
                  <span
                    className="font-mono text-[8px] tracking-widest"
                    style={{
                      color: ready ? accentColor : waiting ? '#ffb3ad' : '#334155',
                    }}
                  >
                    {ready ? '✓' : waiting ? '…' : '–'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Global keyframe (indeterminate progress) ── */}
      <style>{`
        @keyframes arf-progress-slide {
          0%   { left: -42%; }
          100% { left: 100%; }
        }
        @keyframes arf-pulse-glow {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
