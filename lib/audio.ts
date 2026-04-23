"use client";

// Singleton AudioContext to avoid exceeding browser limits (~6 max)
let _ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (_ctx && _ctx.state !== 'closed') return _ctx;
    const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    _ctx = new AudioContextClass();
    return _ctx;
  } catch {
    return null;
  }
}

// Procedural sound generator using Web Audio API
export const playSound = (type: 'click' | 'correct' | 'incorrect' | 'levelUp') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Tarayıcı autoplay politikaları gereği gerekirse bağlamı devam ettir (Hata fırlatmadan sessizce dene)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { /* Sessiz hata yönetimi: Autoplay engellenmiş olabilir */ });
    }

    const playTone = (freq: number, type: OscillatorType, dur: number, vol: number, startTime: number) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + dur);
      } catch {
        // Tekil ton çalma hatası (sessiz fail)
      }
    };

    const now = ctx.currentTime;
    
    if (type === 'click') {
      // Short menu blip
      playTone(800, 'sine', 0.05, 0.05, now);
      playTone(1200, 'sine', 0.05, 0.05, now + 0.02);
    } else if (type === 'correct') {
      // Happy chime up
      playTone(440, 'sine', 0.1, 0.1, now);
      playTone(554, 'sine', 0.1, 0.1, now + 0.1);
      playTone(659, 'sine', 0.2, 0.1, now + 0.2);
    } else if (type === 'incorrect') {
      // Buzz down
      playTone(300, 'sawtooth', 0.15, 0.1, now);
      playTone(250, 'sawtooth', 0.2, 0.1, now + 0.15);
    } else if (type === 'levelUp') {
      // Fanfare
      ['C4', 'E4', 'G4', 'C5', 'G4', 'C5'].forEach((note, i) => {
        const freqs: Record<string, number> = {C4: 261.6, E4: 329.6, G4: 392.0, C5: 523.2};
        const vol = 0.1;
        const start = now + (i * 0.15);
        playTone(freqs[note], 'square', 0.2, vol, start);
        playTone(freqs[note] * 1.01, 'sawtooth', 0.2, vol * 0.5, start); // subtle chorus
      });
    }
  } catch {
    // Ses çalma tamamen engellenmiş veya başarısız olmuş olabilir
  }
};
