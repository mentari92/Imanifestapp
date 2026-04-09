import { z } from "zod";

// === ImanSync Validators ===

export const imanSyncAnalyzeSchema = z.object({
  intentText: z.string().min(1).max(500),
  userId: z.string().min(1),
});

export const imanSyncVisionSchema = z.object({
  intentText: z.string().min(1).max(500),
  userId: z.string().min(1),
});

// === Dua-to-Do Validators ===

export const duaToDoGenerateSchema = z.object({
  manifestationId: z.string().min(1),
});

export const taskUpdateSchema = z.object({
  isCompleted: z.boolean(),
});

// === HeartPulse Validators ===

export const heartPulseReflectSchema = z.object({
  text: z.string().max(2000).optional(),
});

// === Auth Validators ===

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
});

// === Type exports from schemas ===

export type ImanSyncAnalyzeInput = z.infer<typeof imanSyncAnalyzeSchema>;
export type ImanSyncVisionInput = z.infer<typeof imanSyncVisionSchema>;
export type DuaToDoGenerateInput = z.infer<typeof duaToDoGenerateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type HeartPulseReflectInput = z.infer<typeof heartPulseReflectSchema>;
export type LoginInput = z.infer<typeof loginSchema>;