import "../global.css";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular,
} from "@expo-google-fonts/playfair-display";
import {
  Lora_400Regular,
  Lora_600SemiBold,
} from "@expo-google-fonts/lora";
import { Amiri_400Regular } from "@expo-google-fonts/amiri";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text } from "react-native";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "PlayfairDisplay-Bold":    PlayfairDisplay_700Bold,
    "PlayfairDisplay-Regular": PlayfairDisplay_400Regular,
    "Lora-Regular":            Lora_400Regular,
    "Lora-SemiBold":           Lora_600SemiBold,
    "Amiri-Regular":           Amiri_400Regular,
    "JetBrainsMono-Regular":   JetBrainsMono_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#064E3B" />
        <Text className="mt-2 text-ink-secondary font-sans">Loading fonts...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#F8FAFC" },
          headerTintColor: "#1C1917",
          headerTitleStyle: { fontFamily: "PlayfairDisplay-Bold" },
          contentStyle: { backgroundColor: "#F8FAFC" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth"
          options={{ title: "Sign In", presentation: "modal" }}
        />
      </Stack>
    </>
  );
}