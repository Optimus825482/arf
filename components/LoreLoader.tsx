"use client";
import { useEffect, useState } from "react";
import ArfLogo from "@/components/ArfLogo";

const LORE_TEXTS = [
  "Kuvvet kalkanları kontrol ediliyor...",
  "AI bağlantısı kuruluyor...",
  "Motor sıcaklıkları optimize ediliyor...",
  "Yörünge hesaplamaları yapılıyor...",
  "Derin uzay sensörleri aktif...",
  "Görev paketleri senkronize ediliyor..."
];

export default function LoreLoader() {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % LORE_TEXTS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-screen relative z-10">
      <ArfLogo className="w-24 h-24 animate-pulse mb-8 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
      <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase text-center px-4 transition-opacity duration-500">
        {LORE_TEXTS[textIndex]}
      </p>
    </div>
  );
}
