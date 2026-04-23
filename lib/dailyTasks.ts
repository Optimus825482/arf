import { db } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export async function updateDailyTasks(userId: string, xpDelta: number) {
  try {
    const userRef = doc(db, 'users', userId);
    const uSnap = await getDoc(userRef);
    if (!uSnap.exists()) return null;

    const data = uSnap.data();
    const today = new Date().toISOString().split('T')[0];
    
    let dailyTasks = data.dailyTasks || { date: today, count: 0, xp: 0 };
    
    // If it's a new day, reset the daily tasks
    if (dailyTasks.date !== today) {
      dailyTasks = { date: today, count: 0, xp: 0 };
    }
    
    // Update count and xp
    dailyTasks.count += 1;
    dailyTasks.xp += xpDelta;
    
    await updateDoc(userRef, {
      dailyTasks,
      updatedAt: serverTimestamp()
    });
    
    return dailyTasks;
  } catch (e) {
    console.error("Daily tasks update error:", e);
    return null;
  }
}
