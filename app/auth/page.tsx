'use client';

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  User as UserIcon, 
  Lock, 
  AlertCircle, 
  ChevronRight, 
  Globe, 
  Cpu, 
  Scan,
  Zap,
  Activity,
  Terminal,
  Wifi,
  Radio
} from "lucide-react";
import { toast } from "sonner";
import { handleSystemError } from "@/lib/errors";
import TurkishFlag from "@/components/TurkishFlag";
import { FirebaseError } from "firebase/app";

type UserRole = "student" | "parent" | "admin";

export default function AuthPage() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [role, setRole] = useState<UserRole>("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempUser, setTempUser] = useState<FirebaseUser | null>(null);

  const checkUserRoles = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        router.replace(userDoc.data()?.role === "parent" ? "/veli" : "/ogrenci");
      } else {
        setIsRegistering(true);
      }
    } catch (error) {
      handleSystemError(error, { title: "Yetki Kontrolü" });
    }
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && !isRegistering) {
        checkUserRoles(currentUser.uid);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [checkUserRoles, isRegistering]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, provider);
      setTempUser(result.user);
      await checkUserRoles(result.user.uid);
    } catch (error) {
      if (error instanceof FirebaseError && error.code !== 'auth/popup-closed-by-user') {
        handleSystemError(error, { title: "Giriş Hatası" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizeRegistration = async () => {
    const activeUser = tempUser || user;
    if (!firstName || !lastName || !activeUser) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }

    setIsSubmitting(true);
    try {
      const pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const userData = {
        uid: activeUser.uid,
        email: activeUser.email,
        displayName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        role,
        photoURL: activeUser.photoURL,
        createdAt: serverTimestamp(),
        pairingCode,
        isCompleted: true,
        level: 1,
        xp: 0,
      };

      await setDoc(doc(db, "users", activeUser.uid), userData);
      toast.success("Kayıt başarıyla tamamlandı!");
      router.replace(role === "parent" ? "/veli" : "/ogrenci");
    } catch (error) {
      handleSystemError(error, { title: "Kayıt Hatası" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#040608] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <motion.div
          animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="relative z-10"
        >
          <Cpu className="w-16 h-16 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
        </motion.div>
        <p className="mt-6 font-headline text-cyan-400 tracking-[0.5em] uppercase text-xs animate-pulse font-black">SİSTEM_YÜKLENİYOR...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040608] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-400 selection:text-[#040608]">
      {/* Premium HUD Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(34,211,238,0.03)_50%,transparent_100%)] bg-[size:100%_8px] animate-[scanline_12s_linear_infinite]"></div>
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-cyan-900/10 blur-[150px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-red-900/10 blur-[150px] rounded-full"></div>
      </div>
      
      <main className="relative z-10 w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {!isRegistering ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
              className="hud-glass border border-white/5 grid gap-0 overflow-hidden md:grid-cols-[0.8fr_1.2fr] rounded-sm relative group"
            >
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/40 m-2"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/40 m-2"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/40 m-2"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/40 m-2"></div>

              {/* Left Panel: Branding & Mission */}
              <div className="flex flex-col justify-between gap-12 bg-white/[0.02] p-8 md:p-12 border-r border-white/5">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-400/10 rounded-sm border border-cyan-400/20">
                      <Scan className="w-5 h-5 text-cyan-400 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-label tracking-[0.3em] text-cyan-400 uppercase font-black">NODE: ARF_OS_v4.0</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h1 className="text-5xl font-headline font-black tracking-tighter italic">
                      ARF <span className="text-cyan-400 not-italic">OS</span>
                    </h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-transparent"></div>
                  </div>
                  
                  <p className="text-sm leading-relaxed text-on-surface-variant font-medium tracking-wide">
                    Türk Uzay Kuvvetleri Akademisi için geliştirilmiş, ileri düzey matematiksel eğitim ve operasyonel takip arayüzü.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-[9px] font-label uppercase tracking-[0.2em] text-on-surface-variant font-black">
                    <div className="space-y-1">
                      <p className="text-cyan-400/50">ORBİTAL SENKRON</p>
                      <p className="text-white">AKTİF</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-cyan-400/50">KOMUTA BAĞI</p>
                      <p className="text-white">GÜVENLİ</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-cyan-400/5 border border-cyan-400/10 rounded-sm">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-label tracking-widest text-cyan-400 uppercase font-black">CANLI_VERİ_AKIŞI_AÇIK</span>
                  </div>
                </div>
              </div>

              {/* Right Panel: Auth Actions */}
              <div className="p-8 md:p-12 flex flex-col justify-center space-y-10">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="font-label text-[10px] uppercase tracking-[0.4em] text-cyan-400/60 font-black">ERİŞİM_PROTOKOLÜ</p>
                    <h2 className="text-3xl font-headline font-black uppercase tracking-wider italic">Giriş Yap</h2>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="p-1 border border-white/10 rounded-sm">
                      <TurkishFlag className="w-10 h-7 rounded-[1px]" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-label font-black text-cyan-400 uppercase tracking-widest">
                      <Globe className="w-3 h-3" />
                      HQ_LINK
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-sm border border-white/5 bg-white/[0.02] hud-glass group/btn transition-all duration-500 hover:border-cyan-400/30">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-sm bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center transition-transform duration-500 group-hover/btn:scale-110">
                        <Shield className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-headline font-black text-sm uppercase tracking-widest">GÜVENLİ BAĞLANTI</h3>
                        <p className="text-[10px] text-on-surface-variant font-label font-bold uppercase tracking-wider">Tek tıkla akademiye erişin</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-full relative py-4 bg-cyan-400 text-[#040608] font-label font-black tracking-[0.2em] uppercase text-xs rounded-sm overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group/google"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3 transition-transform group-active/google:scale-95">
                        {isSubmitting ? (
                          <Activity className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 fill-current" />
                        )}
                        {isSubmitting ? "PROTOKOL İŞLENİYOR..." : "GOOGLE İLE BAĞLAN"}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="text-[8px] font-label tracking-[0.5em] uppercase text-white/20 font-black">SİSTEM_GÜNLÜĞÜ</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-sm border border-white/5 bg-white/[0.01] flex items-center gap-3">
                      <Wifi className="w-4 h-4 text-cyan-400/40" />
                      <div>
                        <p className="text-[8px] text-on-surface-variant font-label font-black uppercase">Gecikme</p>
                        <p className="text-xs font-mono font-bold text-cyan-400">0.02ms</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-sm border border-white/5 bg-white/[0.01] flex items-center gap-3">
                      <Lock className="w-4 h-4 text-cyan-400/40" />
                      <div>
                        <p className="text-[8px] text-on-surface-variant font-label font-black uppercase">Şifreleme</p>
                        <p className="text-xs font-mono font-bold text-cyan-400">RSA-4096</p>
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-label font-black text-white/20 uppercase tracking-widest">© 2026 ARF_AEROSPACE</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></div>
                    <span className="text-[9px] font-label font-black text-cyan-400 uppercase tracking-widest">HQ_CONNECTED</span>
                  </div>
                </footer>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              className="hud-glass border border-white/5 p-8 md:p-12 relative max-w-2xl mx-auto rounded-sm"
            >
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-400/40 m-2"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-400/40 m-2"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-400/40 m-2"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-400/40 m-2"></div>

              <div className="flex items-center gap-6 mb-12">
                <button 
                  onClick={() => setIsRegistering(false)}
                  className="p-3 bg-white/5 hover:bg-red-400/20 rounded-sm transition-all text-white/40 hover:text-red-400 group/back"
                >
                  <ChevronRight className="w-5 h-5 rotate-180 transition-transform group-hover/back:-translate-x-1" />
                </button>
                <div className="space-y-1">
                  <p className="text-[10px] font-label font-black text-red-400 uppercase tracking-[0.4em]">YENİ_KAYIT_PROTOKOLÜ</p>
                  <h2 className="text-3xl font-headline font-black uppercase italic tracking-wider">Pilot Tanımlama</h2>
                </div>
              </div>

              {registrationStep === 1 ? (
                <div className="space-y-8">
                  <div className="p-4 bg-red-400/5 border-l-2 border-red-400/50">
                    <p className="text-sm text-on-surface-variant font-medium leading-relaxed italic">
                      "Akademiye katılım için rütbe ve görev alanınızı seçin. Bu seçim operasyonel yetkilerinizi belirleyecektir."
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => { setRole("student"); setRegistrationStep(2); }}
                      className={`p-8 rounded-sm transition-all text-left relative group overflow-hidden border-2 ${
                        role === "student" ? "bg-cyan-400/5 border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.15)]" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      <UserIcon className={`w-10 h-10 mb-6 transition-colors ${role === "student" ? "text-cyan-400" : "text-white/20"}`} />
                      <h3 className="font-headline font-black text-xl uppercase italic mb-2 tracking-wide">PİLOT</h3>
                      <p className="text-xs text-on-surface-variant font-medium leading-relaxed">Matematiksel simülasyonlar ve aktif saha görevleri.</p>
                      {role === "student" && (
                        <div className="absolute top-4 right-4">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => { setRole("parent"); setRegistrationStep(2); }}
                      className={`p-8 rounded-sm transition-all text-left relative group overflow-hidden border-2 ${
                        role === "parent" ? "bg-red-400/5 border-red-400/50 shadow-[0_0_30px_rgba(248,113,113,0.15)]" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      <Shield className={`w-10 h-10 mb-6 transition-colors ${role === "parent" ? "text-red-400" : "text-white/20"}`} />
                      <h3 className="font-headline font-black text-xl uppercase italic mb-2 tracking-wide">GÖZCÜ</h3>
                      <p className="text-xs text-on-surface-variant font-medium leading-relaxed">Pilot performans analizi ve lojistik takip.</p>
                      {role === "parent" && (
                        <div className="absolute top-4 right-4">
                          <div className="w-2 h-2 bg-red-400 rounded-full shadow-[0_0_10px_rgba(248,113,113,1)]"></div>
                        </div>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] font-label font-black text-white/20 uppercase tracking-widest px-2">
                    <span>STEP_01: ROL_SEÇİMİ</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-1 bg-red-400"></div>
                      <div className="w-4 h-1 bg-white/10"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="p-6 bg-white/[0.03] border border-white/5 rounded-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-sm bg-white/5 p-1 border border-white/10 relative">
                      <img src={tempUser?.photoURL || ""} alt="" className="w-full h-full rounded-sm object-cover opacity-80" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-400 rounded-sm flex items-center justify-center border border-[#040608]">
                        <Scan className="w-2.5 h-2.5 text-[#040608]" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-label font-black text-cyan-400/60 uppercase tracking-widest">AKADEMİ_KİMLİĞİ</p>
                      <p className="text-sm font-mono font-bold">{tempUser?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-label font-black text-on-surface-variant uppercase tracking-[0.3em] ml-1">İSİM_BİLGİSİ</label>
                      <div className="relative">
                        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400/40" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="ADINIZ"
                          className="w-full bg-[#040608]/50 border border-white/10 rounded-sm py-4 pl-12 pr-4 font-headline text-sm uppercase tracking-widest focus:border-red-400/50 focus:ring-0 transition-all outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-label font-black text-on-surface-variant uppercase tracking-[0.3em] ml-1">SOYİSİM_BİLGİSİ</label>
                      <div className="relative">
                        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400/40" />
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="SOYADINIZ"
                          className="w-full bg-[#040608]/50 border border-white/10 rounded-sm py-4 pl-12 pr-4 font-headline text-sm uppercase tracking-widest focus:border-red-400/50 focus:ring-0 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-400/5 border border-red-400/20 rounded-sm flex gap-4 items-start">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium leading-relaxed text-red-400/80 tracking-wide uppercase">
                      DİKKAT: Verilen bilgiler operasyonel sertifikalarınızda kullanılacaktır. Lütfen doğruluğundan emin olun.
                    </p>
                  </div>

                  <button
                    onClick={finalizeRegistration}
                    disabled={isSubmitting || !firstName || !lastName}
                    className="w-full relative py-5 bg-red-400 text-[#040608] font-label font-black tracking-[0.3em] uppercase text-xs rounded-sm overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(248,113,113,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group/finalize"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3 transition-transform group-active/finalize:scale-95">
                      {isSubmitting ? (
                        <Activity className="w-4 h-4 animate-spin" />
                      ) : (
                        <Radio className="w-4 h-4" />
                      )}
                      {isSubmitting ? "PROTOKOL İŞLENİYOR..." : "KAYDI TAMAMLA"}
                    </span>
                  </button>
                  
                  <div className="flex items-center justify-between text-[10px] font-label font-black text-white/20 uppercase tracking-widest px-2">
                    <span>STEP_02: VERİ_GİRİŞİ</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-1 bg-red-400"></div>
                      <div className="w-4 h-1 bg-red-400"></div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative Floating Data */}
      <div className="hidden lg:block fixed left-12 bottom-12 space-y-4 opacity-20 pointer-events-none">
        <div className="font-mono text-[8px] space-y-1">
          <p className="text-cyan-400 tracking-[0.3em]">SECURE_TUNNEL: ESTABLISHED</p>
          <p className="text-white tracking-[0.3em]">IP_REMOTE: 192.168.1.104</p>
          <p className="text-white tracking-[0.3em]">CRYPT_MODE: RSA_4096_CHACHA20</p>
        </div>
        <div className="h-px w-32 bg-gradient-to-r from-cyan-400 to-transparent"></div>
      </div>
    </div>
  );
}

