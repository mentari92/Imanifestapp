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
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useImanSync } from '../../hooks/useImanSync';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';

// ── Stitch Celestial Ether tokens ──────────────────────────────────────────
const C = {
  bg: '#f9f9fd',
  surface: '#ffffff',
  primary: '#605d71',
  primaryDim: '#545164',
  tertiary: '#206c3a',
  tertiaryContainer: '#a9f7b7',
  secondaryContainer: '#ffe4f2',
  primaryContainer: '#e2ddf8',
  onSurface: '#2f3338',
  onSurfaceVariant: '#5b5f65',
  outlineVariant: '#aeb2b9',
  error: '#ac3149',
  success: '#206c3a',
  warning: '#a87519',
};

const glass = {
  backgroundColor: 'rgba(255,255,255,0.65)' as const,
  borderRadius: 32,
  shadowColor: '#1A1829',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.06,
  shadowRadius: 40,
  elevation: 4,
  ...(Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(24px) saturate(130%)',
        WebkitBackdropFilter: 'blur(24px) saturate(130%)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
      } as any)
    : {}),
};

export default function ImanifestScreen() {
  const insets = useSafeAreaInsets();
  const { loading, error, result, analyzeIntention } = useImanSync();
  const [intentionText, setIntentionText] = useState('');
  const [gratitude, setGratitude] = useState(['', '', '']);

  const handleSubmit = async () => {
    if (!intentionText.trim()) {
      Alert.alert('Please enter your intention or dua');
      return;
    }
    try {
      await analyzeIntention(intentionText.trim());
    } catch (_) {
      // Error is already set in the hook
    }
  };

  const setGratitudeAt = (i: number, v: string) =>
    setGratitude((prev) => prev.map((x, idx) => (idx === i ? v : x)));

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Holographic background blobs ────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.blobTopLeft} />
        <View style={styles.blobBottomRight} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.brandTitle}>Imanifest</Text>
          <View style={styles.bellPlaceholder} />
        </View>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.displayHeadline}>Imanifest{'\n'}My Vision</Text>
          <Text style={styles.displaySub}>
            Align your soul's purpose with intentional action.
          </Text>
        </View>

        {/* ── Soul's Intention ───────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Soul's Intention</Text>
          <Text style={styles.voiceLabel}>🎙 Voice Record</Text>
        </View>
        <View style={[glass, styles.intentionCard]}>
          <TextInput
            style={styles.intentionInput}
            placeholder="Write what your soul desires to manifest today..."
            placeholderTextColor="rgba(96,93,113,0.45)"
            value={intentionText}
            onChangeText={setIntentionText}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ── Gratitude Journal ──────────────────────────────────── */}
        <View style={styles.gratitudeHeader}>
          <View style={styles.gratitudeLine} />
          <Text style={styles.gratitudeTitle}>Moments of Grateful</Text>
          <View style={styles.gratitudeLine} />
        </View>
        {['Something I am grateful for...', 'Another blessing today...', 'A final moment of gratitude...'].map(
          (ph, i) => (
            <View key={i} style={[glass, styles.gratitudeRow]}>
              <Text style={styles.gratitudeNum}>0{i + 1}</Text>
              <TextInput
                style={styles.gratitudeInput}
                placeholder={ph}
                placeholderTextColor="rgba(91,95,101,0.4)"
                value={gratitude[i]}
                onChangeText={(v) => setGratitudeAt(i, v)}
              />
            </View>
          )
        )}

        {/* ── Primary CTA ────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {loading ? 'Analyzing...' : 'Manifest & Start Dua-to-Do  →'}
          </Text>
        </TouchableOpacity>

        {/* ── Feedback ───────────────────────────────────────────── */}
        {error && <ErrorMessage message={error} />}
        {loading && <LoadingSpinner message="Analyzing your intention with AI..." />}

        {/* ── AI Result ──────────────────────────────────────────── */}
        {result && !loading && (
          <View style={styles.resultSection}>
            <View style={[glass, styles.encouragementCard]}>
              <Text style={styles.encouragementText}>{result.encouragement}</Text>
            </View>

            <View
              style={[
                styles.sentimentPill,
                {
                  backgroundColor:
                    result.sentiment === 'positive'
                      ? C.tertiaryContainer
                      : result.sentiment === 'negative'
                        ? '#f9dde3'
                        : '#fef3d7',
                },
              ]}
            >
              <Text
                style={[
                  styles.sentimentPillText,
                  {
                    color:
                      result.sentiment === 'positive'
                        ? C.tertiary
                        : result.sentiment === 'negative'
                          ? C.error
                          : C.warning,
                  },
                ]}
              >
                {result.sentiment === 'positive'
                  ? 'Positive'
                  : result.sentiment === 'negative'
                    ? 'Needs Support'
                    : 'Neutral'}
              </Text>
            </View>

            {result.verses && result.verses.length > 0 && (
              <>
                <Text style={styles.subSectionTitle}>Relevant Quran Verses</Text>
                {result.verses.map((verse, idx) => (
                  <View key={verse.number || idx} style={[glass, styles.verseCard]}>
                    <Text style={styles.verseText}>"{verse.text}"</Text>
                    <Text style={styles.verseRef}>
                      {verse.surahName} {verse.surahNumber}:{verse.ayahNumber}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {result.suggestedActions && result.suggestedActions.length > 0 && (
              <>
                <Text style={styles.subSectionTitle}>Suggested Actions</Text>
                {result.suggestedActions.map((action, idx) => (
                  <View key={idx} style={styles.actionRow}>
                    <Text style={styles.actionDot}>·</Text>
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingHorizontal: 24,
  },
  // blobs
  blobTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    opacity: 0.45,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}),
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 9999,
    backgroundColor: C.secondaryContainer,
    opacity: 0.4,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(90px)' } as any) : {}),
  },
  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingVertical: 4,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primaryContainer,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    fontWeight: '600' as const,
    color: '#1e2024',
  },
  bellPlaceholder: {
    width: 40,
    height: 40,
  },
  // hero
  hero: {
    marginBottom: 32,
  },
  displayHeadline: {
    fontSize: 52,
    lineHeight: 58,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    marginBottom: 10,
  },
  displaySub: {
    fontSize: 17,
    lineHeight: 26,
    fontFamily: 'Noto Serif',
    fontStyle: 'italic' as const,
    color: C.onSurfaceVariant,
    opacity: 0.85,
  },
  // section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    color: C.onSurfaceVariant,
    fontWeight: '700' as const,
  },
  voiceLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: C.primaryDim,
    fontWeight: '600' as const,
  },
  intentionCard: {
    minHeight: 200,
    padding: 24,
    marginBottom: 32,
  },
  intentionInput: {
    flex: 1,
    fontSize: 22,
    lineHeight: 32,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  // gratitude
  gratitudeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  gratitudeLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.outlineVariant,
    opacity: 0.3,
  },
  gratitudeTitle: {
    fontSize: 22,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    flexShrink: 1,
  },
  gratitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 10,
    borderRadius: 16,
    gap: 16,
  },
  gratitudeNum: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: C.tertiary,
    opacity: 0.4,
    minWidth: 24,
  },
  gratitudeInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Noto Serif',
    fontStyle: 'italic' as const,
    color: C.onSurface,
  },
  // CTA
  ctaButton: {
    backgroundColor: C.tertiary,
    borderRadius: 9999,
    paddingVertical: 22,
    paddingHorizontal: 32,
    alignItems: 'center' as const,
    marginTop: 20,
    marginBottom: 12,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 6,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: '#e8ffe8',
    fontSize: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    fontWeight: '700' as const,
  },
  // results
  resultSection: {
    marginTop: 8,
  },
  encouragementCard: {
    padding: 24,
    marginBottom: 16,
  },
  encouragementText: {
    fontSize: 17,
    lineHeight: 27,
    color: C.onSurface,
    fontFamily: 'Noto Serif',
  },
  sentimentPill: {
    alignSelf: 'flex-start' as const,
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 20,
  },
  sentimentPillText: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  subSectionTitle: {
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: C.onSurfaceVariant,
    fontWeight: '700' as const,
    marginBottom: 12,
    marginTop: 4,
  },
  verseCard: {
    padding: 20,
    marginBottom: 10,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 25,
    color: C.onSurface,
    fontFamily: 'Noto Serif',
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
  actionRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
    gap: 10,
  },
  actionDot: {
    fontSize: 22,
    color: C.tertiary,
    lineHeight: 24,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    color: C.onSurface,
    fontFamily: 'Noto Serif',
  },
});