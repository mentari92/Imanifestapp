import { useState, useCallback, useRef } from 'react';
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

// Demo data for offline/fallback mode
const DEMO_DASHBOARD: DashboardData = {
  user: {
    id: 'demo-user',
    name: 'Mentari',
    email: 'mentari@imanifestapp.com',
  },
  stats: {
    totalIntentions: 5,
    totalJournalEntries: 12,
    totalDuaTasks: 23,
    completedDuaTasks: 8,
    currentStreak: 3,
    longestStreak: 15,
  },
  recentActivity: [
    {
      id: '1',
      type: 'intention',
      title: 'Niat untuk istiqomah dalam ibadah',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'dua',
      title: 'Completed morning dua checklist',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  verseOfTheDay: {
    number: 1,
    text: 'Alif-Laam-Meem. This is the scripture whereof there is no doubt, a guidance unto those who ward off (evil).',
    surahName: 'Al-Baqarah',
    surahNumber: 2,
    ayahNumber: 1,
  },
};

/**
 * Retry logic with exponential backoff for API calls
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelayMs = 500,
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}

export function useDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const retryCountRef = useRef(0);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOfflineMode(false);
    retryCountRef.current = 0;

    try {
      const response = await fetchWithRetry(
        () => apiGet<{ data: DashboardData }>('/dashboard/overview'),
        3,
        500,
      );
      setData(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.message || 'Failed to fetch dashboard';
      
      // Check if error is network/connectivity related
      const isNetworkError = 
        message.includes('502') ||
        message.includes('Failed to fetch') ||
        message.includes('Network') ||
        message.includes('timeout') ||
        message.includes('ECONNREFUSED');

      if (isNetworkError) {
        // Use demo data in offline mode
        setData(DEMO_DASHBOARD);
        setIsOfflineMode(true);
          setError('Live data belum tersedia. Menampilkan preview sementara.');
      } else {
        setError(message);
      }
      
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
    isOfflineMode,
  };
}