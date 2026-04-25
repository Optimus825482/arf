import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Rocket, Trophy, MessageSquare, User } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { name: 'PANEL', icon: LayoutDashboard, href: '#', active: true },
    { name: 'GÖREVLER', icon: Rocket, href: '#' },
    { name: 'LİDER', icon: Trophy, href: '#' },
    { name: 'İLETİ', icon: MessageSquare, href: '#' },
    { name: 'PROFİL', icon: User, href: '#' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-end h-24 pb-8 px-4 bg-gradient-to-t from-[#0c0e12] to-transparent pointer-events-none">
      <div className="flex justify-around items-center w-full max-w-lg mx-auto hud-glass border border-cyan-400/20 rounded-sm px-2 py-2 shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-auto relative">
        {/* HUD Decorative Brackets */}
        <div className="absolute -top-1 left-4 w-4 h-[2px] bg-cyan-400/40"></div>
        <div className="absolute -top-1 right-4 w-4 h-[2px] bg-cyan-400/40"></div>
        
        {navItems.map((item) => (
          <Link 
            key={item.name}
            href={item.href} 
            className={`flex flex-col items-center justify-center transition-all duration-300 relative py-2 px-3 rounded-sm group ${item.active ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-400/70'}`}
          >
            {item.active && (
              <>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] rounded-sm z-10"></div>
                <div className="absolute inset-0 bg-cyan-400/5 rounded-sm border border-cyan-400/10"></div>
              </>
            )}
            
            <item.icon className={`w-5 h-5 mb-1.5 transition-transform duration-300 ${item.active ? 'drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] scale-110' : 'group-hover:scale-110'}`} />
            <span className={`font-label uppercase tracking-[0.15em] text-[8px] font-bold ${item.active ? 'opacity-100' : 'opacity-60'}`}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
