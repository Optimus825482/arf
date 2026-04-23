import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ARF: Türk Uzay Kuvvetleri Macerası',
    short_name: 'ARF',
    description: 'Öğrenci, Veli ve Yapay Zeka destekli Uzay Temalı Matematik Oyunu',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#05070f',
    theme_color: '#0b1120',
    lang: 'tr',
    dir: 'ltr',
    categories: ['education', 'games', 'kids'],
    icons: [
      { src: '/icons/icon-48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Öğrenci', short_name: 'Öğrenci', url: '/ogrenci', description: 'Öğrenci paneli' },
      { name: 'Veli', short_name: 'Veli', url: '/veli', description: 'Veli paneli' },
    ],
  };
}
