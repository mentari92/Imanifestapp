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
} from "lucide-react-native";
import { useDashboard, DashboardData } from "../../hooks/useDashboard";
import { ErrorMessage } from "../../components/shared/ErrorMessage";

// ─── Stats Card ──────────────────────────────────────────────
function StatsCard({ stats }: { stats: DashboardData["stats"] }) {
  const items = [
    { icon: Target, label: "Intentions", value: stats.totalManifestations, color: "#064E3B" },
    { icon: CheckCircle, label: "Tasks Done", value: stats.completedTasks, color: "#064E3B" },
    { icon: Flame, label: "Day Streak", value: stats.currentStreak, color: "#54161B" },
  ];

  return (
    <View className="flex-row gap-3">
      {items.map((item) => (
        <View
          key={item.label}
          className="flex-1 bg-surface rounded-2xl px-3 py-4 border border-border items-center"
        >
          <item.icon size={20} color={item.color} />
          <Text className="font-display text-display-sm text-primary mt-2">
            {item.value}
          </Text>
          <Text className="font-sans text-body-xs text-ink-secondary mt-0.5">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── 7-Day Sentiment Chart (simple bar chart) ────────────────
function SentimentChart({ data }: { data: DashboardData["sentiment7Days"] }) {
  if (data.length === 0) {
    return (
      <View className="bg-surface rounded-2xl px-4 py-5 border border-border">
        <Text className="font-sans text-body-sm text-ink-secondary text-center">
          No reflections this week yet.
        </Text>
      </View>
    );
  }

  const positiveSet = new Set(["hopeful", "grateful", "peaceful", "content", "happy", "joyful"]);

  return (
    <View className="bg-surface rounded-2xl px-4 py-5 border border-border">
      <View className="flex-row items-center gap-2 mb-3">
        <TrendingUp size={16} color="#064E3B" />
        <Text className="font-sans text-label text-primary">7-Day Mood</Text>
      </View>
      <View className="flex-row items-end justify-between gap-1" style={{ height: 80 }}>
        {data.map((day, i) => {
          const isPositive = positiveSet.has(day.sentiment.toLowerCase());
          const barHeight = Math.max(8, day.score * 72);
          return (
            <View key={i} className="flex-1 items-center gap-1">
              <View
                className="w-full rounded-t-md"
                style={{
                  height: barHeight,
                  backgroundColor: isPositive ? "#064E3B" : "#54161B",
                  opacity: 0.7 + day.score * 0.3,
                }}
              />
              <Text className="font-sans text-[9px] text-ink-secondary">
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
  const dateStr = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface rounded-2xl px-4 py-3 border border-border active:opacity-80"
    >
      <View className="flex-row justify-between items-start">
        <Text className="font-sans text-body-sm text-ink-primary flex-1" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="font-sans text-body-xs text-ink-secondary ml-2">{dateStr}</Text>
      </View>
      <View className="flex-row items-center gap-2 mt-2">
        <View className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${item.completionPct}%` }}
          />
        </View>
        <Text className="font-sans text-body-xs text-ink-secondary">
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
    { icon: Sparkles, label: "New Intention", tab: "/", color: "#064E3B" },
    { icon: Mic, label: "New Reflection", tab: "/heartpulse", color: "#54161B" },
    { icon: Headphones, label: "SakinahStream", tab: "/sakinah", color: "#E3C567" },
  ];

  return (
    <View className="flex-row gap-3">
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          onPress={() => router.push(action.tab as any)}
          className="flex-1 bg-surface rounded-2xl px-3 py-3 border border-border items-center active:opacity-80"
        >
          <action.icon size={18} color={action.color} />
          <Text className="font-sans text-body-xs text-ink-primary mt-1.5 text-center">
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
    <View className="items-center py-8">
      <Calendar size={48} color="#78716C" />
      <Text className="font-display text-display-sm text-ink-secondary mt-4">
        Your spiritual journey starts here
      </Text>
      <Text className="font-sans text-body-sm text-ink-secondary mt-2 text-center">
        Set an intention, reflect on your day, or listen to Quran recitation.
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/")}
        className="mt-4 bg-primary rounded-button px-6 py-3"
        activeOpacity={0.8}
      >
        <Text className="font-sans text-label text-champagne">Create Your First Intention</Text>
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
      className="flex-1 bg-background px-screen-x py-screen-y"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#064E3B" />}
    >
      {/* Header */}
      <Text className="font-display text-display-lg text-primary">Dashboard</Text>
      <Text className="font-sans text-body-md text-ink-secondary mt-1">
        Your spiritual progress at a glance.
      </Text>

      {/* Loading */}
      {isLoading && !data && (
        <View className="mt-12 items-center">
          <ActivityIndicator size="large" color="#064E3B" />
          <Text className="font-sans text-body-sm text-ink-secondary mt-3">
            Loading your dashboard…
          </Text>
        </View>
      )}

      {/* Error */}
      {error && !data && <ErrorMessage message={error} />}

      {/* Content */}
      {data && !isEmpty && (
        <>
          {/* Stats */}
          <View className="mt-6">
            <StatsCard stats={data.stats} />
          </View>

          {/* Sentiment Chart */}
          <View className="mt-4">
            <SentimentChart data={data.sentiment7Days} />
          </View>

          {/* Quick Actions */}
          <View className="mt-4">
            <Text className="font-sans text-label text-ink-secondary mb-2">Quick Actions</Text>
            <QuickActions />
          </View>

          {/* Manifestation History */}
          <View className="mt-4 mb-8">
            <Text className="font-sans text-label text-ink-secondary mb-2">Recent Intentions</Text>
            <View className="gap-3">
              {data.manifestations.map((m) => (
                <ManifestationCard
                  key={m.id}
                  item={m}
                  onPress={() => {
                    // Navigate to ImanSync tab with manifestation context
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
        <View className="mt-6">
          <QuickActions />
          <EmptyState />
        </View>
      )}
    </ScrollView>
  );
}