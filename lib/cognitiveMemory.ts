/**
 * ARF Hyper-Cognitive Memory System (Phase 3)
 * Hiyerarşik ve Graf Destekli Bilişsel İşletim Sistemi
 * (PostgreSQL + pgvector mimarisi üzerinden fiziksel bellek)
 */

import { logger } from "./logger";
import pool from "./db";

export interface WorkingMemory {
  sessionId: string;
  currentFocus: string;
  consecutiveErrors: number;
  currentAnxietyLevel: number;
  currentFatigueRatio: number;
}

export interface EpisodicMemory {
  eventId: string;
  uid: string;
  timestamp: Date;
  eventContext: string;
  actionTaken: string;
  outcome: string;
}

interface WorkingMemoryMetrics {
  accuracy: number;
  frustrationLevel?: number;
  fatigueRatio?: number;
  currentFocus?: string;
}

export function classifyOutcome(accuracy: number): string {
  if (accuracy >= 85) return "Yüksek başarı ve hazır bulunuşluk";
  if (accuracy >= 60) return "Kısmi başarı, hedefli pekiştirme gerekli";
  return "Destek gerekli, temel kavramlar güçlendirilmeli";
}

export class HyperCognitiveEngine {

  /**
   * L1: SENSE - Çalışma Belleğini (L1) PostgreSQL profiline yazar.
   */
  static processWorkingMemory(uid: string, metrics: WorkingMemoryMetrics): WorkingMemory {
    const l1State: WorkingMemory = {
      sessionId: `sess_${Date.now()}`,
      currentFocus: metrics.currentFocus || "Mixed Operations",
      consecutiveErrors: metrics.accuracy < 50 ? 3 : 0,
      currentAnxietyLevel: metrics.frustrationLevel || 0,
      currentFatigueRatio: metrics.fatigueRatio || 1.0
    };

    void pool.query(
      'INSERT INTO student_profiles (uid, metrics) VALUES ($1, $2) ON CONFLICT (uid) DO UPDATE SET metrics = $2, updated_at = now()',
      [uid, JSON.stringify({ ...l1State, outcome: classifyOutcome(metrics.accuracy) })]
    ).catch(err => logger.error("L1 DB Sync Error", err));

    return l1State;
  }

  /**
   * L2: CONSOLIDATE - Önemli bilişsel anları Episodik Belleğe kaydeder.
   */
  static async consolidateToEpisodic(uid: string, l1State: WorkingMemory, finalResult: string) {
    const shouldPersist =
      l1State.consecutiveErrors >= 3 ||
      l1State.currentFatigueRatio > 1.2 ||
      l1State.currentAnxietyLevel > 70;

    if (shouldPersist) {
      try {
        await pool.query(
          'INSERT INTO episodic_memories (uid, event_context, action_taken, outcome) VALUES ($1, $2, $3, $4)',
          [
            uid,
            `${l1State.currentFocus} odağında bilişsel zorlanma (Hata serisi: ${l1State.consecutiveErrors}, Yorulma: ${l1State.currentFatigueRatio}x, Kaygı: ${l1State.currentAnxietyLevel})`,
            l1State.consecutiveErrors >= 3
              ? "Temel adıma dönme ve örnekli pekiştirme önerildi."
              : "Pedagojik yavaşlatma uygulandı.",
            finalResult
          ]
        );
        logger.info(`[L2: Memory] Kalıcı anı kaydedildi: ${uid}`);
      } catch (err) {
        logger.error("L2 DB Sync Error", err);
      }
    }
  }

  /**
   * L3: SYNTHESIZE - Graf Tabanlı neden-sonuç bağlantılarını günceller.
   */
  static async updateSemanticGraph(uid: string, l1State?: WorkingMemory) {
    try {
      const focus = l1State?.currentFocus || "Mixed Operations";
      const focusId = `focus_${focus.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "mixed"}`;
      const riskStrength = Math.min(
        1,
        Math.max(
          0.1,
          ((l1State?.consecutiveErrors || 0) * 0.2) +
            ((l1State?.currentAnxietyLevel || 0) / 200) +
            Math.max(0, (l1State?.currentFatigueRatio || 1) - 1)
        )
      );

      await pool.query(
        'INSERT INTO cognitive_nodes (id, uid, label, strength) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET strength = EXCLUDED.strength',
        [focusId, uid, `Odak: ${focus}`, Number((1 - riskStrength / 2).toFixed(2))]
      );

      await pool.query(
        'INSERT INTO cognitive_nodes (id, uid, label, strength) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET strength = EXCLUDED.strength',
        ['risk_stress_fatigue', uid, 'Stres/Yorgunluk Riski', Number(riskStrength.toFixed(2))]
      );

      logger.info(`[L3: Graph] Bilişsel graf güncellendi: ${uid}`);
    } catch (err) {
      logger.error("L3 DB Sync Error", err);
    }
  }

  /**
   * RETRIEVE - AI için fiziksel hafızadan bağlam (Context) çeker.
   */
  static async getCognitiveContext(uid: string, currentMetrics?: WorkingMemoryMetrics): Promise<string> {
    try {
      const res = await pool.query(
        'SELECT event_context, outcome FROM episodic_memories WHERE uid = $1 ORDER BY created_at DESC LIMIT 3',
        [uid]
      );

      const memories = res.rows.map(r => `- ${r.event_context} (${r.outcome})`).join("\n");

      const currentContext = currentMetrics
        ? `\n[Güncel Telemetri]: İsabet %${currentMetrics.accuracy}, yorulma ${(currentMetrics.fatigueRatio || 1).toFixed(2)}x, odak ${currentMetrics.currentFocus || "karma işlemler"}.`
        : "";

      return memories
        ? `[Fiziksel Hafıza]: Pilot geçmişte şu bilişsel zorlukları yaşadı:\n${memories}${currentContext}`
        : `Pilotun henüz derin hafıza kaydı bulunmuyor.${currentContext}`;
    } catch {
      return "Hafıza sistemi şu an pasif.";
    }
  }
}
