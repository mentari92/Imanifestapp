import { z } from "zod";

// === Imanifest Validators ===

export const imanifestAnalyzeSchema = z.object({
  intentText: z.string().min(1).max(500),
  userId: z.string().min(1),
});

export const imanifestVisionSchema = z.object({
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

// === Qalb Validators ===

export const qalbReflectSchema = z.object({
  text: z.string().max(2000).optional(),
});

// === Auth Validators ===

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
});

// === Type exports from schemas ===

export type ImanifestAnalyzeInput = z.infer<typeof imanifestAnalyzeSchema>;
export type ImanifestVisionInput = z.infer<typeof imanifestVisionSchema>;
export type DuaToDoGenerateInput = z.infer<typeof duaToDoGenerateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type QalbReflectInput = z.infer<typeof qalbReflectSchema>;
export type LoginInput = z.infer<typeof loginSchema>;