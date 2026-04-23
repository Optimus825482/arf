'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, TrendingUp } from 'lucide-react';

interface ChartProps {
  userId: string;
}

export default function StudentProgressChart({ userId }: ChartProps) {
  const [data, setData] = useState<Array<Record<string, string | number>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const statsRef = collection(db, `users/${userId}/daily_stats`);
        const q = query(statsRef, orderBy('date', 'asc'), limit(30));
        const snap = await getDocs(q);
        
        const historyData = snap.docs.map(doc => {
           const d = doc.data();
           return {
              name: doc.id,
              xp: d.xp,
              level: d.level,
              'Kalkan (T/Ç)': Math.round(d.addSubScore || 0),
              'İtki (Ç/B)': Math.round(d.mulDivScore || 0),
              'Hız': Math.round(d.speedScore || 0)
           };
        });
        
        setData(historyData);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Chart data error:", e);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [userId]);

  if (loading) return (
    <div className="h-64 flex items-center justify-center bg-slate-900/20 rounded-2xl border border-white/5">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  );

  if (data.length < 2) return (
    <div className="h-64 flex flex-col items-center justify-center bg-slate-900/20 rounded-2xl border border-white/5 text-slate-500 font-mono text-xs">
      <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
      Grafik için daha fazla veri toplanıyor...
    </div>
  );

  return (
    <div className="glass-panel p-4 h-80 w-full mt-6">
      <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
         <TrendingUp className="w-4 h-4 text-purple-400" /> PERFORMANS TELEMETRİSİ (SON 30 GÜN)
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis 
            dataKey="name" 
            stroke="#64748b" 
            fontSize={10} 
            tickFormatter={(val) => val.split('-').slice(1).join('/')} 
          />
          <YAxis stroke="#64748b" fontSize={10} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          <Line type="monotone" dataKey="xp" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="XP" />
          <Line type="monotone" dataKey="Kalkan (T/Ç)" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="İtki (Ç/B)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Hız" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
