import React from 'react';
import Link from 'next/link';

export default function GuardianBottomNav() {
  const navItems = [
    { label: 'Panel', icon: 'dashboard', active: true, href: '/veli' },
    { label: 'Raporlar', icon: 'assessment', active: false, href: '#' },
    { label: 'Ayarlar', icon: 'settings', active: false, href: '#' },
    { label: 'Profil', icon: 'account_circle', active: false, href: '#' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 hud-glass border-t border-white/5 backdrop-blur-md px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center w-full h-18 px-2 py-3">
        {navItems.map((item, idx) => (
          <Link 
            key={idx}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 w-full transition-all active:scale-90 ${
              item.active 
                ? 'text-cyan-400 bg-cyan-500/10 rounded-sm shadow-[inset_0_0_10px_rgba(34,211,238,0.2)]' 
                : 'text-slate-500 hover:text-cyan-200'
            }`}
          >
            <span 
              className="material-symbols-outlined mb-0.5 text-xl" 
              style={{ fontVariationSettings: item.active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="font-label text-[10px] uppercase tracking-[0.1em] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
