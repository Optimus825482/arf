"use client";

import { useEffect, useRef } from "react";

const MAX_STARS = 400; // Performans için yıldız sayısını sınırla

export default function StarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Düşük grafik modu kontrolü: Kullanıcı animasyonları azaltmak istiyor mu veya cihaz yavaş mı?
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const lowGraphicsMode = prefersReducedMotion || isMobile;

    let animationFrameId: number;
    let stars: { x: number; y: number; radius: number; vx: number; vy: number; color: string; glow: boolean }[] = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      // Düşük grafik modunda yıldız sayısını önemli ölçüde azalt
      const starDensity = lowGraphicsMode ? 20000 : 5000;
      const numStars = Math.min(MAX_STARS, Math.floor((canvas.width * canvas.height) / starDensity));
      
      for (let i = 0; i < numStars; i++) {
        const rand = Math.random();
        let color = '#ffffff';
        let glow = false;
        
        // Düşük grafik modunda pahalı olan parlama (glow) efektini azalt
        if (!lowGraphicsMode) {
          if (rand > 0.95) { color = '#FEF08A'; glow = true; }
          else if (rand > 0.8) { color = '#60A5FA'; glow = true; }
          else if (rand > 0.6) { color = '#A78BFA'; }
        } else {
          // Sadeleştirilmiş renk paleti
          if (rand > 0.9) color = '#FEF08A';
          else if (rand > 0.8) color = '#60A5FA';
        }
        
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * (lowGraphicsMode ? 1.0 : 1.5),
          vx: (Math.random() - 0.5) * (lowGraphicsMode ? 0.05 : 0.2), // Animasyonu yavaşlat
          vy: (Math.random() - 0.5) * (lowGraphicsMode ? 0.05 : 0.2),
          color,
          glow
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Parlamayan yıldızları çiz (hızlı çizim)
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      stars.forEach(star => {
        if (star.glow) return;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Hareket hesaplaması
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;
      });
      
      // Parlayan yıldızları çiz (Gölge efekti işlemciyi yorar, bu yüzden sayıları kısıtlıdır)
      // Düşük grafik modunda bu döngü zaten genellikle boş olacaktır (glow: false)
      stars.forEach(star => {
        if (!star.glow) return;
        ctx.fillStyle = star.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;
      });
      
      // Sonraki kareler için gölgeyi sıfırla
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0">
        <div className="absolute top-20 right-20 w-32 h-32 bg-purple-900 rounded-full filter blur-[100px] opacity-20"></div>
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-blue-900 rounded-full filter blur-[120px] opacity-20"></div>
      </div>
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full pointer-events-none z-0" 
      />
    </>
  );
}
