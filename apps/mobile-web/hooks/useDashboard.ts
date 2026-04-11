import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

interface DashboardStats {
  totalManifestations: number;
  totalTasks: number;
  completedTasks: number;
  currentStreak: number;
}

interface SentimentDay {
  date: string;
  sentiment: string;
  score: number;
}

interface ManifestationItem {
  id: string;
  title: string;
  createdAt: string;
  taskTotal: number;
  taskCompleted: number;
  completionPct: number;
}

export interface DashboardData {
  stats: DashboardStats;
  sentiment7Days: SentimentDay[];
  manifestations: ManifestationItem[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<DashboardData>("/dashboard/overview");
      setData(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return { data, isLoading, error, refresh: fetchOverview };
}