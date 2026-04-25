"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function PairingSection() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 3 || !user) return;

    setStatus('loading');
    try {
      // Kodu normalize et (ARF- ekini ekle veya temizle)
      let normalizedCode = code.toUpperCase().trim();
      if (!normalizedCode.startsWith('ARF-')) {
        normalizedCode = `ARF-${normalizedCode}`;
      }

      // 1. Kodu kullanan öğrenciyi bul
      const q = query(collection(db, 'users'), where('pairingCode', '==', normalizedCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus('error');
        setMessage('Geçersiz eşleşme kodu. Lütfen pilotun kodunu kontrol edin.');
        return;
      }

      const studentDoc = querySnapshot.docs[0];
      const studentId = studentDoc.id;

      // 2. Veli dökümanını güncelle
      const parentDocRef = doc(db, 'users', user.uid);
      await updateDoc(parentDocRef, {
        linkedStudentId: studentId
      });

      setStatus('success');
      setMessage('Bağlantı başarılı! Pilot verileri senkronize ediliyor...');
      
      // Başarı durumunda sayfayı yenileyerek yeni verilerin çekilmesini sağla
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Pairing error:", error);
      setStatus('error');
      setMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-8 relative overflow-hidden group"
      >
        {/* Background Glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />

        <div className="relative z-10 space-y-6 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-2">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase italic">Gözcü Bağlantısı</h2>
            <p className="text-gray-400 mt-2 text-sm">Pilotunuzun ARF panelindeki eşleşme kodunu girerek sistemleri senkronize edin.</p>
          </div>

          <form onSubmit={handlePair} className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Örn: ARF123"
                maxLength={10}
                className="w-full bg-black/60 border border-gray-800 rounded-2xl py-4 px-6 text-center text-2xl font-mono tracking-widest text-cyan-400 focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-gray-700 uppercase"
              />
              <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5" />
            </div>

            <button 
              disabled={status === 'loading' || code.length < 3}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-wider text-sm"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sistem Sorgulanıyor...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Sistemi Bağla
                </>
              )}
            </button>
          </form>

          <AnimatePresence mode="wait">
            {status === 'error' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 justify-center text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20"
              >
                <AlertCircle className="w-4 h-4" />
                {message}
              </motion.div>
            )}
            {status === 'success' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 justify-center text-green-400 text-sm bg-green-400/10 p-3 rounded-xl border border-green-400/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 border-t border-gray-800/50">
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">ARF OS SECURITY PROTOCOL v4.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
