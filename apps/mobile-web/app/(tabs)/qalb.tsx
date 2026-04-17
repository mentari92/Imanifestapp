import { useState, useRef } from "react";
import { Heart } from "lucide-react-native";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../lib/api";

const glass = (radius = 28) => ({
  backgroundColor: "rgba(255,255,255,0.6)",
  borderRadius: radius,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.2)",
  ...(Platform.OS === "web"
    ? ({
        backdropFilter: "blur(24px) saturate(140%)",
        WebkitBackdropFilter: "blur(24px) saturate(140%)",
      } as any)
    : {}),
});

const SENTIMENTS = [
  { label: "Hopeful", color: "#524f63" },
  { label: "Peaceful", color: "#65515d" },
  { label: "Grounded", color: "#0e6030" },
  { label: "Anxious", color: "#5b5f65" },
  { label: "Seeking", color: "#524f63" },
  { label: "Grateful", color: "#65515d" },
];

export default function QalbScreen() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startVoice = () => {
    if (Platform.OS !== "web") return;
    setError(null);
    setNotice(null);
    try {
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SR) {
        setError("Voice not supported in this browser. Please type below.");
        return;
      }
      const recognition = new SR();
      recognition.lang = "id-ID";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNote((prev) => (prev ? prev + " " + transcript : transcript));
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      setIsRecording(true);
      recognition.start();
    } catch {
      setIsRecording(false);
      setError("Voice recording failed. Please type your reflection below.");
    }
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please share what's in your heart before seeking guidance.");
      return;
    }

    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const [reflectRes, versesRes] = await Promise.allSettled([
        api.post(
          "/heart-pulse/reflect",
          { transcriptText: trimmed },
          { timeout: 18000 },
        ),
        api.post(
          "/iman-sync/quick-search",
          { text: trimmed },
          { timeout: 14000 },
        ),
      ]);

      const reflectData = reflectRes.status === "fulfilled" ? reflectRes.value?.data : null;
      const verseData = versesRes.status === "fulfilled" ? versesRes.value?.data : null;

      const aiSummary = reflectData?.aiInsight
        ? [
            reflectData.aiInsight.spiritual,
            reflectData.aiInsight.tafsir,
            reflectData.aiInsight.scientific,
          ]
            .filter(Boolean)
            .join("\n\n")
        : "Allah mengetahui isi hatimu. Tetap berikhtiar, perbanyak doa, dan jaga hati dengan dzikir.";

      const payload = {
        manifestationId: "qalb-response",
        aiSummary,
        verses: Array.isArray(verseData?.verses) ? verseData.verses : [],
      };

      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("qalb_result", JSON.stringify(payload));
      }

      if (reflectRes.status !== "fulfilled") {
        setNotice("AI utama sedang sibuk, menampilkan guidance fallback yang tetap relevan.");
      }

      router.push({
        pathname: "/qalb-result",
        params: {
          userText: trimmed,
          sentiment: reflectData?.sentiment || selected || "",
        },
      });
    } catch {
      setNotice("AI sedang sibuk, menampilkan guidance fallback.");
      const fallback = {
        manifestationId: "demo",
        aiSummary:
          "Allah SWT mendengar setiap doa dari hati yang tulus. Dalam setiap kesulitan terdapat kemudahan (QS 94:5-6). " +
          "Ambil satu langkah kecil hari ini, lalu lanjutkan dengan ikhtiar yang konsisten.",
        verses: [
          {
            verseKey: "94:5",
            arabicText: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
            translation: "For indeed, with hardship will be ease.",
            tafsirSnippet: "Allah menjanjikan bahwa bersama setiap kesulitan ada kemudahan.",
          },
          {
            verseKey: "13:28",
            arabicText: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
            translation: "Verily, in the remembrance of Allah do hearts find rest.",
            tafsirSnippet: "Ketenangan hati tumbuh saat kita mengingat Allah dengan sadar.",
          },
        ],
      };
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("qalb_result", JSON.stringify(fallback));
      }
      router.push({
        pathname: "/qalb-result",
        params: { userText: trimmed, sentiment: selected || "" },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Holographic blobs */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1 } as any}
      >
        <View
          style={{
            position: "absolute", top: "-10%", left: "-10%",
            width: "60%", height: "60%",
            backgroundColor: "#e5dff8", borderRadius: 9999, opacity: 0.4,
            ...(Platform.OS === "web" ? ({ filter: "blur(80px)" } as any) : {}),
          } as any}
        />
        <View
          style={{
            position: "absolute", bottom: "-10%", right: "-10%",
            width: "50%", height: "50%",
            backgroundColor: "#ffe4f2", borderRadius: 9999, opacity: 0.4,
            ...(Platform.OS === "web" ? ({ filter: "blur(80px)" } as any) : {}),
          } as any}
        />
      </View>

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 24, paddingVertical: 16,
          flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.6)",
          ...(Platform.OS === "web"
            ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)" } as any)
            : {}),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" }}>
            <Heart size={20} color="#be185d" strokeWidth={1.8} />
          </View>
          <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
            Qalb
          </Text>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24, gap: 32, paddingTop: 32, maxWidth: 680, alignSelf: "center", width: "100%" }}>
        {/* Hero */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: "Newsreader", fontSize: 38, fontStyle: "italic", fontWeight: "600", color: "#2f3338", lineHeight: 46 }}>
            A Sanctuary for your Spiritual Voice
          </Text>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#5b5f65", lineHeight: 20 }}>
            Share what weighs on your heart. Receive guidance from the Quran and wisdom of the Prophet ﷺ.
          </Text>
        </View>

        {/* How are you feeling? */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
            How are you feeling?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SENTIMENTS.map((s) => (
              <TouchableOpacity
                key={s.label}
                onPress={() => setSelected(selected === s.label ? null : s.label)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999,
                  backgroundColor: selected === s.label ? s.color : "rgba(255,255,255,0.6)",
                  borderWidth: 1,
                  borderColor: selected === s.label ? s.color : "rgba(174,178,185,0.3)",
                }}
              >
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "600", color: selected === s.label ? "#fff" : s.color }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Main Input */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Share your reflection
            </Text>
            <TouchableOpacity
              onPress={isRecording ? stopVoice : startVoice}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999,
                backgroundColor: isRecording ? "#be185d" : "rgba(255,255,255,0.7)",
                borderWidth: 1, borderColor: isRecording ? "#be185d" : "rgba(174,178,185,0.4)",
              }}
            >
              <Text style={{ fontSize: 14 }}>{isRecording ? "⏹" : "🎙️"}</Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: isRecording ? "#fff" : "#524f63" }}>
                {isRecording ? "Stop" : "Voice"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[glass(24), { padding: 20, minHeight: 160 }]}>
            {isRecording ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(190,24,93,0.2)" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#be185d" }} />
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#be185d", fontWeight: "600" }}>
                  Listening... speak clearly
                </Text>
              </View>
            ) : null}
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Write or speak what is in your heart... What worries you? What do you hope for?"
              placeholderTextColor="rgba(91,95,101,0.45)"
              style={{
                fontFamily: "Noto Serif", fontSize: 16, fontStyle: "italic",
                color: "#2f3338", minHeight: 120, textAlignVertical: "top", lineHeight: 28,
                ...(Platform.OS === "web" ? ({ outline: "none" } as any) : {}),
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: "rgba(91,95,101,0.4)" }}>
                {note.length}/500
              </Text>
            </View>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={[glass(16), { padding: 16, backgroundColor: "rgba(254,202,202,0.4)" }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#991b1b" }}>{error}</Text>
          </View>
        ) : null}

        {notice ? (
          <View style={[glass(16), { padding: 16, backgroundColor: "rgba(187,247,208,0.45)" }]}> 
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#166534" }}>{notice}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          onPress={() => submit(note)}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: loading ? "rgba(22,101,52,0.5)" : "#166534",
            paddingVertical: 20, paddingHorizontal: 32, borderRadius: 9999,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
            shadowColor: "#166534", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 3, color: "#fff" }}>
                Seeking Guidance...
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 18 }}>✨</Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 3, color: "#fff" }}>
                Receive Guidance
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Streak pill */}
        <View style={[glass(9999), { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 12, alignSelf: "center" }]}>
          <Text style={{ fontSize: 18 }}>⭐</Text>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: "700", color: "#6d5965" }}>12 Days</Text>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#5b5f65" }}>Reflection Streak</Text>
        </View>
      </View>
    </ScrollView>
  );
}
