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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDuaToDo } from '../../hooks/useDuaToDo';
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
        borderColor: 'rgba(255,255,255,0.30)',
      } as any)
    : {}),
};

export default function DuaTodoScreen() {
  const insets = useSafeAreaInsets();
  const {
    loading,
    error,
    tasks,
    verses,
    generateTasks,
    fetchTasks,
    completeTask,
    uncompleteTask,
    deleteTask,
  } = useDuaToDo();
  const [intention, setIntention] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleGenerate = async () => {
    if (!intention.trim()) {
      Alert.alert('Please enter your dua or intention');
      return;
    }
    try {
      await generateTasks(intention.trim());
    } catch (_) {
      // Error handled in hook
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      if (completed) {
        await uncompleteTask(taskId);
      } else {
        await completeTask(taskId);
      }
    } catch (_) {
      Alert.alert('Failed to update task');
    }
  };

  const handleDelete = (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask(taskId),
      },
    ]);
  };

  const completedCount = tasks?.filter((t) => t.completed).length ?? 0;
  const totalCount = tasks?.length ?? 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // SVG progress ring values
  const RADIUS = 40;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUM - (progressPct / 100) * CIRCUM;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Holographic blobs ───────────────────────────────────── */}
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
          <Text style={styles.brandTitle}>Dua-to-Do</Text>
          <View style={styles.bellPlaceholder} />
        </View>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.displayHeadline}>
            {totalCount > 0
              ? `${totalCount} Steps to Manifest\nyour Intention`
              : 'Turn your Duas into\nActionable Steps'}
          </Text>
        </View>

        {/* ── Progress Bento (only when tasks exist) ─────────────── */}
        {totalCount > 0 && (
          <View style={[glass, styles.progressCard]}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressLabel}>Journey Status</Text>
              <Text style={styles.progressValue}>
                {completedCount}/{totalCount} Steps Completed
              </Text>
            </View>
            {Platform.OS === 'web' ? (
              <View style={styles.ringWrap}>
                {/* SVG ring on web */}
                <svg
                  width="96"
                  height="96"
                  viewBox="0 0 96 96"
                  style={{ display: 'block' } as any}
                >
                  <circle
                    cx="48"
                    cy="48"
                    r={RADIUS}
                    fill="none"
                    stroke="#eceef3"
                    strokeWidth="6"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={RADIUS}
                    fill="none"
                    stroke={C.tertiary}
                    strokeWidth="6"
                    strokeDasharray={CIRCUM}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' } as any}
                  />
                  <text
                    x="48"
                    y="53"
                    textAnchor="middle"
                    fill={C.tertiary}
                    fontSize="14"
                    fontWeight="700"
                    fontFamily="system-ui"
                  >
                    {progressPct}%
                  </text>
                </svg>
              </View>
            ) : (
              <View style={styles.ringNative}>
                <Text style={styles.ringPctText}>{progressPct}%</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Intention Input ─────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Your Dua / Intention</Text>
        </View>
        <View style={[glass, styles.inputCard]}>
          <TextInput
            style={styles.intentionInput}
            placeholder="e.g., I want to become closer to Allah through daily Quran reading..."
            placeholderTextColor="rgba(91,95,101,0.4)"
            value={intention}
            onChangeText={setIntention}
            multiline
            textAlignVertical="top"
          />
        </View>
        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaDisabled]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {loading ? 'Generating...' : 'Add to Daily Tasks'}
          </Text>
        </TouchableOpacity>

        {/* ── Feedback ───────────────────────────────────────────── */}
        {error && <ErrorMessage message={error} />}
        {loading && <LoadingSpinner message="AI is generating your tasks..." />}

        {/* ── Related Verses ──────────────────────────────────────── */}
        {verses && verses.length > 0 && (
          <View style={styles.versesSection}>
            <Text style={styles.subSectionTitle}>Related Quran Verses</Text>
            {verses.map((verse, idx) => (
              <View key={verse.number || idx} style={[glass, styles.verseCard]}>
                <Text style={styles.verseText}>"{verse.text}"</Text>
                <Text style={styles.verseRef}>
                  {verse.surahName} {verse.surahNumber}:{verse.ayahNumber}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Task Checklist ──────────────────────────────────────── */}
        {tasks && tasks.length > 0 && (
          <View style={styles.tasksSection}>
            {tasks.map((task, idx) => {
              const isActive = !task.completed && idx === tasks.findIndex((t) => !t.completed);
              const isPending = !task.completed && !isActive;

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskRow,
                    isActive && [glass, styles.taskRowActive],
                    isPending && styles.taskRowPending,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.taskCheck,
                      task.completed && styles.taskCheckDone,
                    ]}
                    onPress={() => handleToggleComplete(task.id, task.completed)}
                    activeOpacity={0.75}
                  >
                    {task.completed && <Text style={styles.taskCheckMark}>✓</Text>}
                  </TouchableOpacity>

                  <View style={styles.taskContent}>
                    <Text
                      style={[
                        styles.taskTitle,
                        task.completed && styles.taskTitleDone,
                      ]}
                    >
                      {task.title}
                    </Text>
                    {task.completed && (
                      <Text style={styles.taskMeta}>Completed</Text>
                    )}
                    {isPending && (
                      <Text style={styles.taskMeta}>
                        Unlocks after previous task
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(task.id)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
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
  blobTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    opacity: 0.42,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}),
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: -70,
    width: 300,
    height: 300,
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
    marginBottom: 28,
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
    marginBottom: 24,
  },
  displayHeadline: {
    fontSize: 48,
    lineHeight: 54,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurface,
  },
  // progress card
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 28,
    marginBottom: 28,
    overflow: 'hidden',
  },
  progressLeft: {
    flex: 1,
    gap: 6,
  },
  progressLabel: {
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    fontWeight: '700' as const,
    color: C.onSurfaceVariant,
  },
  progressValue: {
    fontSize: 26,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurfaceVariant,
    lineHeight: 34,
  },
  ringWrap: {
    width: 96,
    height: 96,
  },
  ringNative: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: C.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPctText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: C.tertiary,
  },
  // input
  sectionHeader: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    color: C.onSurfaceVariant,
    fontWeight: '700' as const,
  },
  inputCard: {
    padding: 20,
    marginBottom: 14,
  },
  intentionInput: {
    fontSize: 17,
    lineHeight: 26,
    fontFamily: 'Noto Serif',
    color: C.onSurface,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  // CTA
  ctaButton: {
    backgroundColor: C.tertiary,
    borderRadius: 9999,
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
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
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    fontWeight: '700' as const,
  },
  // verses
  versesSection: {
    marginBottom: 24,
  },
  subSectionTitle: {
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: C.onSurfaceVariant,
    fontWeight: '700' as const,
    marginBottom: 12,
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
  // tasks
  tasksSection: {
    gap: 0,
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 18,
    gap: 20,
  },
  taskRowActive: {
    padding: 22,
    marginHorizontal: -4,
    marginBottom: 4,
    borderLeftWidth: 4,
    borderLeftColor: C.tertiary,
    borderRadius: 24,
  },
  taskRowPending: {
    opacity: 0.45,
  },
  taskCheck: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(119,123,129,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  taskCheckDone: {
    backgroundColor: C.tertiary,
    borderColor: C.tertiary,
    shadowColor: C.tertiary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  taskCheckMark: {
    color: '#e8ffe8',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  taskContent: {
    flex: 1,
    paddingBottom: 4,
  },
  taskTitle: {
    fontSize: 19,
    fontFamily: 'Noto Serif',
    color: C.onSurface,
    lineHeight: 27,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through' as const,
    color: C.onSurfaceVariant,
    opacity: 0.6,
  },
  taskMeta: {
    fontSize: 12,
    color: C.outlineVariant,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  deleteBtn: {
    paddingTop: 6,
    paddingLeft: 4,
  },
  deleteBtnText: {
    fontSize: 22,
    color: C.error,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
});

