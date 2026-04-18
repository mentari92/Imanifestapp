import { useState, useCallback } from 'react';
import { apiPost, apiPatch } from '../lib/api';

interface Verse {
  number: number;
  text: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
}

interface DuaTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

interface GenerateTasksResult {
  tasks: DuaTask[];
  relevantVerses: Verse[];
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

interface RawTask {
  id: string;
  description: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export function useDuaToDo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DuaTask[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);

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
    };
  };

  const mapTask = (task: RawTask, index: number): DuaTask => ({
    id: task.id,
    title: task.description,
    description: task.description,
    completed: Boolean(task.isCompleted),
    order: index,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });

  const generateTasks = useCallback(async (intention: string) => {
    setLoading(true);
    setError(null);
    try {
      const analyzeResponse = await apiPost<AnalyzeResponse>(
        '/iman-sync/analyze',
        { intentText: intention },
      );

      const taskResponse = await apiPost<{ tasks: RawTask[] }>(
        '/dua-to-do/generate',
        { manifestationId: analyzeResponse.manifestationId },
      );

      const mappedTasks = Array.isArray(taskResponse?.tasks)
        ? taskResponse.tasks.map(mapTask)
        : [];
      const mappedVerses = Array.isArray(analyzeResponse?.verses)
        ? analyzeResponse.verses.map(mapVerse)
        : [];

      setTasks(mappedTasks);
      setVerses(mappedVerses);

      return {
        tasks: mappedTasks,
        relevantVerses: mappedVerses,
      };
    } catch (err: any) {
      const message = err.message || 'Failed to generate tasks';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setTasks([]);
    return [];
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    try {
      await apiPatch(
        `/dua-to-do/tasks/${taskId}`,
        { isCompleted: true },
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: true } : t,
        ),
      );
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to complete task');
      throw err;
    }
  }, []);

  const uncompleteTask = useCallback(async (taskId: string) => {
    try {
      await apiPatch(
        `/dua-to-do/tasks/${taskId}`,
        { isCompleted: false },
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: false } : t,
        ),
      );
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to uncomplete task');
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    tasks,
    verses,
    generateTasks,
    fetchTasks,
    completeTask,
    uncompleteTask,
    deleteTask,
  };
}