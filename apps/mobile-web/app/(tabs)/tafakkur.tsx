import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, TextInput, Alert,
  useWindowDimensions,
} from "react-native";
import { MeditationIcon } from "../../components/shared/MeditationIcon";
import { apiGet, api } from "../../lib/api";

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
}

const RECITER_COLORS = [
  "#7c3aed",
  "#0e6030",
  "#1d4ed8",
  "#92400e",
  "#334155",
  "#065f46",
  "#7e22ce",
  "#0f766e",
  "#1e40af",
  "#9f1239",
];

const DHIKR_LIST = [
  { arabic: "سُبْحَانَ ٱللَّٰهِ", transliteration: "Subhanallah", meaning: "Glory be to Allah" },
  { arabic: "ٱلْحَمْدُ لِلَّٰهِ", transliteration: "Alhamdulillah", meaning: "All praise is to Allah" },
  { arabic: "ٱللَّٰهُ أَكْبَرُ", transliteration: "Allahu Akbar", meaning: "Allah is the Greatest" },
  { arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", transliteration: "La ilaha illallah", meaning: "There is no god but Allah" },
  { arabic: "أَسْتَغْفِرُ ٱللَّٰهَ", transliteration: "Astaghfirullah", meaning: "I seek forgiveness from Allah" },
];

interface Surah { number: number; name: string; englishName: string; versesCount: number; }
interface Verse { verseKey: string; arabic: string; translation: string; }

const NATURE_SOUNDS = [
  { id: "rain", label: "Rain of Calm", emoji: "🌧️" },
  { id: "ocean", label: "Ocean Waves", emoji: "🌊" },
  { id: "river", label: "Zamzam Flow", emoji: "💧" },
  { id: "birds", label: "Dawn Garden", emoji: "🐦" },
];

const SOUND_FILES: Record<string, string> = {
  rain: "/sounds/rain.mp3",
  ocean: "/sounds/ocean.mp3",
  river: "/sounds/river.mp3",
  birds: "/sounds/birds.mp3",
};

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5] as const;
const MAX_VISIBLE_RECITERS = 6;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}


export default function TafakkurHubScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [loadingReciters, setLoadingReciters] = useState(true);
  const [recitersError, setRecitersError] = useState<string | null>(null);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [surahSearch, setSurahSearch] = useState("");
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [surahsError, setSurahsError] = useState<string | null>(null);
  const [activeReciter, setActiveReciter] = useState(0);
  const [activeSurah, setActiveSurah] = useState<Surah | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [dhikrCount, setDhikrCount] = useState(0);
  const [activeNature, setActiveNature] = useState<string | null>(null);
  const [surahVerses, setSurahVerses] = useState<Verse[]>([]);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);
  const [autoPlayMode, setAutoPlayMode] = useState<'stop' | 'loop'>('loop');
  const [versesSurahNumber, setVersesSurahNumber] = useState<number | null>(null);
  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<string>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [readMode, setReadMode] = useState(false);

  const handleBookmark = useCallback(async (verseKey: string) => {
    if (bookmarkInFlightRef.current) return;
    if (bookmarkedVerses.has(verseKey)) {
      Alert.alert('Already bookmarked', `${verseKey} is already in your Quran.com bookmarks.`);
      return;
    }
    bookmarkInFlightRef.current = true;
    setBookmarkLoading(true);
    try {
      const res = await api.post('/auth/quran/bookmark', { verseKey });
      if (res.data?.success) {
        setBookmarkedVerses((prev) => new Set([...prev, verseKey]));
        Alert.alert('Bookmarked ✓', `Ayah ${verseKey} saved to your Quran.com account.`);
      } else {
        Alert.alert('Not saved', res.data?.message || 'Please login with Quran.com to bookmark verses.');
      }
    } catch {
      Alert.alert('Not saved', 'Please login with Quran.com to bookmark verses.');
    } finally {
      bookmarkInFlightRef.current = false;
      setBookmarkLoading(false);
    }
  }, [bookmarkedVerses]);
  const [showAllReciters, setShowAllReciters] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<any>(null);
  const ambientStopRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);
  const audioUrlCacheRef = useRef<Record<string, { url: string; reciterIdUsed: number }>>({});
  const scrubProgressRef = useRef<number | null>(null);
  const autoPlayModeRef = useRef(autoPlayMode);
  const bookmarkInFlightRef = useRef(false);
  const loadAndPlayVersesRef = useRef<(reciterIdx: number, surah: Surah, startIdx: number) => void>(() => {});

  useEffect(() => { autoPlayModeRef.current = autoPlayMode; }, [autoPlayMode]);

  const toInitials = (name: string) => {
    const words = name
      .replace(/[^A-Za-z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (words.length === 0) return "QR";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  const loadReciters = useCallback(async () => {
    setLoadingReciters(true);
    setRecitersError(null);
    try {
      const response = await apiGet<{ data: Array<{ id: number; name: string; subtitle?: string; style?: string }> }>(
        "/tafakkur/reciters",
      );

      const normalizeReciterName = (value: string) =>
        value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

      const reciterPriority = (reciter: { name: string }) => {
        const name = normalizeReciterName(reciter.name);
        if (name.includes("mishari") && name.includes("afasy")) return 0;
        if (name.includes("abu bakr") && name.includes("shatri")) return 1;
        return 2;
      };

      const ordered = [...(response.data || [])].sort((a, b) => {
        const byPriority = reciterPriority(a) - reciterPriority(b);
        if (byPriority !== 0) return byPriority;
        return a.name.localeCompare(b.name);
      });

      const mapped: Reciter[] = ordered.map((r, index) => ({
        id: r.id,
        name: r.name,
        subtitle: r.subtitle || `Recitation · ${r.style || "Murattal"}`,
        style: r.style || "Murattal",
        initials: toInitials(r.name),
        bg: RECITER_COLORS[index % RECITER_COLORS.length],
      }));

      setReciters(mapped);
      setActiveReciter(0);
      setShowAllReciters(false);
    } catch {
      setReciters([]);
      setRecitersError("Unable to load reciters right now.");
    } finally {
      setLoadingReciters(false);
    }
  }, []);

  const loadSurahs = useCallback(async () => {
    setLoadingSurahs(true);
    setSurahsError(null);
    try {
      const res = await fetch("https://api.quran.com/api/v4/chapters?language=en");
      const data = await res.json();
      const mappedSurahs = (data.chapters || []).map((c: any) => ({
        number: Number(c.id),
        name: String(c.name_arabic || ""),
        englishName: String(c.name_simple || `Surah ${c.id}`),
        versesCount: Number(c.verses_count || 0),
      }));

      if (mappedSurahs.length === 0) {
        setSurahsError("Surah list is currently unavailable.");
        setSurahs(Array.from({ length: 114 }, (_, i) => ({
          number: i + 1, name: "", englishName: `Surah ${i + 1}`, versesCount: 0,
        })));
        return;
      }

      setSurahs(mappedSurahs);
    } catch {
      setSurahsError("Unable to load surahs right now.");
      setSurahs(Array.from({ length: 114 }, (_, i) => ({
        number: i + 1, name: "", englishName: `Surah ${i + 1}`, versesCount: 0,
      })));
    } finally {
      setLoadingSurahs(false);
    }
  }, []);

  const fetchVersesByChapter = useCallback(async (surahNum: number, signal?: AbortSignal): Promise<Verse[]> => {
    const res = await fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?language=en&words=false&fields=text_uthmani&translations=85,131&per_page=300`,
      signal ? { signal } : undefined,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.verses || []).map((v: any) => {
      const raw = (v.translations as any[])?.find((t: any) => t.text?.trim())?.text || "";
      return { verseKey: String(v.verse_key), arabic: String(v.text_uthmani || ""), translation: stripHtml(raw) };
    });
  }, []);

  // Load reciters and 114 surahs
  useEffect(() => {
    void loadReciters();
    void loadSurahs();
    return () => {
      audioRef.current?.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      ambientStopRef.current?.();
    };
  }, [loadReciters, loadSurahs]);

  useEffect(() => {
    if (!activeSurah) { setSurahVerses([]); setVersesSurahNumber(null); return; }
    setSurahVerses([]);
    setVersesSurahNumber(null);
    setCurrentVerseIdx(0);
    const surahNum = activeSurah.number;
    const controller = new AbortController();
    fetchVersesByChapter(surahNum, controller.signal).then((verses) => {
      setSurahVerses(verses);
      setVersesSurahNumber(surahNum);
    }).catch((err) => {
      if (err?.name === 'AbortError') return;
      setSurahVerses([]);
      setVersesSurahNumber(null);
    });
    return () => controller.abort();
  }, [activeSurah, fetchVersesByChapter]);

  useEffect(() => {
    if (pendingPlay && surahVerses.length > 0 && activeSurah && versesSurahNumber === activeSurah.number) {
      setPendingPlay(false);
      loadAndPlayVersesRef.current(activeReciter, activeSurah, 0);
    }
  }, [surahVerses, pendingPlay, versesSurahNumber, activeReciter, activeSurah]);

  const stopAudio = useCallback(() => {
    requestIdRef.current++;
    audioRef.current?.pause();
    if (audioRef.current) { audioRef.current.src = ""; audioRef.current = null; }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false); setProgress(0); setCurrentTime(0); setDuration(0);
    setIsLoadingAudio(false); setAudioError(null); setPendingPlay(false);
  }, []);

  const fetchVerseAudioUrl = useCallback(async (reciterId: number, ayahKey: string) => {
    const cacheKey = `${reciterId}:${ayahKey}`;
    const fromCache = audioUrlCacheRef.current[cacheKey];
    if (fromCache) {
      return fromCache;
    }

    const response = await apiGet<{ url: string; reciterIdUsed: number; fallbackUsed: boolean }>(
      "/tafakkur/verse-audio-url",
      { reciterId: String(reciterId), ayahKey },
    );

    const value = { url: response.url, reciterIdUsed: response.reciterIdUsed };
    audioUrlCacheRef.current[cacheKey] = value;
    return value;
  }, []);

  const loadAndPlayVerses = useCallback((reciterIdx: number, _surah: Surah, startIdx: number) => {
    if (Platform.OS !== "web") return;
    const reciter = reciters[reciterIdx];
    if (!reciter) return;

    const thisId = ++requestIdRef.current;
    setAudioError(null);
    setIsLoadingAudio(true);
    setIsPlaying(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (intervalRef.current) clearInterval(intervalRef.current);

    const initialVerses = surahVerses;
    if (initialVerses.length === 0) { setIsLoadingAudio(false); return; }

    // playVerse accepts verses explicitly — avoids stale closure when autoplay advances surahs
    const playVerse = async (idx: number, verses: Verse[]) => {
      if (thisId !== requestIdRef.current || idx >= verses.length) {
        setIsPlaying(false);
        setIsLoadingAudio(false);
        if (idx >= verses.length) setProgress(100);
        return;
      }
      setCurrentVerseIdx(idx);
      setCurrentTime(0);
      setDuration(0);
      setProgress(Math.round((idx / Math.max(verses.length, 1)) * 100));

      const verse = verses[idx];
      let resolved: { url: string; reciterIdUsed: number };
      try {
        resolved = await fetchVerseAudioUrl(reciter.id, verse.verseKey);
      } catch {
        setIsLoadingAudio(false);
        if (thisId === requestIdRef.current) setTimeout(() => playVerse(idx + 1, verses), 300);
        return;
      }

      if (resolved.reciterIdUsed !== reciter.id) {
        const fallbackReciterIndex = reciters.findIndex((r) => r.id === resolved.reciterIdUsed);
        if (fallbackReciterIndex >= 0) setActiveReciter(fallbackReciterIndex);
      }

      const audio = new Audio(resolved.url);
      audio.playbackRate = playbackRate;
      audioRef.current = audio;

      audio.oncanplay = () => {
        if (thisId !== requestIdRef.current) { audio.pause(); audio.src = ""; return; }
        setIsLoadingAudio(false);
        audio.play().then(() => {
          if (thisId !== requestIdRef.current) { audio.pause(); return; }
          setIsPlaying(true);
          intervalRef.current = setInterval(() => {
            if (audio.duration > 0) {
              setCurrentTime(audio.currentTime);
              setDuration(audio.duration);
              const totalVerses = Math.max(verses.length, 1);
              const verseFraction = idx / totalVerses;
              const inVerseFraction = (audio.currentTime / audio.duration) / totalVerses;
              setProgress(Math.min(100, Math.max(0, Math.round((verseFraction + inVerseFraction) * 100))));
            }
          }, 300);
        }).catch(() => {
          setIsLoadingAudio(false);
          if (thisId === requestIdRef.current) setTimeout(() => playVerse(idx + 1, verses), 300);
        });
      };
      audio.onended = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (thisId !== requestIdRef.current) return;

        if (idx + 1 < verses.length) {
          // Continue to next verse in same surah
          playVerse(idx + 1, verses);
          return;
        }

        // End of surah — read autoPlayMode from ref to avoid stale closure
        if (autoPlayModeRef.current !== 'loop') {
          setIsPlaying(false);
          setIsLoadingAudio(false);
          setProgress(100);
          return;
        }

        const nextSurahNum = _surah.number === 114 ? 1 : _surah.number + 1;
        const nextSurah = surahs.find(s => s.number === nextSurahNum);
        if (!nextSurah) { setIsPlaying(false); setIsLoadingAudio(false); setProgress(100); return; }

        setActiveSurah(nextSurah);
        setCurrentVerseIdx(0);
        setProgress(0);
        setIsLoadingAudio(true);
        setIsPlaying(false);

        fetchVersesByChapter(nextSurah.number).then((nextVerses) => {
          if (thisId !== requestIdRef.current) return;
          setSurahVerses(nextVerses);
          setVersesSurahNumber(nextSurah.number);
          playVerse(0, nextVerses);
        }).catch(() => {
          if (thisId !== requestIdRef.current) return;
          setIsLoadingAudio(false);
          setIsPlaying(false);
        });
      };
      audio.onerror = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsLoadingAudio(false);
        if (thisId === requestIdRef.current) setTimeout(() => playVerse(idx + 1, verses), 200);
      };
      audio.load();
    };

    playVerse(startIdx, initialVerses);
  }, [fetchVerseAudioUrl, fetchVersesByChapter, playbackRate, reciters, surahVerses, surahs]);

  useEffect(() => { loadAndPlayVersesRef.current = loadAndPlayVerses; }, [loadAndPlayVerses]);

  const seekToProgressFraction = useCallback((fraction: number) => {
    if (!activeSurah || surahVerses.length === 0) return;
    const clamped = Math.min(1, Math.max(0, fraction));
    const targetIdx = Math.min(
      surahVerses.length - 1,
      Math.floor(clamped * surahVerses.length),
    );
    setCurrentVerseIdx(targetIdx);
    setProgress(Math.round(clamped * 100));
    loadAndPlayVerses(activeReciter, activeSurah, targetIdx);
  }, [activeReciter, activeSurah, loadAndPlayVerses, surahVerses.length]);

  const clampSeekFraction = useCallback((x: number) => {
    if (progressBarWidth <= 0) return 0;
    return Math.min(1, Math.max(0, x / progressBarWidth));
  }, [progressBarWidth]);

  const previewSeekFraction = useCallback((x: number) => {
    const nextFraction = clampSeekFraction(x);
    const nextProgress = Math.round(nextFraction * 100);
    scrubProgressRef.current = nextProgress;
    setScrubProgress(nextProgress);
    return nextFraction;
  }, [clampSeekFraction]);

  const commitSeekFromX = useCallback((x: number) => {
    const nextFraction = previewSeekFraction(x);
    scrubProgressRef.current = null;
    setScrubProgress(null);
    seekToProgressFraction(nextFraction);
  }, [previewSeekFraction, seekToProgressFraction]);

  const cyclePlaybackRate = useCallback(() => {
    const idx = PLAYBACK_SPEEDS.findIndex((s) => s === playbackRate);
    const next = PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  }, [playbackRate]);

  const togglePlay = useCallback(() => {
    if (reciters.length === 0) {
      setAudioError("No reciter available for playback.");
      return;
    }

    if (!activeSurah) {
      setAudioError("Please select a surah first.");
      return;
    }

    if (!audioRef.current?.src && activeSurah) {
      if (surahVerses.length > 0) {
        loadAndPlayVerses(activeReciter, activeSurah, currentVerseIdx);
      } else {
        setPendingPlay(true);
      }
      return;
    }
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      audioRef.current?.play().then(() => {
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
          const a = audioRef.current;
          if (a && a.duration > 0) { setCurrentTime(a.currentTime); setDuration(a.duration); }
        }, 300);
      });
    }
  }, [reciters, activeSurah, surahVerses, activeReciter, currentVerseIdx, isPlaying, loadAndPlayVerses]);

  const toggleNature = (soundId: string) => {
    const url = SOUND_FILES[soundId];
    if (activeNature === soundId) {
      ambientStopRef.current?.();
      ambientStopRef.current = null;
      setActiveNature(null);
      return;
    }
    if (!url || Platform.OS !== "web") return;
    ambientStopRef.current?.();
    ambientStopRef.current = null;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.35;
    audio.play().catch(() => { });
    ambientStopRef.current = () => { audio.pause(); audio.currentTime = 0; };
    setActiveNature(soundId);
  };

  const normalize = useCallback((s: string) => s.toLowerCase().replace(/[-'\u2019]/g, ' ').replace(/\s+/g, ' ').trim(), []);
  const filtered = useMemo(() => surahs.filter((s) =>
    normalize(s.englishName).includes(normalize(surahSearch)) ||
    s.name.includes(surahSearch) ||
    String(s.number).includes(surahSearch)
  ), [surahs, surahSearch, normalize]);
  const dhikr = DHIKR_LIST[dhikrIndex];
  const showPlayer = isPlaying || isLoadingAudio || progress > 0 || !!audioError;
  const currentVerse = surahVerses[currentVerseIdx];
  const visibleProgress = scrubProgress ?? progress;
  const reciterItems = reciters.map((reciter, index) => ({ reciter, index }));
  const visibleReciterItems = showAllReciters
    ? reciterItems
    : reciterItems.slice(0, MAX_VISIBLE_RECITERS);

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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 180, paddingHorizontal: isCompact ? 16 : 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: isCompact ? 16 : 24, paddingVertical: isCompact ? 12 : 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.4)", ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.2)" } as any) : {}) }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" }}>
            <MeditationIcon size={20} color="#065f46" />
          </View>
          <Text style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>Tafakkur</Text>
          <View style={{ width: 40, height: 40 }} />
        </View>

        <View style={{ paddingHorizontal: 0, gap: isCompact ? 24 : 32, paddingTop: 28, maxWidth: 680, alignSelf: "center", width: "100%" }}>

          {/* Hero */}
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: "Newsreader", fontSize: isCompact ? 28 : 36, fontStyle: "italic", fontWeight: "600", color: "#2f3338", lineHeight: isCompact ? 34 : 44 }}>Tafakkur</Text>
            <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#5b5f65", lineHeight: 22 }}>
              Contemplate the divine through recitation, reflection, and remembrance.
            </Text>
          </View>

          {/* Setup Instructions */}
          <View style={[glass(20), { padding: isCompact ? 16 : 20, gap: 12, backgroundColor: "rgba(169,247,183,0.08)" }]}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "700", color: "#0e6030" }}>
              Getting Started:
            </Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: "800", color: "#166534" }}>1</Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#2f3338", flex: 1, lineHeight: 18 }}>Select your preferred reciter below</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: "800", color: "#166534" }}>2</Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#2f3338", flex: 1, lineHeight: 18 }}>Choose a Surah to begin reflection</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 16, fontWeight: "800", color: "#166534" }}>3</Text>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#2f3338", flex: 1, lineHeight: 18 }}>In Listen mode, press play to hear each verse. In Read mode, browse all verses at your own pace — audio is optional</Text>
              </View>
            </View>
          </View>

          {/* Curated Reciters */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#5b5f65", fontWeight: "700" }}>
              Curated Reciters
            </Text>
            {loadingReciters ? (
              <View style={[glass(20), { padding: isCompact ? 16 : 20, flexDirection: "row", alignItems: "center", gap: 10 }]}>
                <ActivityIndicator color="#166534" />
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65" }}>
                  Loading reciters...
                </Text>
              </View>
            ) : reciters.length === 0 ? (
              <View style={[glass(20), { padding: isCompact ? 16 : 20 }]}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#991b1b" }}>
                  {recitersError || "Reciters are unavailable. Please try again shortly."}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadReciters()}
                  activeOpacity={0.85}
                  style={[glass(999), { marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8 }]}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: "#0e6030" }}>
                    Retry reciters
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {visibleReciterItems.map(({ reciter: r, index: i }) => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => { setActiveReciter(i); if (activeSurah && surahVerses.length > 0) loadAndPlayVerses(i, activeSurah, 0); }}
                    activeOpacity={0.85}
                    style={[glass(20), { flexDirection: "row", alignItems: "center", gap: 16, padding: isCompact ? 14 : 18, ...(activeReciter === i ? { backgroundColor: "rgba(169,247,183,0.18)", borderColor: "rgba(22,101,52,0.3)" } : {}) }]}
                  >
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: r.bg, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 18, fontWeight: "800", color: "#fff" }}>{r.initials}</Text>
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
                {reciters.length > MAX_VISIBLE_RECITERS ? (
                  <TouchableOpacity
                    onPress={() => setShowAllReciters((prev) => !prev)}
                    activeOpacity={0.85}
                    style={[glass(14), { paddingVertical: 10, alignItems: "center", justifyContent: "center" }]}
                  >
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "700", color: "#166534" }}>
                      {showAllReciters
                        ? "Hide reciters"
                        : `View all reciters (${reciters.length - MAX_VISIBLE_RECITERS} more)`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
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
                {surahsError ? (
                  <View style={{ padding: 16 }}>
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#991b1b" }}>
                      {surahsError}
                    </Text>
                    <TouchableOpacity
                      onPress={() => void loadSurahs()}
                      activeOpacity={0.85}
                      style={[glass(999), { marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8 }]}
                    >
                      <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: "#0e6030" }}>
                        Retry surah list
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator
                  style={{ maxHeight: 420, borderRadius: 20, ...(Platform.OS === "web" ? ({ overflowY: "auto" } as any) : {}) }}
                >
                  {filtered.map((s) => (
                    <TouchableOpacity
                      key={s.number}
                      onPress={() => { setActiveSurah(s); stopAudio(); setCurrentVerseIdx(0); setSurahVerses([]); if (!readMode) setPendingPlay(true); }}
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
          {(showPlayer || !activeSurah) && (
            <View style={[glass(24), { padding: isCompact ? 16 : 24, gap: 16, opacity: !activeSurah ? 0.6 : 1 }]}>
              {/* Track info */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 20 }}>🎵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: "#2f3338" }}>
                    {activeSurah ? `${activeSurah.englishName} · ${reciters[activeReciter]?.name || "Unknown"}` : "Select a surah to begin"}
                  </Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: audioError ? "#991b1b" : !activeSurah ? "#5b5f65" : "#5b5f65", marginTop: 2 }}>
                    {!activeSurah ? "👉 Choose a surah from the list above" : isLoadingAudio ? "Loading audio..." : audioError ? audioError : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                  </Text>
                </View>
              </View>
              {/* Player controls — wrap on small screens */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <TouchableOpacity onPress={togglePlay} disabled={!activeSurah || isLoadingAudio}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: !activeSurah ? "#c5c5c5" : "#166534", alignItems: "center", justifyContent: "center" }}>
                  {isLoadingAudio ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 18, color: "#fff" }}>{isPlaying ? "⏸" : "▶"}</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={stopAudio}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 16 }}>⏹</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cyclePlaybackRate}
                  style={{ height: 34, borderRadius: 17, backgroundColor: "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: "#2f3338" }}>{playbackRate}x</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAutoPlayMode(autoPlayMode === 'stop' ? 'loop' : 'stop')}
                  style={{ height: 34, borderRadius: 17, backgroundColor: autoPlayMode === 'loop' ? "rgba(22,165,52,0.3)" : "rgba(229,223,248,0.6)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: autoPlayMode === 'loop' ? "rgba(22,165,52,0.5)" : "transparent" }}>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: autoPlayMode === 'loop' ? "#0e6030" : "#524f63" }}>
                    {autoPlayMode === 'loop' ? '🔁 Auto' : '⏭ Auto'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Auto-play info */}
              <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: autoPlayMode === 'loop' ? "rgba(169,247,183,0.1)" : "rgba(229,223,248,0.1)", borderRadius: 12 }}>
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, color: autoPlayMode === 'loop' ? "#0e6030" : "#524f63", textAlign: "center" }}>
                  {autoPlayMode === 'loop' ? '🔁 Auto-play enabled: Will loop through all surahs' : '⏭ Auto-play disabled: Will stop at end of surah'}
                </Text>
              </View>
              {!audioError && (
                <View
                  onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    previewSeekFraction(e.nativeEvent.locationX || 0);
                  }}
                  onResponderMove={(e) => {
                    previewSeekFraction(e.nativeEvent.locationX || 0);
                  }}
                  onResponderRelease={(e) => {
                    commitSeekFromX(e.nativeEvent.locationX || 0);
                  }}
                  onResponderTerminate={() => {
                    scrubProgressRef.current = null;
                    setScrubProgress(null);
                  }}
                  style={{ height: 28, justifyContent: "center" }}
                >
                  <View style={{ height: 6, backgroundColor: "#eceef3", borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ width: `${Math.min(visibleProgress, 100)}%` as any, height: "100%", backgroundColor: "#166534", borderRadius: 3 }} />
                  </View>
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: `${Math.min(visibleProgress, 100)}%` as any,
                      marginLeft: -9,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: "#ffffff",
                      borderWidth: 2,
                      borderColor: "#166534",
                      top: 5,
                      shadowColor: "#166534",
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    }}
                  />
                </View>
              )}
            </View>
          )}

          {/* Read & Reflect */}
          <View style={[glass(24), { padding: isCompact ? 18 : 28, gap: 16, backgroundColor: "rgba(169,247,183,0.08)" }]}>
            {/* Header + Listen/Read toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#0e6030", fontWeight: "700" }}>
                Read &amp; Reflect{activeSurah ? ` · ${activeSurah.englishName}` : ""}
              </Text>
              <View style={{ flexDirection: "row", backgroundColor: "rgba(229,223,248,0.5)", borderRadius: 20, padding: 3 }}>
                <TouchableOpacity
                  onPress={() => setReadMode(false)}
                  activeOpacity={0.85}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: !readMode ? "#166534" : "transparent" }}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: !readMode ? "#fff" : "#5b5f65" }}>Listen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setReadMode(true)}
                  activeOpacity={0.85}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: readMode ? "#166534" : "transparent" }}
                >
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: readMode ? "#fff" : "#5b5f65" }}>Read</Text>
                </TouchableOpacity>
              </View>
            </View>

            {readMode ? (
              surahVerses.length > 0 ? (
                <View style={{ gap: 0 }}>
                  {surahVerses.map((verse, idx) => {
                    const isCurrentPlaying = isPlaying && idx === currentVerseIdx;
                    return (
                      <View
                        key={verse.verseKey}
                        style={{
                          gap: 12,
                          paddingVertical: 20,
                          paddingHorizontal: 4,
                          borderBottomWidth: idx < surahVerses.length - 1 ? 1 : 0,
                          borderBottomColor: "rgba(174,178,185,0.2)",
                          borderRadius: 12,
                          backgroundColor: isCurrentPlaying ? "rgba(169,247,183,0.2)" : "transparent",
                        }}
                      >
                        <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#777b81", textAlign: "center" }}>
                          {verse.verseKey}{isCurrentPlaying ? "  · ▶ playing" : ""}
                        </Text>
                        <Text style={{ fontFamily: "Amiri-Regular", fontSize: 26, lineHeight: 50, color: "#2f3338", textAlign: "center", ...(Platform.OS === "web" ? ({ direction: "rtl" } as any) : {}) }}>
                          {verse.arabic}
                        </Text>
                        <View style={{ height: 1, backgroundColor: "rgba(174,178,185,0.15)" }} />
                        <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#2f3338", textAlign: "center", lineHeight: 24 }}>
                          "{verse.translation}"
                        </Text>
                        <TouchableOpacity
                          onPress={() => void handleBookmark(verse.verseKey)}
                          disabled={bookmarkLoading}
                          style={{
                            alignSelf: "center",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: bookmarkedVerses.has(verse.verseKey) ? "rgba(22,101,52,0.15)" : "rgba(169,247,183,0.2)",
                            borderWidth: 1,
                            borderColor: bookmarkedVerses.has(verse.verseKey) ? "rgba(22,101,52,0.4)" : "rgba(169,247,183,0.5)",
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={{ fontSize: 12 }}>{bookmarkedVerses.has(verse.verseKey) ? "🔖" : "📖"}</Text>
                          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, fontWeight: "700", color: "#0e6030" }}>
                            {bookmarkedVerses.has(verse.verseKey) ? "Saved to Quran.com" : "Bookmark"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : activeSurah ? (
                <View style={{ alignItems: "center", paddingVertical: 24, gap: 10 }}>
                  <ActivityIndicator color="#166534" />
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65" }}>Loading verses...</Text>
                </View>
              ) : (
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65", textAlign: "center", paddingVertical: 12 }}>
                  Choose a surah above to start reading.
                </Text>
              )
            ) : (
              // Listen mode: single verse synced to audio position
              currentVerse ? (
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
                  <TouchableOpacity
                    onPress={() => void handleBookmark(currentVerse.verseKey)}
                    disabled={bookmarkLoading}
                    style={{
                      alignSelf: "center",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: bookmarkedVerses.has(currentVerse.verseKey) ? "rgba(22,101,52,0.15)" : "rgba(169,247,183,0.25)",
                      borderWidth: 1,
                      borderColor: bookmarkedVerses.has(currentVerse.verseKey) ? "rgba(22,101,52,0.4)" : "rgba(169,247,183,0.6)",
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 14 }}>{bookmarkedVerses.has(currentVerse.verseKey) ? "🔖" : "📖"}</Text>
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, fontWeight: "700", color: "#0e6030" }}>
                      {bookmarkedVerses.has(currentVerse.verseKey) ? "Saved to Quran.com" : "Bookmark in Quran.com"}
                    </Text>
                  </TouchableOpacity>
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
              )
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
          <View style={[glass(28), { padding: isCompact ? 18 : 28, gap: 20, alignItems: "center" }]}>
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
