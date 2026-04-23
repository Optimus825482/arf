export default function ArfLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="deltaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" /> {/* cyan-400 */}
          <stop offset="100%" stopColor="#0284c7" /> {/* sky-600 */}
        </linearGradient>
        <linearGradient id="deltaDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891b2" /> {/* cyan-600 */}
          <stop offset="100%" stopColor="#1e3a8a" /> {/* blue-900 */}
        </linearGradient>
        <linearGradient id="flameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" /> {/* amber-300 */}
          <stop offset="40%" stopColor="#f97316" /> {/* orange-500 */}
          <stop offset="100%" stopColor="#ef4444" /> {/* red-500 */}
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
           <feGaussianBlur stdDeviation="3" result="blur" />
           <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Engine Glow Backdrop */}
      <circle cx="50" cy="85" r="12" fill="url(#flameGrad)" filter="url(#glow)" className="opacity-70 animate-pulse" />
      
      {/* Flames */}
      <path d="M50 65 L 62 95 L 50 85 L 38 95 Z" fill="url(#flameGrad)" className="animate-pulse" style={{transformOrigin: '50% 65%'}} />
      
      {/* Main Delta Aircraft Left */}
      <path d="M50 5 L 15 80 L 50 65 Z" fill="url(#deltaDark)" />
      
      {/* Main Delta Aircraft Right */}
      <path d="M50 5 L 85 80 L 50 65 Z" fill="url(#deltaGrad)" />
      
      {/* Center Star */}
      <path d="M50 35 L 52 42 L 59 42 L 53 46 L 55 53 L 50 49 L 45 53 L 47 46 L 41 42 L 48 42 Z" fill="#ffffff" />
    </svg>
  );
}
