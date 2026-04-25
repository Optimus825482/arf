"use client";

import { motion } from 'motion/react';
import Image from 'next/image';

interface AnimatedArfLogoProps {
  size?: number;
  glowColor?: string;
  className?: string;
}

export default function AnimatedArfLogo({ 
  size = 120, 
  glowColor = "rgba(34, 211, 238, 0.4)",
  className = ""
}: AnimatedArfLogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer Glow */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl scale-150 transition-opacity duration-1000"
        style={{ backgroundColor: glowColor, opacity: 0.15 }}
      ></div>
      
      {/* Orbiting Rings */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full border border-cyan-400/10 border-t-cyan-400/30"
        style={{ width: size * 1.4, height: size * 1.4 }}
      ></motion.div>
      
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full border border-cyan-400/5 border-b-cyan-400/20"
        style={{ width: size * 1.2, height: size * 1.2 }}
      ></motion.div>

      {/* Main Logo Container */}
      <motion.div 
        animate={{ 
          scale: [1, 1.05, 1],
          filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)']
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="relative z-10 flex items-center justify-center rounded-full border border-cyan-400/20 bg-slate-950/80 shadow-[0_0_50px_rgba(34,211,238,0.1)] overflow-hidden"
        style={{ width: size, height: size }}
      >
        {/* Internal Decorators */}
        <div className="absolute inset-1 rounded-full border border-cyan-400/5 border-dashed"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-transparent to-transparent"></div>
        
        <Image 
          src="/icons/icon-512.png" 
          alt="ARF Logo" 
          width={size * 0.65} 
          height={size * 0.65} 
          className="relative z-10 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]"
          priority
        />
      </motion.div>

      {/* Scanning Line Effect */}
      <motion.div
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-20 pointer-events-none"
        style={{ width: size * 1.2 }}
      ></motion.div>
    </div>
  );
}
