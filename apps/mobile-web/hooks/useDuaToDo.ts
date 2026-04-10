import { useState, useCallback } from "react";
import { api } from "../lib/api";

interface Task {
  id: string;
  manifestationId: string;
  description: string;
  isCompleted: boolean;
  quranGoalId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseDuaToDoReturn {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  generateTasks: (manifestationId: string) => Promise<void>;
  toggleTask: (taskId: string, isCompleted: boolean) => Promise<void>;
  reset: () => void;
}

export function useDuaToDo(): UseDuaToDoReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTasks = useCallback(async (manifestationId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<{ tasks: Task[] }>("/dua-to-do/generate", {
        manifestationId,
      });
      setTasks(res.data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate tasks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleTask = useCallback(async (taskId: string, isCompleted: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted } : t)),
    );
    try {
      await api.patch(`/dua-to-do/tasks/${taskId}`, { isCompleted });
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isCompleted: !isCompleted } : t)),
      );
    }
  }, []);

  const reset = useCallback(() => {
    setTasks([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { tasks, isLoading, error, generateTasks, toggleTask, reset };
}