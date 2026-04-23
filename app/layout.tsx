import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import StarsBackground from '@/components/StarsBackground';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/AuthProvider';
import PWAInstaller from '@/components/PWAInstaller';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arf.erkanerdem.net';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'ARF: Türk Uzay Kuvvetleri Macerası',
  description: 'Öğrenci, Veli ve Yapay Zeka destekli Uzay Temalı Matematik Oyunu',
  metadataBase: new URL(appUrl),
  applicationName: 'ARF',
  appleWebApp: {
    capable: true,
    title: 'ARF',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/icons/favicon-32.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b1120',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="antialiased font-sans relative" suppressHydrationWarning>
        <StarsBackground />
        <Toaster theme="dark" position="top-center" />
        <div className="relative z-10 min-h-screen flex flex-col">
          <ErrorBoundary>
            <AuthProvider>
              <main className="flex-1">
                {children}
              </main>
              <footer className="px-4 pb-6 pt-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500/80 font-mono">
                  Uygulama Gelistiricisi Erkan Erdem @ 2026
                </p>
              </footer>
            </AuthProvider>
          </ErrorBoundary>
        </div>
        <PWAInstaller />
      </body>
    </html>
  );
}
