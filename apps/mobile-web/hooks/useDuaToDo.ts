import { useState, useCallback, useRef } from "react";
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

  // Track in-flight toggles to prevent race conditions on rapid tap
  const pendingToggles = useRef<Set<string>>(new Set());

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
    // Prevent concurrent toggle on the same task
    if (pendingToggles.current.has(taskId)) return;
    pendingToggles.current.add(taskId);

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
    } finally {
      pendingToggles.current.delete(taskId);
    }
  }, []);

  const reset = useCallback(() => {
    setTasks([]);
    setError(null);
    setIsLoading(false);
    pendingToggles.current.clear();
  }, []);

  return { tasks, isLoading, error, generateTasks, toggleTask, reset };
}
