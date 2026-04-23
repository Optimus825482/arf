import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { updateDailyTasks } from './dailyTasks';

export interface BadgeMeta {
  id: string;
  name: string;
}

export async function addXpAndBadge(userId: string, xpDelta: number, badge: BadgeMeta | null, category: string, isCorrect: boolean) {
  try {
     const userRef = doc(db, 'users', userId);
     const uSnap = await getDoc(userRef);
     if (!uSnap.exists()) return { leveledUp: false, newLevel: 1, currentXp: 0 };
     
     const data = uSnap.data();
     const oldLevel = data.level || 1;
     const oldXp = data.xp || 0;
     const lastCategory = data.lastCategory || '';
     
     // Spam engelleme: Aynı kategori üst üste yapıldığında XP %30 azalır
     let finalXpDelta = xpDelta;
     if (category === lastCategory && isCorrect) {
        finalXpDelta = Math.round(xpDelta * 0.7);
     }
     
     const newXp = oldXp + finalXpDelta;
     
     // Yeni seviye formülü: XP = 62 * (Level - 1)^2 => Level = sqrt(XP / 62) + 1
     // Bu formülle Seviye 10 için ~5022 XP gerekir.
     const newLevel = Math.floor(Math.sqrt(newXp / 62)) + 1;
     
     const leveledUp = newLevel > oldLevel;
     
     await updateDoc(userRef, {
        xp: newXp,
        level: newLevel,
        lastCategory: category,
        updatedAt: serverTimestamp()
     });

     // Performans güncellemesi
     const perfId = category === '+' || category === '-' ? 'add_sub' : 
                   (category === 'x' || category === '÷' ? 'mul_div' : 
                   (category === 'mixed' ? 'mixed_ops' :
                   (category === 'boss_deepseek' || category.startsWith('ai_') ? category : 'classic')));
     const perfRef = doc(db, `users/${userId}/performance`, perfId);
     const pSnap = await getDoc(perfRef);
     if (!pSnap.exists()) {
        await setDoc(perfRef, { 
          totalAttempts: 1, 
          correctAttempts: isCorrect ? 1 : 0,
          lastUpdated: serverTimestamp()
        });
     } else {
        await updateDoc(perfRef, {
           totalAttempts: increment(1),
           correctAttempts: increment(isCorrect ? 1 : 0),
           lastUpdated: serverTimestamp()
        });
     }

     // Badge logic
     if (badge && badge.id) {
        const badgeRef = doc(db, `users/${userId}/badges`, badge.id);
        const bSnap = await getDoc(badgeRef);
        if (!bSnap.exists()) {
           await setDoc(badgeRef, { 
             badgeId: badge.id, 
             name: badge.name, 
             earnedAt: serverTimestamp()
           });
        }
     }

     // Automatic badges based on XP and performance
     if (newXp >= 1000) {
        const nebulaRef = doc(db, `users/${userId}/badges`, 'nebula_kasifi');
        const nSnap = await getDoc(nebulaRef);
        if (!nSnap.exists()) {
           await setDoc(nebulaRef, { badgeId: 'nebula_kasifi', name: 'Nebula Kaşifi', earnedAt: serverTimestamp() });
        }
     }

     // Performance based badges (require a quick check of the updated performance)
     const pSnapAfter = await getDoc(perfRef);
     if (pSnapAfter.exists()) {
        const pData = pSnapAfter.data();
        const accuracy = pData.totalAttempts > 0 ? (pData.correctAttempts / pData.totalAttempts) * 100 : 0;
        
        if (perfId === 'add_sub' && accuracy >= 95 && pData.totalAttempts >= 50) {
           const kalkanRef = doc(db, `users/${userId}/badges`, 'kalkan_ustasi');
           const kSnap = await getDoc(kalkanRef);
           if (!kSnap.exists()) await setDoc(kalkanRef, { badgeId: 'kalkan_ustasi', name: 'Kalkan Ustası', earnedAt: serverTimestamp() });
        }

        if (perfId === 'mul_div' && accuracy >= 90 && pData.totalAttempts >= 30) {
           const kuantumRef = doc(db, `users/${userId}/badges`, 'kuantum_islemci');
           const kuSnap = await getDoc(kuantumRef);
           if (!kuSnap.exists()) await setDoc(kuantumRef, { badgeId: 'kuantum_islemci', name: 'Kuantum İşlemci', earnedAt: serverTimestamp() });
        }

        if (pData.totalAttempts >= 100 && accuracy >= 80) {
           const guardRef = doc(db, `users/${userId}/badges`, 'galaksi_koruyucusu');
           const gSnap = await getDoc(guardRef);
           if (!gSnap.exists()) await setDoc(guardRef, { badgeId: 'galaksi_koruyucusu', name: 'Galaksi Koruyucusu', earnedAt: serverTimestamp() });
        }

        if (newLevel >= 10) {
           const fatihRef = doc(db, `users/${userId}/badges`, 'kozmik_fatih');
           const fSnap = await getDoc(fatihRef);
           if (!fSnap.exists()) await setDoc(fatihRef, { badgeId: 'kozmik_fatih', name: 'Kozmik Fatih', earnedAt: serverTimestamp() });
        }
        
        if (accuracy === 100 && pData.totalAttempts >= 20) {
           const mutlakRef = doc(db, `users/${userId}/badges`, 'mutlak_dogruluk');
           const muSnap = await getDoc(mutlakRef);
           if (!muSnap.exists()) await setDoc(mutlakRef, { badgeId: 'mutlak_dogruluk', name: 'Mutlak Doğruluk', earnedAt: serverTimestamp() });
        }
        
        if (pData.totalAttempts >= 50 && category === 'boss_deepseek' && isCorrect) {
           const mineRef = doc(db, `users/${userId}/badges`, 'kara_delik_madencisi');
           const mSnap = await getDoc(mineRef);
           if (!mSnap.exists()) await setDoc(mineRef, { badgeId: 'kara_delik_madencisi', name: 'Kara Delik Madencisi', earnedAt: serverTimestamp() });
        }

        if (category === 'mixed' && isCorrect) {
           const ustaRef = doc(db, `users/${userId}/badges`, 'matematik_ustadi');
           const uSnap = await getDoc(ustaRef);
           if (!uSnap.exists()) await setDoc(ustaRef, { badgeId: 'matematik_ustadi', name: 'Matematik Üstadı', earnedAt: serverTimestamp() });
        }
     }

     // Daily Stats Snapshot for Parent Charts
     const today = new Date().toISOString().split('T')[0];
     const dailyRef = doc(db, `users/${userId}/daily_stats`, today);
     const mResult = await getStudentMetrics(userId);
     if (mResult) {
        await setDoc(dailyRef, {
           xp: mResult.xp,
           level: mResult.level,
           addSubScore: mResult.addSubScore,
           mulDivScore: mResult.mulDivScore,
           speedScore: mResult.speedScore,
           accuracy: mResult.accuracy,
           date: serverTimestamp()
        }, { merge: true });
     }
     
     await updateDailyTasks(userId, xpDelta);
     
     return { leveledUp, levelUp: leveledUp, newLevel, currentXp: newXp };
  } catch (e) {
     console.error("Progress update error:", e);
     return { leveledUp: false, levelUp: false, newLevel: 1, currentXp: 0 };
  }
}

export async function getStudentMetrics(userId: string) {
  try {
     const userRef = doc(db, 'users', userId);
     const uSnap = await getDoc(userRef);
     if (!uSnap.exists()) return null;
     
     const userData = uSnap.data();
     const perfSnap = await getDocs(collection(db, `users/${userId}/performance`));
     const metrics: {
        addSubScore: number;
        mulDivScore: number;
        speedScore: number;
        accuracy: number;
        level: number;
        xp: number;
        username: string | undefined;
     } = {
        addSubScore: userData.metrics?.addSubScore || 50, 
        mulDivScore: userData.metrics?.mulDivScore || 50, 
        speedScore: userData.metrics?.speedScore || 50, 
        accuracy: userData.metrics?.accuracy || 50,
        level: userData.level || 1, 
        xp: userData.xp || 0,
        username: userData.username
     };
     
     perfSnap.forEach(d => {
        const p = d.data();
        const score = p.totalAttempts > 0 ? (p.correctAttempts / p.totalAttempts) * 100 : 50;
        // Merge ongoing performance with initial placement
        if (d.id === 'add_sub') metrics.addSubScore = (metrics.addSubScore + score) / 2;
        if (d.id === 'mul_div') metrics.mulDivScore = (metrics.mulDivScore + score) / 2;
        if (d.id === 'classic') metrics.speedScore = (metrics.speedScore + score) / 2;
     });
     
     return metrics;
  } catch (e) {
     console.error("Get metrics error:", e);
     return null;
  }
}
