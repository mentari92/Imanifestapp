import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeartPulse } from '../../hooks/useHeartPulse';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import { colors } from '../../constants/theme';

export default function QalbScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, error, result, streak, analyzeEntry, fetchStreak } =
    useHeartPulse();
  const [journalText, setJournalText] = useState('');

  useEffect(() => {
    fetchStreak();
  }, []);

  const handleSubmit = async () => {
    if (!journalText.trim()) {
      Alert.alert('Please write how you feel in your heart');
      return;
    }
    try {
      const nextResult = await analyzeEntry(journalText.trim());

      if (typeof sessionStorage !== 'undefined') {
        const serialized = {
          aiSummary: nextResult?.advice || '',
          verses: Array.isArray(nextResult?.verses)
            ? nextResult.verses.map((verse) => ({
                verseKey: `${verse.surahNumber}:${verse.ayahNumber}`,
                arabicText: '',
                translation: verse.text || '',
                tafsirSnippet: '',
              }))
            : [],
        };
        sessionStorage.setItem('qalb_result', JSON.stringify(serialized));
      }

      router.push({
        pathname: '/qalb-result',
        params: {
          userText: journalText.trim(),
          sentiment: nextResult?.emotion || '',
        },
      });
    } catch (err) {
      // Error handled in hook
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.scrollView, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💚 Qalb</Text>
          <Text style={styles.subtitle}>
            Pour your heart out, and receive spiritual guidance from the Quran
          </Text>
        </View>

        {/* Streak Card */}
        {streak && (
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakNumber}>
                {streak.currentStreak} Day Streak
              </Text>
              <Text style={styles.streakSubtext}>
                Best: {streak.longestStreak} days
              </Text>
            </View>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>How does your heart feel today?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Write your thoughts, feelings, or struggles..."
            placeholderTextColor={colors.textSecondary}
            value={journalText}
            onChangeText={setJournalText}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Receiving Guidance...' : '✨ Receive Guidance'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && <ErrorMessage message={error} />}

        {/* Loading */}
        {loading && (
          <LoadingSpinner message="Analyzing your feelings with AI..." />
        )}

        {/* Result */}
        {result && !loading && (
          <View style={styles.resultSection}>
            {/* Sentiment */}
            <View
              style={[
                styles.sentimentBadge,
                {
                  backgroundColor:
                    result.sentiment === 'positive'
                      ? colors.success + '20'
                      : result.sentiment === 'negative'
                        ? colors.error + '20'
                        : colors.warning + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.sentimentText,
                  {
                    color:
                      result.sentiment === 'positive'
                        ? colors.success
                        : result.sentiment === 'negative'
                          ? colors.error
                          : colors.warning,
                  },
                ]}
              >
                {result.sentiment === 'positive'
                  ? '😊 Peaceful'
                  : result.sentiment === 'negative'
                    ? '😔 Troubled'
                    : '😌 Calm'}{' '}
                - Feeling {result.emotion}
              </Text>
            </View>

            {/* Advice */}
            <View style={styles.adviceCard}>
              <Text style={styles.adviceLabel}>💭 Spiritual Advice</Text>
              <Text style={styles.adviceText}>{result.advice}</Text>
            </View>

            {/* Verses */}
            {result.verses && result.verses.length > 0 && (
              <View style={styles.versesSection}>
                <Text style={styles.sectionTitle}>
                  📖 Healing Verses for You
                </Text>
                {result.verses.map((verse, index) => (
                  <View key={verse.number || index} style={styles.verseCard}>
                    <Text style={styles.verseText}>"{verse.text}"</Text>
                    <Text style={styles.verseRef}>
                      {verse.surahName} {verse.surahNumber}:{verse.ayahNumber}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  streakCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  streakEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    fontFamily: 'Inter-Bold',
  },
  streakSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 140,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'Inter-SemiBold',
  },
  resultSection: {
    marginBottom: 24,
  },
  sentimentBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start' as const,
    marginBottom: 16,
  },
  sentimentText: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'Inter-SemiBold',
  },
  adviceCard: {
    backgroundColor: colors.success + '15',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  adviceLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.success,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  adviceText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontFamily: 'Inter-Regular',
  },
  versesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'Inter-SemiBold',
  },
  verseCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontStyle: 'italic' as const,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500' as const,
    fontFamily: 'Inter-Medium',
  },
};