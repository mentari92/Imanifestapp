import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useImanSync } from '../../hooks/useImanSync';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import { colors } from '../../constants/theme';

export default function ImanifestScreen() {
  const insets = useSafeAreaInsets();
  const { loading, error, result, analyzeIntention } = useImanSync();
  const [intentionText, setIntentionText] = useState('');

  const handleSubmit = async () => {
    if (!intentionText.trim()) {
      Alert.alert('Please enter your intention or dua');
      return;
    }
    try {
      await analyzeIntention(intentionText.trim());
    } catch (err) {
      // Error is already set in the hook
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
          <Text style={styles.title}>✨ Imanifest</Text>
          <Text style={styles.subtitle}>
            Share your intention, and let AI find the perfect Quran verses for
            you
          </Text>
        </View>

        {/* Input Form */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Your Intention / Dua</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., I want to be more patient in my daily life..."
            placeholderTextColor={colors.textSecondary}
            value={intentionText}
            onChangeText={setIntentionText}
            multiline
            numberOfLines={4}
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
              {loading ? 'Analyzing...' : '✨ Analyze & Find Verses'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <ErrorMessage message={error} />
        )}

        {/* Loading */}
        {loading && (
          <LoadingSpinner message="Analyzing your intention with AI..." />
        )}

        {/* Result */}
        {result && !loading && (
          <View style={styles.resultSection}>
            {/* Encouragement */}
            <View style={styles.encouragementCard}>
              <Text style={styles.encouragementText}>
                {result.encouragement}
              </Text>
            </View>

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
                  ? '😊 Positive'
                  : result.sentiment === 'negative'
                    ? '😔 Needs Support'
                    : '😌 Neutral'}
              </Text>
            </View>

            {/* Quran Verses */}
            {result.verses && result.verses.length > 0 && (
              <View style={styles.versesSection}>
                <Text style={styles.sectionTitle}>📖 Relevant Quran Verses</Text>
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

            {/* Suggested Actions */}
            {result.suggestedActions && result.suggestedActions.length > 0 && (
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>🎯 Suggested Actions</Text>
                {result.suggestedActions.map((action, index) => (
                  <View key={index} style={styles.actionItem}>
                    <Text style={styles.actionBullet}>•</Text>
                    <Text style={styles.actionText}>{action}</Text>
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
    minHeight: 120,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
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
  encouragementCard: {
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  encouragementText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontStyle: 'italic',
    fontFamily: 'Inter-Regular',
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
    borderLeftColor: colors.primary,
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontStyle: 'italic',
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500' as const,
    fontFamily: 'Inter-Medium',
  },
  actionsSection: {
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
    paddingLeft: 8,
  },
  actionBullet: {
    fontSize: 16,
    color: colors.primary,
    marginRight: 8,
    marginTop: 2,
  },
  actionText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    fontFamily: 'Inter-Regular',
  },
};