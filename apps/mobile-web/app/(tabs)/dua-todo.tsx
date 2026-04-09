import { View, Text } from "react-native";

export default function DuaToDoScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-screen-x">
      <Text className="font-display text-display-md text-primary">
        Dua-to-Do
      </Text>
      <Text className="font-sans text-body-md text-ink-secondary mt-2 text-center">
        Your spiritual checklist.
      </Text>
    </View>
  );
}