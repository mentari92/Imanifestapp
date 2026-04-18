import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboard } from '../../hooks/useDashboard';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import { colors } from '../../constants/theme';

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
          <Text style={styles.offlineAlertText}>📡 Demo Mode - Server Offline</Text>
        </View>
      )}

      {/* Error Message with Retry */}
      {error && (
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

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  offlineAlert: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  offlineAlertText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#92400E',
    fontFamily: 'Inter-SemiBold',
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  verseCard: {
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  verseLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontStyle: 'italic' as const,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.primary,
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'Inter-SemiBold',
  },
  activityItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  activityTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  activityDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
  },
};