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
import { BookText, CircleUserRound } from "lucide-react-native";
import { colors } from "../constants/theme";
import { useAuth } from "../lib/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, token, loading } = useAuth();

  const handleOAuthPress = async () => {
    router.push("/auth");
  };

  const handleProfilePress = () => {
    if (!isSignedIn) {
      router.push("/auth");
      return;
    }

    Alert.alert(
      "Your Profile",
      `${user?.name || "User"}\n${user?.email || ""}`.trim(),
    );
  };

  const isSignedIn = Boolean(token || user);

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

        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardTitle}>Legal</Text>
          <TouchableOpacity
            style={styles.legalRow}
            onPress={handleProfilePress}
          >
            <View style={styles.profileRowLeft}>
              <View style={styles.profileIconWrap}>
                <CircleUserRound size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.legalRowText}>Profile</Text>
                <Text style={styles.profileRowSubtext}>
                  {isSignedIn ? "View your account details" : "Sign in to view your profile"}
                </Text>
              </View>
            </View>
            <Text style={styles.legalRowChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.profileSummaryBox}>
            <Text style={styles.profileSummaryTitle}>Profile details</Text>
            <Text style={styles.profileSummaryText}>
              {isSignedIn
                ? `${user?.name || "User"}${user?.email ? ` • ${user.email}` : ""}`
                : "Sign in to see your account details and sync status."}
            </Text>
          </View>
          <View style={styles.legalDivider} />
          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => router.push("/about-us")}
          >
            <View style={styles.profileRowLeft}>
              <View style={styles.profileIconWrap}>
                <BookText size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.legalRowText}>About Us</Text>
                <Text style={styles.profileRowSubtext}>
                  Meet the founder and mission
                </Text>
              </View>
            </View>
            <Text style={styles.legalRowChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.legalDivider} />
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
  buttonDisabled: {
    opacity: 0.6,
  },
  legalRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 14,
  },
  profileRowLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  profileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.surface,
  },
  legalRowText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: "Inter-Regular",
  },
  profileRowSubtext: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontFamily: "Inter-Regular",
  },
  profileSummaryBox: {
    marginTop: 2,
    marginBottom: 4,
    marginLeft: 4,
    marginRight: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileSummaryTitle: {
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    color: colors.textSecondary,
    fontFamily: "Inter-SemiBold",
    marginBottom: 6,
  },
  profileSummaryText: {
    fontSize: 13,
    lineHeight: 18,
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
