import { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, TextInput,
} from "react-native";
import { Headphones } from "lucide-react-native";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG   = "#f0efeb";
const CARD = "#ffffff";
const GR   = "#166534";   // primary green
const TXT  = "#1a1a1a";
const SUB  = "#6b7280";
const BDR  = "#e5e7eb";

const card = (extra?: object) => ({
  backgroundColor: CARD,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: BDR,
  ...(Platform.OS === "web" ? ({ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" } as any) : {}),
  ...extra,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Reciter { id: number; name: string; subtitle: string; cdnId: string; initials: string; bg: string; }
interface Surah   { number: number; name: string; englishName: string; versesCount: number; }
interface Verse   { verseKey: string; arabic: string; translation: string; }

// ─── Static data ──────────────────────────────────────────────────────────────
const ALL_RECITERS: Reciter[] = [
  { id: 1,  name: "Mishary Rashid al-ʿAfasy",   subtitle: "RECITATION · MURATTAL", cdnId: "ar.alafasy",           initials: "MR", bg: "#2d5e3a" },
  { id: 2,  name: "Abu Bakr al-Shatri",              subtitle: "SAUDI · MURATTAL",      cdnId: "ar.shaatree",          initials: "AB", bg: "#1e4a5c" },
  { id: 3,  name: "AbdulBaset AbdulSamad",           subtitle: "EGYPT · MUJAWWAD",      cdnId: "ar.abdulsamad",        initials: "AA", bg: "#1e3a8a" },
  { id: 4,  name: "AbdulBaset AbdulSamad",           subtitle: "EGYPT · MURATTAL",      cdnId: "ar.abdulsamadmurattal",initials: "AA", bg: "#7c2d2d" },
  { id: 5,  name: "Abdur-Rahman as-Sudais",          subtitle: "RECITATION · MURATTAL", cdnId: "ar.abdurrahmansudais", initials: "AR", bg: "#1a4731" },
  { id: 6,  name: "Hani ar-Rifai",                   subtitle: "SAUDI · MURATTAL",      cdnId: "ar.hanirifai",         initials: "HA", bg: "#2d4a3e" },
  { id: 7,  name: "Maher Al-Muaiqly",                subtitle: "MADINAH · IMAM",        cdnId: "ar.mahermuaiqly",      initials: "MM", bg: "#1d4ed8" },
  { id: 8,  name: "Mohamed Siddiq al-Minshawi",      subtitle: "EGYPT · MURATTAL",      cdnId: "ar.minshawi",          initials: "MS", bg: "#334155" },
  { id: 9,  name: "Saud ash-Shuraym",                subtitle: "MAKKAH · IMAM",         cdnId: "ar.saudshuraym",       initials: "SS", bg: "#065f46" },
  { id: 10, name: "Saad Al-Ghamdi",                  subtitle: "SAUDI · MURATTAL",      cdnId: "ar.saadalghamdi",      initials: "SG", bg: "#1e40af" },
  { id: 11, name: "Yasser Al-Dosari",                subtitle: "SAUDI · MURATTAL",      cdnId: "ar.yasseraldossari",   initials: "YD", bg: "#9f1239" },
  { id: 12, name: "Salah Bukhatir",                  subtitle: "KUWAIT · MURATTAL",     cdnId: "ar.salahbukhAtir",     initials: "SB", bg: "#7e22ce" },
];

const INITIAL_SHOWN = 6;

const DHIKR_LIST = [
  { arabic: "سُبْحَانَ اللّهِ",           transliteration: "Subhanallah",      meaning: "Glory be to Allah" },
  { arabic: "الْحَمْدُ لِلّهِ",           transliteration: "Alhamdulillah",    meaning: "All praise is to Allah" },
  { arabic: "اللّهُ أَكْبَرُ",                transliteration: "Allahu Akbar",     meaning: "Allah is the Greatest" },
  { arabic: "لَا إِلَٰهَ إِلَّا اللّهُ", transliteration: "La ilaha illallah", meaning: "There is no god but Allah" },
];

const NATURE_SOUNDS = [
  { id: "rain",  label: "Rain of Calm",  emoji: "🌧️" },
  { id: "ocean", label: "Ocean Waves",   emoji: "🌊" },
  { id: "river", label: "Zamzam Flow",   emoji: "💧" },
  { id: "birds", label: "Dawn Garden",   emoji: "🐦" },
];
const SOUND_FILES: Record<string, string> = {
  rain: "/sounds/rain.mp3", ocean: "/sounds/ocean.mp3",
  river: "/sounds/river.mp3", birds: "/sounds/birds.mp3",
};

const SPEEDS = [1, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
function stripHtml(t: string) { return t.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(); }

// ─── Component ────────────────────────────────────────────────────────────────
export default function TafakkurHubScreen() {
  const [showAll, setShowAll]           = useState(false);
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
  const [speed, setSpeed]               = useState<Speed>(1);
  const [autoPlay, setAutoPlay]         = useState(true);
  const [dhikrIndex, setDhikrIndex]     = useState(0);
  const [dhikrCount, setDhikrCount]     = useState(0);
  const [activeNature, setActiveNature] = useState<string | null>(null);
  const [surahVerses, setSurahVerses]   = useState<Verse[]>([]);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);

  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const intervalRef   = useRef<any>(null);
  const ambientRef    = useRef<(() => void) | null>(null);
  const reqIdRef      = useRef(0);

  const reciters = showAll ? ALL_RECITERS : ALL_RECITERS.slice(0, INITIAL_SHOWN);
  const hiddenCount = ALL_RECITERS.length - INITIAL_SHOWN;

  // Load surahs
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("https://api.quran.com/api/v4/chapters?language=en");
        const data = await res.json();
        setSurahs((data.chapters || []).map((c: any) => ({
          number: Number(c.id), name: String(c.name_arabic || ""),
          englishName: String(c.name_simple || `Surah ${c.id}`),
          versesCount: Number(c.verses_count || 0),
        })));
      } catch {
        setSurahs(Array.from({ length: 114 }, (_, i) => ({ number: i + 1, name: "", englishName: `Surah ${i + 1}`, versesCount: 0 })));
      } finally {
        setLoadingSurahs(false);
      }
    })();
    return () => {
      audioRef.current?.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      ambientRef.current?.();
    };
  }, []);

  // Load verses when surah changes
  useEffect(() => {
    if (!activeSurah) { setSurahVerses([]); return; }
    setSurahVerses([]); setCurrentVerseIdx(0);
    (async () => {
      try {
        const res  = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${activeSurah.number}?language=en&words=false&fields=text_uthmani&translations=85,131&per_page=300`);
        const data = await res.json();
        setSurahVerses((data.verses || []).map((v: any) => ({
          verseKey: v.verse_key, arabic: v.text_uthmani || "",
          translation: stripHtml(v.translations?.find((t: any) => t.text?.trim())?.text || ""),
        })));
      } catch { setSurahVerses([]); }
    })();
  }, [activeSurah]);

  // Sync verse to audio progress
  useEffect(() => {
    if (surahVerses.length === 0) return;
    setCurrentVerseIdx(Math.min(Math.floor((progress / 100) * surahVerses.length), surahVerses.length - 1));
  }, [progress, surahVerses.length]);

  const stopAudio = useCallback(() => {
    reqIdRef.current++;
    audioRef.current?.pause();
    if (audioRef.current) { audioRef.current.src = ""; audioRef.current = null; }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false); setProgress(0); setCurrentTime(0); setDuration(0);
    setIsLoadingAudio(false); setAudioError(null);
  }, []);

  const loadAndPlay = useCallback(async (reciterIdx: number, surah: Surah) => {
    if (Platform.OS !== "web") return;
    const reciter = ALL_RECITERS[reciterIdx];
    if (!reciter) return;
    stopAudio();
    const id  = ++reqIdRef.current;
    setIsLoadingAudio(true);
    const url = `https://cdn.islamic.network/quran/audio/128/${reciter.cdnId}/${surah.number}.mp3`;
    const audio = new Audio(url);
    audioRef.current  = audio;
    audio.playbackRate = speed;
    audio.onloadedmetadata = () => { if (id === reqIdRef.current) setDuration(audio.duration || 0); };
    audio.oncanplay = () => {
      if (id !== reqIdRef.current) { audio.pause(); return; }
      setIsLoadingAudio(false);
      audio.play().then(() => {
        if (id !== reqIdRef.current) { audio.pause(); return; }
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
          if (audio.duration > 0) { setCurrentTime(audio.currentTime); setProgress((audio.currentTime / audio.duration) * 100); }
        }, 500);
      }).catch(() => { setIsLoadingAudio(false); setAudioError("Tap ▶ to start."); });
    };
    audio.onerror = () => {
      if (id === reqIdRef.current) { setIsLoadingAudio(false); setAudioError("Could not load audio."); }
    };
    audio.onended = () => {
      if (id !== reqIdRef.current) return;
      setIsPlaying(false); setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (autoPlay) {
        const nextIdx = surahs.findIndex(s => s.number === surah.number) + 1;
        if (nextIdx < surahs.length) { setActiveSurah(surahs[nextIdx]); loadAndPlay(reciterIdx, surahs[nextIdx]); }
      }
    };
    audio.load();
  }, [speed, autoPlay, surahs, stopAudio]);

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

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const toggleNature = (soundId: string) => {
    if (ambientRef.current) { ambientRef.current(); ambientRef.current = null; }
    if (activeNature === soundId) { setActiveNature(null); return; }
    if (Platform.OS !== "web") return;
    const url = SOUND_FILES[soundId];
    if (!url) return;
    const a = new Audio(url); a.loop = true; a.volume = 0.35;
    a.play().catch(() => {});
    ambientRef.current = () => { a.pause(); a.currentTime = 0; };
    setActiveNature(soundId);
  };

  const filtered = surahs.filter(s =>
    s.englishName.toLowerCase().includes(surahSearch.toLowerCase()) ||
    s.name.includes(surahSearch) || String(s.number).includes(surahSearch)
  );
  const dhikr = DHIKR_LIST[dhikrIndex];
  const showPlayer = isPlaying || isLoadingAudio || progress > 0 || !!audioError;
  const currentVerse = surahVerses[currentVerseIdx];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={{
          paddingHorizontal: 24, paddingVertical: 14, flexDirection: "row", alignItems: "center",
          backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BDR,
          ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 50 } as any) : {}),
        }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
            <Headphones size={18} color={GR} strokeWidth={1.8} />
          </View>
          <Text style={{ fontFamily: "Newsreader", fontSize: 20, fontStyle: "italic", fontWeight: "600", color: TXT }}>Tafakkur</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 24, maxWidth: 600, alignSelf: "center", width: "100%" }}>

          {/* ── Hero ── */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: "Newsreader", fontSize: 30, fontStyle: "italic", fontWeight: "600", color: TXT }}>Tafakkur</Text>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: SUB, lineHeight: 20 }}>
              Contemplate the divine through recitation, reflection, and remembrance.
            </Text>
          </View>

          {/* ── Getting Started ── */}
          <View style={[card(), { padding: 18, gap: 10 }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, fontWeight: "700", color: GR, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Getting Started
            </Text>
            {[
              "Select your preferred reciter below",
              "Choose a Surah to begin reflection",
              "Press play and configure auto-advance settings",
            ].map((step, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: GR, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{i + 1}</Text>
                </View>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#374151", flex: 1, lineHeight: 20 }}>{step}</Text>
              </View>
            ))}
          </View>

          {/* ── Curated Reciters ── */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, fontWeight: "700", color: SUB, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Curated Reciters
            </Text>
            {reciters.map((r, i) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => { setActiveReciter(i); if (activeSurah) loadAndPlay(i, activeSurah); }}
                activeOpacity={0.85}
                style={[card({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 }),
                  activeReciter === i ? { backgroundColor: "#f0fdf4", borderColor: "#86efac" } : {}]}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: r.bg, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 15, fontWeight: "800", color: "#fff" }}>{r.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: TXT }}>{r.name}</Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: SUB, marginTop: 2, letterSpacing: 0.5 }}>{r.subtitle}</Text>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: activeReciter === i ? GR : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14, color: activeReciter === i ? "#fff" : "#374151" }}>
                    {activeReciter === i && isPlaying ? "⏸" : "▶"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {!showAll ? (
              <TouchableOpacity onPress={() => setShowAll(true)} style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: GR, fontWeight: "600" }}>
                  View all reciters ({hiddenCount} more)
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setShowAll(false)} style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: SUB, fontWeight: "600" }}>Show less</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Surah Selector ── */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, fontWeight: "700", color: SUB, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Choose Surah {surahs.length > 0 ? `(${surahs.length} total)` : ""}
            </Text>
            <View style={[card({ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 })]}>
              <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
              <TextInput
                value={surahSearch} onChangeText={setSurahSearch}
                placeholder="Search surah by name or number..."
                placeholderTextColor="#9ca3af"
                style={{ flex: 1, fontFamily: "Plus Jakarta Sans", fontSize: 14, color: TXT, ...(Platform.OS === "web" ? ({ outline: "none" } as any) : {}) }}
              />
            </View>
            {loadingSurahs ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator color={GR} />
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: SUB, marginTop: 8 }}>Loading surahs...</Text>
              </View>
            ) : (
              <View style={[card({ overflow: "hidden" })]}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator
                  style={{ maxHeight: 380, ...(Platform.OS === "web" ? ({ overflowY: "auto" } as any) : {}) }}>
                  {filtered.map((s) => (
                    <TouchableOpacity
                      key={s.number}
                      onPress={() => { setActiveSurah(s); loadAndPlay(activeReciter, s); }}
                      style={{
                        flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13,
                        borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
                        backgroundColor: activeSurah?.number === s.number ? "#f0fdf4" : "transparent",
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: activeSurah?.number === s.number ? GR : "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: activeSurah?.number === s.number ? "#fff" : "#6b7280" }}>{s.number}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: TXT }}>{s.englishName}</Text>
                        {s.versesCount > 0 && <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: SUB }}>{s.versesCount} verses</Text>}
                      </View>
                      {s.name ? <Text style={{ fontFamily: "Amiri-Regular", fontSize: 16, color: "#524f63" }}>{s.name}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* ── Audio Player ── */}
          {showPlayer && activeSurah ? (
            <View style={[card({ padding: 16, gap: 12 }), { borderColor: "#d1fae5" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 18 }}>🎵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: TXT }}>
                    {activeSurah.englishName} · {ALL_RECITERS[activeReciter]?.name || ""}
                  </Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: audioError ? "#991b1b" : SUB, marginTop: 2 }}>
                    {isLoadingAudio ? "Loading audio..." : audioError ? audioError : `${fmt(currentTime)} / ${fmt(duration)}`}
                  </Text>
                </View>
                {/* Controls */}
                <TouchableOpacity onPress={togglePlay} disabled={isLoadingAudio}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: GR, alignItems: "center", justifyContent: "center" }}>
                  {isLoadingAudio ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 16, color: "#fff" }}>{isPlaying ? "⏸" : "▶"}</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={stopAudio}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14 }}>⏹</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cycleSpeed}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: "#374151" }}>{speed}x</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAutoPlay(v => !v)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: autoPlay ? GR : "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 16 }}>🔁</Text>
                </TouchableOpacity>
              </View>
              {!audioError && (
                <View style={{ height: 5, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(progress, 100)}%` as any, height: "100%", backgroundColor: GR, borderRadius: 3 }} />
                </View>
              )}
              {autoPlay && !audioError && (
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: SUB, textAlign: "center" }}>
                  Auto-play enabled: Will loop through all surahs
                </Text>
              )}
            </View>
          ) : null}

          {/* ── Read & Reflect ── */}
          <View style={[card({ padding: 24, gap: 14 })]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, fontWeight: "700", color: GR, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "center" }}>
              Read &amp; Reflect{activeSurah ? ` · ${activeSurah.englishName.toUpperCase()}` : ""}
            </Text>
            {currentVerse ? (
              <>
                <Text style={{ fontFamily: "Amiri-Regular", fontSize: 28, lineHeight: 52, color: TXT, textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
                  {currentVerse.arabic}
                </Text>
                <View style={{ height: 1, backgroundColor: BDR }} />
                <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#374151", textAlign: "center", lineHeight: 24 }}>
                  "{currentVerse.translation}"
                </Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: SUB, textAlign: "center", letterSpacing: 1 }}>
                  — {currentVerse.verseKey}{surahVerses.length > 0 ? `  ·  Verse ${currentVerseIdx + 1} of ${surahVerses.length}` : ""}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: "Amiri-Regular", fontSize: 26, lineHeight: 50, color: TXT, textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
                  {"فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ"}
                </Text>
                <View style={{ height: 1, backgroundColor: BDR }} />
                <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#374151", textAlign: "center", lineHeight: 24 }}>
                  "So which of the favors of your Lord would you deny?"
                </Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: SUB, textAlign: "center", letterSpacing: 1 }}>
                  {activeSurah ? "Loading verses..." : "Choose a surah to begin reading and reflecting."}
                </Text>
              </>
            )}
          </View>

          {/* ── Ambient Sounds ── */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, fontWeight: "700", color: SUB, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Ambient Sounds
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {NATURE_SOUNDS.map((n) => (
                <TouchableOpacity key={n.id} onPress={() => toggleNature(n.id)} activeOpacity={0.85}
                  style={[card({ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, flex: 1, minWidth: 100 }),
                    activeNature === n.id ? { backgroundColor: "#f0fdf4", borderColor: "#86efac" } : {}]}>
                  <Text style={{ fontSize: 16 }}>{n.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: activeNature === n.id ? GR : TXT }}>{n.label}</Text>
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: SUB }}>{activeNature === n.id ? "Playing ◼" : "Tap to play"}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Dhikr Counter ── */}
          <View style={[card({ padding: 24, gap: 18, alignItems: "center" })]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, fontWeight: "700", color: SUB, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Dhikr Counter
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {DHIKR_LIST.map((d, i) => (
                <TouchableOpacity key={i} onPress={() => { setDhikrIndex(i); setDhikrCount(0); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, backgroundColor: dhikrIndex === i ? GR : "#f3f4f6", borderWidth: 1, borderColor: dhikrIndex === i ? GR : BDR }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "600", color: dhikrIndex === i ? "#fff" : "#374151" }}>{d.transliteration}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setDhikrCount(c => c + 1)} activeOpacity={0.75}
              style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "#f0fdf4", borderWidth: 2, borderColor: "#86efac", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 42, fontWeight: "800", color: GR }}>{dhikrCount}</Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: SUB, textTransform: "uppercase", letterSpacing: 1 }}>TAP</Text>
            </TouchableOpacity>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontFamily: "Amiri-Regular", fontSize: 26, color: TXT, textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
                {dhikr.arabic}
              </Text>
              <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#524f63" }}>{dhikr.transliteration}</Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: SUB }}>{dhikr.meaning}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => setDhikrCount(0)} style={[card({ paddingHorizontal: 18, paddingVertical: 8 })]}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "600", color: "#374151" }}>Reset</Text>
              </TouchableOpacity>
              <View style={[card({ paddingHorizontal: 18, paddingVertical: 8 })]}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: dhikrCount >= 33 ? GR : SUB }}>
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
