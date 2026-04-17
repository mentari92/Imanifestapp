import { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, TextInput, Image,
} from "react-native";
import { Headphones } from "lucide-react-native";
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
  subtitle: string;
  style: string;
  initials: string;
  bg: string;
  photo: string;
}

// Quran.com CDN reciter photos
const RECITER_PHOTO_MAP: Record<number, string> = {
  7:  "https://static.qurancdn.com/images/reciters/7/profile-picture.jpg",
  1:  "https://static.qurancdn.com/images/reciters/1/profile-picture.jpg",
  3:  "https://static.qurancdn.com/images/reciters/3/profile-picture.jpg",
  10: "https://static.qurancdn.com/images/reciters/10/profile-picture.jpg",
  4:  "https://static.qurancdn.com/images/reciters/4/profile-picture.jpg",
};

const RECITER_COLORS = ["#7c3aed", "#0e6030", "#1d4ed8", "#92400e", "#334155"];

const FALLBACK_RECITERS: Reciter[] = [
  { id: 7, name: "Mishary Rashid Alafasy", subtitle: "114 Surahs", style: "Murattal", initials: "MA", bg: "#7c3aed", photo: RECITER_PHOTO_MAP[7] },
  { id: 1, name: "AbdulBaset AbdulSamad",  subtitle: "Egypt",      style: "Murattal", initials: "AB", bg: "#0e6030", photo: RECITER_PHOTO_MAP[1] },
  { id: 3, name: "Abdur-Rahman as-Sudais", subtitle: "Makkah Imam",style: "Murattal", initials: "AS", bg: "#1d4ed8", photo: RECITER_PHOTO_MAP[3] },
];

const DHIKR_LIST = [
  { arabic: "سُبْحَانَ ٱللَّٰهِ",           transliteration: "Subhanallah",      meaning: "Glory be to Allah" },
  { arabic: "ٱلْحَمْدُ لِلَّٰهِ",           transliteration: "Alhamdulillah",    meaning: "All praise is to Allah" },
  { arabic: "ٱللَّٰهُ أَكْبَرُ",            transliteration: "Allahu Akbar",     meaning: "Allah is the Greatest" },
  { arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", transliteration: "La ilaha illallah",meaning: "There is no god but Allah" },
];

interface Surah { number: number; name: string; englishName: string; versesCount: number; }
interface Verse  { verseKey: string; arabic: string; translation: string; }

const NATURE_SOUNDS = [
  { id: "rain",  label: "Rain of Sakinah",  emoji: "🌧️" },
  { id: "ocean", label: "Ocean Waves",      emoji: "🌊" },
  { id: "river", label: "Zamzam Flow",      emoji: "💧" },
  { id: "birds", label: "Dawn Garden",      emoji: "🐦" },
];

const SOUND_FILES: Record<string, string> = {
  rain:  "/sounds/rain.mp3",
  ocean: "/sounds/ocean.mp3",
  river: "/sounds/river.mp3",
  birds: "/sounds/birds.mp3",
};

const RECITER_CDN_MAP: Record<number, string> = {
  7: "ar.alafasy",
  1: "ar.abdulsamad",
  2: "ar.abdulsamad",
  3: "ar.sudais",
  4: "ar.shuraym",
  5: "ar.ibrahimakhdar",
  6: "ar.mahermuaiqly",
  9: "ar.minshawi",
  10: "ar.shuraym",
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}


export default function TafakkurHubScreen() {
  const [reciters, setReciters]         = useState<Reciter[]>(FALLBACK_RECITERS);
  const [surahs, setSurahs]             = useState<Surah[]>([]);
  const [surahSearch, setSurahSearch]   = useState("");
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [activeReciter, setActiveReciter] = useState(0);
  const [activeSurah, setActiveSurah]   = useState<Surah | null>(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError]     = useState<string | null>(null);
  const [progress, setProgress]         = useState(0);
  const [duration, setDuration]         = useState(0);
  const [currentTime, setCurrentTime]   = useState(0);
  const [dhikrIndex, setDhikrIndex]     = useState(0);
  const [dhikrCount, setDhikrCount]     = useState(0);
  const [activeNature, setActiveNature] = useState<string | null>(null);
  const [surahVerses, setSurahVerses]   = useState<Verse[]>([]);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
  const [photoErrors, setPhotoErrors]   = useState<Record<number, boolean>>({});

  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const intervalRef   = useRef<any>(null);
  const ambientStopRef = useRef<(() => void) | null>(null);
  const requestIdRef  = useRef(0); // cancels stale loadAndPlay calls

  // Load reciters + 114 surahs — try backend, fallback to Quran.com API directly
  useEffect(() => {
    const load = async () => {
      setLoadingSurahs(true);
      try {
        // Primary: try Quran.com API directly (CORS-friendly, always up-to-date)
        const [rRes, sRes] = await Promise.all([
          fetch("https://api.quran.com/api/v4/resources/recitations?language=en"),
          fetch("https://api.quran.com/api/v4/chapters?language=en"),
        ]);
        const rData = await rRes.json();
        const sData = await sRes.json();

        const TOP_IDS = [7, 3, 6, 1, 2, 4, 9, 5, 10, 8];
        const allRecitations: any[] = rData.recitations || [];
        const topRecitations = TOP_IDS
          .map((id) => allRecitations.find((r: any) => r.id === id))
          .filter(Boolean)
          .slice(0, 10);

        const mapped: Reciter[] = topRecitations.map((r: any, i: number) => {
          const name = String(r.reciter_name || "Unknown");
          const initials = name.split(" ").filter(Boolean).slice(0, 2)
            .map((p: string) => p[0]?.toUpperCase() || "").join("") || "QR";
          return {
            id: r.id,
            name,
            subtitle: String(r.style || "Murattal"),
            style: String(r.style || "Murattal"),
            initials,
            bg: RECITER_COLORS[i % RECITER_COLORS.length],
            photo: `https://static.qurancdn.com/images/reciters/${r.id}/profile-picture.jpg`,
          };
        });
        if (mapped.length > 0) setReciters(mapped);

        setSurahs((sData.chapters || []).map((c: any) => ({
          number: Number(c.id),
          name: String(c.name_arabic || ""),
          englishName: String(c.name_simple || `Surah ${c.id}`),
          versesCount: Number(c.verses_count || 0),
        })));
      } catch {
        setReciters(FALLBACK_RECITERS);
        setSurahs(Array.from({ length: 114 }, (_, i) => ({
          number: i + 1, name: "", englishName: `Surah ${i + 1}`, versesCount: 0,
        })));
      } finally {
        setLoadingSurahs(false);
      }
    };
    load();
    return () => {
      audioRef.current?.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      ambientStopRef.current?.();
    };
  }, []);

  // Fetch verses when surah changes (Quran Foundation API supports CORS)
  useEffect(() => {
    if (!activeSurah) { setSurahVerses([]); return; }
    setSurahVerses([]);
    setCurrentVerseIdx(0);
    (async () => {
      try {
        const res = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${activeSurah.number}?language=en&words=false&translations=85,131&per_page=300`
        );
        const data = await res.json();
        const verses: Verse[] = (data.verses || []).map((v: any) => {
          const raw = v.translations?.find((t: any) => t.text?.trim())?.text || "";
          return {
            verseKey: v.verse_key,
            arabic: v.text_uthmani || "",
            translation: stripHtml(raw),
          };
        });
        setSurahVerses(verses);
      } catch {
        setSurahVerses([]);
      }
    })();
  }, [activeSurah]);

  // Sync displayed verse with audio progress
  useEffect(() => {
    if (surahVerses.length === 0) return;
    const idx = Math.min(
      Math.floor((progress / 100) * surahVerses.length),
      surahVerses.length - 1
    );
    setCurrentVerseIdx(idx);
  }, [progress, surahVerses.length]);

  const stopAudio = useCallback(() => {
    requestIdRef.current++; // cancel any pending loadAndPlay
    audioRef.current?.pause();
    if (audioRef.current) { audioRef.current.src = ""; audioRef.current = null; }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false); setProgress(0); setCurrentTime(0); setDuration(0);
    setIsLoadingAudio(false); setAudioError(null);
  }, []);

  const loadAndPlay = async (reciterIdx: number, surah: Surah) => {
    if (Platform.OS !== "web") return;
    const reciter = reciters[reciterIdx];
    if (!reciter) return;

    stopAudio();
    const thisId = ++requestIdRef.current;
    setAudioError(null);
    setIsLoadingAudio(true);

    let url: string | null = null;
    try {
      const res = await api.get("/sakinah/audio", {
        params: { reciterId: reciter.id, surahNumber: surah.number },
        timeout: 10000,
      });
      url = res.data?.url ?? null;
    } catch { url = null; }

    // CDN fallback
    if (!url) {
      const id = RECITER_CDN_MAP[reciter.id] || "ar.alafasy";
      url = `https://cdn.islamic.network/quran/audio/128/${id}/${surah.number}.mp3`;
    }

    // Stale request — a newer surah was tapped
    if (thisId !== requestIdRef.current) return;

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => { if (thisId === requestIdRef.current) setDuration(audio.duration || 0); };
    audio.oncanplay = () => {
      if (thisId !== requestIdRef.current) { audio.pause(); return; }
      setIsLoadingAudio(false);
      audio.play().then(() => {
        if (thisId !== requestIdRef.current) { audio.pause(); return; }
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
          if (audio.duration > 0) {
            setCurrentTime(audio.currentTime);
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        }, 500);
      }).catch(() => { setIsLoadingAudio(false); setAudioError("Tap ▶ to start."); });
    };
    audio.onerror = () => { if (thisId === requestIdRef.current) { setIsLoadingAudio(false); setAudioError("Could not load audio."); } };
    audio.onended = () => { if (thisId === requestIdRef.current) { setIsPlaying(false); setProgress(100); if (intervalRef.current) clearInterval(intervalRef.current); } };
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
          const a = audioRef.current;
          if (a && a.duration > 0) { setCurrentTime(a.currentTime); setProgress((a.currentTime / a.duration) * 100); }
        }, 500);
      });
    }
  };

  const toggleNature = (soundId: string) => {
    if (ambientStopRef.current) { ambientStopRef.current(); ambientStopRef.current = null; }
    if (activeNature === soundId) { setActiveNature(null); return; }
    if (Platform.OS !== "web") return;
    const url = SOUND_FILES[soundId];
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.35;
    audio.play().catch(() => {});
    ambientStopRef.current = () => { audio.pause(); audio.currentTime = 0; };
    setActiveNature(soundId);
  };

  const filtered = surahs.filter((s) =>
    s.englishName.toLowerCase().includes(surahSearch.toLowerCase()) ||
    s.name.includes(surahSearch) || String(s.number).includes(surahSearch)
  );
  const dhikr = DHIKR_LIST[dhikrIndex];
  const showPlayer = isPlaying || isLoadingAudio || progress > 0 || !!audioError;
  const currentVerse = surahVerses[currentVerseIdx];

  return (
    <View style={{ flex: 1 }}>
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
        <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.4)", ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.2)" } as any) : {}) }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" }}>
            <Headphones size={20} color="#065f46" strokeWidth={1.8} />
          </View>
          <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e", marginLeft: 12 }}>Tafakkur Hub</Text>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 32, paddingTop: 28, maxWidth: 680, alignSelf: "center", width: "100%" }}>

          {/* Hero */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: "Newsreader", fontSize: 36, fontStyle: "italic", fontWeight: "600", color: "#2f3338", lineHeight: 44 }}>Tafakkur Hub</Text>
            <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#5b5f65", lineHeight: 22 }}>
              Contemplate the divine through recitation, reflection, and remembrance.
            </Text>
          </View>

          {/* Curated Reciters */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Curated Reciters
            </Text>
            {reciters.map((r, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setActiveReciter(i); if (activeSurah) loadAndPlay(i, activeSurah); }}
                activeOpacity={0.85}
                style={[glass(20), { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, ...(activeReciter === i ? { backgroundColor: "rgba(169,247,183,0.18)", borderColor: "rgba(22,101,52,0.3)" } : {}) }]}
              >
                {/* Photo or Initials fallback */}
                <View style={{ width: 60, height: 60, borderRadius: 30, overflow: "hidden", backgroundColor: r.bg }}>
                  {r.photo && !photoErrors[r.id] ? (
                    <Image
                      source={{ uri: r.photo }}
                      style={{ width: 60, height: 60, borderRadius: 30 } as any}
                      onError={() => setPhotoErrors((prev) => ({ ...prev, [r.id]: true }))}
                    />
                  ) : (
                    <View style={{ width: 60, height: 60, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: "800", color: "#fff" }}>{r.initials}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 14, fontWeight: "700", color: "#2f3338" }}>{r.name}</Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{r.subtitle}</Text>
                </View>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: activeReciter === i ? "#166534" : "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, color: activeReciter === i ? "#fff" : "#2f3338" }}>
                    {activeReciter === i && isPlaying ? "⏸" : "▶"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Surah Selector */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Choose Surah {surahs.length > 0 ? `(${surahs.length} total)` : ""}
            </Text>
            <View style={[glass(16), { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }]}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
              <TextInput
                value={surahSearch}
                onChangeText={setSurahSearch}
                placeholder="Search surah by name or number..."
                placeholderTextColor="rgba(91,95,101,0.45)"
                style={{ flex: 1, fontFamily: "Plus Jakarta Sans", fontSize: 14, color: "#2f3338", ...(Platform.OS === "web" ? ({ outline: "none" } as any) : {}) }}
              />
            </View>
            {loadingSurahs ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator color="#166534" />
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65", marginTop: 8 }}>Loading surahs...</Text>
              </View>
            ) : (
              <View style={[glass(20)]}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator
                  style={{ maxHeight: 420, borderRadius: 20, ...(Platform.OS === "web" ? ({ overflowY: "auto" } as any) : {}) }}
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
                        {s.versesCount > 0 && <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#5b5f65" }}>{s.versesCount} verses</Text>}
                      </View>
                      {s.name ? <Text style={{ fontFamily: "Amiri-Regular", fontSize: 18, color: "#524f63" }}>{s.name}</Text> : null}
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
                    {activeSurah.englishName} · {reciters[activeReciter]?.name || "Unknown"}
                  </Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: audioError ? "#991b1b" : "#5b5f65", marginTop: 2 }}>
                    {isLoadingAudio ? "Loading audio..." : audioError ? audioError : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={togglePlay} disabled={isLoadingAudio}
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#166534", alignItems: "center", justifyContent: "center" }}>
                  {isLoadingAudio ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 20, color: "#fff" }}>{isPlaying ? "⏸" : "▶"}</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={stopAudio}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center" }}>
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

          {/* Read & Reflect — synced verse display */}
          <View style={[glass(24), { padding: 28, gap: 16, backgroundColor: "rgba(169,247,183,0.08)" }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#0e6030", fontWeight: "700", textAlign: "center" }}>
              Read &amp; Reflect{activeSurah ? ` · ${activeSurah.englishName}` : ""}
            </Text>
            {currentVerse ? (
              <>
                <Text style={{ fontFamily: "Amiri-Regular", fontSize: 28, lineHeight: 54, color: "#2f3338", textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
                  {currentVerse.arabic}
                </Text>
                <View style={{ height: 1, backgroundColor: "rgba(174,178,185,0.2)" }} />
                <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#2f3338", textAlign: "center", lineHeight: 26 }}>
                  "{currentVerse.translation}"
                </Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#777b81", textAlign: "center" }}>
                  — {currentVerse.verseKey}
                  {surahVerses.length > 0 ? `  ·  verse ${currentVerseIdx + 1} of ${surahVerses.length}` : ""}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: "Amiri-Regular", fontSize: 26, lineHeight: 50, color: "#2f3338", textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
                  فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ
                </Text>
                <View style={{ height: 1, backgroundColor: "rgba(174,178,185,0.2)" }} />
                <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#2f3338", textAlign: "center", lineHeight: 26 }}>
                  "So which of the favors of your Lord would you deny?"
                </Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#777b81", textAlign: "center" }}>
                  {activeSurah ? "Loading verses..." : "Choose a surah to begin reading and reflecting."}
                </Text>
              </>
            )}
          </View>

          {/* Ambient Sounds */}
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
                  style={[glass(16), {
                    flexDirection: "row", alignItems: "center", gap: 8,
                    paddingHorizontal: 16, paddingVertical: 12, flex: 1, minWidth: 100,
                    ...(activeNature === n.id ? { backgroundColor: "rgba(169,247,183,0.25)", borderColor: "rgba(22,101,52,0.3)" } : {}),
                  }]}
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

          {/* Dhikr Counter */}
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
              <Text style={{ fontFamily: "Amiri-Regular", fontSize: 28, color: "#2f3338", textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
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
                  {dhikrCount >= 33 ? `${Math.floor(dhikrCount / 33)}× 33 ✓` : `${33 - dhikrCount} more to 33`}
                </Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
