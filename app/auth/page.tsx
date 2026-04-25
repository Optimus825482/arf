"use client";

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
  Activity
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
    try {
      const result = await signInWithPopup(auth, provider);
      setTempUser(result.user);
      await checkUserRoles(result.user.uid);
    } catch (error) {
      if (error instanceof FirebaseError && error.code !== 'auth/popup-closed-by-user') {
        handleSystemError(error, { title: "Giriş Hatası" });
      }
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
        <div className="hud-grid absolute inset-0 pointer-events-none" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="relative z-10"
        >
          <Cpu className="w-16 h-16 text-primary animate-pulse" />
        </motion.div>
        <p className="mt-4 font-headline text-primary tracking-[0.3em] uppercase animate-pulse">Sistem Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="command-backdrop min-h-screen text-white flex items-center justify-center p-4 relative overflow-hidden font-body">
      {/* Background Effects */}
      <div className="hud-scanline" />
      <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 shadow-[0_0_15px_rgba(47,217,244,0.3)]" />
      <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute inset-x-6 bottom-6 h-px bg-gradient-to-r from-transparent via-secondary/35 to-transparent" />
      
      {/* Ambient Glows */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-secondary/10 blur-[120px]" />
      <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
      <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />

      <main className="relative z-10 w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {!isRegistering ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="command-shell grid gap-8 p-6 md:grid-cols-[0.95fr_1.25fr] md:p-8 relative group"
            >
              {/* Decorative Corners */}
              <div className="corner-top-left" />
              <div className="corner-top-right" />
              <div className="corner-bottom-left" />
              <div className="corner-bottom-right" />

              <div className="flex flex-col justify-between gap-8 bg-[#05070A]/55 p-6 rounded-sm">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Scan className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-headline tracking-[0.2em] text-primary/60 uppercase">System Status: Active</span>
                  </div>
                  <h1 className="text-4xl font-headline font-bold tracking-tight">
                    ARF <span className="text-primary">PILOT</span>
                  </h1>
                  <p className="mt-4 max-w-xs text-sm leading-6 text-on-surface-variant">
                    Türk Uzay Kuvvetleri Matematik Akademisi komuta konsoluna güvenli erişim.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="h-px bg-gradient-to-r from-primary/50 to-transparent" />
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-headline uppercase tracking-widest text-white/45">
                    <span>Orbit Sync</span>
                    <span className="text-right text-primary">Online</span>
                    <span>Academy Link</span>
                    <span className="text-right text-secondary">Armed</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-headline text-[10px] uppercase tracking-[0.28em] text-primary/70">TUR_HQ Access Node</p>
                    <h2 className="mt-2 font-headline text-2xl font-bold uppercase tracking-wider">Komuta Girişi</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <TurkishFlag className="w-10 h-7 shadow-lg" />
                    <div className="flex items-center gap-1 text-[10px] font-headline text-white/40">
                      <Globe className="w-3 h-3" />
                      SECURE
                    </div>
                  </div>
                </div>

                <div className="hud-module p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-headline font-semibold text-sm">Güvenli Erişim</h2>
                      <p className="text-xs text-white/40">Komuta merkezine giriş yapın</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="w-full cyber-button-primary group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4 fill-background" />
                      GOOGLE İLE BAĞLAN
                    </span>
                    <motion.div 
                      className="absolute inset-0 bg-white/20 translate-x-[-100%]"
                      whileHover={{ translateX: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-white/20 px-2">
                  <div className="h-px flex-1 bg-current" />
                  <span className="text-[10px] font-headline tracking-widest uppercase">System Logs</span>
                  <div className="h-px flex-1 bg-current" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="hud-module p-3 flex items-center gap-3">
                    <Activity className="w-4 h-4 text-primary/60" />
                    <div>
                      <p className="text-[8px] text-white/40 font-headline uppercase">Latency</p>
                      <p className="text-xs font-mono">12ms</p>
                    </div>
                  </div>
                  <div className="hud-module p-3 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-primary/60" />
                    <div>
                      <p className="text-[8px] text-white/40 font-headline uppercase">Encryption</p>
                      <p className="text-xs font-mono">AES-256</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 mt-2 pt-5 border-t border-primary/10 flex items-center justify-between text-[10px] text-white/30 font-headline">
                <span>© 2026 ARF AEROSPACE</span>
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-primary animate-ping" />
                  SECURE CONNECTION
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hud-module p-8 relative"
            >
              <div className="corner-top-left" />
              <div className="corner-top-right" />
              <div className="corner-bottom-left" />
              <div className="corner-bottom-right" />

              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setIsRegistering(false)}
                  className="p-2 hover:bg-white/5 rounded-sm transition-colors text-white/40 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div>
                  <h2 className="text-2xl font-headline font-bold">Pilot Kayıt Protokolü</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest">Adım {registrationStep} / 2</p>
                </div>
              </div>

              {registrationStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm text-white/60 mb-6">Sistemdeki rütbenizi belirleyin. Bu ayar daha sonra komuta merkezi tarafından değiştirilebilir.</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => { setRole("student"); setRegistrationStep(2); }}
                      className={`p-6 rounded-sm transition-all text-left relative group overflow-hidden ${
                        role === "student" ? "bg-primary/10 shadow-[0_0_20px_rgba(47,217,244,0.1)]" : "bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <UserIcon className={`w-8 h-8 mb-4 ${role === "student" ? "text-primary" : "text-white/40"}`} />
                      <h3 className="font-headline font-bold text-lg">Öğrenci Pilot</h3>
                      <p className="text-xs text-white/40">Eğitim simülasyonları ve görevlere erişim.</p>
                      {role === "student" && <motion.div layoutId="active-role" className="absolute top-4 right-4 w-2 h-2 bg-primary shadow-[0_0_10px_rgba(47,217,244,1)]" />}
                    </button>

                    <button
                      onClick={() => { setRole("parent"); setRegistrationStep(2); }}
                      className={`p-6 rounded-sm transition-all text-left relative group overflow-hidden ${
                        role === "parent" ? "bg-secondary/10 shadow-[0_0_20px_rgba(255,179,173,0.1)]" : "bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <Shield className={`w-8 h-8 mb-4 ${role === "parent" ? "text-secondary" : "text-white/40"}`} />
                      <h3 className="font-headline font-bold text-lg">Veli / Gözlemci</h3>
                      <p className="text-xs text-white/40">Pilot performans izleme ve raporlama yetkisi.</p>
                      {role === "parent" && <motion.div layoutId="active-role" className="absolute top-4 right-4 w-2 h-2 bg-secondary shadow-[0_0_10px_rgba(255,179,173,1)]" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-primary/5 rounded-sm flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-sm bg-primary/20 p-0.5">
                      <img src={tempUser?.photoURL || ""} alt="" className="w-full h-full rounded-sm object-cover" />
                    </div>
                    <div>
                      <p className="text-[10px] font-headline text-primary uppercase">Tanımlanan Profil</p>
                      <p className="text-sm font-semibold">{tempUser?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-headline text-white/40 uppercase tracking-widest ml-1">İsim</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Adınız"
                        className="w-full cyber-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-headline text-white/40 uppercase tracking-widest ml-1">Soyisim</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Soyadınız"
                        className="w-full cyber-input"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-tertiary-container/10 rounded-sm text-tertiary-container/90">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-xs leading-relaxed">Bilgilerinizin doğruluğu sistem güvenliği ve sertifika süreçleri için kritiktir.</p>
                  </div>

                  <button
                    onClick={finalizeRegistration}
                    disabled={isSubmitting || !firstName || !lastName}
                    className="w-full cyber-button-primary"
                  >
                    {isSubmitting ? "PROTOKOL İŞLENİYOR..." : "KAYDI TAMAMLA"}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Side HUD Elements (Visible on larger screens) */}
      <div className="hidden xl:block absolute left-10 top-1/2 -translate-y-1/2 space-y-8 pointer-events-none">
        <div className="space-y-2">
          <div className="h-0.5 w-12 bg-primary/40" />
          <p className="text-[10px] font-headline text-primary/40 rotate-90 origin-left mt-10 tracking-[0.5em] uppercase">Navigation_Matrix</p>
        </div>
      </div>

      <div className="hidden xl:block absolute right-10 top-1/2 -translate-y-1/2 space-y-8 pointer-events-none text-right">
        <div className="space-y-1">
          <p className="text-[10px] font-headline text-white/20 uppercase tracking-widest">Protocol_V.2.4.0</p>
          <div className="h-0.5 w-32 bg-white/10 ml-auto" />
          <div className="h-0.5 w-16 bg-primary/20 ml-auto" />
        </div>
      </div>
    </div>
  );
}
