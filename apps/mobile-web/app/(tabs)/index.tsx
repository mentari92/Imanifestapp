import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDashboard } from '../../hooks/useDashboard';
import { MeditationIcon } from '../../components/shared/MeditationIcon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import {
  Heart, Sparkles, ListChecks,
  Bell, User, Sun, BookOpen, Star,
} from 'lucide-react-native';

type PrayerKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

const PRAYER_SEQUENCE: PrayerKey[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const parseClockMinutes = (value: string): number | null => {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
};

const to12hLabel = (value: string): string => {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hh = Number(match[1]);
  const mm = match[2];
  const h12 = hh % 12 || 12;
  const suffix = hh >= 12 ? 'PM' : 'AM';
  return `${h12}:${mm} ${suffix}`;
};

const formatRemaining = (minutesLeft: number): string => {
  const hh = Math.floor(minutesLeft / 60);
  const mm = minutesLeft % 60;
  if (hh === 0) return `${mm}m`;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
};

const resolvePrayerState = (timings: Record<PrayerKey, string>, now: Date) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const entries = PRAYER_SEQUENCE
    .map((name) => ({ name, minutes: parseClockMinutes(timings[name]), raw: timings[name] }))
    .filter((item): item is { name: PrayerKey; minutes: number; raw: string } => item.minutes !== null);

  if (entries.length === 0) {
    return {
      currentPrayer: 'Dhuhr',
      currentTimeLabel: '12:45 PM',
      nextPrayer: 'Asr',
      nextTimeLabel: '3:27 PM',
      remaining: '2h 42m',
    };
  }

  let current = entries[entries.length - 1];
  for (const entry of entries) {
    if (entry.minutes <= nowMinutes) current = entry;
  }

  let next = entries.find((entry) => entry.minutes > nowMinutes) || entries[0];
  let remainingMinutes = next.minutes - nowMinutes;
  if (remainingMinutes <= 0) remainingMinutes += 24 * 60;

  return {
    currentPrayer: current.name,
    currentTimeLabel: to12hLabel(current.raw),
    nextPrayer: next.name,
    nextTimeLabel: to12hLabel(next.raw),
    remaining: formatRemaining(remainingMinutes),
  };
};

// ── Stitch Celestial Ether tokens ──────────────────────────────────────────
const C = {
  bg: '#f9f9fd',
  primary: '#605d71',
  primaryDim: '#545164',
  primaryContainer: '#e2ddf8',
  secondary: '#6d5965',
  secondaryContainer: '#ffe4f2',
  secondaryDim: '#614e59',
  tertiary: '#206c3a',
  tertiaryContainer: '#a9f7b7',
  onSurface: '#2f3338',
  onSurfaceVariant: '#5b5f65',
  surfaceContainer: '#eceef3',
  surfaceContainerLow: '#f2f3f8',
  outlineVariant: '#aeb2b9',
};

const glass = {
  backgroundColor: 'rgba(255,255,255,0.45)' as const,
  borderRadius: 32,
  shadowColor: '#1A1829',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.04,
  shadowRadius: 40,
  elevation: 3,
  ...(Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
      } as any)
    : {}),
};

type QuickAccessItem = {
  label: string;
  desc: string;
  route: string;
  Icon?: any;
  iconEmoji?: string;
  iconBg: string;
  iconColor: string;
  iconFill?: string;
};

const QUICK_ACCESS: QuickAccessItem[] = [
  { label: 'Qalb', desc: 'Calm your heart and reset your focus', route: '/(tabs)/qalb', Icon: Heart, iconBg: '#fce7f3', iconColor: '#db2777', iconFill: '#db2777' },
  { label: 'Imanifest', desc: 'Write a clear intention and direction', route: '/(tabs)/imanifest', Icon: Sparkles, iconBg: '#ede9fe', iconColor: '#7c3aed' },
  { label: 'Dua-to-Do', desc: 'Turn intention into daily action', route: '/(tabs)/dua-todo', Icon: ListChecks, iconBg: '#fef3c7', iconColor: '#b45309' },
  { label: 'Tafakkur', desc: 'Reconnect through Quran reflection', route: '/(tabs)/tafakkur', Icon: MeditationIcon, iconBg: '#d1fae5', iconColor: '#059669' },
];


export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const demoAuthMode =
    typeof process !== 'undefined' &&
    process.env.EXPO_PUBLIC_DEMO_AUTH_MODE === 'true';
  const { data, fetchDashboard, isOfflineMode, loading, error } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [prayerTimings, setPrayerTimings] = useState<Record<PrayerKey, string> | null>(null);
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const saveTimingsFromCoords = async (latitude: number, longitude: number) => {
      const resp = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=20`,
      );
      const json = await resp.json();
      const t = json?.data?.timings;
      if (!t) return;

      const nextTimings: Record<PrayerKey, string> = {
        Fajr: String(t.Fajr || ''),
        Dhuhr: String(t.Dhuhr || ''),
        Asr: String(t.Asr || ''),
        Maghrib: String(t.Maghrib || ''),
        Isha: String(t.Isha || ''),
      };

      if (!cancelled) {
        setPrayerTimings(nextTimings);
      }
    };

    const fetchByIpFallback = async () => {
      try {
        const ipResp = await fetch('https://ipapi.co/json/');
        const ipJson = await ipResp.json();
        const lat = Number(ipJson?.latitude);
        const lon = Number(ipJson?.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          await saveTimingsFromCoords(lat, lon);
        }
      } catch {
        // Keep static fallback in UI when location APIs are unavailable.
      }
    };

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void saveTimingsFromCoords(position.coords.latitude, position.coords.longitude);
        },
        () => {
          void fetchByIpFallback();
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    } else {
      void fetchByIpFallback();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void fetchDashboard().catch(() => undefined);
  }, [fetchDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await fetchDashboard(); } catch {}
    setRefreshing(false);
  };

  const onPressBell = () => {
    Alert.alert('Notifications', 'Notification center is coming soon.');
  };

  const onPressProfile = () => {
    Alert.alert('Account', 'Account settings are temporarily disabled during demo.');
  };

  const userName = data?.user?.name || 'Mentari';
  const streak = data?.stats?.currentStreak ?? 7;
  const completed = data?.stats?.completedDuaTasks ?? 0;
  const total = data?.stats?.totalDuaTasks ?? 15;
  const alignPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 80;
  const hasQalbStep = (data?.stats?.totalJournalEntries ?? 0) > 0;
  const hasImanifestStep = (data?.stats?.totalIntentions ?? 0) > 0;
  const hasDuaStep = (data?.stats?.completedDuaTasks ?? 0) > 0;
  const hasTafakkurStep = (data?.recentActivity ?? []).some((activity) => {
    const type = activity.type.toLowerCase();
    return type.includes('tafakkur') || type.includes('quran');
  });

  const funnelSteps = [
    { key: 'qalb', label: 'Qalb Reflection', done: hasQalbStep, route: '/(tabs)/qalb' },
    { key: 'imanifest', label: 'Imanifest Intention', done: hasImanifestStep, route: '/(tabs)/imanifest' },
    { key: 'dua', label: 'Dua-to-Do Action', done: hasDuaStep, route: '/(tabs)/dua-todo' },
    { key: 'tafakkur', label: 'Tafakkur Session', done: hasTafakkurStep, route: '/(tabs)/tafakkur' },
  ];
  const completedFunnelSteps = funnelSteps.filter((step) => step.done).length;
  const funnelPct = Math.round((completedFunnelSteps / funnelSteps.length) * 100);
  const nextFunnelStep = funnelSteps.find((step) => !step.done) || funnelSteps[0];
  const showFirstRunGuide = completedFunnelSteps < funnelSteps.length;
  const toActivityRoute = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes('intent') || normalized.includes('imanifest')) return '/(tabs)/imanifest';
    if (normalized.includes('dua')) return '/(tabs)/dua-todo';
    if (normalized.includes('heart') || normalized.includes('qalb') || normalized.includes('journal')) return '/(tabs)/qalb';
    if (normalized.includes('tafakkur') || normalized.includes('quran')) return '/(tabs)/tafakkur';
    return '/(tabs)/imanifest';
  };

  const recentIntentions =
    data?.recentActivity && data.recentActivity.length > 0
      ? data.recentActivity.slice(0, 3).map((activity, index) => {
          const normalized = activity.type.toLowerCase();
          const isDua = normalized.includes('dua');
          const isQuran = normalized.includes('quran') || normalized.includes('tafakkur');
          const isQalb = normalized.includes('qalb') || normalized.includes('heart') || normalized.includes('journal');
          const icon = isDua ? ListChecks : isQuran ? BookOpen : isQalb ? Heart : Star;
          const iconBg = isDua ? 'rgba(254,243,199,0.6)' : isQuran ? 'rgba(169,247,183,0.5)' : isQalb ? 'rgba(252,231,243,0.6)' : 'rgba(229,223,248,0.5)';
          const iconColor = isDua ? '#b45309' : isQuran ? C.tertiary : isQalb ? '#db2777' : C.primaryDim;
          const pct = isDua ? alignPct : Math.max(45, 78 - index * 14);

          return {
            title: activity.title,
            pct,
            icon,
            iconBg,
            iconColor,
            route: toActivityRoute(activity.type),
          };
        })
      : [];

  const prayerState = prayerTimings
    ? resolvePrayerState(prayerTimings, new Date(clockTick))
    : {
        currentPrayer: 'Dhuhr',
        currentTimeLabel: '12:45 PM',
        nextPrayer: 'Asr',
        nextTimeLabel: '3:27 PM',
        remaining: '2h 42m',
      };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Holographic background blobs ───────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[s.blob, { top: -80, left: -80, backgroundColor: C.primaryContainer,
          ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}) }]} />
        <View style={[s.blob, { bottom: -80, right: -80, backgroundColor: C.secondaryContainer,
          ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}) }]} />
        <View style={[s.blob, { top: '40%', right: '20%', width: 200, height: 200, borderRadius: 100,
          backgroundColor: C.tertiaryContainer, opacity: 0.2,
          ...(Platform.OS === 'web' ? ({ filter: 'blur(60px)' } as any) : {}) }]} />
      </View>

      {/* ── Fixed glass top app bar ─────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.avatarCircle} onPress={onPressProfile} activeOpacity={0.8}>
          <User size={18} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.headerBrand}>Imanifest</Text>
        <TouchableOpacity style={s.iconBtn} onPress={onPressBell} activeOpacity={0.8}>
          <Bell size={22} color={C.onSurface} />
        </TouchableOpacity>
      </View>

      {/* ── Scroll content ──────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 72 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={s.welcomeSection}>
          <Text style={s.welcomeHeadline}>Assalamu'alaikum, {userName}.</Text>
          <Text style={s.welcomeSub}>Build your dreams through intention, action, and consistency.</Text>
        </View>

        {/* Offline notice */}
        {isOfflineMode && (
          <View style={[glass, s.offlineCard]}>
            <Text style={s.offlineLabel}>Preview Mode</Text>
            <Text style={s.offlineText}>Server is currently unavailable. Showing preview data for now.</Text>
            <TouchableOpacity onPress={() => void fetchDashboard().catch(() => undefined)} style={s.retryPill}>
              <Text style={s.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Critical fetch fallback */}
        {!isOfflineMode && error ? (
          <View style={{ marginBottom: 20 }}>
            <ErrorMessage message={error} onRetry={() => void fetchDashboard().catch(() => undefined)} />
          </View>
        ) : null}

        {loading && !data ? (
          <View style={[glass, { padding: 18, marginBottom: 20 }]}> 
            <LoadingSpinner message="Preparing your dashboard..." />
          </View>
        ) : null}

        {/* Guided onboarding */}
        {showFirstRunGuide ? (
          <View style={[glass, s.firstRunCard]}>
            <Text style={s.firstRunKicker}>90-Second Setup</Text>
            <Text style={s.firstRunTitle}>Finish this quick flow before the demo</Text>
            <Text style={s.firstRunSub}>
              Start with Qalb, set your Imanifest intention, then convert it to Dua-to-Do and close with Tafakkur.
            </Text>
            <TouchableOpacity
              style={s.firstRunCta}
              onPress={() => router.push(nextFunnelStep.route as any)}
              activeOpacity={0.85}
            >
              <Text style={s.firstRunCtaText}>Continue: {nextFunnelStep.label}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Prayer Times */}
        <View style={s.prayerCard}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120,
              borderRadius: 60, backgroundColor: C.primaryContainer, opacity: 0.3,
              ...(Platform.OS === 'web' ? ({ filter: 'blur(40px)' } as any) : {}) }} />
          </View>
          <View style={s.prayerLeft}>
            <View style={s.prayerIconWrap}>
              <Sun size={26} color={C.primary} />
            </View>
            <View>
              <Text style={s.prayerName}>{prayerState.currentPrayer}</Text>
              <Text style={s.prayerMeta}>Current Prayer · {prayerState.currentTimeLabel}</Text>
            </View>
          </View>
          <View style={s.prayerRight}>
            <Text style={s.prayerNextLabel}>Next: {prayerState.nextPrayer}</Text>
            <Text style={s.prayerCountdown}>{prayerState.remaining}</Text>
            <Text style={s.prayerRemainingLabel}>at {prayerState.nextTimeLabel}</Text>
          </View>
        </View>

        {/* Quick Access */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Access</Text>
        </View>
        <View style={s.quickGrid}>
          {QUICK_ACCESS.map(({ label, desc, route, Icon, iconEmoji, iconBg, iconColor, iconFill }) => (
            <TouchableOpacity
              key={label}
              style={[glass, s.quickCard]}
              onPress={() => router.push(route as any)}
              activeOpacity={0.85}
            >
              <View style={[s.quickIconWrap, { backgroundColor: iconBg }]}>
                {Icon ? (
                  <Icon size={22} color={iconColor} fill={iconFill} />
                ) : (
                  <Text style={{ fontSize: 20 }}>{iconEmoji}</Text>
                )}
              </View>
              <Text style={s.quickLabel}>{label}</Text>
              <Text style={s.quickDesc}>{desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recovery Funnel */}
        <View style={[glass, s.funnelCard]}>
          <View style={s.funnelHeadRow}>
            <View>
              <Text style={s.funnelTitle}>Progress Funnel</Text>
              <Text style={s.funnelSub}>Track movement from reflection to action</Text>
            </View>
            <Text style={s.funnelStat}>{completedFunnelSteps}/4</Text>
          </View>
          <View style={s.funnelTrack}>
            <View style={[s.funnelFill, { width: `${funnelPct}%` as any }]} />
          </View>
          <View style={s.funnelStepsWrap}>
            {funnelSteps.map((step) => (
              <TouchableOpacity
                key={step.key}
                style={s.funnelStepRow}
                onPress={() => router.push(step.route as any)}
                activeOpacity={0.8}
              >
                <View style={[s.funnelDot, step.done ? s.funnelDotDone : s.funnelDotPending]} />
                <Text style={[s.funnelStepLabel, step.done && s.funnelStepLabelDone]}>{step.label}</Text>
                <Text style={[s.funnelStepStatus, step.done ? s.funnelStepStatusDone : s.funnelStepStatusPending]}>
                  {step.done ? 'Done' : 'Pending'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {demoAuthMode ? (
            <TouchableOpacity onPress={() => router.push('/api-proof')} activeOpacity={0.85}>
              <Text style={s.funnelProofLink}>Open API proof</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Bento: Daily Alignment + Streak */}
        <View style={s.bentoRow}>
          {/* Dream Realization */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/dua-todo')}
            style={[glass, s.bentoMain]}
          >
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150,
                borderRadius: 75, backgroundColor: C.primaryContainer, opacity: 0.2,
                ...(Platform.OS === 'web' ? ({ filter: 'blur(50px)' } as any) : {}) }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <View>
                <Text style={s.bentoTitle}>Dream Realization</Text>
                <Text style={s.bentoSubtitle}>Intention to daily action</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.bentoStat}>{completed}/{total}</Text>
                <Text style={s.bentoStatLabel}>TASKS DONE</Text>
              </View>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${alignPct}%` as any }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              {data?.verseOfTheDay ? (
                <Text style={s.bentoVerse} numberOfLines={2}>
                  "{data.verseOfTheDay.text.substring(0, 80)}..." ({data.verseOfTheDay.surahName} {data.verseOfTheDay.surahNumber}:{data.verseOfTheDay.ayahNumber})
                </Text>
              ) : (
                <Text style={s.bentoVerse}>"Allah does not burden a soul beyond that it can bear." (2:286)</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Istiqamah Streak */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/dua-todo')}
            style={[glass, s.bentoSide]}
          >
            <View style={s.streakIconWrap}>
              <Star size={28} color={C.tertiary} fill={C.tertiaryContainer} />
            </View>
            <Text style={s.streakTitle}>{streak}-Day Consistency</Text>
            <Text style={s.streakSub}>Small daily steps create lasting growth.</Text>
            <View style={s.streakDots}>
              {Array.from({ length: 7 }, (_, i) => (
                <View
                  key={i}
                  style={[s.streakDot, i < streak ? s.streakDotActive : s.streakDotInactive,
                    i === Math.min(streak, 6) && streak < 7 && s.streakDotPulse]}
                />
              ))}
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={[glass, { padding: 24, marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <Text style={s.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/imanifest')}>
              <Text style={s.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentIntentions.length > 0 ? recentIntentions.map(({ title, pct, icon: Icon, iconBg, iconColor, route }, i) => (
            <TouchableOpacity
              key={i}
              style={s.intentionRow}
              onPress={() => router.push(route as any)}
              activeOpacity={0.85}
            >
              <View style={[s.intentionIconWrap, { backgroundColor: iconBg }]}>
                <Icon size={20} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={s.intentionTitle}>{title}</Text>
                  <Text style={s.intentionPct}>{pct}%</Text>
                </View>
                <View style={s.intentionTrack}>
                  <View style={[s.intentionFill, { width: `${pct}%` as any, backgroundColor: iconColor, opacity: 0.7 }]} />
                </View>
              </View>
            </TouchableOpacity>
          )) : (
            <View style={s.emptyState}>
              <Sparkles size={32} color={C.primary} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text style={s.emptyStateTitle}>Begin your journey</Text>
              <Text style={s.emptyStateSub}>Write your first intention or reflect on your heart to see activity here.</Text>
              <TouchableOpacity
                style={s.emptyStateCta}
                onPress={() => router.push('/(tabs)/qalb')}
                activeOpacity={0.85}
              >
                <Text style={s.emptyStateCtaText}>Start with Qalb →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.5,
  },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(24px)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' } as any)
      : {}),
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBrand: {
    fontSize: 24,
    fontFamily: 'Newsreader',
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#1e293b',
  },
  iconBtn: {
    padding: 8, borderRadius: 20,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  welcomeSection: {
    marginBottom: 28,
  },
  welcomeHeadline: {
    fontSize: 40,
    fontFamily: 'Newsreader',
    fontStyle: 'italic',
    fontWeight: '600',
    color: C.onSurface,
    lineHeight: 48,
    opacity: 0.92,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 14,
    fontFamily: 'Plus Jakarta Sans',
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
    opacity: 0.8,
  },
  offlineCard: {
    padding: 16,
    marginBottom: 20,
  },
  offlineLabel: {
    fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
    color: C.tertiary, fontFamily: 'Plus Jakarta Sans', fontWeight: '700', marginBottom: 6,
  },
  offlineText: {
    fontSize: 13, color: C.onSurfaceVariant, fontFamily: 'Noto Serif', lineHeight: 20,
  },
  retryPill: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: 'rgba(96,93,113,0.15)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  retryText: {
    fontSize: 11, color: C.primary, fontFamily: 'Plus Jakarta Sans', fontWeight: '700',
  },
  prayerCard: {
    backgroundColor: 'linear-gradient(135deg,rgba(226,221,248,0.4),rgba(255,228,242,0.4))' as any,
    ...(Platform.OS === 'web'
      ? ({
          background: 'linear-gradient(135deg,rgba(226,221,248,0.4) 0%,rgba(255,228,242,0.4) 100%)',
          backdropFilter: 'blur(20px)',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
          boxShadow: '0 8px 32px rgba(31,38,135,0.07)',
        } as any)
      : { backgroundColor: 'rgba(226,221,248,0.4)' }),
    borderRadius: 32,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  prayerIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  prayerName: {
    fontSize: 24, fontFamily: 'Newsreader', fontWeight: '600', color: C.onSurface,
  },
  prayerMeta: {
    fontSize: 10, fontFamily: 'Plus Jakarta Sans', color: C.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.8,
  },
  prayerRight: { alignItems: 'flex-end' },
  prayerNextLabel: {
    fontSize: 10, fontFamily: 'Plus Jakarta Sans', color: C.tertiary,
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  prayerCountdown: {
    fontSize: 36, fontFamily: 'Newsreader', color: C.onSurface, fontWeight: '600',
  },
  prayerRemainingLabel: {
    fontSize: 11, fontFamily: 'Plus Jakarta Sans', color: C.onSurfaceVariant,
  },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 26, fontFamily: 'Newsreader', fontWeight: '600', color: C.onSurface,
  },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24,
  },
  funnelCard: {
    padding: 20,
    marginBottom: 22,
  },
  funnelHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  funnelTitle: {
    fontSize: 20,
    fontFamily: 'Newsreader',
    fontWeight: '600',
    color: C.onSurface,
  },
  funnelSub: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    fontFamily: 'Plus Jakarta Sans',
  },
  funnelStat: {
    fontSize: 22,
    fontFamily: 'Newsreader',
    color: C.tertiary,
    fontWeight: '700',
  },
  funnelTrack: {
    height: 8,
    backgroundColor: C.surfaceContainer,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  funnelFill: {
    height: '100%',
    backgroundColor: C.tertiary,
    borderRadius: 4,
  },
  funnelStepsWrap: {
    gap: 10,
  },
  funnelStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  funnelDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  funnelDotDone: {
    backgroundColor: C.tertiary,
  },
  funnelDotPending: {
    backgroundColor: C.outlineVariant,
    opacity: 0.6,
  },
  funnelStepLabel: {
    flex: 1,
    fontSize: 12,
    color: C.onSurface,
    fontFamily: 'Plus Jakarta Sans',
  },
  funnelStepLabelDone: {
    color: C.tertiary,
    fontWeight: '700',
  },
  funnelStepStatus: {
    fontSize: 10,
    fontFamily: 'Plus Jakarta Sans',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  funnelStepStatusDone: {
    color: C.tertiary,
    fontWeight: '700',
  },
  funnelStepStatusPending: {
    color: C.onSurfaceVariant,
  },
  funnelProofLink: {
    marginTop: 12,
    fontSize: 12,
    color: C.primaryDim,
    textDecorationLine: 'underline',
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
  },
  quickCard: {
    width: '47%' as any,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  quickIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  quickLabel: {
    fontSize: 11, fontFamily: 'Plus Jakarta Sans', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2, color: C.onSurface,
  },
  quickDesc: {
    fontSize: 10, fontFamily: 'Noto Serif', color: C.onSurfaceVariant,
    textAlign: 'center', lineHeight: 15,
  },
  bentoRow: {
    flexDirection: 'row', gap: 14, marginBottom: 20, flexWrap: 'wrap',
  },
  bentoMain: {
    flex: 2, minWidth: 200, padding: 28, overflow: 'hidden',
  },
  bentoTitle: {
    fontSize: 26, fontFamily: 'Newsreader', fontWeight: '600', color: C.onSurface, marginBottom: 2,
  },
  bentoSubtitle: {
    fontSize: 10, fontFamily: 'Plus Jakarta Sans', color: C.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  bentoStat: {
    fontSize: 44, fontFamily: 'Newsreader', color: C.primary, lineHeight: 48,
  },
  bentoStatLabel: {
    fontSize: 9, fontFamily: 'Plus Jakarta Sans', color: C.tertiary,
    fontWeight: '700', letterSpacing: 1,
  },
  progressTrack: {
    height: 8, backgroundColor: C.surfaceContainer, borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: C.tertiary, borderRadius: 4,
  },
  bentoVerse: {
    fontSize: 13, fontFamily: 'Noto Serif', color: C.onSurfaceVariant,
    fontStyle: 'italic', lineHeight: 20, flex: 1, marginTop: 4,
  },
  bentoSide: {
    flex: 1, minWidth: 140, padding: 24, alignItems: 'center',
  },
  streakIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(169,247,183,0.4)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  streakTitle: {
    fontSize: 18, fontFamily: 'Newsreader', fontWeight: '600', color: C.onSurface,
    textAlign: 'center', marginBottom: 4,
  },
  streakSub: {
    fontSize: 11, fontFamily: 'Plus Jakarta Sans', color: C.onSurfaceVariant,
    textAlign: 'center', marginBottom: 16, lineHeight: 16,
  },
  streakDots: { flexDirection: 'row', gap: 6 },
  streakDot: { width: 8, height: 8, borderRadius: 4 },
  streakDotActive: { backgroundColor: C.tertiary },
  streakDotInactive: { backgroundColor: C.surfaceContainer },
  streakDotPulse: { opacity: 0.6 },
  seeAll: {
    fontSize: 12, fontFamily: 'Plus Jakarta Sans', color: C.primaryDim,
    textDecorationLine: 'underline',
  },
  intentionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18,
  },
  intentionIconWrap: {
    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  intentionTitle: {
    fontSize: 14, fontFamily: 'Noto Serif', fontWeight: '600', color: C.onSurface,
  },
  intentionPct: {
    fontSize: 10, fontFamily: 'Plus Jakarta Sans', color: C.onSurfaceVariant,
  },
  intentionTrack: {
    height: 6, backgroundColor: C.surfaceContainerLow, borderRadius: 3, overflow: 'hidden',
  },
  intentionFill: {
    height: '100%', borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurface,
    marginBottom: 6,
  },
  emptyStateSub: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  emptyStateCta: {
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyStateCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primaryDim,
  },
  firstRunCard: {
    padding: 18,
    marginBottom: 18,
  },
  firstRunKicker: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: C.tertiary,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    marginBottom: 8,
  },
  firstRunTitle: {
    fontSize: 20,
    fontFamily: 'Newsreader',
    fontWeight: '600',
    color: C.onSurface,
    marginBottom: 6,
  },
  firstRunSub: {
    fontSize: 12,
    fontFamily: 'Noto Serif',
    color: C.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 12,
  },
  firstRunCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(169,247,183,0.4)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  firstRunCtaText: {
    color: C.tertiary,
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    fontWeight: '700',
  },
});