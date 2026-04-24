/**
 * ARF Hyper-Cognitive Memory System (Phase 3)
 * PostgreSQL-backed episodic + semantic memory layer.
 */

import { logger } from "./logger";
import { query } from "./db";

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
  outcome: "success" | "failure" | "neutral";
  vectorEmbedding?: number[];
}

export interface SemanticNode {
  nodeId: string;
  uid: string;
  concept: string;
  strength: number;
}

export interface SemanticEdge {
  sourceNodeId: string;
  targetNodeId: string;
  relationType: "TRIGGERS" | "IMPROVES" | "DEPENDS_ON";
  weight: number;
}

type SqlParams = Array<string | number | boolean | null>;

function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function safeQuery(text: string, params: SqlParams = []) {
  if (!isDbConfigured()) return null;
  try {
    return await query(text, params);
  } catch (error) {
    logger.error("Cognitive memory query failed", error, { text });
    return null;
  }
}

function buildConceptSignals(l1State: WorkingMemory) {
  const signals: Array<{ nodeId: string; label: string; strength: number }> = [];

  if (l1State.currentFatigueRatio >= 1.15) {
    signals.push({
      nodeId: "concept_fatigue_under_speed",
      label: "Yorulma Altinda Hiz Kaybi",
      strength: Math.min(1, (l1State.currentFatigueRatio - 1) / 0.6),
    });
  }

  if (l1State.currentAnxietyLevel >= 40) {
    signals.push({
      nodeId: "concept_performance_anxiety",
      label: "Performans Kaygisi",
      strength: Math.min(1, l1State.currentAnxietyLevel / 100),
    });
  }

  if (l1State.consecutiveErrors >= 3) {
    signals.push({
      nodeId: "concept_error_spiral",
      label: "Ust Uste Hata Spirali",
      strength: Math.min(1, l1State.consecutiveErrors / 6),
    });
  }

  return signals;
}

function summarizeContext(episodes: Array<{ event_context: string; outcome: string }>, edges: Array<{ source_label: string; target_label: string; relation_type: string; weight: number }>) {
  const lines: string[] = [];

  if (episodes.length) {
    const episodeSummary = episodes
      .slice(0, 3)
      .map((episode) => `${episode.event_context} Sonuc: ${episode.outcome}.`);
    lines.push(`[L2 Anisal Bellek]: ${episodeSummary.join(" ")}`);
  }

  if (edges.length) {
    const edgeSummary = edges
      .slice(0, 3)
      .map((edge) => `${edge.source_label} --(${edge.relation_type})--> ${edge.target_label} (Gucluk: ${edge.weight.toFixed(2)})`);
    lines.push(`[L3 Semantik Graf]: ${edgeSummary.join(" | ")}`);
  }

  if (!lines.length) {
    lines.push("[Bellek]: Henuz yeterli kalici hafiza kaydi yok. Ogrenciyi dikkatle gozlemle ve nazik bir ton kullan.");
  } else if (edges.some((edge) => edge.source_label.includes("Kayg") || edge.target_label.includes("Kayg"))) {
    lines.push("[Oneri Yonergesi]: Sure baskisini azalt, dogrulugu odaga al, sakin ve cesaretlendirici kal.");
  } else if (edges.some((edge) => edge.source_label.includes("Yorulma") || edge.target_label.includes("Yorulma"))) {
    lines.push("[Oneri Yonergesi]: Kisa adimlar, daha yavas tempo ve mola odakli yonlendirme kullan.");
  }

  return lines.join("\n");
}

export class HyperCognitiveEngine {
  static processWorkingMemory(uid: string, metrics: { accuracy: number; frustrationLevel?: number; fatigueRatio?: number }): WorkingMemory {
    const l1State: WorkingMemory = {
      sessionId: `sess_${Date.now()}`,
      currentFocus: "Mixed Operations",
      consecutiveErrors: metrics.accuracy < 50 ? 3 : metrics.accuracy < 70 ? 1 : 0,
      currentAnxietyLevel: metrics.frustrationLevel || 0,
      currentFatigueRatio: metrics.fatigueRatio || 1.0,
    };

    logger.debug(`[L1: Working Memory] Guncellendi: ${uid}`, l1State as unknown as Record<string, unknown>);
    return l1State;
  }

  static async consolidateToEpisodic(uid: string, l1State: WorkingMemory, finalResult: string) {
    if (!(l1State.currentFatigueRatio > 1.1 || l1State.currentAnxietyLevel > 45 || l1State.consecutiveErrors >= 3)) {
      return;
    }

    const episode: EpisodicMemory = {
      eventId: `ep_${Date.now()}`,
      uid,
      timestamp: new Date(),
      eventContext: `Odak ${l1State.currentFocus}; yorulma ${l1State.currentFatigueRatio.toFixed(2)}x; kaygi ${l1State.currentAnxietyLevel}; seri hata ${l1State.consecutiveErrors}.`,
      actionTaken: l1State.currentFatigueRatio > 1.2
        ? "Sistem tempoyu yavaslatma ve mini mola onerisi uretmeli."
        : "Sistem daha sakin, cesaretlendirici yonlendirme vermeli.",
      outcome: finalResult === "improved" ? "success" : finalResult === "failure" ? "failure" : "neutral",
    };

    const inserted = await safeQuery(
      `INSERT INTO episodic_memories (uid, event_context, action_taken, outcome)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [episode.uid, episode.eventContext, episode.actionTaken, episode.outcome],
    );

    if (inserted) {
      logger.info(`[L2: Episodic Memory] Yeni ani olusturuldu: ${uid}`);
      await this.updateSemanticGraph(uid, l1State);
    }
  }

  static async updateSemanticGraph(uid: string, l1State?: WorkingMemory) {
    const signals = l1State ? buildConceptSignals(l1State) : [];
    if (!signals.length) return;

    await safeQuery(
      `INSERT INTO student_profiles (uid)
       VALUES ($1)
       ON CONFLICT (uid) DO NOTHING`,
      [uid],
    );

    for (const signal of signals) {
      await safeQuery(
        `INSERT INTO cognitive_nodes (id, uid, label, strength)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id)
         DO UPDATE SET
           uid = EXCLUDED.uid,
           label = EXCLUDED.label,
           strength = GREATEST(cognitive_nodes.strength, EXCLUDED.strength),
           updated_at = CURRENT_TIMESTAMP`,
        [signal.nodeId, uid, signal.label, signal.strength],
      );
    }

    if (signals.length >= 2) {
      const [source, target] = signals;
      await safeQuery(
        `INSERT INTO cognitive_edges (uid, source_node, target_node, relation_type, weight)
         VALUES ($1, $2, $3, $4, $5)`,
        [uid, source.nodeId, target.nodeId, "TRIGGERS", Math.max(source.strength, target.strength)],
      );
    }

    logger.info(`[L3: Semantic Graph] Guncellendi: ${uid}`);
  }

  static async getCognitiveContext(uid: string): Promise<string> {
    if (!isDbConfigured()) {
      return "[Bellek]: PostgreSQL baglantisi ayarli degil. Varsayilan nazik rehberlik kullan.";
    }

    const [episodesResult, edgesResult] = await Promise.all([
      safeQuery(
        `SELECT event_context, outcome
         FROM episodic_memories
         WHERE uid = $1
         ORDER BY created_at DESC
         LIMIT 3`,
        [uid],
      ),
      safeQuery(
        `SELECT
           sn.label AS source_label,
           tn.label AS target_label,
           ce.relation_type,
           ce.weight
         FROM cognitive_edges ce
         LEFT JOIN cognitive_nodes sn ON sn.id = ce.source_node
         LEFT JOIN cognitive_nodes tn ON tn.id = ce.target_node
         WHERE ce.uid = $1
         ORDER BY ce.updated_at DESC NULLS LAST, ce.weight DESC
         LIMIT 3`,
        [uid],
      ),
    ]);

    const episodes = episodesResult?.rows ?? [];
    const edges = edgesResult?.rows ?? [];
    return summarizeContext(episodes, edges);
  }
}
