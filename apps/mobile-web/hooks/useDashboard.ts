import { useState, useCallback } from 'react';
import { apiGet } from '../lib/api';

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  stats: {
    totalIntentions: number;
    totalJournalEntries: number;
    totalDuaTasks: number;
    completedDuaTasks: number;
    currentStreak: number;
    longestStreak: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: string;
  }>;
  verseOfTheDay: {
    number: number;
    text: string;
    surahName: string;
    surahNumber: number;
    ayahNumber: number;
  } | null;
}

export function useDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<{ data: DashboardData }>(
        '/dashboard/overview',
      );
      setData(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.message || 'Failed to fetch dashboard';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    data,
    fetchDashboard,
  };
}