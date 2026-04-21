import { useState, useCallback } from 'react';
import { apiPost, apiGet } from '../lib/api';

interface Verse {
  number: number;
  text: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  arabicText?: string;
  tafsirSnippet?: string;
}

interface ImanifestResult {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  verses: Verse[];
  suggestedActions: Array<{ title: string; guidance?: string }>;
  encouragement: string;
  createdAt: string;
}

interface ManifestationHistoryItem {
  id: string;
  intentText: string;
  aiSummary: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  isAchieved: boolean;
}

interface RawVerse {
  verseKey: string;
  arabicText: string;
  translation: string;
  tafsirSnippet: string;
}

interface AnalyzeResponse {
  manifestationId: string;
  verses: RawVerse[];
  aiSummary: string;
  tasks: Array<string | { title?: string; guidance?: string }>;
}

interface HistoryItem extends ImanifestResult {
  text: string;
  type: 'text' | 'voice';
  totalTasks?: number;
  completedTasks?: number;
  isAchieved?: boolean;
}

interface HistoryResponse {
  manifestations: ManifestationHistoryItem[];
}

export function useImanifest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImanifestResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const mapVerse = (verse: RawVerse): Verse => {
    const [surahPart, ayahPart] = String(verse.verseKey || '').split(':');
    const surahNumber = Number(surahPart) || 0;
    const ayahNumber = Number(ayahPart) || 0;

    return {
      number: 0,
      text: verse.translation || '',
      surahName: `Surah ${surahNumber || '?'}`,
      surahNumber,
      ayahNumber,
      arabicText: verse.arabicText || '',
      tafsirSnippet: verse.tafsirSnippet || '',
    };
  };

  const normalizeTask = (
    task: string | { title?: string; guidance?: string },
  ): { title: string; guidance?: string } => {
    if (typeof task === 'string') {
      return { title: task.trim(), guidance: undefined };
    }

    const rawTitle = typeof task?.title === 'string' ? task.title : '';
    const rawGuidance = typeof task?.guidance === 'string' ? task.guidance : '';

    return {
      title: rawTitle.trim() || 'Action Step',
      guidance: rawGuidance.trim() || undefined,
    };
  };

  const analyzeIntention = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiPost<AnalyzeResponse>(
        '/imanifest/analyze',
        { intentText: text },
      );

      const mapped: ImanifestResult = {
        id: response.manifestationId,
        sentiment: 'neutral',
        verses: Array.isArray(response.verses)
          ? response.verses.map(mapVerse)
          : [],
        suggestedActions: Array.isArray(response.tasks)
          ? response.tasks.map(normalizeTask)
          : [],
        encouragement: response.aiSummary || '',
        createdAt: new Date().toISOString(),
      };

      setResult(mapped);
      return mapped;
    } catch (err: any) {
      const message = err.message || 'Failed to analyze intention';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(
    async (page = 1, limit = 10) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiGet<HistoryResponse>('/imanifest/history');
        const mapped = Array.isArray(response?.manifestations)
          ? response.manifestations.map((item) => ({
              id: item.id,
              text: item.intentText,
              type: 'text' as const,
              sentiment: (item.isAchieved ? 'positive' : item.completedTasks > 0 ? 'neutral' : 'negative') as 'positive' | 'neutral' | 'negative',
              verses: [],
              suggestedActions: [],
              encouragement: item.aiSummary,
              createdAt: item.createdAt,
              totalTasks: item.totalTasks,
              completedTasks: item.completedTasks,
              isAchieved: item.isAchieved,
            }))
          : [];

        setHistory(mapped);
        return mapped;
      } catch (err: any) {
        const message = err.message || 'Failed to fetch history';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    result,
    history,
    analyzeIntention,
    fetchHistory,
  };
}