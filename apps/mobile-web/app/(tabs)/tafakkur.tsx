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

// Quran.com v4 chapter recitation IDs (verified)
// GET https://api.quran.com/api/v4/chapter_recitations/{id}/{chapter}
const RECITERS = [
  { id: 7,  name: "Mishary Rashid Alafasy", origin: "Kuwait",       style: "Melodic & Emotive",   initials: "MA", bg: "#7c3aed" },
  { id: 1,  name: "Abdur-Rahman as-Sudais", origin: "Makkah",        style: "Grand Mosque Imam",    initials: "AS", bg: "#0e6030" },
  { id: 10, name: "Yasser Al-Dosari",       origin: "Saudi Arabia",  style: "Clear & Soothing",    initials: "YD", bg: "#1d4ed8" },
];

const SURAHS = [
  { num: 55, name: "Ar-Rahman",   desc: "The Most Gracious · 78 verses" },
  { num: 67, name: "Al-Mulk",     desc: "The Sovereignty · 30 verses" },
  { num: 56, name: "Al-Waqi'ah", desc: "The Inevitable Event · 96 verses" },
  { num: 36, name: "Ya-Sin",      desc: "Heart of the Quran · 83 verses" },
];

const DHIKR_LIST = [
  { arabic: "سُبْحَانَ ٱللَّٰهِ",          transliteration: "Subhanallah",     meaning: "Glory be to Allah" },
  { arabic: "ٱلْحَمْدُ لِلَّٰهِ",          transliteration: "Alhamdulillah",   meaning: "All praise is to Allah" },
  { arabic: "ٱللَّٰهُ أَكْبَرُ",           transliteration: "Allahu Akbar",    meaning: "Allah is the Greatest" },
  { arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", transliteration: "La ilaha illallah", meaning: "There is no god but Allah" },
];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Fetch the audio file URL from Quran.com v4 API
async function fetchAudioUrl(reciterId: number, surahNum: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${surahNum}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.audio_file?.audio_url ?? null;
  } catch {
    return null;
  }
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
      audioRef.current?.pause();
      audioRef.current = null;
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const stopAudio = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (progressInterval.current) clearInterval(progressInterval.current);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  };

  const startProgressTracker = (audio: HTMLAudioElement) => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (audio.duration > 0) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    }, 500);
  };

  const loadAndPlay = async (reciterIdx: number, surahIdx: number) => {
    if (Platform.OS !== "web") return;
    stopAudio();
    setAudioError(null);
    setIsLoading(true);

    const reciter = RECITERS[reciterIdx];
    const surah = SURAHS[surahIdx];

    // Fetch actual audio URL from Quran.com v4
    const audioUrl = await fetchAudioUrl(reciter.id, surah.num);
    if (!audioUrl) {
      setIsLoading(false);
      setAudioError(`Audio untuk ${reciter.name} tidak tersedia. Coba reciter lain.`);
      return;
    }

    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.oncanplay = () => {
      setIsLoading(false);
      audio.play()
        .then(() => {
          setIsPlaying(true);
          startProgressTracker(audio);
        })
        .catch(() => {
          setIsLoading(false);
          setAudioError("Tap tombol play untuk mulai.");
        });
    };

    audio.onerror = () => {
      setIsLoading(false);
      setAudioError("Audio tidak dapat diputar. Coba reciter lain.");
      setIsPlaying(false);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(100);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };

    audio.load();
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioRef.current.src) {
      loadAndPlay(activeReciter, activeSurah);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        startProgressTracker(audioRef.current!);
      });
    }
  };

  const selectReciter = (idx: number) => {
    setActiveReciter(idx);
    loadAndPlay(idx, activeSurah);
  };

  const selectSurah = (idx: number) => {
    setActiveSurah(idx);
    if (isPlaying || isLoading || audioRef.current?.src) {
      loadAndPlay(activeReciter, idx);
    }
  };

  const dhikr = DHIKR_LIST[dhikrIndex];
  const showPlayer = isPlaying || isLoading || progress > 0 || !!audioError;

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

          {/* Surah Selector */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Pilih Surah
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SURAHS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => selectSurah(i)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16,
                    backgroundColor: activeSurah === i ? "#166534" : "rgba(255,255,255,0.65)",
                    borderWidth: 1, borderColor: activeSurah === i ? "#166534" : "rgba(174,178,185,0.3)",
                  }}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: activeSurah === i ? "#fff" : "#2f3338" }}>
                    {s.name}
                  </Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: activeSurah === i ? "rgba(255,255,255,0.75)" : "#5b5f65", marginTop: 2 }}>
                    {s.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reciter Cards */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Pilih Reciter — Tap untuk Putar
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
                      ? { backgroundColor: "rgba(169,247,183,0.18)", borderColor: "rgba(22,101,52,0.3)" }
                      : {}),
                  },
                ]}
              >
                {/* Initials avatar */}
                <View
                  style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: r.bg, alignItems: "center", justifyContent: "center",
                    shadowColor: r.bg, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: "800", color: "#fff" }}>
                    {r.initials}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 14, fontWeight: "700", color: "#2f3338" }}>
                    {r.name}
                  </Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65", marginTop: 2 }}>
                    {r.origin} · {r.style}
                  </Text>
                </View>

                <View
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: activeReciter === i && (isPlaying || isLoading) ? "#166534" : "rgba(229,223,248,0.6)",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  {isLoading && activeReciter === i ? (
                    <ActivityIndicator size="small" color="#166534" />
                  ) : (
                    <Text style={{ fontSize: 18, color: activeReciter === i && isPlaying ? "#fff" : "#2f3338" }}>
                      {activeReciter === i && isPlaying ? "⏸" : "▶"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Audio Player */}
          {showPlayer ? (
            <View style={[glass(24), { padding: 24, gap: 16 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 20 }}>🎵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: "#2f3338" }}>
                    {SURAHS[activeSurah].name} · {RECITERS[activeReciter].name}
                  </Text>
                  {audioError ? (
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#991b1b", marginTop: 2 }}>
                      {audioError}
                    </Text>
                  ) : (
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65", marginTop: 2 }}>
                      {isLoading ? "Loading audio..." : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={togglePlay}
                  disabled={isLoading}
                  style={{
                    width: 48, height: 48, borderRadius: 24, backgroundColor: "#166534",
                    alignItems: "center", justifyContent: "center",
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
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 18 }}>⏹</Text>
                </TouchableOpacity>
              </View>
              {!audioError ? (
                <View style={{ height: 6, backgroundColor: "#eceef3", borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(progress, 100)}%` as any, height: "100%", backgroundColor: "#166534", borderRadius: 3 }} />
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Dhikr Counter */}
          <View style={[glass(28), { padding: 28, gap: 20, alignItems: "center" }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#5b5f65", fontWeight: "700" }}>
              Dhikr Counter
            </Text>

            {/* Dhikr type selector */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {DHIKR_LIST.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => { setDhikrIndex(i); setDhikrCount(0); }}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999,
                    backgroundColor: dhikrIndex === i ? "#166534" : "rgba(255,255,255,0.65)",
                    borderWidth: 1, borderColor: dhikrIndex === i ? "#166534" : "rgba(174,178,185,0.3)",
                  }}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "600", color: dhikrIndex === i ? "#fff" : "#524f63" }}>
                    {d.transliteration}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Big tap button */}
            <TouchableOpacity
              onPress={() => setDhikrCount((c) => c + 1)}
              activeOpacity={0.75}
              style={{
                width: 148, height: 148, borderRadius: 74,
                backgroundColor: "rgba(169,247,183,0.2)",
                borderWidth: 2, borderColor: "rgba(22,101,52,0.2)",
                alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 44, fontWeight: "800", color: "#0e6030" }}>
                {dhikrCount}
              </Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: "#5b5f65", textTransform: "uppercase", letterSpacing: 1 }}>
                Tap
              </Text>
            </TouchableOpacity>

            {/* Arabic text */}
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

            {/* Reset + milestone */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setDhikrCount(0)}
                style={[glass(9999), { paddingHorizontal: 20, paddingVertical: 10 }]}
              >
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "600", color: "#524f63" }}>Reset</Text>
              </TouchableOpacity>
              <View style={[glass(9999), { paddingHorizontal: 20, paddingVertical: 10 }]}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: dhikrCount >= 33 ? "#166534" : "#5b5f65" }}>
                  {dhikrCount >= 33 ? `${Math.floor(dhikrCount / 33)}× 33 ✓` : `${33 - dhikrCount} lagi ke 33`}
                </Text>
              </View>
            </View>
          </View>

          {/* Featured verse */}
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
