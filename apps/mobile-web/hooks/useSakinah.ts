import { useState, useCallback } from 'react';
import { apiGet } from '../lib/api';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Reciter {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
}

export function useSakinah() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const fetchSurahs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<{ data: Surah[] }>('/sakinah/surahs');
      setSurahs(response.data || []);
      return response.data;
    } catch (err: any) {
      const message = err.message || 'Failed to fetch surahs';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReciters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<{ data: Reciter[] }>('/sakinah/reciters');
      setReciters(response.data || []);
      return response.data;
    } catch (err: any) {
      const message = err.message || 'Failed to fetch reciters';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPopularReciters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<{ data: Reciter[] }>(
        '/sakinah/popular-reciters',
      );
      setReciters(response.data || []);
      return response.data;
    } catch (err: any) {
      const message = err.message || 'Failed to fetch reciters';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAudioUrl = useCallback(
    async (surahNumber: number, reciterIdentifier: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiGet<{ url: string }>(
          `/sakinah/audio-url?surah=${surahNumber}&reciter=${reciterIdentifier}`,
        );
        setAudioUrl(response.url);
        return response.url;
      } catch (err: any) {
        const message = err.message || 'Failed to fetch audio URL';
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
    surahs,
    reciters,
    audioUrl,
    fetchSurahs,
    fetchReciters,
    fetchPopularReciters,
    fetchAudioUrl,
  };
}