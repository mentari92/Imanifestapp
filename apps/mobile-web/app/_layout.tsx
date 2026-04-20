import "../global.css";
import { Stack, Redirect, useSegments } from "expo-router";
import { Component } from "react";
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
import { AuthProvider, useAuth } from "../lib/auth";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message + "\n" + e.stack }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 20, backgroundColor: "#fff", justifyContent: "center" }}>
          <Text style={{ color: "red", fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>App Error — copy this and share:</Text>
          <Text style={{ color: "#333", fontSize: 12, fontFamily: "monospace" }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user, token } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === "auth";
  const isAuthenticated = Boolean(user && token);
  const demoAuthMode =
    typeof process !== "undefined" &&
    process.env.EXPO_PUBLIC_DEMO_AUTH_MODE === "true";

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-2 text-ink-secondary font-sans">Loading your workspace...</Text>
      </View>
    );
  }

  // Optional bypass for demo mode only.
  if (demoAuthMode && inAuthGroup) {
    return <Redirect href="/" />;
  }

  if (!demoAuthMode && !isAuthenticated && !inAuthGroup) {
    return <Redirect href="/auth" />;
  }

  if (!demoAuthMode && isAuthenticated && inAuthGroup) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}

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
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-2 text-ink-secondary font-sans">Loading fonts...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
    <AuthProvider>
      <AuthGate>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "transparent" },
            headerTintColor: "#F8FAFC",
            headerTitleStyle: { fontFamily: "PlayfairDisplay-Bold" },
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="qalb-result" options={{ headerShown: false }} />
          <Stack.Screen name="api-proof" options={{ title: "API Proof" }} />
          <Stack.Screen
            name="auth"
            options={{ title: "Sign In", presentation: "modal" }}
          />
        </Stack>
      </AuthGate>
    </AuthProvider>
    </ErrorBoundary>
  );
}