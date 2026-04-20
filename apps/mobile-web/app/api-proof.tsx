import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { apiGet } from "../lib/api";

type ProbeStatus = "ok" | "fail" | "pending";

interface ProbeItem {
  key: string;
  title: string;
  endpoint: string;
  category: "Content API" | "User API" | "Audio API" | "Platform";
  status: ProbeStatus;
  detail: string;
}

const glass = {
  backgroundColor: "rgba(255,255,255,0.62)",
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.45)",
  ...(Platform.OS === "web"
    ? ({ backdropFilter: "blur(22px) saturate(135%)", WebkitBackdropFilter: "blur(22px) saturate(135%)" } as any)
    : {}),
};

const endpointMap = [
  { key: "health", title: "Backend Health", endpoint: "/health", category: "Platform" as const },
  { key: "dashboard", title: "Dashboard Overview", endpoint: "/dashboard/overview", category: "User API" as const },
  { key: "sakinahReciters", title: "Reciter List", endpoint: "/sakinah/reciters", category: "Audio API" as const },
  { key: "foundationHealth", title: "Foundation API Health", endpoint: "/sakinah/foundation-health", category: "Content API" as const },
];

function statusColors(status: ProbeStatus) {
  if (status === "ok") return { bg: "rgba(169,247,183,0.35)", fg: "#166534" };
  if (status === "fail") return { bg: "rgba(249,221,227,0.6)", fg: "#991b1b" };
  return { bg: "rgba(226,221,248,0.6)", fg: "#545164" };
}

export default function ApiProofScreen() {
  const router = useRouter();
  const demoAuthMode =
    typeof process !== "undefined" &&
    process.env.EXPO_PUBLIC_DEMO_AUTH_MODE === "true";
  const [loading, setLoading] = useState(true);
  const [probes, setProbes] = useState<ProbeItem[]>(
    endpointMap.map((item) => ({ ...item, status: "pending", detail: "Checking..." })),
  );

  const summary = useMemo(() => {
    const okCount = probes.filter((p) => p.status === "ok").length;
    return `${okCount}/${probes.length} live checks passed`;
  }, [probes]);

  useEffect(() => {
    if (!demoAuthMode) return;

    let active = true;

    const runChecks = async () => {
      setLoading(true);

      const checks = await Promise.allSettled([
        apiGet("/health"),
        apiGet("/dashboard/overview"),
        apiGet("/sakinah/reciters"),
        apiGet("/sakinah/foundation-health"),
      ]);

      if (!active) return;

      const next = endpointMap.map((meta, index) => {
        const result = checks[index];
        if (result.status === "fulfilled") {
          return {
            ...meta,
            status: "ok" as const,
            detail: "Live response received",
          };
        }

        const reason = result.reason instanceof Error ? result.reason.message : "Request failed";
        return {
          ...meta,
          status: "fail" as const,
          detail: reason,
        };
      });

      setProbes(next);
      setLoading(false);
    };

    runChecks().catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!demoAuthMode) {
    return <Redirect href="/" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9f9fd" }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 64, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: "Newsreader", fontSize: 34, fontStyle: "italic", color: "#2f3338" }}>
            API Proof
          </Text>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#5b5f65" }}>
            Submission evidence for API integrations used in the app.
          </Text>
        </View>

        <View style={[glass, { padding: 16, gap: 8 }]}>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "#545164", fontWeight: "700" }}>
            Live Status
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {loading ? <ActivityIndicator color="#166534" /> : null}
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 14, color: "#2f3338", fontWeight: "700" }}>
              {loading ? "Running checks..." : summary}
            </Text>
          </View>
        </View>

        {probes.map((probe) => {
          const color = statusColors(probe.status);
          return (
            <View key={probe.key} style={[glass, { padding: 16, gap: 10 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 15, color: "#2f3338", fontWeight: "700" }}>{probe.title}</Text>
                  <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 11, color: "#6b7280", marginTop: 4 }}>{probe.endpoint}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: color.bg }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: color.fg, fontWeight: "700", textTransform: "uppercase" }}>{probe.status}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65" }}>
                Category: {probe.category}
              </Text>
              <Text style={{ fontFamily: "Noto Serif", fontSize: 13, color: "#4b5563", fontStyle: "italic" }}>
                {probe.detail}
              </Text>
            </View>
          );
        })}

        <View style={[glass, { padding: 16, gap: 8 }]}>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "#545164", fontWeight: "700" }}>
            Hackathon Coverage
          </Text>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#2f3338" }}>Content API: Verse references and foundation health checks.</Text>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#2f3338" }}>Audio API: Reciter list and verse playback routes.</Text>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#2f3338" }}>User API: Dashboard overview and user progress signals.</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignSelf: "flex-start", backgroundColor: "rgba(226,221,248,0.7)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 }}
        >
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "700", color: "#545164" }}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
