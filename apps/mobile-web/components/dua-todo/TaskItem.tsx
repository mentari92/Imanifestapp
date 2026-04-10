import { View, Text, TouchableOpacity } from "react-native";
import { Check, Circle } from "lucide-react-native";
import { colors } from "../../constants/theme";

interface TaskItemProps {
  id: string;
  description: string;
  isCompleted: boolean;
  stepNumber: number;
  onToggle: (taskId: string, isCompleted: boolean) => void;
}

export function TaskItem({ id, description, isCompleted, stepNumber, onToggle }: TaskItemProps) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(id, !isCompleted)}
      className="flex-row items-start bg-surface rounded-2xl px-4 py-4 mb-3 border border-border"
      activeOpacity={0.7}
    >
      {isCompleted ? (
        <Check size={22} color={colors.primary} />
      ) : (
        <Circle size={22} color={colors.ink.secondary} />
      )}
      <View className="ml-3 flex-1">
        <Text
          className={`font-sans text-body-md ${
            isCompleted
              ? "text-ink-secondary line-through"
              : "text-ink-primary"
          }`}
        >
          {description}
        </Text>
        <Text className="font-sans text-body-xs text-ink-tertiary mt-1">
          Step {stepNumber}
        </Text>
      </View>
    </TouchableOpacity>
  );
}