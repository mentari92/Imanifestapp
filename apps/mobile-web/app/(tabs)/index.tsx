import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Heart, Sparkles, ListChecks, Headphones } from "lucide-react-native";

const PRAYER_ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const PRAYER_EMOJI: Record<string, string> = { Fajr: "🌙", Sunrise: "🌅", Dhuhr: "☀️", Asr: "🌤️", Maghrib: "🌇", Isha: "🌃" };

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmtCountdown(diffMin: number): string {
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}` : `00:${String(m).padStart(2,"0")}`;
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

function computePrayer(timings: Record<string, string>) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const prayers = PRAYER_ORDER.filter((p) => timings[p]).map((p) => ({ name: p, min: timeStrToMinutes(timings[p]) }));
  let currentIdx = prayers.length - 1;
  for (let i = 0; i < prayers.length; i++) {
    if (prayers[i].min > nowMin) { currentIdx = i === 0 ? prayers.length - 1 : i - 1; break; }
    if (i === prayers.length - 1) currentIdx = i;
  }
  const nextIdx = (currentIdx + 1) % prayers.length;
  const nextMin = prayers[nextIdx].min;
  const diffMin = nextMin > nowMin ? nextMin - nowMin : 24 * 60 - nowMin + nextMin;
  return {
    current: { name: prayers[currentIdx].name, time: fmtTime(timings[prayers[currentIdx].name]) },
    next: { name: prayers[nextIdx].name, countdown: fmtCountdown(diffMin) },
  };
}

function usePrayerTimes() {
  const [prayer, setPrayer] = useState<{ current: { name: string; time: string }; next: { name: string; countdown: string } } | null>(null);
  const [allTimings, setAllTimings] = useState<{ name: string; time: string }[]>([]);
  const timingsRef = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const load = async (lat: number, lng: number) => {
      try {
        const ts = Math.floor(Date.now() / 1000);
        const res = await fetch(`https://api.aladhan.com/v1/timings/${ts}?latitude=${lat}&longitude=${lng}&method=2`);
        const data = await res.json();
        const timings: Record<string, string> = data?.data?.timings || {};
        timingsRef.current = timings;
        setPrayer(computePrayer(timings));
        setAllTimings(PRAYER_ORDER.filter((p) => timings[p]).map((p) => ({ name: p, time: fmtTime(timings[p]) })));
      } catch {}
    };
    navigator.geolocation?.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(3.139, 101.6869),
    );
    const tick = setInterval(() => {
      if (timingsRef.current) setPrayer(computePrayer(timingsRef.current));
    }, 60000);
    return () => clearInterval(tick);
  }, []);

  return { prayer, allTimings };
}

const glass = {
  backgroundColor: "rgba(255,255,255,0.45)",
  borderRadius: 28,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.5)",
  ...(Platform.OS === "web"
    ? ({
        backdropFilter: "blur(24px) saturate(140%)",
        WebkitBackdropFilter: "blur(24px) saturate(140%)",
      } as any)
    : {}),
};

const holoCard = {
  background: undefined,
  backgroundColor: "rgba(226,221,248,0.25)",
  borderRadius: 32,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.6)",
  ...(Platform.OS === "web"
    ? ({
        background:
          "linear-gradient(135deg, rgba(226,221,248,0.4) 0%, rgba(255,228,242,0.4) 100%)",
        backdropFilter: "blur(20px)",
      } as any)
    : {}),
};

interface QuickCardProps {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  iconColor: string;
  title: string;
  desc: string;
  bg: string;
  onPress: () => void;
}

function QuickCard({ icon: Icon, iconColor, title, desc, bg, onPress }: QuickCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        glass,
        {
          flex: 1,
          margin: 6,
          padding: 20,
          alignItems: "center",
          gap: 8,
        },
      ]}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Icon size={24} color={iconColor} strokeWidth={1.8} />
      </View>
      <Text
        style={{
          fontFamily: "Plus Jakarta Sans",
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "#2f3338",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: "Noto Serif",
          fontSize: 10,
          color: "#5b5f65",
          textAlign: "center",
          lineHeight: 14,
        }}
      >
        {desc}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { prayer, allTimings } = usePrayerTimes();
  const [showBell, setShowBell] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          position: "sticky" as any,
          top: 0,
          zIndex: 50,
          paddingHorizontal: 24,
          paddingVertical: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.4)",
          ...(Platform.OS === "web"
            ? ({ backdropFilter: "blur(24px)" } as any)
            : {}),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#e5dff8",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.4)",
            }}
          >
            <Text style={{ fontSize: 18 }}>🌟</Text>
          </View>
          <Text
            style={{
              fontFamily: "Newsreader",
              fontSize: 22,
              fontStyle: "italic",
              fontWeight: "600",
              color: "#1e1b2e",
            }}
          >
            Imanifest
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowBell((v) => !v)}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: showBell ? "rgba(22,101,52,0.1)" : "transparent" }}
        >
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Prayer Times Bell Panel */}
      {showBell && (
        <View style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 4, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", ...(Platform.OS === "web" ? ({ backdropFilter: "blur(24px)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" } as any) : {}), zIndex: 49 }}>
          <Text style={{ fontFamily: "Newsreader", fontSize: 18, fontWeight: "600", color: "#2f3338", marginBottom: 12 }}>Today's Prayer Times</Text>
          {allTimings.length === 0 ? (
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65" }}>Detecting your location...</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {allTimings.map((p) => (
                <View key={p.name} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(174,178,185,0.15)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>{PRAYER_EMOJI[p.name] ?? "🕌"}</Text>
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: prayer?.current.name === p.name ? "700" : "500", color: prayer?.current.name === p.name ? "#166534" : "#2f3338" }}>{p.name}</Text>
                    {prayer?.current.name === p.name && <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 9, color: "#166534", fontWeight: "700", letterSpacing: 1 }}>NOW</Text>}
                  </View>
                  <Text style={{ fontFamily: "Newsreader", fontSize: 16, color: prayer?.current.name === p.name ? "#166534" : "#5b5f65", fontWeight: "600" }}>{p.time}</Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setShowBell(false)} style={{ marginTop: 12, alignSelf: "center" }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65" }}>Close ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ paddingHorizontal: 24, gap: 32, paddingTop: 32 }}>
        {/* Welcome */}
        <View>
          <Text
            style={{
              fontFamily: "Newsreader",
              fontSize: 38,
              fontStyle: "italic",
              fontWeight: "600",
              color: "#2f3338",
              lineHeight: 46,
              marginBottom: 4,
            }}
          >
            Assalamu'alaikum, Aisha.
          </Text>
          <Text
            style={{
              fontFamily: "Plus Jakarta Sans",
              fontSize: 12,
              color: "#5b5f65",
              letterSpacing: 0.5,
            }}
          >
            May your heart find peace in today's intentions.
          </Text>
        </View>

        {/* Prayer Times */}
        <View style={[holoCard, { padding: 24 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "rgba(255,255,255,0.4)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 26 }}>{PRAYER_EMOJI[prayer?.current.name ?? "Dhuhr"] ?? "☀️"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Newsreader", fontSize: 22, color: "#2f3338", fontWeight: "600" }}>
                {prayer?.current.name ?? "—"}
              </Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65" }}>
                {prayer ? `Current Prayer · ${prayer.current.time}` : "Detecting location..."}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#605d71", fontWeight: "700" }}>
                {prayer ? `Next: ${prayer.next.name} in` : ""}
              </Text>
              <Text style={{ fontFamily: "Newsreader", fontSize: 32, color: "#2f3338", fontWeight: "600" }}>
                {prayer?.next.countdown ?? "--:--"}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Access */}
        <View>
          <Text
            style={{
              fontFamily: "Newsreader",
              fontSize: 22,
              fontWeight: "600",
              color: "#2f3338",
              marginBottom: 16,
            }}
          >
            Quick Access
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -6 }}>
            <QuickCard
              icon={Heart}
              iconColor="#be185d"
              title="Qalb"
              desc="Check-in with your spirit"
              bg="#fce7f3"
              onPress={() => router.push("/qalb")}
            />
            <QuickCard
              icon={Sparkles}
              iconColor="#1d4ed8"
              title="Imanifest"
              desc="Set your daily intention"
              bg="#dbeafe"
              onPress={() => router.push("/imanifest")}
            />
            <QuickCard
              icon={ListChecks}
              iconColor="#b45309"
              title="Dua-to-Do"
              desc="Act on your manifestations"
              bg="#fef3c7"
              onPress={() => router.push("/dua-todo")}
            />
            <QuickCard
              icon={Headphones}
              iconColor="#065f46"
              title="Tafakkur Hub"
              desc="Find tranquility in Quran"
              bg="#d1fae5"
              onPress={() => router.push("/tafakkur")}
            />
          </View>
        </View>

        {/* Daily Alignment */}
        <View style={[glass, { padding: 28 }]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: "Newsreader",
                  fontSize: 26,
                  fontWeight: "600",
                  color: "#2f3338",
                }}
              >
                Daily Alignment
              </Text>
              <Text
                style={{
                  fontFamily: "Plus Jakarta Sans",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  color: "#5b5f65",
                }}
              >
                Spiritual Momentum
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontFamily: "Newsreader",
                  fontSize: 40,
                  color: "#605d71",
                  fontWeight: "600",
                }}
              >
                12/15
              </Text>
              <Text
                style={{
                  fontFamily: "Plus Jakarta Sans",
                  fontSize: 9,
                  color: "#206c3a",
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                NEARLY THERE
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View
            style={{
              height: 8,
              backgroundColor: "#eceef3",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: "80%",
                height: "100%",
                backgroundColor: "#206c3a",
                borderRadius: 4,
              }}
            />
          </View>

          <Text
            style={{
              fontFamily: "Noto Serif",
              fontSize: 13,
              fontStyle: "italic",
              color: "#5b5f65",
              lineHeight: 20,
            }}
          >
            "Allah does not burden a soul beyond that it can bear." (2:286)
          </Text>
        </View>

        {/* Streak + Recent Grid */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Streak */}
          <View
            style={[
              glass,
              {
                flex: 1,
                padding: 24,
                alignItems: "center",
              },
            ]}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "rgba(169,247,183,0.4)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 30 }}>⭐</Text>
            </View>
            <Text
              style={{
                fontFamily: "Newsreader",
                fontSize: 18,
                fontWeight: "600",
                color: "#0e6030",
                marginBottom: 4,
              }}
            >
              7-Day Streak
            </Text>
            <Text
              style={{
                fontFamily: "Noto Serif",
                fontSize: 11,
                color: "#1d6b39",
                fontStyle: "italic",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Consistency is the bridge to light.
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#206c3a",
                  }}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Recent Intentions */}
        <View style={[glass, { padding: 28 }]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontFamily: "Newsreader",
                fontSize: 22,
                fontWeight: "600",
                color: "#2f3338",
              }}
            >
              Recent Intentions
            </Text>
            <Text
              style={{
                fontFamily: "Plus Jakarta Sans",
                fontSize: 11,
                color: "#545164",
              }}
            >
              See All →
            </Text>
          </View>

          {[
            { emoji: "❤️", label: "Morning Dhikr", pct: 85, color: "#6d5965" },
            { emoji: "📖", label: "Surah Ar-Rahman", pct: 40, color: "#206c3a" },
            { emoji: "🌙", label: "Tahajjud", pct: 62, color: "#605d71" },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "rgba(229,223,248,0.5)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Noto Serif",
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#2f3338",
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Plus Jakarta Sans",
                      fontSize: 10,
                      color: "#5b5f65",
                    }}
                  >
                    {item.pct}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: "#eceef3",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${item.pct}%` as any,
                      height: "100%",
                      backgroundColor: item.color,
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
