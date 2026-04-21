// Shared TypeScript interfaces for ImanifestApp

// === Database Models ===

export interface User {
  id: string;
  email: string;
  name: string | null;
  password?: string | null;     // bcrypt hashed — never sent to client
  quranApiKey: string | null;   // per-user Quran Foundation API key
  createdAt: Date;
  updatedAt: Date;
}

export interface Manifestation {
  id: string;
  userId: string;
  intentText: string;
  imagePath: string | null;
  verses: QuranVerse[] | null;
  aiSummary: string | null;
  createdAt: Date;
}

export interface Task {
  id: string;
  manifestationId: string;
  description: string;
  isCompleted: boolean;
  quranGoalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reflection {
  id: string;
  userId: string;
  audioPath: string | null;
  transcriptText: string | null;
  sentiment: SentimentLabel | null;
  sentimentScore: number | null;
  streakDate: Date;
  createdAt: Date;
}

// === Quran API Types ===

export interface QuranVerse {
  verseKey: string;    // e.g. "2:286"
  arabicText: string;
  translation: string;
  tafsirSnippet: string;
}

// === AI / Sentiment Types ===

export type SentimentLabel =
  | "hopeful"
  | "grateful"
  | "peaceful"
  | "content"
  | "focused"
  | "anxious"
  | "struggling"
  | "uncertain"
  | "heavy"
  | "other";

// === API Request/Response Types ===

export interface ImanifestAnalyzeRequest {
  intentText: string;
  userId: string;
}

export interface ImanifestAnalyzeResponse {
  manifestationId: string;
  verses: QuranVerse[];
  aiSummary: string;
}

export interface ImanifestVisionResponse extends ImanifestAnalyzeResponse {
  imagePath: string;
}

export interface DuaToDoGenerateRequest {
  manifestationId: string;
}

export interface DuaToDoGenerateResponse {
  tasks: Task[];
}

export interface QalbReflectResponse {
  reflection: Reflection;
  sentiment: SentimentLabel;
  sentimentScore: number;
  streakCount: number;
}

export interface TaskUpdateRequest {
  isCompleted: boolean;
}