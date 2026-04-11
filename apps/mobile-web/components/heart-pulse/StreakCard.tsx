import { View, Text } from "react-native";
import { Flame } from "lucide-react-native";

interface StreakCardProps {
  streakCount: number;
  loading?: boolean;
}

export function StreakCard({ streakCount, loading }: StreakCardProps) {
  if (loading) {
    return (
      <View className="mt-4 bg-highlight/10 rounded-2xl px-5 py-4 flex-row items-center animate-pulse">
        <View className="w-6 h-6 rounded-full bg-highlight/20" />
        <View className="ml-3 gap-1">
          <View className="w-20 h-3 rounded bg-highlight/20" />
          <View className="w-14 h-5 rounded bg-highlight/20" />
        </View>
      </View>
    );
  }

  if (streakCount === 0) {
    return (
      <View className="mt-4 bg-surface rounded-2xl px-5 py-4 flex-row items-center border border-border">
        <Flame size={24} color="#78716C" />
        <View className="ml-3">
          <Text className="font-sans text-body-md text-secondary">
            Mulai streak harianmu!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mt-4 bg-highlight/20 rounded-2xl px-5 py-4 flex-row items-center">
      <Flame size={24} color="#E3C567" />
      <View className="ml-3">
        <Text className="font-sans text-body-sm text-highlight">
          🔥 {streakCount} hari berturut-turut
        </Text>
      </View>
    </View>
  );
}