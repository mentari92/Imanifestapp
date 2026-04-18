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
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeartPulse } from '../../hooks/useHeartPulse';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';

// ── Stitch Celestial Ether tokens ──────────────────────────────────────────
const C = {
  bg: '#f9f9fd',
  primary: '#605d71',
  primaryDim: '#545164',
  primaryContainer: '#e2ddf8',
  tertiary: '#206c3a',
  tertiaryContainer: '#a9f7b7',
  secondaryContainer: '#ffe4f2',
  onSurface: '#2f3338',
  onSurfaceVariant: '#5b5f65',
  outlineVariant: '#aeb2b9',
  error: '#ac3149',
  success: '#206c3a',
  warning: '#a87519',
};

const glass = {
  backgroundColor: 'rgba(255,255,255,0.60)' as const,
  borderRadius: 32,
  shadowColor: '#1A1829',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.06,
  shadowRadius: 40,
  elevation: 4,
  ...(Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
      } as any)
    : {}),
};

const SENTIMENT_CHIPS = ['Hopeful', 'Peaceful', 'Grounded', 'Anxious', 'Seeking', 'Grateful'];

export default function QalbScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, error, result, streak, analyzeEntry, fetchStreak } =
    useHeartPulse();
  const [journalText, setJournalText] = useState('');
  const [activeSentiment, setActiveSentiment] = useState<string | null>(null);

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
    } catch (_) {
      // Error handled in hook
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Holographic blobs ───────────────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.blobTopLeft} />
        <View style={styles.blobCenter} />
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
          <Text style={styles.brandTitle}>Qalb Voice</Text>
          <View style={styles.bellPlaceholder} />
        </View>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.displayHeadline}>
            A Sanctuary for your{'\n'}Spiritual Voice
          </Text>
          <Text style={styles.displaySub}>
            Speak your truth into the silence. Let your intentions ripple
            through the holographic expanse.
          </Text>
        </View>

        {/* ── Central Mic Button ──────────────────────────────────── */}
        <View style={styles.micSection}>
          <TouchableOpacity
            style={[glass, styles.micCircle]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.88}
          >
            <View style={styles.micIconBg}>
              <Text style={styles.micEmoji}>🎙</Text>
            </View>
            <Text style={styles.micCaption}>Begin</Text>
            <Text style={styles.micLabel}>Tap to Commence{'\n'}Reflection</Text>
          </TouchableOpacity>

          {streak && (
            <View style={[glass, styles.streakPill]}>
              <Text style={styles.streakStar}>✨</Text>
              <Text style={styles.streakCount}>{streak.currentStreak} Days</Text>
              <View style={styles.streakDivider} />
              <Text style={styles.streakLabel}>Reflection Streak</Text>
            </View>
          )}
        </View>

        {/* ── Sentiment Landscape ─────────────────────────────────── */}
        <View style={styles.sentimentSection}>
          <View style={styles.sentimentRow}>
            <Text style={styles.sentimentHeading}>Sentiment Landscape</Text>
            <Text style={styles.sentimentSubLabel}>Current Vibrations</Text>
          </View>
          <View style={styles.chipWrap}>
            {SENTIMENT_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={[
                  glass,
                  styles.chip,
                  activeSentiment === chip && styles.chipActive,
                ]}
                onPress={() =>
                  setActiveSentiment(activeSentiment === chip ? null : chip)
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    activeSentiment === chip && styles.chipTextActive,
                  ]}
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Writing Section ─────────────────────────────────────── */}
        <View style={[glass, styles.writePanel]}>
          <Text style={styles.writePanelTitle}>Prefer to write?</Text>
          <Text style={styles.writePanelSub}>
            Transcribe your internal dialogue into the physical realm.
          </Text>
          <View style={styles.textareaWrap}>
            <TextInput
              style={styles.textarea}
              placeholder="Pour your thoughts here..."
              placeholderTextColor="rgba(119,123,129,0.55)"
              value={journalText}
              onChangeText={setJournalText}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.archiveBtn, loading && styles.archiveBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.archiveBtnText}>
                {loading ? 'Receiving...' : 'Archive Soul-Note'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Feedback ───────────────────────────────────────────── */}
        {error && <ErrorMessage message={error} />}
        {loading && <LoadingSpinner message="Analyzing your feelings with AI..." />}

        {/* ── Result preview (if not redirected) ─────────────────── */}
        {result && !loading && (
          <View style={styles.resultSection}>
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
                  ? 'Peaceful'
                  : result.sentiment === 'negative'
                    ? 'Troubled'
                    : 'Calm'}{' '}
                · {result.emotion}
              </Text>
            </View>

            <View style={[glass, styles.adviceCard]}>
              <Text style={styles.adviceLabel}>Spiritual Advice</Text>
              <Text style={styles.adviceText}>{result.advice}</Text>
            </View>

            {result.verses && result.verses.length > 0 && (
              <>
                <Text style={styles.subSectionTitle}>Healing Verses for You</Text>
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
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    opacity: 0.4,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}),
  },
  blobCenter: {
    position: 'absolute',
    top: '20%',
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 9999,
    backgroundColor: C.tertiaryContainer,
    opacity: 0.35,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(70px)' } as any) : {}),
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 9999,
    backgroundColor: C.secondaryContainer,
    opacity: 0.38,
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
    fontFamily: 'PlayfairDisplay-Regular',
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
    marginBottom: 40,
  },
  displayHeadline: {
    fontSize: 52,
    lineHeight: 58,
    fontFamily: 'PlayfairDisplay-Bold',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    marginBottom: 12,
  },
  displaySub: {
    fontSize: 16,
    lineHeight: 25,
    fontFamily: 'Lora-Regular',
    color: C.onSurfaceVariant,
    maxWidth: 340,
  },
  // mic
  micSection: {
    alignItems: 'center',
    marginBottom: 48,
    gap: 24,
  },
  micCircle: {
    width: 240,
    height: 240,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  micIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(96,93,113,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  micEmoji: {
    fontSize: 32,
  },
  micCaption: {
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    fontWeight: '700' as const,
    color: C.primary,
  },
  micLabel: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Regular',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  streakStar: {
    fontSize: 18,
  },
  streakCount: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: C.primary,
  },
  streakDivider: {
    width: 1,
    height: 16,
    backgroundColor: C.outlineVariant,
    opacity: 0.3,
  },
  streakLabel: {
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  // sentiment
  sentimentSection: {
    marginBottom: 32,
  },
  sentimentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sentimentHeading: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay-Regular',
    fontStyle: 'italic' as const,
    color: C.onSurface,
  },
  sentimentSubLabel: {
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: C.onSurfaceVariant,
    fontWeight: '600' as const,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: C.primaryContainer,
  },
  chipText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    fontWeight: '500' as const,
  },
  chipTextActive: {
    color: C.primary,
    fontWeight: '700' as const,
  },
  // writing panel
  writePanel: {
    padding: 28,
    marginBottom: 16,
  },
  writePanelTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Regular',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    marginBottom: 6,
  },
  writePanelSub: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    marginBottom: 16,
    fontFamily: 'Lora-Regular',
  },
  textareaWrap: {
    position: 'relative',
  },
  textarea: {
    backgroundColor: 'rgba(236,238,243,0.35)',
    borderRadius: 20,
    padding: 20,
    fontSize: 17,
    fontFamily: 'Lora-Regular',
    color: C.onSurface,
    minHeight: 160,
    textAlignVertical: 'top',
    paddingBottom: 52,
  },
  archiveBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: C.primary,
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  archiveBtnDisabled: {
    opacity: 0.6,
  },
  archiveBtnText: {
    color: '#fcf7ff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  // result
  resultSection: {
    marginTop: 8,
  },
  sentimentPill: {
    alignSelf: 'flex-start' as const,
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sentimentPillText: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  adviceCard: {
    padding: 24,
    marginBottom: 16,
  },
  adviceLabel: {
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    color: C.tertiary,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  adviceText: {
    fontSize: 17,
    lineHeight: 27,
    fontFamily: 'Lora-Regular',
    color: C.onSurface,
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
    fontFamily: 'Lora-Regular',
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
});

