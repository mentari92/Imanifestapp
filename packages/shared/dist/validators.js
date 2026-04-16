"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.heartPulseReflectSchema = exports.taskUpdateSchema = exports.duaToDoGenerateSchema = exports.imanSyncVisionSchema = exports.imanSyncAnalyzeSchema = void 0;
const zod_1 = require("zod");
// === ImanSync Validators ===
exports.imanSyncAnalyzeSchema = zod_1.z.object({
    intentText: zod_1.z.string().min(1).max(500),
    userId: zod_1.z.string().min(1),
});
exports.imanSyncVisionSchema = zod_1.z.object({
    intentText: zod_1.z.string().min(1).max(500),
    userId: zod_1.z.string().min(1),
});
// === Dua-to-Do Validators ===
exports.duaToDoGenerateSchema = zod_1.z.object({
    manifestationId: zod_1.z.string().min(1),
});
exports.taskUpdateSchema = zod_1.z.object({
    isCompleted: zod_1.z.boolean(),
});
// === HeartPulse Validators ===
exports.heartPulseReflectSchema = zod_1.z.object({
    text: zod_1.z.string().max(2000).optional(),
});
// === Auth Validators ===
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).optional(),
});
