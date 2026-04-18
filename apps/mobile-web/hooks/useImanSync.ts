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

interface ImanSyncResult {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  verses: Verse[];
  suggestedActions: string[];
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
  tasks: string[];
}

interface HistoryItem extends ImanSyncResult {
  text: string;
  type: 'text' | 'voice';
  totalTasks?: number;
  completedTasks?: number;
  isAchieved?: boolean;
}

interface HistoryResponse {
  manifestations: ManifestationHistoryItem[];
}

export function useImanSync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImanSyncResult | null>(null);
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

  const analyzeIntention = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiPost<AnalyzeResponse>(
        '/iman-sync/analyze',
        { intentText: text },
      );

      const mapped: ImanSyncResult = {
        id: response.manifestationId,
        sentiment: 'neutral',
        verses: Array.isArray(response.verses)
          ? response.verses.map(mapVerse)
          : [],
        suggestedActions: Array.isArray(response.tasks) ? response.tasks : [],
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
        const response = await apiGet<HistoryResponse>('/iman-sync/history');
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