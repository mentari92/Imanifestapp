import { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, TextInput,
} from "react-native";
import { api } from "../../lib/api";

const glass = (radius = 24) => ({
  backgroundColor: "rgba(255,255,255,0.45)",
  borderRadius: radius,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.5)",
  ...(Platform.OS === "web"
    ? ({ backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)" } as any)
    : {}),
});

interface Reciter {
  id: number;
  name: string;
  origin: string;
  style: string;
  initials: string;
  bg: string;
}

const RECITER_COLORS = ["#7c3aed", "#0e6030", "#1d4ed8", "#92400e", "#334155"];

const FALLBACK_RECITERS: Reciter[] = [
  { id: 7, name: "Mishary Rashid Alafasy", origin: "Kuwait", style: "Murattal", initials: "MA", bg: "#7c3aed" },
  { id: 1, name: "Abdul Basit", origin: "Egypt", style: "Murattal", initials: "AB", bg: "#0e6030" },
  { id: 3, name: "Abdurrahmaan As-Sudais", origin: "Makkah", style: "Murattal", initials: "AS", bg: "#1d4ed8" },
];

const DHIKR_LIST = [
  { arabic: "سُبْحَانَ ٱللَّٰهِ",           transliteration: "Subhanallah",      meaning: "Glory be to Allah" },
  { arabic: "ٱلْحَمْدُ لِلَّٰهِ",           transliteration: "Alhamdulillah",    meaning: "All praise is to Allah" },
  { arabic: "ٱللَّٰهُ أَكْبَرُ",            transliteration: "Allahu Akbar",     meaning: "Allah is the Greatest" },
  { arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", transliteration: "La ilaha illallah",meaning: "There is no god but Allah" },
];

interface Surah { number: number; name: string; englishName: string; versesCount: number; }
interface ReadReflectVerse { verseKey: string; arabicText: string; translation: string; tafsirSnippet: string; }

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// Reciter ID → CDN identifier map (islamic.network fallback)
const RECITER_CDN_MAP: Record<number, string> = {
  7: "ar.alafasy",
  1: "ar.abdulsamad",
  3: "ar.sudais",
  10: "ar.minshawi",
};

const NATURE_SOUNDS = [
  { id: "rain",    label: "Rain of Sakinah",    emoji: "🌧️", url: "https://www.soundjay.com/nature/rain-07.mp3" },
  { id: "river",   label: "Zamzam Flow",         emoji: "💧", url: "https://www.soundjay.com/nature/river-1.mp3" },
  { id: "birds",   label: "Garden of Peace",     emoji: "🐦", url: "https://www.soundjay.com/nature/birds-1.mp3" },
];

export default function TafakkurHubScreen() {
  const [reciters, setReciters] = useState<Reciter[]>(FALLBACK_RECITERS);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [surahSearch, setSurahSearch] = useState("");
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [activeReciter, setActiveReciter] = useState(0);
  const [activeSurah, setActiveSurah] = useState<Surah | null>(null);
  const [readReflect, setReadReflect] = useState<ReadReflectVerse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [dhikrCount, setDhikrCount] = useState(0);
  const [activeNature, setActiveNature] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const natureRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<any>(null);

  // Load reciters + 114 surahs through backend proxy for stable runtime.
  useEffect(() => {
    const load = async () => {
      setLoadingSurahs(true);
      try {
        const [recitersRes, surahsRes] = await Promise.all([
          api.get("/sakinah/reciters", { timeout: 15000 }),
          api.get("/sakinah/surahs", { timeout: 15000 }),
        ]);

        const mappedReciters: Reciter[] = (recitersRes.data || []).map((r: any, i: number) => {
          const name = String(r?.name || "Unknown Reciter");
          const initials = name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || "")
            .join("") || "QR";

          return {
            id: Number(r?.id || i + 1),
            name,
            origin: String(r?.origin || "Quran.com"),
            style: String(r?.style || "Murattal"),
            initials,
            bg: RECITER_COLORS[i % RECITER_COLORS.length],
          };
        });

        const mappedSurahs: Surah[] = (surahsRes.data || []).map((s: any, idx: number) => ({
          number: Number(s?.number || idx + 1),
          name: String(s?.name || ""),
          englishName: String(s?.englishName || `Surah ${idx + 1}`),
          versesCount: Number(s?.versesCount || 0),
        }));

        if (mappedReciters.length > 0) {
          setReciters(mappedReciters);
          setActiveReciter((prev) => (prev < mappedReciters.length ? prev : 0));
        }
        setSurahs(mappedSurahs);
      } catch {
        setReciters(FALLBACK_RECITERS);
        setSurahs(Array.from({ length: 114 }, (_, i) => ({
          number: i + 1,
          name: "",
          englishName: `Surah ${i + 1}`,
          versesCount: 0,
        })));
        setNotice("Gagal memuat data Quran dari backend, memakai fallback list.");
      } finally {
        setLoadingSurahs(false);
      }
    };

    load();
    return () => {
      audioRef.current?.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stopAudio = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false); setProgress(0); setCurrentTime(0); setDuration(0);
  };

  const loadAndPlay = async (reciterIdx: number, surah: Surah) => {
    if (Platform.OS !== "web") return;
    const reciter = reciters[reciterIdx];
    if (!reciter) return;

    stopAudio();
    setAudioError(null);
    setIsLoadingAudio(true);

    let url: string | null = null;
    try {
      const res = await api.get("/sakinah/audio", {
        params: {
          reciterId: reciter.id,
          surahNumber: surah.number,
        },
        timeout: 15000,
      });
      url = res.data?.url ?? null;
    } catch {
      url = null;
    }

    // CDN fallback — works even if VPS is unreachable
    if (!url) {
      const identifier = RECITER_CDN_MAP[reciter.id] || "ar.alafasy";
      url = `https://cdn.islamic.network/quran/audio/128/${identifier}/${surah.number}.mp3`;
      setNotice("Menggunakan fallback audio CDN.");
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.oncanplay = () => {
      setIsLoadingAudio(false);
      audio.play().then(() => {
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
          if (audio.duration > 0) {
            setCurrentTime(audio.currentTime);
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        }, 500);
      }).catch(() => { setIsLoadingAudio(false); setAudioError("Tap ▶ untuk mulai."); });
    };
    audio.onerror = () => { setIsLoadingAudio(false); setAudioError("Audio tidak bisa diputar."); };
    audio.onended = () => { setIsPlaying(false); setProgress(100); if (intervalRef.current) clearInterval(intervalRef.current); };
    audio.load();
  };

  const togglePlay = () => {
    if (!audioRef.current?.src) { if (activeSurah) loadAndPlay(activeReciter, activeSurah); return; }
    if (isPlaying) {
      audioRef.current.pause(); setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
          const a = audioRef.current!;
          if (a.duration > 0) { setCurrentTime(a.currentTime); setProgress((a.currentTime / a.duration) * 100); }
        }, 500);
      });
    }
  };

  const toggleNature = (soundId: string) => {
    if (Platform.OS !== "web") return;
    const sound = NATURE_SOUNDS.find((n) => n.id === soundId);
    if (!sound) return;

    if (activeNature === soundId) {
      // Stop
      natureRef.current?.pause();
      if (natureRef.current) natureRef.current.src = "";
      natureRef.current = null;
      setActiveNature(null);
    } else {
      // Stop previous
      if (natureRef.current) { natureRef.current.pause(); natureRef.current.src = ""; }
      const audio = new Audio(sound.url);
      audio.loop = true;
      audio.volume = 0.35;
      audio.play().catch(() => {});
      natureRef.current = audio;
      setActiveNature(soundId);
    }
  };

  useEffect(() => {
    const loadReadReflect = async () => {
      if (!activeSurah) {
        setReadReflect(null);
        return;
      }

      try {
        const res = await api.get("/sakinah/read-reflect", {
          params: { surahNumber: activeSurah.number },
          timeout: 10000,
        });
        setReadReflect(res.data || null);
      } catch {
        setReadReflect({
          verseKey: `${activeSurah.number}:1`,
          arabicText: "",
          translation: `Reflect on Surah ${activeSurah.englishName} and map one concrete lesson for today.`, 
          tafsirSnippet: "Pause, breathe, then apply one ayah insight in your next action.",
        });
      }
    };

    loadReadReflect();
  }, [activeSurah]);

  const filtered = surahs.filter((s) =>
    s.englishName.toLowerCase().includes(surahSearch.toLowerCase()) ||
    s.name.includes(surahSearch) ||
    String(s.number).includes(surahSearch)
  );
  const dhikr = DHIKR_LIST[dhikrIndex];
  const showPlayer = isPlaying || isLoadingAudio || progress > 0 || !!audioError;

  return (
    <View style={{ flex: 1 }}>
      {/* Blobs */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1 } as any}>
        {[
          { top: "-5%", left: "-10%", w: "65%", h: "55%", bg: "rgba(229,223,248,0.3)" },
          { bottom: "10%", right: "-10%", w: "55%", h: "45%", bg: "rgba(169,247,183,0.25)" },
        ].map((b, i) => (
          <View key={i} style={{ position: "absolute", ...(b.top ? { top: b.top } : { bottom: b.bottom }), ...(b.left ? { left: b.left } : { right: b.right }), width: b.w, height: b.h, backgroundColor: b.bg, borderRadius: 9999, opacity: 0.5, ...(Platform.OS === "web" ? ({ filter: "blur(90px)" } as any) : {}) } as any} />
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.4)", ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.2)" } as any) : {}) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>🧘</Text>
            </View>
            <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>Tafakkur Hub</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 32, paddingTop: 28, maxWidth: 680, alignSelf: "center", width: "100%" }}>

          {notice ? (
            <View style={[glass(16), { padding: 12, backgroundColor: "rgba(254,243,199,0.6)" }]}> 
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#7c2d12" }}>{notice}</Text>
            </View>
          ) : null}

          {/* Hero */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: "Newsreader", fontSize: 36, fontStyle: "italic", fontWeight: "600", color: "#2f3338", lineHeight: 44 }}>Tafakkur Hub</Text>
            <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#5b5f65", lineHeight: 22 }}>
              Contemplate the divine through recitation, reflection, and remembrance.
            </Text>
          </View>

          {/* Reciter Cards */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>Pilih Reciter</Text>
            {reciters.map((r, i) => (
              <TouchableOpacity key={i} onPress={() => { setActiveReciter(i); if (activeSurah) loadAndPlay(i, activeSurah); }} activeOpacity={0.85}
                style={[glass(20), { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, ...(activeReciter === i ? { backgroundColor: "rgba(169,247,183,0.18)", borderColor: "rgba(22,101,52,0.3)" } : {}) }]}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: r.bg, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: "800", color: "#fff" }}>{r.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 14, fontWeight: "700", color: "#2f3338" }}>{r.name}</Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65", marginTop: 2 }}>{r.origin} · {r.style}</Text>
                </View>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: activeReciter === i ? "#166534" : "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, color: activeReciter === i ? "#fff" : "#2f3338" }}>
                    {activeReciter === i && isPlaying ? "⏸" : "▶"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Surah Selector — ALL 114 */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Pilih Surah {surahs.length > 0 ? `(${surahs.length} surah)` : ""}
            </Text>
            {/* Search */}
            <View style={[glass(16), { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }]}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
              <TextInput
                value={surahSearch}
                onChangeText={setSurahSearch}
                placeholder="Cari surah... (nama/nomor)"
                placeholderTextColor="rgba(91,95,101,0.45)"
                style={{ flex: 1, fontFamily: "Plus Jakarta Sans", fontSize: 14, color: "#2f3338", ...(Platform.OS === "web" ? ({ outline: "none" } as any) : {}) }}
              />
            </View>
            {loadingSurahs ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator color="#166534" />
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65", marginTop: 8 }}>Memuat daftar surah...</Text>
              </View>
            ) : (
              // Outer View intentionally has NO overflow:hidden — it would block nested scroll on web.
              // Border radius is applied to the ScrollView's contentContainer instead.
              <View style={[glass(20)]}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={{
                    maxHeight: 420,
                    borderRadius: 20,
                    ...(Platform.OS === "web" ? ({ overflowY: "auto" } as any) : {}),
                  }}
                >
                  {filtered.map((s) => (
                    <TouchableOpacity
                      key={s.number}
                      onPress={() => { setActiveSurah(s); loadAndPlay(activeReciter, s); }}
                      style={{
                        flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14,
                        borderBottomWidth: 1, borderBottomColor: "rgba(174,178,185,0.15)",
                        backgroundColor: activeSurah?.number === s.number ? "rgba(169,247,183,0.2)" : "transparent",
                      }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: activeSurah?.number === s.number ? "#166534" : "rgba(229,223,248,0.5)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                        <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: activeSurah?.number === s.number ? "#fff" : "#524f63" }}>{s.number}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: "#2f3338" }}>{s.englishName}</Text>
                        <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65" }}>{s.versesCount} verses</Text>
                      </View>
                      <Text style={{ fontFamily: "Amiri", fontSize: 18, color: "#524f63" }}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Audio Player */}
          {showPlayer && activeSurah ? (
            <View style={[glass(24), { padding: 24, gap: 16 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 20 }}>🎵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: "#2f3338" }}>
                    {activeSurah.englishName} · {reciters[activeReciter]?.name || "Unknown Reciter"}
                  </Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: audioError ? "#991b1b" : "#5b5f65", marginTop: 2 }}>
                    {isLoadingAudio ? "Loading audio..." : audioError ? audioError : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={togglePlay} disabled={isLoadingAudio}
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#166534", alignItems: "center", justifyContent: "center" }}>
                  {isLoadingAudio ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 20, color: "#fff" }}>{isPlaying ? "⏸" : "▶"}</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={stopAudio} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>⏹</Text>
                </TouchableOpacity>
              </View>
              {!audioError && (
                <View style={{ height: 6, backgroundColor: "#eceef3", borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(progress, 100)}%` as any, height: "100%", backgroundColor: "#166534", borderRadius: 3 }} />
                </View>
              )}
            </View>
          ) : null}

          {/* Read & Reflect synced to selected surah */}
          <View style={[glass(24), { padding: 28, gap: 16, backgroundColor: "rgba(169,247,183,0.08)" }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#0e6030", fontWeight: "700", textAlign: "center" }}>
              Read & Reflect {activeSurah ? `· ${activeSurah.englishName}` : ""}
            </Text>
            <Text style={{ fontFamily: "Amiri", fontSize: 26, lineHeight: 50, color: "#2f3338", textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
              {readReflect?.arabicText || "Pilih surah untuk mulai membaca dan tafakkur"}
            </Text>
            <View style={{ height: 1, backgroundColor: "rgba(174,178,185,0.2)" }} />
            <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#2f3338", textAlign: "center", lineHeight: 26 }}>
              "{readReflect?.translation || "Pilih surah lalu baca perlahan, kemudian renungkan satu pelajaran yang bisa diamalkan hari ini."}"
            </Text>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#777b81", textAlign: "center" }}>
              — {readReflect?.verseKey || "Surah:Ayah"}
            </Text>
            {readReflect?.tafsirSnippet ? (
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65", lineHeight: 20, textAlign: "center" }}>
                {readReflect.tafsirSnippet}
              </Text>
            ) : null}
          </View>

          {/* Nature Sounds */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Ambient Sounds
            </Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {NATURE_SOUNDS.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  onPress={() => toggleNature(n.id)}
                  activeOpacity={0.85}
                  style={[
                    glass(16),
                    {
                      flexDirection: "row", alignItems: "center", gap: 8,
                      paddingHorizontal: 16, paddingVertical: 12, flex: 1, minWidth: 100,
                      ...(activeNature === n.id ? { backgroundColor: "rgba(169,247,183,0.25)", borderColor: "rgba(22,101,52,0.3)" } : {}),
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{n.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: activeNature === n.id ? "#0e6030" : "#2f3338" }}>
                      {n.label}
                    </Text>
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: "#5b5f65" }}>
                      {activeNature === n.id ? "Playing ◼" : "Tap to play"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dhikr Counter — di bawah */}
          <View style={[glass(28), { padding: 28, gap: 20, alignItems: "center" }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#5b5f65", fontWeight: "700" }}>
              Dhikr Counter
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {DHIKR_LIST.map((d, i) => (
                <TouchableOpacity key={i} onPress={() => { setDhikrIndex(i); setDhikrCount(0); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, backgroundColor: dhikrIndex === i ? "#166534" : "rgba(255,255,255,0.65)", borderWidth: 1, borderColor: dhikrIndex === i ? "#166534" : "rgba(174,178,185,0.3)" }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "600", color: dhikrIndex === i ? "#fff" : "#524f63" }}>{d.transliteration}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setDhikrCount((c) => c + 1)} activeOpacity={0.75}
              style={{ width: 148, height: 148, borderRadius: 74, backgroundColor: "rgba(169,247,183,0.2)", borderWidth: 2, borderColor: "rgba(22,101,52,0.2)", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 44, fontWeight: "800", color: "#0e6030" }}>{dhikrCount}</Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: "#5b5f65", textTransform: "uppercase", letterSpacing: 1 }}>Tap</Text>
            </TouchableOpacity>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ fontFamily: "Amiri", fontSize: 28, color: "#2f3338", textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
                {dhikr.arabic}
              </Text>
              <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#524f63" }}>{dhikr.transliteration}</Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65" }}>{dhikr.meaning}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setDhikrCount(0)} style={[glass(9999), { paddingHorizontal: 20, paddingVertical: 10 }]}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "600", color: "#524f63" }}>Reset</Text>
              </TouchableOpacity>
              <View style={[glass(9999), { paddingHorizontal: 20, paddingVertical: 10 }]}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: dhikrCount >= 33 ? "#166534" : "#5b5f65" }}>
                  {dhikrCount >= 33 ? `${Math.floor(dhikrCount / 33)}× 33 ✓` : `${33 - dhikrCount} lagi ke 33`}
                </Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
