'use client';

import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X, WifiOff } from 'lucide-react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'arf:pwa-install-dismissed';

export default function PWAInstaller() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [offline, setOffline] = useState(false);
  const [manualMode, setManualMode] = useState<'ios' | 'generic' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|chrome|android/.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ((window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    if (isStandalone) return;

    if ('serviceWorker' in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => null);
      };
      if (document.readyState === 'complete') onLoad();
      else window.addEventListener('load', onLoad, { once: true });
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
      setManualMode(null);
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    const onInstalled = () => {
      setDeferred(null);
      setManualMode(null);
      setShow(false);
    };
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);

    setOffline(!navigator.onLine);
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    const fallbackTimer = window.setTimeout(() => {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
      if (isIos && isSafari) {
        setManualMode('ios');
        setShow(true);
        return;
      }

      const supportsPrompt = 'BeforeInstallPromptEvent' in window;
      if (!supportsPrompt) {
        setManualMode('generic');
        setShow(true);
      }
    }, 1500);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
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

  const isSafariGuide = manualMode === 'ios';

  return (
    <>
      {offline && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-sm bg-secondary/15 px-3 py-1.5 text-xs text-secondary backdrop-blur">
          <WifiOff className="w-3.5 h-3.5" />
          Çevrimdışı moddasın — önbellekteki içerikler gösteriliyor
        </div>
      )}
      {show && (deferred || manualMode) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,430px)] animate-in slide-in-from-bottom-4">
          <div className={`hud-module relative overflow-hidden backdrop-blur-xl shadow-2xl ${isSafariGuide ? 'bg-slate-950/95' : 'bg-slate-900/90'}`}>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-cyan-300/40 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            {isSafariGuide ? (
              <div className="relative p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 via-cyan-400/15 to-slate-900 text-cyan-100 shadow-[0_0_30px_rgba(56,189,248,0.18)]">
                      <Share className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">Safari Install</p>
                      <p className="mt-1 text-base font-semibold text-white">ARF’i ana ekrana ekle</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">iPhone ve iPad Safari otomatik yukleme popup’i vermez. Kurulum icin iki dokunus yeterli.</p>
                    </div>
                  </div>
                  <button onClick={dismiss} aria-label="Kapat" className="rounded-sm p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-2.5">
                  <div className="rounded-sm border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-cyan-300/30 bg-cyan-400/10 font-mono text-xs text-cyan-100">1</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">Alt bardaki Paylas tusuna dokun</p>
                        <p className="text-xs text-slate-400">Safari menusu acilir. Simgesi yukari ok olan kare kutudur.</p>
                      </div>
                    <div className="rounded-sm border border-cyan-300/20 bg-slate-950/80 px-2.5 py-2 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] motion-safe:animate-[install-share-pulse_1.8s_ease-in-out_infinite]">
                      <Share className="h-4 w-4" />
                    </div>
                    </div>
                  </div>

                  <div className="rounded-sm border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-cyan-400/10 font-mono text-xs text-cyan-100">2</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">Ana Ekrana Ekle secenegini sec</p>
                        <p className="text-xs text-slate-400">Onaylayinca ARF normal uygulama gibi ikon olarak eklenir.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-cyan-400/15 bg-cyan-400/10 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Tam ekran, hizli acilis, uygulama hissi</p>
                  <button onClick={dismiss} className="rounded-sm border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15">
                    Tamam
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gradient-to-br from-cyan-500 to-cyan-500 text-white font-bold">
                  {manualMode === 'generic' ? <Smartphone className="h-4 w-4" /> : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">ARF’i yükle</p>
                  <p className="text-xs text-slate-300">
                    {manualMode === 'generic'
                      ? 'Tarayici menusunden Yukle veya Ana Ekrana Ekle secenegini kullan.'
                      : 'Anasayfana ekle, cevrimdisi calissin.'}
                  </p>
                </div>
                {deferred ? (
                  <button onClick={install} className="flex items-center gap-1.5 rounded-sm bg-cyan-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-cyan-400">
                    <Download className="h-4 w-4" /> Yükle
                  </button>
                ) : null}
                <button onClick={dismiss} aria-label="Kapat" className="rounded-sm p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
