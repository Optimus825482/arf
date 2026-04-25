"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { UserData } from '@/lib/types';

export function useUserData() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [studentData, setStudentData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Pairing Code Üretme Fonksiyonu
  const generatePairingCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ARF-${code}`;
  };

  useEffect(() => {
    if (!user) {
      setUserData(null);
      setStudentData(null);
      setLoading(false);
      return;
    }

    let unsubStudent: (() => void) | null = null;

    // Kullanıcı verisini dinle
    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserData;
        
        // EĞER ÖĞRENCİ VE KODU YOKSA: Üret ve kaydet
        if (data.role === 'student' && !data.pairingCode) {
          const newCode = generatePairingCode();
          await updateDoc(userDocRef, { pairingCode: newCode });
          return;
        }

        setUserData(data);

        // Eğer veli ise ve bağlı öğrenci varsa, öğrenciyi de dinle
        if (data.role === 'parent' && data.linkedStudentId) {
          // Eğer zaten bir öğrenci dinleniyorsa ve id değişmemişse tekrar kurma
          // (Bu basit kontrol, gereksiz listener'ları önler)
          const studentDocRef = doc(db, 'users', data.linkedStudentId);
          
          // Önceki öğrenci dinleyicisini temizle
          if (unsubStudent) unsubStudent();

          unsubStudent = onSnapshot(studentDocRef, (sSnapshot) => {
            if (sSnapshot.exists()) {
              setStudentData(sSnapshot.data() as UserData);
            } else {
              setStudentData(null);
            }
            setLoading(false);
          });
        } else {
          setStudentData(null);
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubUser();
      if (unsubStudent) unsubStudent();
    };
  }, [user]);

  return { userData, studentData, loading };
}
