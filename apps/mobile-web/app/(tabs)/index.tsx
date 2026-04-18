import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDashboard } from '../../hooks/useDashboard';
import {
  Heart, Sparkles, ListChecks, Headphones,
  Bell, User, Sun, BookOpen, Star,
} from 'lucide-react-native';

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

const QUICK_ACCESS = [
  { label: 'Qalb', desc: 'Check-in with your spirit', route: '/(tabs)/qalb', Icon: Heart, iconBg: '#fce7f3', iconColor: '#be185d' },
  { label: 'Imanifest', desc: 'Set your daily intention', route: '/(tabs)/imanifest', Icon: Sparkles, iconBg: '#dbeafe', iconColor: '#1d4ed8' },
  { label: 'Dua-to-Do', desc: 'Act on your manifestations', route: '/(tabs)/dua-todo', Icon: ListChecks, iconBg: '#fef3c7', iconColor: '#b45309' },
  { label: 'Tafakkur', desc: 'Find tranquility in Quran audio', route: '/(tabs)/tafakkur', Icon: Headphones, iconBg: '#d1fae5', iconColor: '#065f46' },
];

const RECENT_INTENTIONS = [
  { title: 'Morning Dhikr', pct: 85, icon: Heart, iconBg: 'rgba(255,228,242,0.5)', iconColor: C.secondaryDim },
  { title: 'Surah Ar-Rahman', pct: 40, icon: BookOpen, iconBg: 'rgba(169,247,183,0.5)', iconColor: C.tertiary },
  { title: 'Tahajjud', pct: 62, icon: Star, iconBg: 'rgba(229,223,248,0.5)', iconColor: C.primaryDim },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, fetchDashboard, isOfflineMode } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void fetchDashboard().catch(() => undefined);
  }, [fetchDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await fetchDashboard(); } catch {}
    setRefreshing(false);
  };

  const userName = data?.user?.name || 'Mentari';
  const streak = data?.stats?.currentStreak ?? 7;
  const completed = data?.stats?.completedDuaTasks ?? 0;
  const total = data?.stats?.totalDuaTasks ?? 15;
  const alignPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 80;

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
        <View style={s.avatarCircle}>
          <User size={18} color={C.primary} />
        </View>
        <Text style={s.headerBrand}>Imanifest</Text>
        <TouchableOpacity style={s.iconBtn}>
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
          <Text style={s.welcomeSub}>May your heart find peace in today's intentions.</Text>
        </View>

        {/* Offline notice */}
        {isOfflineMode && (
          <View style={[glass, s.offlineCard]}>
            <Text style={s.offlineLabel}>Preview Mode</Text>
            <Text style={s.offlineText}>Server sedang tidak tersedia. Data demo ditampilkan sementara.</Text>
            <TouchableOpacity onPress={() => void fetchDashboard().catch(() => undefined)} style={s.retryPill}>
              <Text style={s.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}

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
              <Text style={s.prayerName}>Dhuhr</Text>
              <Text style={s.prayerMeta}>Current Prayer · 12:45 PM</Text>
            </View>
          </View>
          <View style={s.prayerRight}>
            <Text style={s.prayerNextLabel}>Next: Asr in</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={s.prayerCountdown}>02:42</Text>
              <Text style={s.prayerRemainingLabel}>remaining</Text>
            </View>
          </View>
        </View>

        {/* Quick Access */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Access</Text>
        </View>
        <View style={s.quickGrid}>
          {QUICK_ACCESS.map(({ label, desc, route, Icon, iconBg, iconColor }) => (
            <TouchableOpacity
              key={label}
              style={[glass, s.quickCard]}
              onPress={() => router.push(route as any)}
              activeOpacity={0.85}
            >
              <View style={[s.quickIconWrap, { backgroundColor: iconBg }]}>
                <Icon size={22} color={iconColor} />
              </View>
              <Text style={s.quickLabel}>{label}</Text>
              <Text style={s.quickDesc}>{desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bento: Daily Alignment + Streak */}
        <View style={s.bentoRow}>
          {/* Daily Alignment */}
          <View style={[glass, s.bentoMain]}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150,
                borderRadius: 75, backgroundColor: C.primaryContainer, opacity: 0.2,
                ...(Platform.OS === 'web' ? ({ filter: 'blur(50px)' } as any) : {}) }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <View>
                <Text style={s.bentoTitle}>Daily Alignment</Text>
                <Text style={s.bentoSubtitle}>Spiritual Momentum</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.bentoStat}>{completed}/{total}</Text>
                <Text style={s.bentoStatLabel}>NEARLY THERE</Text>
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
          </View>

          {/* Reflection Streak */}
          <View style={[glass, s.bentoSide]}>
            <View style={s.streakIconWrap}>
              <Star size={28} color={C.tertiary} fill={C.tertiaryContainer} />
            </View>
            <Text style={s.streakTitle}>{streak}-Day Streak</Text>
            <Text style={s.streakSub}>Consistency is the bridge to light.</Text>
            <View style={s.streakDots}>
              {Array.from({ length: 7 }, (_, i) => (
                <View
                  key={i}
                  style={[s.streakDot, i < streak ? s.streakDotActive : s.streakDotInactive,
                    i === Math.min(streak, 6) && streak < 7 && s.streakDotPulse]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Recent Intentions */}
        <View style={[glass, { padding: 24, marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <Text style={s.sectionTitle}>Recent Intentions</Text>
            <Text style={s.seeAll}>See All</Text>
          </View>
          {RECENT_INTENTIONS.map(({ title, pct, icon: Icon, iconBg, iconColor }, i) => (
            <View key={i} style={s.intentionRow}>
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
            </View>
          ))}
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
});