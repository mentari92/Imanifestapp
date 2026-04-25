import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../constants/theme";
import { useAuth } from "../lib/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const { startOAuthLogin, loading } = useAuth();

  const upgradeUrl =
    (typeof process !== "undefined" && process.env.EXPO_PUBLIC_QURAN_UPGRADE_URL) ||
    "https://quran.foundation";

  const handleOAuthPress = async () => {
    try {
      await startOAuthLogin();
    } catch (error: any) {
      Alert.alert(
        "Sign in unavailable",
        error?.message || "Quran.com sign-in could not be started.",
      );
    }
  };

  const handleUpgradePress = async () => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const opened = window.open(upgradeUrl, "_blank", "noopener,noreferrer");
        if (!opened) window.location.assign(upgradeUrl);
        return;
      }

      const canOpen = await Linking.canOpenURL(upgradeUrl);
      if (!canOpen) {
        Alert.alert("Unable to open link", upgradeUrl);
        return;
      }
      await Linking.openURL(upgradeUrl);
    } catch (error: any) {
      Alert.alert("Unable to open upgrade link", error?.message || upgradeUrl);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account & Sync</Text>
          <Text style={styles.cardDesc}>
            Sign in with your Quran.com account to sync bookmarks, streaks, and reading
            progress across all your devices.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={() => void handleOAuthPress()}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>Sign in with Quran.com</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={() => void handleUpgradePress()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardTitle}>Legal</Text>
          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => router.push("/privacy-policy")}
          >
            <Text style={styles.legalRowText}>Privacy Policy</Text>
            <Text style={styles.legalRowChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.legalDivider} />
          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => router.push("/terms-of-service")}
          >
            <Text style={styles.legalRowText}>Terms of Service</Text>
            <Text style={styles.legalRowChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start" as const,
    justifyContent: "center" as const,
  },
  backText: {
    fontSize: 30,
    lineHeight: 30,
    color: colors.text,
    fontFamily: "Inter-Regular",
  },
  title: {
    flex: 1,
    textAlign: "center" as const,
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text,
    fontFamily: "Inter-Bold",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    fontFamily: "Inter-Bold",
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: "Inter-Regular",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter-SemiBold",
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Inter-SemiBold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  legalRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 14,
  },
  legalRowText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: "Inter-Regular",
  },
  legalRowChevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  legalDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
};
