import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";

const glass = (radius = 24) => ({
  backgroundColor: "rgba(255,255,255,0.45)",
  borderRadius: radius,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.5)",
  ...(Platform.OS === "web"
    ? ({
        backdropFilter: "blur(24px) saturate(140%)",
        WebkitBackdropFilter: "blur(24px) saturate(140%)",
      } as any)
    : {}),
});

// Verified reciter IDs from api.quran.com (recitation_id → slug for verses.quran.com)
const RECITERS = [
  {
    id: 7,
    slug: "mishary_rashid_alafasy",
    name: "Mishary Rashid Alafasy",
    origin: "Kuwait",
    style: "Melodic & Emotive",
    initials: "MA",
    bg: "#7c3aed",
  },
  {
    id: 1,
    slug: "abdurrahmaan_as-sudais",
    name: "Abdur-Rahman as-Sudais",
    origin: "Makkah",
    style: "Grand Mosque Imam",
    initials: "AS",
    bg: "#0e6030",
  },
  {
    id: 6,
    slug: "yasser_ad-dussary",
    name: "Yasser Al-Dosari",
    origin: "Saudi Arabia",
    style: "Clear & Soothing",
    initials: "YD",
    bg: "#1d4ed8",
  },
];

const SURAHS = [
  { num: 55, name: "Ar-Rahman", desc: "The Most Gracious · 78 verses" },
  { num: 67, name: "Al-Mulk", desc: "The Sovereignty · 30 verses" },
  { num: 56, name: "Al-Waqi'ah", desc: "The Inevitable Event · 96 verses" },
  { num: 36, name: "Ya-Sin", desc: "Heart of the Quran · 83 verses" },
];

const DHIKR_LIST = [
  { arabic: "سُبْحَانَ ٱللَّٰهِ", transliteration: "Subhanallah", meaning: "Glory be to Allah" },
  { arabic: "ٱلْحَمْدُ لِلَّٰهِ", transliteration: "Alhamdulillah", meaning: "All praise is to Allah" },
  { arabic: "ٱللَّٰهُ أَكْبَرُ", transliteration: "Allahu Akbar", meaning: "Allah is the Greatest" },
  { arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", transliteration: "La ilaha illallah", meaning: "There is no god but Allah" },
];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function TafakkurHubScreen() {
  const [activeReciter, setActiveReciter] = useState(0);
  const [activeSurah, setActiveSurah] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [dhikrCount, setDhikrCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (progressInterval.current) clearInterval(progressInterval.current);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const playAudio = async (reciterIdx: number, surahIdx: number) => {
    if (Platform.OS !== "web") return;
    stopAudio();
    setAudioError(null);
    setIsLoading(true);

    const reciter = RECITERS[reciterIdx];
    const surah = SURAHS[surahIdx];
    // Build the audio URL using the Quran CDN verse-by-verse URL (verse 1 of selected surah)
    const surahPadded = String(surah.num).padStart(3, "0");
    const audioUrl = `https://verses.quran.com/${reciter.slug}/${surahPadded}001.mp3`;

    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.oncanplaythrough = () => {
        setIsLoading(false);
        setDuration(audio.duration || 0);
        audio.play().then(() => {
          setIsPlaying(true);
          progressInterval.current = setInterval(() => {
            if (audio.duration > 0) {
              setCurrentTime(audio.currentTime);
              setProgress((audio.currentTime / audio.duration) * 100);
            }
          }, 500);
        }).catch(() => {
          setAudioError("Playback blocked. Tap play again.");
          setIsLoading(false);
        });
      };

      audio.onerror = () => {
        setIsLoading(false);
        setAudioError("Audio unavailable for this reciter. Try another.");
        setIsPlaying(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        if (progressInterval.current) clearInterval(progressInterval.current);
      };

      audio.load();
    } catch {
      setIsLoading(false);
      setAudioError("Audio not supported in this browser.");
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        progressInterval.current = setInterval(() => {
          if (audioRef.current && audioRef.current.duration > 0) {
            setCurrentTime(audioRef.current.currentTime);
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          }
        }, 500);
      });
    } else {
      playAudio(activeReciter, activeSurah);
    }
  };

  const selectReciter = (idx: number) => {
    if (idx === activeReciter && (isPlaying || isLoading)) {
      togglePlay();
      return;
    }
    setActiveReciter(idx);
    playAudio(idx, activeSurah);
  };

  const selectSurah = (idx: number) => {
    setActiveSurah(idx);
    if (isPlaying || isLoading) {
      playAudio(activeReciter, idx);
    }
  };

  const dhikr = DHIKR_LIST[dhikrIndex];

  return (
    <View style={{ flex: 1 }}>
      {/* Holographic blobs */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1 } as any}
      >
        {[
          { top: "-5%", left: "-10%", w: "65%", h: "55%", bg: "rgba(229,223,248,0.3)" },
          { bottom: "10%", right: "-10%", w: "55%", h: "45%", bg: "rgba(169,247,183,0.25)" },
          { top: "40%", left: "20%", w: "40%", h: "30%", bg: "rgba(255,228,242,0.2)" },
        ].map((b, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              ...(b.top ? { top: b.top } : {}),
              ...(b.bottom ? { bottom: b.bottom } : {}),
              ...(b.left ? { left: b.left } : {}),
              ...(b.right ? { right: b.right } : {}),
              width: b.w, height: b.h,
              backgroundColor: b.bg, borderRadius: 9999, opacity: 0.5,
              ...(Platform.OS === "web" ? ({ filter: "blur(90px)" } as any) : {}),
            } as any}
          />
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 24, paddingVertical: 16,
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.4)",
            ...(Platform.OS === "web"
              ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.2)" } as any)
              : {}),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>🧘</Text>
            </View>
            <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
              Tafakkur Hub
            </Text>
          </View>
          <TouchableOpacity style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 32, paddingTop: 32, maxWidth: 680, alignSelf: "center", width: "100%" }}>

          {/* Hero */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "rgba(91,95,101,0.7)", fontWeight: "700" }}>
              Curated Spiritual Guidance
            </Text>
            <Text style={{ fontFamily: "Newsreader", fontSize: 38, fontStyle: "italic", fontWeight: "600", color: "#2f3338", lineHeight: 46 }}>
              Tafakkur Hub
            </Text>
            <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#5b5f65", lineHeight: 22 }}>
              Contemplate the divine through recitation, reflection, and remembrance.
            </Text>
          </View>

          {/* Surah Selection */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Choose Surah
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SURAHS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => selectSurah(i)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16,
                    backgroundColor: activeSurah === i ? "#166534" : "rgba(255,255,255,0.6)",
                    borderWidth: 1, borderColor: activeSurah === i ? "#166534" : "rgba(174,178,185,0.3)",
                  }}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "700", color: activeSurah === i ? "#fff" : "#2f3338" }}>
                    {s.name}
                  </Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: activeSurah === i ? "rgba(255,255,255,0.7)" : "#5b5f65", marginTop: 2 }}>
                    {s.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reciters */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Choose Reciter · Tap to Play
            </Text>
            {RECITERS.map((r, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => selectReciter(i)}
                activeOpacity={0.85}
                style={[
                  glass(20),
                  {
                    flexDirection: "row", alignItems: "center", gap: 16, padding: 18,
                    ...(activeReciter === i
                      ? { backgroundColor: "rgba(169,247,183,0.15)", borderColor: "rgba(22,101,52,0.3)" }
                      : {}),
                  },
                ]}
              >
                {/* Avatar with initials */}
                <View
                  style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: r.bg, alignItems: "center", justifyContent: "center",
                    shadowColor: r.bg, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: "700", color: "#fff" }}>
                    {r.initials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 14, fontWeight: "700", color: "#2f3338" }}>{r.name}</Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65", marginTop: 2 }}>
                    {r.origin} · {r.style}
                  </Text>
                </View>
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: activeReciter === i && (isPlaying || isLoading) ? "#166534" : "rgba(229,223,248,0.5)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {isLoading && activeReciter === i ? (
                    <ActivityIndicator size="small" color="#166534" />
                  ) : (
                    <Text style={{ fontSize: 18 }}>
                      {activeReciter === i && isPlaying ? "⏸" : "▶"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Audio Player */}
          {(isPlaying || isLoading || progress > 0 || audioError) ? (
            <View style={[glass(24), { padding: 24, gap: 16 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <Text style={{ fontSize: 18 }}>🎵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: "#2f3338" }}>
                    {SURAHS[activeSurah].name} · {RECITERS[activeReciter].name}
                  </Text>
                  {audioError ? (
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#991b1b", marginTop: 2 }}>{audioError}</Text>
                  ) : (
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65", marginTop: 2 }}>
                      {isLoading ? "Loading audio..." : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={isLoading ? undefined : togglePlay}
                  style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: "#166534", alignItems: "center", justifyContent: "center",
                    shadowColor: "#166534", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 20, color: "#fff" }}>{isPlaying ? "⏸" : "▶"}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={stopAudio}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(229,223,248,0.5)", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 16 }}>⏹</Text>
                </TouchableOpacity>
              </View>
              {/* Progress bar */}
              {!audioError && (
                <View style={{ height: 6, backgroundColor: "#eceef3", borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${progress}%` as any, height: "100%", backgroundColor: "#166534", borderRadius: 3 }} />
                </View>
              )}
            </View>
          ) : null}

          {/* Dhikr Counter */}
          <View style={[glass(28), { padding: 28, gap: 20, alignItems: "center" }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#5b5f65", fontWeight: "700" }}>
              Dhikr Counter
            </Text>

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {DHIKR_LIST.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => { setDhikrIndex(i); setDhikrCount(0); }}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999,
                    backgroundColor: dhikrIndex === i ? "#166534" : "rgba(255,255,255,0.6)",
                    borderWidth: 1, borderColor: dhikrIndex === i ? "#166534" : "rgba(174,178,185,0.3)",
                  }}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "600", color: dhikrIndex === i ? "#fff" : "#524f63" }}>
                    {d.transliteration}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setDhikrCount((c) => c + 1)}
              activeOpacity={0.8}
              style={{
                width: 140, height: 140, borderRadius: 70,
                backgroundColor: "rgba(169,247,183,0.2)",
                borderWidth: 2, borderColor: "rgba(22,101,52,0.2)",
                alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 42, fontWeight: "700", color: "#0e6030" }}>
                {dhikrCount}
              </Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: "#5b5f65", textTransform: "uppercase", letterSpacing: 1 }}>
                Tap to count
              </Text>
            </TouchableOpacity>

            <View style={{ alignItems: "center", gap: 6 }}>
              <Text
                style={{
                  fontFamily: "Amiri", fontSize: 28, color: "#2f3338", textAlign: "center",
                  ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}),
                }}
              >
                {dhikr.arabic}
              </Text>
              <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#524f63" }}>
                {dhikr.transliteration}
              </Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65" }}>
                {dhikr.meaning}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setDhikrCount(0)}
                style={[glass(9999), { paddingHorizontal: 20, paddingVertical: 10 }]}
              >
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "600", color: "#524f63" }}>Reset</Text>
              </TouchableOpacity>
              <View style={[glass(9999), { paddingHorizontal: 20, paddingVertical: 10 }]}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65" }}>
                  {dhikrCount >= 33 ? `${Math.floor(dhikrCount / 33)}× 33 ✓` : `${33 - dhikrCount} to 33`}
                </Text>
              </View>
            </View>
          </View>

          {/* Featured Verse */}
          <View style={[glass(24), { padding: 28, gap: 16, backgroundColor: "rgba(169,247,183,0.08)" }]}>
            <Text
              style={{
                fontFamily: "Amiri", fontSize: 26, lineHeight: 50, color: "#2f3338", textAlign: "center",
                ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}),
              }}
            >
              فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ
            </Text>
            <View style={{ height: 1, backgroundColor: "rgba(174,178,185,0.2)" }} />
            <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#2f3338", textAlign: "center", lineHeight: 26 }}>
              "So which of the favors of your Lord would you deny?"
            </Text>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#777b81", textAlign: "center" }}>
              — Ar-Rahman (55:13)
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
