import { View, Text, ScrollView } from "react-native";
import { Sparkles } from "lucide-react-native";

export default function ImanSyncScreen() {
  return (
    <ScrollView className="flex-1 bg-background px-screen-x py-screen-y">
      <View className="items-center mb-section">
        <Sparkles size={48} color="#064E3B" />
        <Text className="font-display text-display-lg text-primary mt-4">
          ImanSync
        </Text>
        <Text className="font-sans text-body-md text-ink-secondary mt-2 text-center">
          Turn your intention into action.
        </Text>
      </View>

      <View className="bg-surface rounded-verse p-card-p border-l-2 border-primary">
        <Text className="font-sans text-body-lg text-primary">
          No manifestations yet.
        </Text>
        <Text className="font-sans text-body-sm text-ink-secondary mt-1">
          Set your first intention to get started.
        </Text>
      </View>
    </ScrollView>
  );
}