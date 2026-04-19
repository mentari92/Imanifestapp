import "../global.css";
import { Stack, Redirect, useSegments } from "expo-router";
import Head from "expo-router/head";
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

const SITE_TITLE = "Imanifest";
const SITE_DESCRIPTION = "Spiritual mindfulness, daily intentions, and tranquil audio for a peaceful heart and focused faith.";
const SITE_URL = "https://imanifestapp.com";
const OG_IMAGE_URL = `${SITE_URL}/og/imanifest-og.png?v=e951fab`;

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
  const { loading } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === "auth";

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-2 text-ink-secondary font-sans">Connecting to Divine wisdom...</Text>
      </View>
    );
  }

  // Completely bypass auth screen for Demo
  if (inAuthGroup) {
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
        <Head>
          <title>{SITE_TITLE}</title>
          <meta name="description" content={SITE_DESCRIPTION} />
          <meta name="theme-color" content="#f9f9fd" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={SITE_TITLE} />
          <meta property="og:title" content={SITE_TITLE} />
          <meta property="og:description" content={SITE_DESCRIPTION} />
          <meta property="og:url" content={SITE_URL} />
          <meta property="og:image" content={OG_IMAGE_URL} />
          <meta property="og:image:secure_url" content={OG_IMAGE_URL} />
          <meta property="og:image:type" content="image/png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="Imanifest spiritual mindfulness social preview card" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={SITE_TITLE} />
          <meta name="twitter:description" content={SITE_DESCRIPTION} />
          <meta name="twitter:image" content={OG_IMAGE_URL} />
          <meta name="twitter:image:alt" content="Imanifest spiritual mindfulness social preview card" />
          <link rel="canonical" href={SITE_URL} />
        </Head>
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