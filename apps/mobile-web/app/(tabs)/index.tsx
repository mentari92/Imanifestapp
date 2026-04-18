import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboard } from '../../hooks/useDashboard';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';

const palette = {
  background: '#f9f9fd',
  onSurface: '#2f3338',
  onSurfaceVariant: '#5b5f65',
  primary: '#605d71',
  tertiary: '#206c3a',
  tertiaryContainer: '#a9f7b7',
  surfaceLow: '#f2f3f8',
  glass: 'rgba(255, 255, 255, 0.58)',
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { loading, error, data, fetchDashboard, isOfflineMode } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void fetchDashboard().catch(() => undefined);
  }, [fetchDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboard();
    } catch (err) {
      // Error already handled in hook
    }
    setRefreshing(false);
  };

  if (loading && !data) {
    return <LoadingSpinner message="Loading your spiritual dashboard..." />;
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Assalamu'alaikum 👋
        </Text>
        <Text style={styles.userName}>
          {data?.user?.name || 'Muslim'}
        </Text>
      </View>

      {/* Offline Mode Alert */}
      {isOfflineMode && (
        <View style={styles.offlineAlert}>
          <Text style={styles.offlineAlertLabel}>Preview Mode</Text>
          <Text style={styles.offlineAlertText}>Live server belum merespons. Data sementara ditampilkan agar alur tetap jalan.</Text>
          <TouchableOpacity onPress={() => void fetchDashboard().catch(() => undefined)} style={styles.retryChip}>
            <Text style={styles.retryChipText}>Coba Sambung Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error Message with Retry */}
      {error && !isOfflineMode && (
        <View style={{ marginBottom: 16 }}>
          <ErrorMessage
            message={error}
            onRetry={fetchDashboard}
            isOffline={isOfflineMode}
          />
        </View>
      )}

      {/* Verse of the Day */}
      {data?.verseOfTheDay && (
        <View style={styles.verseCard}>
          <Text style={styles.verseLabel}>📖 Verse of the Day</Text>
          <Text style={styles.verseText}>
            "{data.verseOfTheDay.text}"
          </Text>
          <Text style={styles.verseRef}>
            {data.verseOfTheDay.surahName} {data.verseOfTheDay.surahNumber}:
            {data.verseOfTheDay.ayahNumber}
          </Text>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {data?.stats?.totalIntentions || 0}
          </Text>
          <Text style={styles.statLabel}>Intentions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {data?.stats?.totalJournalEntries || 0}
          </Text>
          <Text style={styles.statLabel}>Journal</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {data?.stats?.currentStreak || 0}
          </Text>
          <Text style={styles.statLabel}>Streak 🔥</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {data?.stats?.completedDuaTasks || 0}
          </Text>
          <Text style={styles.statLabel}>Tasks Done</Text>
        </View>
      </View>

      {/* Recent Activity */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {data.recentActivity.map((activity, index) => (
            <View key={activity.id || index} style={styles.activityItem}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityDate}>
                {new Date(activity.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  offlineAlert: {
    backgroundColor: palette.glass,
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#1a1829',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  offlineAlertLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: palette.tertiary,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    marginBottom: 6,
  },
  offlineAlertText: {
    fontSize: 13,
    color: palette.onSurfaceVariant,
    fontFamily: 'Noto Serif',
    lineHeight: 20,
  },
  retryChip: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(96,93,113,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryChipText: {
    fontSize: 11,
    color: palette.primary,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  greeting: {
    fontSize: 15,
    color: palette.onSurfaceVariant,
    fontFamily: 'Noto Serif',
  },
  userName: {
    fontSize: 40,
    fontWeight: '600',
    color: palette.onSurface,
    fontFamily: 'Newsreader',
    fontStyle: 'italic',
    lineHeight: 46,
    marginTop: 4,
  },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#1a1829',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
  },
  verseLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.tertiary,
    marginBottom: 8,
    fontFamily: 'Plus Jakarta Sans',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 26,
    color: palette.onSurface,
    fontStyle: 'italic',
    fontFamily: 'Noto Serif',
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 13,
    color: palette.onSurfaceVariant,
    fontFamily: 'Plus Jakarta Sans',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#1a1829',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
  },
  statNumber: {
    fontSize: 34,
    fontWeight: '600',
    color: palette.tertiary,
    fontFamily: 'Newsreader',
  },
  statLabel: {
    fontSize: 11,
    color: palette.onSurfaceVariant,
    marginTop: 4,
    fontFamily: 'Plus Jakarta Sans',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: palette.onSurface,
    marginBottom: 12,
    fontFamily: 'Newsreader',
  },
  activityItem: {
    backgroundColor: palette.surfaceLow,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 15,
    color: palette.onSurface,
    fontFamily: 'Noto Serif',
    flex: 1,
  },
  activityDate: {
    fontSize: 11,
    color: palette.onSurfaceVariant,
    fontFamily: 'Plus Jakarta Sans',
  },
});