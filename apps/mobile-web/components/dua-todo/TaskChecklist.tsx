import { View, Text, FlatList } from "react-native";
import { TaskItem } from "./TaskItem";

interface Task {
  id: string;
  manifestationId: string;
  description: string;
  isCompleted: boolean;
  quranGoalId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskChecklistProps {
  tasks: Task[];
  onToggle: (taskId: string, isCompleted: boolean) => void;
}

export function TaskChecklist({ tasks, onToggle }: TaskChecklistProps) {
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <View className="flex-1">
      <Text className="font-display text-display-lg text-primary">
        Your Action Plan
      </Text>

      {tasks.length === 0 ? (
        <View className="mt-8 items-center">
          <Text className="font-sans text-body-md text-ink-secondary text-center">
            No tasks yet. Generate an action plan to get started.
          </Text>
        </View>
      ) : (
        <>
          {/* Progress bar */}
          <View className="mt-4 flex-row items-center">
            <View className="flex-1 h-2 bg-border rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </View>
            <Text className="font-sans text-body-sm text-ink-secondary ml-3">
              {completedCount}/{tasks.length}
            </Text>
          </View>

          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            className="mt-4"
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item, index }) => (
              <TaskItem
                id={item.id}
                description={item.description}
                isCompleted={item.isCompleted}
                stepNumber={index + 1}
                onToggle={onToggle}
              />
            )}
          />
        </>
      )}
    </View>
  );
}