import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

const glass = (radius = 24) => ({
  backgroundColor: "rgba(255,255,255,0.4)",
  borderRadius: radius,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.3)",
  ...(Platform.OS === "web"
    ? ({ backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)" } as any)
    : {}),
});

interface Verse {
  verseKey: string;
  arabicText: string;
  translation: string;
  tafsirSnippet: string;
}

interface LegacyAnalyzeResult {
  manifestationId: string;
  aiSummary: string;
  verses: Verse[];
}

interface NewQalbStoredResult {
  aiSummary?: string;
  advice?: string;
  hadith?: Array<{
    reference?: string;
    text?: string;
  }>;
  verses?: Array<
    | Verse
    | {
        number?: number;
        text?: string;
        surahName?: string;
        surahNumber?: number;
        ayahNumber?: number;
      }
  >;
}

type QalbStoredResult = LegacyAnalyzeResult | NewQalbStoredResult;

interface HadithItem {
  reference: string;
  text: string;
}

function cleanModelText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function QalbResultScreen() {
  const router = useRouter();
  const { userText, sentiment } = useLocalSearchParams<{
    userText: string;
    sentiment: string;
  }>();

  const [result, setResult] = useState<QalbStoredResult | null>(null);

  // Read large result payload from sessionStorage (avoids URL length limits)
  useEffect(() => {
    try {
      if (typeof sessionStorage !== "undefined") {
        const stored = sessionStorage.getItem("qalb_result");
        if (stored) {
          setResult(JSON.parse(stored));
        }
      }
    } catch {}
  }, []);

  const verses: Verse[] = Array.isArray(result?.verses)
    ? result.verses.map((verse): Verse => {
        if (typeof (verse as Verse).verseKey === "string") {
          return verse as Verse;
        }

        const normalized = verse as {
          text?: string;
          surahNumber?: number;
          ayahNumber?: number;
        };

        return {
          verseKey: `${normalized.surahNumber ?? 0}:${normalized.ayahNumber ?? 0}`,
          arabicText: "",
          translation: normalized.text || "",
          tafsirSnippet: "",
        };
      })
    : [];

  const aiSummary =
    (typeof result?.aiSummary === "string" && result.aiSummary) ||
    (typeof (result as NewQalbStoredResult | null)?.advice === "string"
      ? (result as NewQalbStoredResult).advice || ""
      : "");

  const cleanedSummary = cleanModelText(aiSummary);

  const hadith: HadithItem[] = Array.isArray((result as NewQalbStoredResult | null)?.hadith)
    ? ((result as NewQalbStoredResult).hadith || [])
        .filter((h) => h?.reference && h?.text)
        .map((h) => ({ reference: String(h.reference), text: String(h.text) }))
    : [];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Holographic blobs */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1 } as any}>
        {[
          { top: "-10%", left: "-10%", w: "70%", h: "70%", bg: "rgba(229,223,248,0.4)" },
          { bottom: "-10%", right: "-10%", w: "60%", h: "60%", bg: "rgba(169,247,183,0.3)" },
          { top: "30%", right: "-5%", w: "40%", h: "40%", bg: "rgba(255,228,242,0.3)" },
        ].map((b, i) => (
          <View key={i} style={{
            position: "absolute",
            ...(b.top ? { top: b.top } : {}), ...(b.bottom ? { bottom: b.bottom } : {}),
            ...(b.left ? { left: b.left } : {}), ...(b.right ? { right: b.right } : {}),
            width: b.w, height: b.h, backgroundColor: b.bg, borderRadius: 9999, opacity: 0.35,
            ...(Platform.OS === "web" ? ({ filter: "blur(100px)" } as any) : {}),
          } as any} />
        ))}
      </View>

      {/* Header */}
      <View style={{
        paddingHorizontal: 24, paddingVertical: 16,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.4)",
        ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.2)" } as any) : {}),
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, color: "#2f3338" }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
            Your Qalb Answer
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, gap: 24, paddingTop: 24, maxWidth: 680, alignSelf: "center", width: "100%" }}>

        {/* User's Reflection */}
        <View style={[glass(24), { padding: 24, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>🌸</Text>
            </View>
            <View>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
                Your Reflection
              </Text>
              {sentiment ? (
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#524f63", fontWeight: "600" }}>
                  Feeling: {sentiment}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: "rgba(174,178,185,0.2)" }} />
          <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#5b5f65", lineHeight: 24 }}>
            "{userText}"
          </Text>
        </View>

        {/* Loading state */}
        {!result && (
          <View style={[glass(24), { padding: 32, alignItems: "center", gap: 12 }]}>
            <Text style={{ fontSize: 32 }}>🌙</Text>
            <Text style={{ fontFamily: "Newsreader", fontSize: 18, fontStyle: "italic", color: "#2f3338", textAlign: "center" }}>
              Loading your guidance...
            </Text>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65", textAlign: "center" }}>
              If this persists, go back and try again.
            </Text>
          </View>
        )}

        {/* AI Summary */}
        {aiSummary ? (
          <View style={[glass(24), { padding: 24, gap: 12, backgroundColor: "rgba(169,247,183,0.08)" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 18 }}>✨</Text>
              <Text style={{ fontFamily: "Newsreader", fontSize: 20, fontStyle: "italic", color: "#0e6030" }}>
                Divine Response
              </Text>
            </View>
            <Text style={{ fontFamily: "Noto Serif", fontSize: 15, color: "#2f3338", lineHeight: 28 }}>
                {cleanedSummary}
            </Text>
          </View>
        ) : null}

        {/* Quran Verses */}
        {verses.length > 0 ? (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 18 }}>📖</Text>
              <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", color: "#2f3338" }}>
                Quranic Guidance
              </Text>
            </View>
            {verses.map((verse, i) => (
              <View key={i} style={[glass(24), { padding: 28, gap: 20 }]}>
                {/* Arabic */}
                <Text style={{
                  fontFamily: "Amiri", fontSize: 26, lineHeight: 52,
                  color: "#2f3338", textAlign: "center",
                  ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}),
                }}>
                  {verse.arabicText}
                </Text>
                <View style={{ height: 1, backgroundColor: "rgba(174,178,185,0.2)" }} />
                {/* Translation */}
                <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#524f63", textAlign: "center", lineHeight: 26 }}>
                  "{cleanModelText(verse.translation)}"
                </Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#777b81", textAlign: "center" }}>
                  — {verse.verseKey}
                </Text>
                {/* Tafsir */}
                {verse.tafsirSnippet ? (
                  <View style={{ backgroundColor: "rgba(229,223,248,0.2)", borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#6d5965", fontWeight: "700", marginBottom: 6 }}>
                      Tafsir
                    </Text>
                    <Text style={{ fontFamily: "Noto Serif", fontSize: 13, color: "#5b5f65", lineHeight: 22 }}>
                      {cleanModelText(verse.tafsirSnippet)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Hadith References */}
        {hadith.length > 0 ? (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🕊️</Text>
              <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", color: "#2f3338" }}>
                Hadith Guidance
              </Text>
            </View>
            {hadith.map((item, i) => (
              <View key={`${item.reference}-${i}`} style={[glass(24), { padding: 22, gap: 10, backgroundColor: "rgba(226,221,248,0.16)" }]}>
                <Text style={{ fontFamily: "Noto Serif", fontSize: 15, color: "#2f3338", lineHeight: 26 }}>
                  "{cleanModelText(item.text)}"
                </Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: "#605d71", letterSpacing: 0.6 }}>
                  — {item.reference}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Primary CTA — Plan with Imanifest (per project brief) */}
        <TouchableOpacity
          onPress={() => router.push("/imanifest" as any)}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#206c3a", paddingVertical: 20, paddingHorizontal: 32,
            borderRadius: 9999, flexDirection: "row", alignItems: "center", justifyContent: "center",
            gap: 10, marginTop: 8,
            shadowColor: "#166534", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2, color: "#e8ffe8" }}>
            Plan with Imanifest
          </Text>
          <Text style={{ fontSize: 18 }}>✨</Text>
        </TouchableOpacity>

        {/* Secondary CTA */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={[
            {
              paddingVertical: 16, paddingHorizontal: 32,
              borderRadius: 9999, flexDirection: "row", alignItems: "center", justifyContent: "center",
              gap: 10, marginTop: 12,
              backgroundColor: "rgba(255,255,255,0.5)",
              borderWidth: 1, borderColor: "rgba(174,178,185,0.3)",
            },
            Platform.OS === "web" ? ({ backdropFilter: "blur(12px)" } as any) : {},
          ]}
        >
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "600", color: "#5b5f65", letterSpacing: 1 }}>
            Share Another Reflection 🌸
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
