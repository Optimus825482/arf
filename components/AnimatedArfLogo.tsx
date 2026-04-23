import { useId } from 'react';

interface AnimatedArfLogoProps {
  className?: string;
  accent?: 'cyan' | 'purple' | 'amber';
}

const ACCENTS = {
  cyan: {
    primary: '#22d3ee',
    secondary: '#0284c7',
    tertiary: '#0891b2',
    glow: 'rgba(34,211,238,0.35)',
  },
  purple: {
    primary: '#c084fc',
    secondary: '#7c3aed',
    tertiary: '#4338ca',
    glow: 'rgba(168,85,247,0.35)',
  },
  amber: {
    primary: '#fcd34d',
    secondary: '#f97316',
    tertiary: '#ef4444',
    glow: 'rgba(251,191,36,0.35)',
  },
} as const;

export default function AnimatedArfLogo({
  className = 'w-28 h-28',
  accent = 'cyan',
}: AnimatedArfLogoProps) {
  const id = useId().replace(/:/g, '');
  const colors = ACCENTS[accent];

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-[8%] rounded-full loader-core-glow" style={{ backgroundColor: colors.glow }} />
      <div className="absolute inset-0 rounded-full border border-white/10 loader-ring" />
      <div className="absolute inset-[9%] rounded-full border border-white/10 loader-ring-reverse" />
      <div className="absolute inset-[18%] rounded-full border border-white/5 loader-ring" style={{ animationDuration: '10s' }} />
      <div className="absolute inset-0 loader-scan rounded-full" />

      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`deltaGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          <linearGradient id={`deltaDark-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.tertiary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          <linearGradient id={`flameGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="45%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="50" cy="50" r="42" stroke={colors.primary} strokeOpacity="0.12" strokeDasharray="4 6" className="loader-ring" />
        <circle cx="50" cy="85" r="12" fill={`url(#flameGrad-${id})`} filter={`url(#glow-${id})`} className="loader-thrust opacity-75" />
        <path d="M50 65 L 62 95 L 50 85 L 38 95 Z" fill={`url(#flameGrad-${id})`} className="loader-thrust" style={{ transformOrigin: '50px 65px' }} />

        <path d="M50 5 L 15 80 L 50 65 Z" fill={`url(#deltaDark-${id})`} className="loader-wing-left" />
        <path d="M50 5 L 85 80 L 50 65 Z" fill={`url(#deltaGrad-${id})`} className="loader-wing-right" />

        <path d="M50 35 L 52 42 L 59 42 L 53 46 L 55 53 L 50 49 L 45 53 L 47 46 L 41 42 L 48 42 Z" fill="#ffffff" className="loader-beacon" />

        <path
          d="M50 8 L 80 72 L 50 60 L 20 72 Z"
          stroke={colors.primary}
          strokeWidth="1.5"
          strokeOpacity="0.85"
          fill="none"
          className="loader-outline"
        />
      </svg>
    </div>
  );
}
