"use client";

import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Loader2, Rocket, Activity } from 'lucide-react';
import TurkishFlag from '@/components/TurkishFlag';
import { toast } from 'sonner';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { handleSystemError } from '@/lib/errors';
import { useAuth } from '@/components/AuthProvider';

export default function AuthPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [nickname, setNickname] = useState('');
  
  useEffect(() => {
    if (!authLoading && user && !isRegistering) {
       // Automatic redirect based on role if already logged in and not in the middle of registration
       const redirectUser = async () => {
         const studentSnap = await getDoc(doc(db, 'users', user.uid));
         if (studentSnap.exists()) {
           router.replace('/ogrenci');
         } else {
           const parentSnap = await getDoc(doc(db, 'parents', user.uid));
           if (parentSnap.exists()) {
              router.replace('/veli');
           }
         }
       };
       redirectUser();
    }
  }, [user, authLoading, isRegistering, router]);
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [pairingCode, setPairingCode] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');

  const generatePairingCode = async () => {
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeSnap = await getDoc(doc(db, 'pairingCodes', code));
      if (!codeSnap.exists()) isUnique = true;
    }
    return code;
  };

  const finalizeRegistration = async () => {
    if (!tempUser) return;
    setLoading(true);
    try {
      if (role === 'student') {
        const cleanFirstName = firstName.trim();
        const cleanLastName = lastName.trim();
        const cleanGradeLevel = gradeLevel.trim();
        const cleanNickname = nickname.trim();

        if (!cleanFirstName || !cleanLastName || !cleanGradeLevel) {
          toast.error("Lütfen ad, soyad ve sınıf bilgilerini doldurun.");
          setLoading(false);
          return;
        }

        const studentRef = doc(db, 'users', tempUser.uid);
        const code = await generatePairingCode();
        const displayUsername = cleanNickname || `${cleanFirstName} ${cleanLastName}`;

        await setDoc(studentRef, {
          username: displayUsername,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          nickname: cleanNickname || null,
          gradeLevel: cleanGradeLevel,
          role: 'student',
          pairingCode: code,
          level: 0,
          xp: 0,
          placementDone: false,
          shipColor: 'bg-cyan-500',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await setDoc(doc(db, 'pairingCodes', code), {
          userId: tempUser.uid,
          username: displayUsername,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          nickname: cleanNickname || null,
          gradeLevel: cleanGradeLevel,
        });
        toast.success(`Mürettebata Hoş Geldin! Gözcü Kodun: ${code}`);
        router.push('/ogrenci');
      } else {
        const cleanParentFirstName = parentFirstName.trim();
        const cleanParentLastName = parentLastName.trim();

        if (!cleanParentFirstName || !cleanParentLastName) {
          toast.error("Lütfen veli ad ve soyad bilgilerini doldurun.");
          setLoading(false);
          return;
        }

        if (pairingCode.length !== 6) {
          toast.error("Lütfen 6 haneli geçerli bir kod girin.");
          setLoading(false);
          return;
        }
        
        const codeSnap = await getDoc(doc(db, 'pairingCodes', pairingCode));
        if (!codeSnap.exists()) {
          toast.error("Geçersiz veya bulunamayan mürettebat kodu!");
          setLoading(false);
          return;
        }

        const studentId = codeSnap.data().userId;
        const parentRef = doc(db, 'parents', tempUser.uid);
        await setDoc(parentRef, {
          email: tempUser.email,
          firstName: cleanParentFirstName,
          lastName: cleanParentLastName,
          parentName: `${cleanParentFirstName} ${cleanParentLastName}`,
          role: 'parent',
          linkedPilots: [studentId]
        });
        toast.success("Gözcü Olarak Bağlanıldı.");
        router.push('/veli');
      }
    } catch (err: unknown) {
      handleSystemError(err, { title: 'Kayıt Hatası', action: 'Lütfen tekrar deneyin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists as parent or student
      const [studentSnap, parentSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDoc(doc(db, 'parents', user.uid))
      ]);

      if (studentSnap.exists()) {
        toast.success("ARF Gemisine Yeniden Hoş Geldin!");
        router.push('/ogrenci');
      } else if (parentSnap.exists()) {
        toast.success("Gözcü Olarak Bağlanıldı.");
        router.push('/veli');
      } else {
        // New Registration flow
        setTempUser(user);
        setIsRegistering(true);
      }
    } catch (err: unknown) {
      if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') {
        toast.error('Google giris penceresi kapatildi.');
        return;
      }
      handleSystemError(err, { title: 'Google Giriş Hatası', action: 'Lütfen Google hesabınızı kontrol edin.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-8 text-center space-y-6">
          <div className="flex justify-center mb-4">
             <div className="bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/20 flex flex-col items-center">
                <TurkishFlag className="w-12 h-8 rounded shrink-0 mb-2" />
                <h1 className="text-xl font-mono font-bold neon-text-red uppercase tracking-widest">TUK - ARF</h1>
             </div>
          </div>
          
          {!isRegistering ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-mono font-bold text-white">HOŞ GELDİN PİLOT</h2>
                <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Sisteme bağlanmak için Google hesabını kullan</p>
              </div>

              <button 
                disabled={loading}
                onClick={handleGoogleLogin}
                className="w-full py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 text-white font-mono text-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-cyan-400"/> : (
                  <>
                    <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={24} height={24} className="w-6 h-6" />
                    <span>GOOGLE İLE BAĞLAN</span>
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-slate-500 font-mono uppercase">Güvenli bir bağlantı için TUK altyapısı kullanılmaktadır.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
               <div className="space-y-2">
                 <h2 className="text-xl font-mono font-bold text-white uppercase tracking-wider">Kayıt Profilini Seç</h2>
                 <p className="text-slate-400 text-[10px] font-mono uppercase tracking-widest">Senin pozisyonun hangisi?</p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setRole('student')}
                    className={`flex flex-col items-center p-6 rounded-2xl border transition-all ${role === 'student' ? 'bg-cyan-900/20 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-slate-900/40 border-slate-700 opacity-60 hover:opacity-100'}`}
                  >
                    <Rocket className={`w-8 h-8 mb-4 ${role === 'student' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className={`text-[10px] font-mono font-bold ${role === 'student' ? 'text-cyan-400' : 'text-slate-400'}`}>MÜRETTEBAT</span>
                    <span className="text-[8px] text-slate-500 mt-1 uppercase">Pilot</span>
                  </button>

                  <button 
                    onClick={() => setRole('parent')}
                    className={`flex flex-col items-center p-6 rounded-2xl border transition-all ${role === 'parent' ? 'bg-purple-900/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-slate-900/40 border-slate-700 opacity-60 hover:opacity-100'}`}
                  >
                    <Activity className={`w-8 h-8 mb-4 ${role === 'parent' ? 'text-purple-400' : 'text-slate-500'}`} />
                    <span className={`text-[10px] font-mono font-bold ${role === 'parent' ? 'text-purple-400' : 'text-slate-400'}`}>GÖREV GÖZCÜSÜ</span>
                    <span className="text-[8px] text-slate-500 mt-1 uppercase">Veli</span>
                  </button>
               </div>

               {role === 'student' && (
                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2 text-left space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">AD</label>
                        <input
                          required={role === 'student'}
                          type="text"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder="Örn: Ahmet"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-cyan-500 text-white font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">SOYAD</label>
                        <input
                          required={role === 'student'}
                          type="text"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder="Örn: Yılmaz"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-cyan-500 text-white font-mono outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">SINIF</label>
                        <input
                          required={role === 'student'}
                          type="text"
                          value={gradeLevel}
                          onChange={e => setGradeLevel(e.target.value)}
                          placeholder="Örn: 5. Sınıf"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-cyan-500 text-white font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">TAKMA AD (ISTEGE BAGLI)</label>
                        <input
                          type="text"
                          value={nickname}
                          onChange={e => setNickname(e.target.value)}
                          placeholder="Örn: YildizPilot"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-cyan-500 text-white font-mono outline-none"
                        />
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-500 font-mono uppercase italic">
                      Oyun icinde takma ad varsa o gorunur. Bos birakirsan adin ve soyadin kullanilir.
                    </p>
                 </motion.div>
               )}

               {role === 'parent' && (
                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2 text-left space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">VELI ADI</label>
                        <input
                          required={role === 'parent'}
                          type="text"
                          value={parentFirstName}
                          onChange={e => setParentFirstName(e.target.value)}
                          placeholder="Örn: Ayşe"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 text-white font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">VELI SOYADI</label>
                        <input
                          required={role === 'parent'}
                          type="text"
                          value={parentLastName}
                          onChange={e => setParentLastName(e.target.value)}
                          placeholder="Örn: Yılmaz"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 text-white font-mono outline-none"
                        />
                      </div>
                    </div>

                    <label className="block text-[10px] font-mono text-slate-400 mb-1">MÜRETTEBAT KODU (6 HANELİ)</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500/50" />
                      <input 
                        required
                        type="text" 
                        maxLength={6}
                        value={pairingCode}
                        onChange={e => setPairingCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Örn: 123456"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-4 focus:border-purple-500 text-white font-mono text-center text-xl tracking-[0.5em]"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono uppercase italic">Öğrenciniz kendi ekranından (Garaj menüsü) bu kodu sizinle paylaşmalıdır.</p>
                 </motion.div>
               )}

               <div className="pt-4 flex flex-col gap-3">
                 <button 
                   disabled={loading}
                   onClick={finalizeRegistration}
                   className={`w-full py-4 rounded-xl font-mono font-bold tracking-widest flex items-center justify-center transition-all ${role === 'student' ? 'neon-btn-blue' : 'neon-btn-purple'}`}
                 >
                   {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : (role === 'student' ? 'MÜRETTEBATI KAYDET' : 'GÖREVE BAŞLA')}
                 </button>
                 
                 <button onClick={() => setIsRegistering(false)} className="text-[10px] text-slate-500 font-mono hover:text-white transition-colors uppercase">Vazgeç</button>
               </div>
            </motion.div>
          )}

          <div className="pt-4 border-t border-slate-800">
             <Link href="/" className="text-xs text-slate-500 hover:text-white font-mono">← Ana Sayfa</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
