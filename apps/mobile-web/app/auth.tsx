import { View, Text, TextInput, TouchableOpacity } from "react-native";

export default function AuthScreen() {
  return (
    <View className="flex-1 bg-background px-screen-x py-screen-y justify-center">
      <Text className="font-display text-display-xl text-primary text-center mb-section">
        Imanifest
      </Text>
      <Text className="font-sans text-body-lg text-primary text-center mb-8">
        Turn your intention into action.
      </Text>

      <TextInput
        className="bg-surface-input rounded-button px-4 py-3 font-sans text-body-md text-primary mb-4 border border-surface"
        placeholder="Email"
        placeholderTextColor="#A8A29E"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity className="bg-primary rounded-button py-4 items-center">
        <Text className="font-sans text-label text-ink-inverse">
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
}