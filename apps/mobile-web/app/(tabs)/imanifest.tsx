import { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

const API_URL =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
  "https://api.imanifestapp.com";

const glass = (radius = 24) => ({
  backgroundColor: "rgba(255,255,255,0.45)",
  borderRadius: radius,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.5)",
  ...(Platform.OS === "web"
    ? ({ backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)" } as any)
    : {}),
});

interface VerseHint {
  verseKey: string;
  translation: string;
}

export default function NiyyahBoardScreen() {
  const router = useRouter();
  const [intention, setIntention] = useState("");
  const [gratitude, setGratitude] = useState(["", "", ""]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiHints, setAiHints] = useState<VerseHint[]>([]);
  const [hintsLoading, setHintsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const debounceRef = useRef<any>(null);

  const updateGratitude = (i: number, v: string) => {
    const a = [...gratitude];
    a[i] = v;
    setGratitude(a);
  };

  // Debounced real-time AI verse hints as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (intention.trim().length < 15) {
      setAiHints([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setHintsLoading(true);
      try {
        const res = await fetch(`${API_URL}/iman-sync/quick-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: intention }),
        });
        if (res.ok) {
          const data = await res.json();
          const verses: VerseHint[] = (data.verses || []).slice(0, 2);
          setAiHints(verses);
        }
      } catch {}
      setHintsLoading(false);
    }, 1400);
    return () => clearTimeout(debounceRef.current);
  }, [intention]);

  const pickPhoto = () => {
    if (Platform.OS !== "web") return;
    const input = (document as any).createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png";
    input.onchange = (e: any) => {
      const file: File = e.target?.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError("Photo must be under 5MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const startVoice = () => {
    if (Platform.OS !== "web") return;
    setError(null);
    try {
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SR) {
        setError("Voice not supported in this browser. Please type below.");
        return;
      }
      const recognition = new SR();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIntention((prev) => (prev ? prev + " " + transcript : transcript));
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      setIsRecording(true);
      recognition.start();
    } catch {
      setIsRecording(false);
      setError("Voice recording failed. Please type your intention below.");
    }
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const manifest = async () => {
    const trimmed = intention.trim();
    if (!trimmed) {
      setError("Please write your intention before manifesting.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let data: any = null;

      // Try vision analysis if photo attached
      if (imageFile) {
        try {
          const form = new FormData();
          form.append("intentText", trimmed);
          form.append("image", imageFile);
          const res = await fetch(`${API_URL}/iman-sync/analyze-vision`, {
            method: "POST",
            body: form,
          });
          if (res.ok) data = await res.json();
        } catch {}
      }

      // Fall back to text analysis
      if (!data) {
        const res = await fetch(`${API_URL}/iman-sync/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intentText: trimmed }),
        });
        if (res.ok) data = await res.json();
      }

      if (!data) throw new Error("API unreachable");

      // Use sessionStorage to avoid URL length limits with large tasks/verses content
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("manifest_result", JSON.stringify({
          tasks: data.tasks || [],
          verses: data.verses || [],
          aiSummary: data.aiSummary || "",
          intentText: trimmed,
        }));
      }
      router.push({
        pathname: "/dua-todo",
        params: { intentText: trimmed },
      });
    } catch {
      // Offline fallback — show motivational tasks
      const fallbackTasks = [
        "Pray all 5 daily prayers on time today",
        "Read Quran for 10 minutes after Fajr",
        "Make sincere dua for your intention after each prayer",
        "Give sadaqah or help someone in need this week",
        "Write 3 gratitude points in a journal each night",
      ];
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("manifest_result", JSON.stringify({
          tasks: fallbackTasks,
          verses: [],
          aiSummary: "",
          intentText: trimmed,
        }));
      }
      router.push({
        pathname: "/dua-todo",
        params: { intentText: trimmed },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Blobs */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1 } as any}>
        <View style={{ position: "absolute", top: "-10%", left: "-10%", width: "65%", height: "55%", backgroundColor: "rgba(226,221,248,0.35)", borderRadius: 9999, ...(Platform.OS === "web" ? ({ filter: "blur(90px)" } as any) : {}) } as any} />
        <View style={{ position: "absolute", bottom: "-5%", right: "-5%", width: "55%", height: "50%", backgroundColor: "rgba(255,228,242,0.3)", borderRadius: 9999, ...(Platform.OS === "web" ? ({ filter: "blur(80px)" } as any) : {}) } as any} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.4)", ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.2)" } as any) : {}) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#e5dff8", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" }}>
            <Text style={{ fontSize: 18 }}>🌟</Text>
          </View>
          <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>Imanifest</Text>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24, gap: 32, paddingTop: 32, maxWidth: 680, alignSelf: "center", width: "100%" }}>

        {/* Hero */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: "Newsreader", fontSize: 40, fontStyle: "italic", fontWeight: "600", color: "#2f3338", lineHeight: 50 }}>
            Imanifest My Vision
          </Text>
          <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#5b5f65", lineHeight: 24, opacity: 0.85 }}>
            Align your soul's purpose with intentional action. AI will craft your personalized Dua steps.
          </Text>
        </View>

        {/* Visual Focus — Photo */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "rgba(91,95,101,0.8)", fontWeight: "700" }}>
            Visual Focus (Optional)
          </Text>
          <TouchableOpacity
            onPress={pickPhoto}
            activeOpacity={0.9}
            style={[glass(32), {
              aspectRatio: 4 / 3,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: imagePreview ? "transparent" : "rgba(226,221,248,0.4)",
            }]}
          >
            {imagePreview && Platform.OS === "web" ? (
              <img
                src={imagePreview}
                style={{ width: "100%", height: "100%", objectFit: "cover" } as any}
                alt="inspiration"
              />
            ) : (
              <>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
                  <Text style={{ fontSize: 28 }}>📸</Text>
                </View>
                <Text style={{ fontFamily: "Newsreader", fontSize: 18, fontStyle: "italic", color: "#545164" }}>
                  {Platform.OS === "web" ? "Tap to Upload Photo" : "Add Inspiration Image"}
                </Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#8b8f96", marginTop: 4 }}>
                  AI will analyze it with your intention
                </Text>
              </>
            )}
          </TouchableOpacity>
          {imagePreview && (
            <TouchableOpacity
              onPress={() => { setImageFile(null); setImagePreview(null); }}
              style={{ alignSelf: "flex-end" }}
            >
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#991b1b" }}>Remove photo ✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Intention Input */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "rgba(91,95,101,0.8)", fontWeight: "700" }}>
              Soul's Intention *
            </Text>
            <TouchableOpacity
              onPress={isRecording ? stopVoice : startVoice}
              activeOpacity={0.85}
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

          {isRecording && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#be185d" }} />
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#be185d", fontWeight: "600" }}>
                Listening... speak your intention clearly
              </Text>
            </View>
          )}

          <View style={[glass(28), { padding: 24, minHeight: 160 }]}>
            <TextInput
              value={intention}
              onChangeText={setIntention}
              multiline
              placeholder="Write what your soul desires to manifest today... be specific and sincere."
              placeholderTextColor="rgba(91,95,101,0.4)"
              style={{
                fontFamily: "Newsreader", fontSize: 20, fontStyle: "italic",
                color: "#2f3338", minHeight: 120, textAlignVertical: "top", lineHeight: 32,
                ...(Platform.OS === "web" ? ({ outline: "none", resize: "none" } as any) : {}),
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: "rgba(91,95,101,0.4)" }}>
                {intention.length}/500
              </Text>
            </View>
          </View>
        </View>

        {/* Real-time AI Verse Hints */}
        {(hintsLoading || aiHints.length > 0) && (
          <View style={[glass(20), { padding: 20, gap: 12, backgroundColor: "rgba(169,247,183,0.08)" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16 }}>✨</Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#0e6030", fontWeight: "700" }}>
                {hintsLoading ? "Finding Quranic Guidance..." : "Related Quranic Verses"}
              </Text>
              {hintsLoading && <ActivityIndicator size="small" color="#0e6030" />}
            </View>
            {aiHints.map((v, i) => (
              <View key={i} style={{ gap: 4, paddingTop: i > 0 ? 12 : 0, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "rgba(174,178,185,0.2)" }}>
                <Text style={{ fontFamily: "Noto Serif", fontSize: 13, fontStyle: "italic", color: "#2f3338", lineHeight: 22 }}>
                  "{v.translation}"
                </Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#777b81" }}>
                  — {v.verseKey}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Gratitude */}
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(174,178,185,0.3)" }} />
            <Text style={{ fontFamily: "Newsreader", fontSize: 20, fontStyle: "italic", color: "#2f3338" }}>
              Moments of Gratitude
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(174,178,185,0.3)" }} />
          </View>
          <View style={{ gap: 12 }}>
            {gratitude.map((val, i) => (
              <View key={i} style={[glass(16), { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingVertical: 16 }]}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 14, color: "rgba(32,108,58,0.4)", fontWeight: "600", width: 28 }}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <TextInput
                  value={val}
                  onChangeText={(t) => updateGratitude(i, t)}
                  placeholder={
                    i === 0
                      ? "Something I am grateful for..."
                      : i === 1
                      ? "Another blessing today..."
                      : "A final moment of gratitude..."
                  }
                  placeholderTextColor="rgba(91,95,101,0.4)"
                  style={{
                    flex: 1, fontFamily: "Noto Serif", fontSize: 16, fontStyle: "italic", color: "#2f3338",
                    ...(Platform.OS === "web" ? ({ outline: "none" } as any) : {}),
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={[glass(16), { padding: 16, backgroundColor: "rgba(254,202,202,0.4)" }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#991b1b" }}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          onPress={manifest}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: loading ? "rgba(32,108,58,0.5)" : "#206c3a",
            paddingVertical: 20, paddingHorizontal: 32, borderRadius: 9999,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
            shadowColor: "#166534", shadowOpacity: 0.15, shadowRadius: 32, shadowOffset: { width: 0, height: 16 },
            marginBottom: 8,
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#e8ffe8" size="small" />
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2, color: "#e8ffe8" }}>
                AI is crafting your steps...
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2, color: "#e8ffe8" }}>
                Manifest &amp; Get Dua Steps
              </Text>
              <Text style={{ fontSize: 18, color: "#e8ffe8" }}>→</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
