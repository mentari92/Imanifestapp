import React, { useEffect, useState } from 'react';
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
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useImanifest } from '../../hooks/useImanifest';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const { loading, error, result, history, analyzeIntention, fetchHistory } = useImanifest();
  const [intentionText, setIntentionText] = useState('');
  const [gratitude, setGratitude] = useState(['', '', '']);
  const [recordingTarget, setRecordingTarget] = useState<'intention' | 'gratitude' | null>(null);
  const [activeGratitudeIndex, setActiveGratitudeIndex] = useState(0);
  const [visionImage, setVisionImage] = useState<string | null>(null);

  const isRecording = recordingTarget !== null;

  useEffect(() => {
    fetchHistory().catch(() => { });
  }, [fetchHistory]);

  const handleSubmit = async () => {
    const sanitizedIntention = intentionText.replace(/\s+/g, ' ').trim();
    if (!sanitizedIntention) {
      Alert.alert('Please enter your intention or dua');
      return;
    }
    if (sanitizedIntention.length > 500) {
      Alert.alert('Intention is too long', 'Please keep it under 500 characters for better guidance.');
      return;
    }
    try {
      await analyzeIntention(sanitizedIntention);
      fetchHistory().catch(() => { });
    } catch (_) {
      // Error is already set in the hook
    }
  };

  const handleContinueToDuaTodo = () => {
    router.push({
      pathname: '/(tabs)/dua-todo',
      params: result?.id ? { manifestationId: result.id } : undefined,
    });
  };

  const startVoiceRecording = (target: 'intention' | 'gratitude') => {
    if (isRecording) {
      return;
    }
    if (Platform.OS !== 'web') {
      Alert.alert('Voice input is available on web. Please type your reflection.');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      Alert.alert('Voice input not supported in this browser. Please type your reflection.');
      return;
    }
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setRecordingTarget(target);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (target === 'intention') {
        setIntentionText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } else {
        setGratitude((prev) =>
          prev.map((item, idx) => {
            if (idx !== activeGratitudeIndex) {
              return item;
            }
            return item ? `${item} ${transcript}` : transcript;
          })
        );
      }
      setRecordingTarget(null);
    };
    recognition.onerror = () => {
      setRecordingTarget(null);
    };
    recognition.onend = () => {
      setRecordingTarget(null);
    };
    recognition.start();
  };

  const pickVisionImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setVisionImage(res.assets[0].uri);
    }
  };

  const setGratitudeAt = (i: number, v: string) =>
    setGratitude((prev) => prev.map((x, idx) => (idx === i ? v : x)));

  const hasGratitudeEntry = gratitude.some((item) => item.trim().length > 0);

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
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingHorizontal: isCompact ? 16 : 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Sparkles size={18} color="#4338ca" strokeWidth={2.1} />
            </View>
            <Text style={styles.brandTitle}>Imanifest</Text>
            <View style={styles.headerIconSpacer} />
          </View>

          {/* ── Hero ───────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <Text style={[styles.displayHeadline, isCompact && styles.displayHeadlineCompact]}>Set Your{'\n'}Niyyah</Text>
            <Text style={styles.displaySub}>
              Ground your niyyah in the Quran and let Allah guide your path.
            </Text>
          </View>

          {/* ── Vision Focus Board ─────────────────────────────────── */}
          <TouchableOpacity
            onPress={pickVisionImage}
            activeOpacity={0.85}
            style={[glass, {
              marginBottom: 28,
              padding: 0,
              overflow: 'hidden',
              minHeight: isCompact ? 220 : 280,
              alignItems: 'center',
              justifyContent: 'center',
            }]}
          >
            {visionImage ? (
              <Image
                source={{ uri: visionImage }}
                style={{ width: '100%', height: isCompact ? 240 : 320, borderRadius: 32 } as any}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.captureBoard}>
                <Text style={styles.captureIcon}>📷</Text>
                <Text style={styles.captureTitle}>Capture Inspiration</Text>
                <Text style={styles.captureSubtext}>Upload a visual reminder for the goal you want to pursue.</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Soul's Intention ───────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Your Niyyah</Text>
            <TouchableOpacity onPress={() => startVoiceRecording('intention')} disabled={isRecording}>
              <Text style={[styles.voiceLabel, recordingTarget === 'intention' && { color: '#ac3149' }]}>
                {recordingTarget === 'intention' ? '⏺ Recording...' : '🎙 Voice Record'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[glass, styles.intentionCard, isCompact && styles.intentionCardCompact]}>
            <TextInput
              style={styles.intentionInput}
              placeholder="Write your niyyah — what do you sincerely intend for the sake of Allah?"
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
            <Text style={[styles.gratitudeTitle, isCompact && styles.gratitudeTitleCompact]}>What are you grateful for today?</Text>
            <View style={styles.gratitudeLine} />
          </View>
          <View style={[glass, styles.gratitudePromptCard]}>
            <Text style={styles.gratitudePromptText}>
              Fill all 3 rows to train your heart in daily gratitude and mindful reflection.
            </Text>
            <Text style={styles.gratitudeVerseText}>
              "If you are grateful, I will surely increase you (in favor)." (QS. Ibrahim: 7)
            </Text>
            <View style={[styles.gratitudeControlRow, isCompact && styles.gratitudeControlRowCompact]}>
              <View style={styles.gratitudeSelectorWrap}>
                {[0, 1, 2].map((idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setActiveGratitudeIndex(idx)}
                    style={[
                      styles.gratitudeSelectorChip,
                      activeGratitudeIndex === idx && styles.gratitudeSelectorChipActive,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.gratitudeSelectorText,
                        activeGratitudeIndex === idx && styles.gratitudeSelectorTextActive,
                      ]}
                    >
                      Row 0{idx + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => startVoiceRecording('gratitude')}
                disabled={isRecording}
                style={styles.gratitudeGlobalMicButton}
                activeOpacity={0.85}
              >
                <Text style={[styles.gratitudeGlobalMicText, recordingTarget === 'gratitude' && { color: '#ac3149' }]}>
                  {recordingTarget === 'gratitude'
                    ? `⏺ Recording Row 0${activeGratitudeIndex + 1}`
                    : `🎙 Voice to Row 0${activeGratitudeIndex + 1}`}
                </Text>
              </TouchableOpacity>
            </View>
            {hasGratitudeEntry ? (
              <Text style={styles.gratitudeHadithText}>
                "How wonderful is the affair of the believer... if he is blessed, he is grateful, and that is good for him." (HR. Muslim)
              </Text>
            ) : null}
          </View>
          {['Something I am grateful for...', 'Another blessing today...', 'A final moment of gratitude...'].map(
            (ph, i) => (
              <View key={i} style={[glass, styles.gratitudeRow, activeGratitudeIndex === i && styles.gratitudeRowActive]}>
                <Text style={styles.gratitudeNum}>0{i + 1}</Text>
                <TextInput
                  style={styles.gratitudeInput}
                  placeholder={ph}
                  placeholderTextColor="rgba(91,95,101,0.4)"
                  value={gratitude[i]}
                  onChangeText={(v) => setGratitudeAt(i, v)}
                  onFocus={() => setActiveGratitudeIndex(i)}
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
              {loading ? 'Analyzing...' : 'Get Quranic Guidance  →'}
            </Text>
          </TouchableOpacity>

          {/* ── Feedback ───────────────────────────────────────────── */}
          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => {
                if (intentionText.trim()) {
                  void handleSubmit();
                  return;
                }
                void fetchHistory().catch(() => { });
              }}
            />
          )}
          {loading && <LoadingSpinner message="Analyzing your intention with AI..." />}

          {/* ── AI Result ──────────────────────────────────────────── */}
          {result && !loading && (
            <View style={styles.resultSection}>
              <Text style={styles.subSectionTitle}>AI Guidance Rooted in Quran and Sunnah</Text>
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
                      {verse.arabicText ? (
                        <Text style={styles.verseArabic}>{verse.arabicText}</Text>
                      ) : null}
                      <Text style={styles.verseText}>"{verse.text}"</Text>
                      <Text style={styles.verseRef}>
                        {verse.surahName} {verse.surahNumber}:{verse.ayahNumber}
                      </Text>
                      {verse.tafsirSnippet ? (
                        <View style={styles.tafsirBox}>
                          <Text style={styles.tafsirLabel}>English explanation</Text>
                          <Text style={styles.tafsirText}>{verse.tafsirSnippet}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                  <Text style={styles.referenceNote}>
                    References are retrieved through Quran API with MCP Quran fallback when needed.
                  </Text>
                </>
              )}

              {result.suggestedActions && result.suggestedActions.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Suggested Actions You Can Start Today</Text>
                  {result.suggestedActions.map((action, idx) => (
                    <View key={idx} style={styles.actionRow}>
                      <Text style={styles.actionDot}>·</Text>
                      <View style={styles.actionContent}>
                        <Text style={styles.actionText}>{action.title}</Text>
                        {action.guidance ? (
                          <Text style={styles.actionGuidance}>{action.guidance}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity
                style={styles.secondaryCtaButton}
                onPress={handleContinueToDuaTodo}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryCtaText}>Continue to Dua-to-Do</Text>
              </TouchableOpacity>
            </View>
          )}

          {history.length > 0 ? (
            <View style={styles.historySection}>
              <Text style={styles.subSectionTitle}>Saved Niyyah</Text>
              {history.map((item) => (
                <View key={item.id} style={[glass, styles.historyCard]}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyIntent} numberOfLines={2}>{item.text}</Text>
                    <View style={[
                      styles.historyBadge,
                      item.isAchieved
                        ? { backgroundColor: 'rgba(169,247,183,0.45)' }
                        : (item.completedTasks || 0) > 0
                          ? { backgroundColor: 'rgba(254,243,215,0.75)' }
                          : { backgroundColor: 'rgba(226,221,248,0.7)' },
                    ]}>
                      <Text style={styles.historyBadgeText}>
                        {item.isAchieved ? 'Achieved' : (item.completedTasks || 0) > 0 ? 'In Progress' : 'Saved'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historySummary} numberOfLines={3}>{item.encouragement}</Text>
                  <Text style={styles.historyMeta}>
                    {(item.completedTasks || 0)}/{item.totalTasks || 0} tasks completed
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ height: 120 }} />
        </View>
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
    paddingBottom: 40,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
    marginBottom: 22,
    paddingVertical: 2,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(226,221,248,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconSpacer: {
    width: 40,
    height: 40,
  },
  brandTitle: {
    fontSize: 17,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    fontWeight: '600' as const,
    color: '#1e2024',
    opacity: 0.95,
  },
  // hero
  hero: {
    marginBottom: 32,
  },
  displayHeadline: {
    fontSize: Platform.OS === 'web' ? 68 : 52,
    lineHeight: Platform.OS === 'web' ? 74 : 58,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    marginBottom: 10,
  },
  displayHeadlineCompact: {
    fontSize: 34,
    lineHeight: 40,
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
  intentionCardCompact: {
    padding: 20,
  },
  captureBoard: {
    width: '100%',
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  captureIcon: {
    fontSize: 22,
  },
  captureTitle: {
    fontFamily: 'Newsreader',
    fontSize: 32,
    lineHeight: 38,
    fontStyle: 'italic',
    color: C.primaryDim,
    fontWeight: '600',
    textAlign: 'center',
  },
  captureSubtext: {
    fontFamily: 'Noto Serif',
    fontSize: 14,
    lineHeight: 24,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 420,
  },
  intentionInput: {
    flex: 1,
    fontSize: 20,
    lineHeight: 30,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  // gratitude
  gratitudeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  gratitudeLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.outlineVariant,
    opacity: 0.3,
  },
  gratitudeTitle: {
    fontSize: 37,
    lineHeight: 44,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurface,
    flexShrink: 1,
    textAlign: 'center',
  },
  gratitudeTitleCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  gratitudePromptCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 10,
  },
  gratitudePromptText: {
    fontSize: 12,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600' as const,
  },
  gratitudeVerseText: {
    fontSize: 13,
    lineHeight: 20,
    color: C.tertiary,
    fontFamily: 'Noto Serif',
    fontStyle: 'italic' as const,
  },
  gratitudeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  gratitudeControlRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  gratitudeSelectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gratitudeSelectorChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(226,221,248,0.55)',
  },
  gratitudeSelectorChipActive: {
    backgroundColor: 'rgba(169,247,183,0.55)',
  },
  gratitudeSelectorText: {
    fontSize: 11,
    letterSpacing: 0.4,
    color: C.primaryDim,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700' as const,
  },
  gratitudeSelectorTextActive: {
    color: C.tertiary,
  },
  gratitudeGlobalMicButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(226,221,248,0.55)',
  },
  gratitudeGlobalMicText: {
    fontSize: 11,
    letterSpacing: 0.4,
    color: C.primaryDim,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700' as const,
  },
  gratitudeHadithText: {
    fontSize: 12,
    lineHeight: 19,
    color: C.onSurfaceVariant,
    fontFamily: 'Noto Serif',
    fontStyle: 'italic' as const,
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
  gratitudeRowActive: {
    borderWidth: 1,
    borderColor: 'rgba(32,108,58,0.28)',
    backgroundColor: 'rgba(169,247,183,0.14)',
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
  verseArabic: {
    fontSize: 26,
    lineHeight: 48,
    color: C.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'Amiri',
    marginBottom: 12,
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
  tafsirBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(226,221,248,0.22)',
  },
  tafsirLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: C.primaryDim,
    marginBottom: 6,
  },
  tafsirText: {
    fontSize: 14,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    fontFamily: 'Noto Serif',
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
    fontSize: 15,
    lineHeight: 23,
    color: C.onSurface,
    fontFamily: 'Noto Serif',
  },
  actionContent: {
    flex: 1,
    gap: 4,
  },
  actionGuidance: {
    fontSize: 12,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    fontFamily: 'Plus Jakarta Sans',
  },
  referenceNote: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    opacity: 0.9,
    marginBottom: 8,
    fontFamily: 'Plus Jakarta Sans',
  },
  secondaryCtaButton: {
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: C.tertiary,
    borderWidth: 1.5,
    borderColor: '#1c8d47',
  },
  secondaryCtaText: {
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#ecfff1',
  },
  historySection: {
    marginTop: 24,
    gap: 12,
  },
  historyCard: {
    padding: 18,
    gap: 10,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyIntent: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    color: C.onSurface,
    fontFamily: 'Newsreader',
    fontStyle: 'italic',
  },
  historyBadge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.primaryDim,
  },
  historySummary: {
    fontSize: 14,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    fontFamily: 'Noto Serif',
  },
  historyMeta: {
    fontSize: 12,
    color: C.tertiary,
    fontWeight: '600',
    fontFamily: 'Plus Jakarta Sans',
  },
});