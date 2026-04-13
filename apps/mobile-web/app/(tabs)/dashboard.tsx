import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import {
  Sparkles,
  Mic,
  Headphones,
  Target,
  CheckCircle,
  Flame,
  TrendingUp,
  Calendar,
  ChevronRight,
} from "lucide-react-native";
import { useDashboard, DashboardData } from "../../hooks/useDashboard";
import { ErrorMessage } from "../../components/shared/ErrorMessage";

// ─── Greeting Hero ────────────────────────────────────────────
function GreetingHero() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Selamat Pagi" : hour < 17 ? "Selamat Siang" : "Selamat Malam";

  return (
    <View
      style={{
        backgroundColor: "#064E3B",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontFamily: "Amiri-Regular",
          fontSize: 18,
          color: "#E3C567",
          textAlign: "center",
          marginBottom: 10,
          writingDirection: "rtl",
        }}
      >
        بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
      </Text>
      <View
        style={{
          height: 1,
          backgroundColor: "rgba(227, 197, 103, 0.25)",
          marginBottom: 12,
        }}
      />
      <Text
        style={{
          fontFamily: "PlayfairDisplay-Bold",
          fontSize: 22,
          color: "#FFFFFF",
        }}
      >
        {greeting} 🌿
      </Text>
      <Text
        style={{
          fontFamily: "Lora-Regular",
          fontSize: 14,
          color: "#A7F3D0",
          marginTop: 4,
        }}
      >
        Pantau perjalanan spiritualmu hari ini.
      </Text>
    </View>
  );
}

// ─── Stats Card ──────────────────────────────────────────────
function StatsCard({ stats }: { stats: DashboardData["stats"] }) {
  const items = [
    {
      icon: Target,
      label: "Intentions",
      value: stats.totalManifestations,
      bg: "#ECFDF5",
      iconColor: "#064E3B",
      textColor: "#064E3B",
      borderColor: "#A7F3D0",
    },
    {
      icon: CheckCircle,
      label: "Tasks Done",
      value: stats.completedTasks,
      bg: "#FEFCE8",
      iconColor: "#CA9A3C",
      textColor: "#7C5E1D",
      borderColor: "#FEF08A",
    },
    {
      icon: Flame,
      label: "Day Streak",
      value: stats.currentStreak,
      bg: "#FFF1F2",
      iconColor: "#54161B",
      textColor: "#54161B",
      borderColor: "#FECDD3",
    },
  ];

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            backgroundColor: item.bg,
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: item.borderColor,
          }}
        >
          <item.icon size={20} color={item.iconColor} />
          <Text
            style={{
              fontFamily: "PlayfairDisplay-Bold",
              fontSize: 26,
              color: item.textColor,
              marginTop: 8,
              lineHeight: 32,
            }}
          >
            {item.value}
          </Text>
          <Text
            style={{
              fontFamily: "Lora-Regular",
              fontSize: 11,
              color: item.textColor,
              opacity: 0.7,
              marginTop: 2,
              textAlign: "center",
            }}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <View style={{ width: 3, height: 16, backgroundColor: "#E3C567", borderRadius: 2 }} />
      <Text
        style={{
          fontFamily: "Lora-Regular",
          fontSize: 12,
          fontWeight: "600",
          color: "#78716C",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── 7-Day Sentiment Chart (simple bar chart) ────────────────
function SentimentChart({ data }: { data: DashboardData["sentiment7Days"] }) {
  if (data.length === 0) {
    return (
      <View
        style={{
          backgroundColor: "#F1F5F0",
          borderRadius: 16,
          padding: 20,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#E2E8E0",
        }}
      >
        <Text style={{ fontFamily: "Lora-Regular", fontSize: 13, color: "#78716C" }}>
          Belum ada refleksi minggu ini.
        </Text>
      </View>
    );
  }

  const positiveSet = new Set(["hopeful", "grateful", "peaceful", "content", "happy", "joyful"]);

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E2E8E0",
        shadowColor: "#064E3B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <TrendingUp size={16} color="#064E3B" />
        <Text style={{ fontFamily: "Lora-Regular", fontWeight: "600", fontSize: 13, color: "#064E3B" }}>
          7-Day Mood
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 4, height: 80 }}>
        {data.map((day, i) => {
          const isPositive = positiveSet.has(day.sentiment.toLowerCase());
          const barHeight = Math.max(10, day.score * 72);
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: "100%",
                  height: barHeight,
                  backgroundColor: isPositive ? "#064E3B" : "#54161B",
                  borderRadius: 6,
                  opacity: 0.65 + day.score * 0.35,
                }}
              />
              <Text style={{ fontFamily: "Lora-Regular", fontSize: 9, color: "#78716C" }}>
                {day.date.slice(8, 10)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Manifestation History Card ──────────────────────────────
function ManifestationCard({
  item,
  onPress,
}: {
  item: DashboardData["manifestations"][0];
  onPress: () => void;
}) {
  const dateStr = new Date(item.createdAt).toLocaleDateString("id-ID", {
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E2E8E0",
        shadowColor: "#064E3B",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text
          style={{ fontFamily: "Lora-Regular", fontSize: 14, color: "#1C1917", flex: 1, lineHeight: 22 }}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginLeft: 8 }}>
          <Text style={{ fontFamily: "Lora-Regular", fontSize: 11, color: "#78716C" }}>{dateStr}</Text>
          <ChevronRight size={12} color="#A8A29E" />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
        <View style={{ flex: 1, height: 6, backgroundColor: "#F1F5F0", borderRadius: 999, overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              width: `${item.completionPct}%`,
              backgroundColor: item.completionPct >= 80 ? "#064E3B" : item.completionPct >= 40 ? "#E3C567" : "#54161B",
              borderRadius: 999,
            }}
          />
        </View>
        <Text style={{ fontFamily: "Lora-Regular", fontSize: 11, color: "#78716C", minWidth: 32 }}>
          {item.completionPct}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Quick Action Buttons ────────────────────────────────────
function QuickActions() {
  const router = useRouter();

  const actions = [
    { icon: Sparkles, label: "Intention", tab: "/", bg: "#ECFDF5", iconColor: "#064E3B", borderColor: "#A7F3D0" },
    { icon: Mic, label: "Reflect", tab: "/heartpulse", bg: "#FFF1F2", iconColor: "#54161B", borderColor: "#FECDD3" },
    { icon: Headphones, label: "Sakinah", tab: "/sakinah", bg: "#FEFCE8", iconColor: "#CA9A3C", borderColor: "#FEF08A" },
  ];

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          onPress={() => router.push(action.tab as any)}
          style={{
            flex: 1,
            backgroundColor: action.bg,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 8,
            alignItems: "center",
            borderWidth: 1,
            borderColor: action.borderColor,
          }}
          activeOpacity={0.75}
        >
          <action.icon size={20} color={action.iconColor} />
          <Text
            style={{
              fontFamily: "Lora-Regular",
              fontSize: 11,
              color: "#1C1917",
              marginTop: 6,
              textAlign: "center",
            }}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Empty State ─────────────────────────────────────────────
function EmptyState() {
  const router = useRouter();

  return (
    <View style={{ alignItems: "center", paddingVertical: 36 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "#ECFDF5",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: "#A7F3D0",
          marginBottom: 16,
        }}
      >
        <Calendar size={36} color="#064E3B" />
      </View>
      <Text style={{ fontFamily: "PlayfairDisplay-Bold", fontSize: 20, color: "#1C1917", textAlign: "center" }}>
        Mulai perjalanan spiritualmu
      </Text>
      <Text style={{ fontFamily: "Lora-Regular", fontSize: 14, color: "#78716C", marginTop: 8, textAlign: "center", lineHeight: 22 }}>
        Tetapkan niat, renungkan harimu, atau dengarkan Al-Quran.
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/")}
        style={{
          marginTop: 20,
          backgroundColor: "#064E3B",
          borderRadius: 10,
          paddingHorizontal: 24,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
        activeOpacity={0.8}
      >
        <Sparkles size={16} color="#E3C567" />
        <Text style={{ fontFamily: "Lora-Regular", fontWeight: "600", fontSize: 14, color: "#FFFFFF" }}>
          Buat Intention Pertama
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export default function DashboardScreen() {
  const { data, isLoading, error, refresh } = useDashboard();
  const router = useRouter();

  const isEmpty = data && data.stats.totalManifestations === 0 && data.sentiment7Days.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#064E3B" />
      }
    >
      {/* Greeting Hero */}
      <GreetingHero />

      {/* Loading */}
      {isLoading && !data && (
        <View style={{ marginTop: 48, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#064E3B" />
          <Text style={{ fontFamily: "Lora-Regular", fontSize: 13, color: "#78716C", marginTop: 12 }}>
            Memuat dashboardmu…
          </Text>
        </View>
      )}

      {/* Error */}
      {error && !data && <ErrorMessage message={error} />}

      {/* Content */}
      {data && !isEmpty && (
        <>
          {/* Stats */}
          <View style={{ marginBottom: 16 }}>
            <SectionHeader label="Progress" />
            <StatsCard stats={data.stats} />
          </View>

          {/* Sentiment Chart */}
          <View style={{ marginBottom: 16 }}>
            <SectionHeader label="Mood Minggu Ini" />
            <SentimentChart data={data.sentiment7Days} />
          </View>

          {/* Quick Actions */}
          <View style={{ marginBottom: 16 }}>
            <SectionHeader label="Aksi Cepat" />
            <QuickActions />
          </View>

          {/* Manifestation History */}
          <View style={{ marginBottom: 16 }}>
            <SectionHeader label="Intentions Terbaru" />
            <View style={{ gap: 10 }}>
              {data.manifestations.map((m) => (
                <ManifestationCard
                  key={m.id}
                  item={m}
                  onPress={() => {
                    router.push("/");
                  }}
                />
              ))}
            </View>
          </View>
        </>
      )}

      {/* Empty State */}
      {data && isEmpty && (
        <View style={{ marginTop: 8 }}>
          <SectionHeader label="Aksi Cepat" />
          <QuickActions />
          <EmptyState />
        </View>
      )}
    </ScrollView>
  );
}
