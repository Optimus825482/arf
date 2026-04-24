/**
 * ARF Hyper-Cognitive Memory System (Phase 3)
 * PostgreSQL-backed episodic + semantic memory layer.
 */

import { GoogleGenAI } from "@google/genai";
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
const EMBEDDING_DIMENSIONS = 1536;

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

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildDeterministicEmbedding(text: string) {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);
  if (!tokens.length) return vector;

  for (const token of tokens) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    const position = Math.abs(hash) % EMBEDDING_DIMENSIONS;
    vector[position] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}

function toPgVector(embedding: number[]) {
  return `[${embedding.map((value) => Number.isFinite(value) ? value : 0).join(",")}]`;
}

async function buildEmbedding(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildDeterministicEmbedding(text);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: [text],
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding?.length) {
      throw new Error("Gemini embedding response was empty");
    }

    return embedding.slice(0, EMBEDDING_DIMENSIONS);
  } catch (error) {
    logger.warn("Gemini embedding failed, using deterministic fallback", {
      err: error instanceof Error ? error.message : String(error),
    });
    return buildDeterministicEmbedding(text);
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

function describeWorkingMemory(l1State: WorkingMemory) {
  return [
    `Odak: ${l1State.currentFocus}`,
    `Seri hata: ${l1State.consecutiveErrors}`,
    `Kaygi: ${l1State.currentAnxietyLevel}`,
    `Yorulma: ${l1State.currentFatigueRatio.toFixed(2)}x`,
  ].join(" | ");
}

function buildRetrievalHint(uid: string, metrics?: { accuracy?: number; fatigueRatio?: number; frustrationLevel?: number; currentFocus?: string }) {
  const l1State: WorkingMemory = {
    sessionId: `retrieval_${uid}`,
    currentFocus: metrics?.currentFocus || "Mixed Operations",
    consecutiveErrors: (metrics?.accuracy ?? 100) < 50 ? 3 : (metrics?.accuracy ?? 100) < 70 ? 1 : 0,
    currentAnxietyLevel: metrics?.frustrationLevel || 0,
    currentFatigueRatio: metrics?.fatigueRatio || 1,
  };
  return describeWorkingMemory(l1State);
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

    const embeddingSource = `${episode.eventContext}\n${episode.actionTaken}\nSonuc: ${episode.outcome}`;
    const embedding = await buildEmbedding(embeddingSource);
    const inserted = await safeQuery(
      `INSERT INTO episodic_memories (uid, event_context, action_taken, outcome, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       RETURNING id`,
      [episode.uid, episode.eventContext, episode.actionTaken, episode.outcome, toPgVector(embedding)],
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

  static async getCognitiveContext(uid: string, retrievalHint?: { accuracy?: number; fatigueRatio?: number; frustrationLevel?: number; currentFocus?: string }): Promise<string> {
    if (!isDbConfigured()) {
      return "[Bellek]: PostgreSQL baglantisi ayarli degil. Varsayilan nazik rehberlik kullan.";
    }

    const retrievalQuery = await buildEmbedding(buildRetrievalHint(uid, retrievalHint));

    const [episodesResult, similarEpisodesResult, edgesResult] = await Promise.all([
      safeQuery(
        `SELECT event_context, outcome
         FROM episodic_memories
         WHERE uid = $1
         ORDER BY created_at DESC
         LIMIT 3`,
        [uid],
      ),
      safeQuery(
        `SELECT event_context, outcome
         FROM episodic_memories
         WHERE uid = $1
           AND embedding IS NOT NULL
         ORDER BY embedding <=> $2::vector
         LIMIT 3`,
        [uid, toPgVector(retrievalQuery)],
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
    const similarEpisodes = similarEpisodesResult?.rows ?? [];
    const edges = edgesResult?.rows ?? [];
    const mergedEpisodes = [...episodes];
    for (const item of similarEpisodes) {
      if (!mergedEpisodes.some((episode) => episode.event_context === item.event_context)) {
        mergedEpisodes.push(item);
      }
    }

    return summarizeContext(mergedEpisodes, edges);
  }
}
