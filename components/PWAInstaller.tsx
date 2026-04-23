'use client';

import { useEffect, useState } from 'react';
import { Download, X, WifiOff } from 'lucide-react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'arf:pwa-install-dismissed';

export default function PWAInstaller() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch(() => null);
          });
        }).catch(() => null);
      }

      const onLoad = () => {
        if (process.env.NODE_ENV !== 'production') return;
        navigator.serviceWorker.register('/sw.js').catch(() => null);
      };
      if (document.readyState === 'complete') onLoad();
      else window.addEventListener('load', onLoad, { once: true });
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);

    setOffline(!navigator.onLine);
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  };

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setShow(false);
  };

  return (
    <>
      {offline && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-400/40 px-3 py-1.5 text-xs text-amber-200 backdrop-blur">
          <WifiOff className="w-3.5 h-3.5" />
          Çevrimdışı moddasın — önbellekteki içerikler gösteriliyor
        </div>
      )}
      {show && deferred && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">A</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">ARF&apos;i yükle</p>
            <p className="text-xs text-slate-300 truncate">Anasayfana ekle, çevrimdışı çalışsın.</p>
          </div>
          <button onClick={install} className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-3 py-1.5 transition">
            <Download className="w-4 h-4" /> Yükle
          </button>
          <button onClick={dismiss} aria-label="Kapat" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
