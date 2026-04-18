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

interface HadithReference {
  reference: string;
  text: string;
}

interface HeartPulseResult {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  emotion: string;
  advice: string;
  verses: Verse[];
  hadith: HadithReference[];
  createdAt: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
}

interface HistoryItem {
  id: string;
  text: string;
  type: 'text' | 'voice';
  sentiment: 'positive' | 'neutral' | 'negative';
  emotion: string;
  advice: string;
  verses: Verse[];
  hadith: HadithReference[];
  createdAt: string;
}

export function useHeartPulse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HeartPulseResult | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const mapSentiment = (
    label: string,
  ): 'positive' | 'neutral' | 'negative' => {
    const value = (label || '').toLowerCase();
    if (['grateful', 'hopeful', 'peaceful', 'content', 'focused'].includes(value)) {
      return 'positive';
    }
    if (['anxious', 'struggling', 'uncertain', 'heavy'].includes(value)) {
      return 'negative';
    }
    return 'neutral';
  };

  const mapVerse = (verse: any): Verse => {
    const [surahPart, ayahPart] = String(verse?.verseKey || '').split(':');
    const surahNumber = Number(surahPart) || 0;
    const ayahNumber = Number(ayahPart) || 0;

    return {
      number: 0,
      text: verse?.translation || '',
      surahName: `Surah ${surahNumber || '?'}`,
      surahNumber,
      ayahNumber,
      arabicText: verse?.arabicText || '',
      tafsirSnippet: verse?.tafsirSnippet || '',
    };
  };

  const mapHadith = (item: any): HadithReference | null => {
    if (!item || !item.reference || !item.text) return null;
    return {
      reference: String(item.reference),
      text: String(item.text),
    };
  };

  const buildGuidancePrompt = (text: string): string => {
    return [
      'User reflection:',
      text,
      '',
      'Instruction:',
      'Analyze this reflection according to Quranic teachings and the authentic Sunnah/Hadith of Prophet Muhammad (peace be upon him).',
      'Provide compassionate, practical, and spiritually grounded guidance that is faithful to Islam.',
    ].join('\n');
  };

  const analyzeEntry = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const guidancePrompt = buildGuidancePrompt(text);

      const [reflectResponse, verseResponse, modelGuidanceResponse] = await Promise.all([
        apiPost<any>('/heart-pulse/reflect', { transcriptText: text }),
        apiPost<any>('/iman-sync/quick-search', { text }),
        apiPost<any>('/iman-sync/analyze', { intentText: guidancePrompt }),
      ]);

      const aiInsight = reflectResponse?.aiInsight || {};
      const modelAdvice =
        typeof modelGuidanceResponse?.aiSummary === 'string'
          ? modelGuidanceResponse.aiSummary.trim()
          : '';

      const mapped: HeartPulseResult = {
        id: reflectResponse?.reflection?.id || `qalb-${Date.now()}`,
        sentiment: mapSentiment(reflectResponse?.sentiment || 'neutral'),
        emotion: reflectResponse?.sentiment || 'neutral',
        advice:
          modelAdvice ||
          [aiInsight.spiritual, aiInsight.tafsir, aiInsight.scientific]
            .filter((part) => typeof part === 'string' && part.trim().length > 0)
            .join('\n\n') ||
          'Allah hears every sincere heart. Keep your dhikr and continue with steady ikhtiar.',
        verses: Array.isArray(verseResponse?.verses)
          ? verseResponse.verses.map(mapVerse)
          : [],
        hadith: Array.isArray(aiInsight?.hadith)
          ? aiInsight.hadith.map(mapHadith).filter(Boolean) as HadithReference[]
          : [],
        createdAt:
          reflectResponse?.reflection?.createdAt || new Date().toISOString(),
      };

      setResult(mapped);
      return mapped;
    } catch (err: any) {
      const message = err.message || 'Failed to analyze entry';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStreak = useCallback(async () => {
    try {
      const response = await apiGet<{ reflections: any[]; streakCount: number }>(
        '/heart-pulse/history',
      );
      const mapped = {
        currentStreak: response?.streakCount || 0,
        longestStreak: response?.streakCount || 0,
      };
      setStreak(mapped);
      return mapped;
    } catch (err: any) {
      console.error('Failed to fetch streak:', err.message);
      return null;
    }
  }, []);

  const fetchHistory = useCallback(
    async (page = 1, limit = 10) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiGet<{
          reflections: Array<{
            id: string;
            transcriptText: string;
            sentiment: string;
            createdAt: string;
          }>;
          streakCount: number;
        }>('/heart-pulse/history');

        const mappedHistory: HistoryItem[] = Array.isArray(response?.reflections)
          ? response.reflections.map((item) => ({
              id: item.id,
              text: item.transcriptText || '',
              type: 'text',
              sentiment: mapSentiment(item.sentiment || 'neutral'),
              emotion: item.sentiment || 'neutral',
              advice: '',
              verses: [],
              hadith: [],
              createdAt: item.createdAt,
            }))
          : [];

        setHistory(mappedHistory);
        setStreak({
          currentStreak: response?.streakCount || 0,
          longestStreak: response?.streakCount || 0,
        });
        return response;
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
    streak,
    history,
    analyzeEntry,
    fetchStreak,
    fetchHistory,
  };
}