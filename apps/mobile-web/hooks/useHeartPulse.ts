import { useState, useCallback } from "react";
import { api } from "../lib/api";

interface Reflection {
  id: string;
  userId: string;
  audioPath: string | null;
  transcriptText: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  streakDate: string;
  createdAt: string;
}

interface UseHeartPulseReturn {
  reflection: Reflection | null;
  sentiment: string | null;
  sentimentScore: number | null;
  streakCount: number;
  isLoading: boolean;
  error: string | null;
  submitTextReflection: (text: string) => Promise<void>;
  submitVoiceReflection: (audioUri: string, transcriptText: string) => Promise<void>;
  reset: () => void;
}

export function useHeartPulse(): UseHeartPulseReturn {
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [sentimentScore, setSentimentScore] = useState<number | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitTextReflection = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post("/heart-pulse/reflect", {
        transcriptText: text,
      });
      setReflection(res.data.reflection);
      setSentiment(res.data.sentiment);
      setSentimentScore(res.data.sentimentScore);
      setStreakCount(res.data.streakCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit reflection");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitVoiceReflection = useCallback(async (audioUri: string, transcriptText: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("audio", {
        uri: audioUri,
        type: "audio/m4a",
        name: "recording.m4a",
      } as unknown as Blob);
      formData.append("transcriptText", transcriptText);

      const res = await api.post("/heart-pulse/reflect-voice", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setReflection(res.data.reflection);
      setSentiment(res.data.sentiment);
      setSentimentScore(res.data.sentimentScore);
      setStreakCount(res.data.streakCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit voice reflection");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReflection(null);
    setSentiment(null);
    setSentimentScore(null);
    setStreakCount(0);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    reflection,
    sentiment,
    sentimentScore,
    streakCount,
    isLoading,
    error,
    submitTextReflection,
    submitVoiceReflection,
    reset,
  };
}