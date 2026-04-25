import { z } from "zod";

export const deepseekRequestSchema = z.object({
  level: z.number().int().min(1).max(100),
  performanceHistory: z
    .object({
      accuracy: z.number().min(0).max(100).optional(),
      speedScore: z.number().min(0).max(100).optional(),
      addSubScore: z.number().min(0).max(100).optional(),
      mulDivScore: z.number().min(0).max(100).optional(),
      mentalMathScore: z.number().min(0).max(100).optional(),
    })
    .partial()
    .passthrough()
    .optional(),
});

export const studentXpUpdateSchema = z.object({
  xpDelta: z.number().int().min(-10000).max(10000).optional(),
  level: z.number().int().min(1).max(1000).optional(),
  completedMissionId: z.string().min(1).max(128).optional(),
  mathAssessment: z
    .object({
      score: z.number().min(0).max(100),
      level: z.number().int().min(1).max(20),
      completedAt: z.string().datetime().optional(),
    })
    .optional(),
}).passthrough();

export const settingsUpdateSchema = z.object({
  deepseekApiKey: z.string().min(1).max(512).optional(),
  parentName: z.string().min(1).max(128).optional(),
  notificationsEnabled: z.boolean().optional(),
}).passthrough();

export const missionsRequestSchema = z.object({
  username: z.string().max(64).optional(),
  level: z.number().int().min(1).max(1000).optional(),
  xp: z.number().int().min(0).max(10_000_000).optional(),
  actionPlan: z.string().max(4000).optional(),
  learningPath: z.string().max(4000).optional(),
  metrics: z.record(z.string().max(64), z.unknown()).optional(),
}).passthrough();

export const briefingRequestSchema = z.object({
  studentId: z.string().min(1).max(128),
  studentName: z.string().max(128).optional(),
  level: z.number().int().min(1).max(1000).optional(),
  xp: z.number().int().min(0).max(10_000_000).optional(),
  performance: z.record(z.string().max(64), z.any()),
  badges: z.array(z.string().max(128)).max(256).optional(),
  actionPlan: z.string().max(8000).optional(),
  learningPath: z.string().max(8000).optional(),
}).passthrough();


export const placementResultSchema = z.object({
  type: z.enum(["+", "-", "x", "÷", "mm"]),
  correct: z.boolean(),
  time: z.number().finite().min(0).max(120_000),
});

export const placementPayloadSchema = z.object({
  results: z.array(placementResultSchema).min(2).max(100),
});

export const ragQueryRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  topK: z.number().int().min(1).max(12).optional(),
  limit: z.number().int().min(1).max(12).optional(),
  minSimilarity: z.number().min(-1).max(1).optional(),
  maxContextChars: z.number().int().min(120).max(6000).optional(),
});

export type PlacementResult = z.infer<typeof placementResultSchema>;

export type DeepseekRequest = z.infer<typeof deepseekRequestSchema>;
export type StudentXpUpdate = z.infer<typeof studentXpUpdateSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type MissionsRequest = z.infer<typeof missionsRequestSchema>;
export type BriefingRequest = z.infer<typeof briefingRequestSchema>;
export type RagQueryRequest = z.infer<typeof ragQueryRequestSchema>;

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}
