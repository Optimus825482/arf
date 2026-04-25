import React from 'react';

export default function ActionRow() {
  const actions = [
    { label: 'PDF Rapor', icon: 'picture_as_pdf', primary: false },
    { label: 'Mesaj Gönder', icon: 'chat', primary: false },
    { label: 'Yeni Plan', icon: 'track_changes', primary: true },
  ];

  return (
    <section className="grid grid-cols-3 gap-4 md:gap-6">
      {actions.map((action, idx) => (
        <button 
          key={idx}
          className={`
            relative overflow-hidden p-6 flex flex-col items-center justify-center gap-3 transition-all duration-500 
            hover:scale-[1.02] active:scale-95 group border border-white/5 bg-white/[0.02] hud-glass rounded-sm
            ${action.primary 
              ? 'ring-1 ring-primary/20 hover:ring-primary/40' 
              : 'hover:bg-white/[0.05]'}
          `}
        >
          {/* Background Highlight */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${action.primary ? 'bg-primary/5' : 'bg-white/5'}`}></div>
          
          <span 
            className={`material-symbols-outlined text-2xl transition-all duration-300 group-hover:scale-110 
              ${action.primary ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}
            `}
          >
            {action.icon}
          </span>
          
          <span 
            className={`font-label text-[10px] md:text-xs uppercase tracking-[0.15em] text-center font-bold
              ${action.primary ? 'text-primary' : 'text-on-surface group-hover:text-primary'}
            `}
          >
            {action.label}
          </span>
          
          {/* Decorative Corner (Premium touch) */}
          <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r transition-colors duration-300 ${action.primary ? 'border-primary/60' : 'border-outline-variant/40 group-hover:border-primary/60'}`}></div>
          <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l transition-colors duration-300 ${action.primary ? 'border-primary/60' : 'border-outline-variant/40 group-hover:border-primary/60'}`}></div>
        </button>
      ))}
    </section>
  );
}
