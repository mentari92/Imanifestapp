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
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  successSoft: '#edf8ef',
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
  const router = useRouter();
  const { manifestationId } = useLocalSearchParams<{ manifestationId?: string }>();
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
    fetchTasks(typeof manifestationId === 'string' ? manifestationId : undefined).catch(() => {});
  }, [fetchTasks, manifestationId]);

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
  const firstPendingIndex = tasks.findIndex((task) => !task.completed);
  const activeIndex = firstPendingIndex === -1 ? tasks.length - 1 : firstPendingIndex;

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
        <View style={styles.contentWrap}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.brandTitle}>Dua-to-Do</Text>
          </View>

          {/* ── Hero ───────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <Text style={styles.displayHeadline}>
              {totalCount > 0
                ? `${totalCount} Steps to Manifest your Intention`
                : 'Turn your Duas into Actionable Steps'}
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
                  <svg width="96" height="96" viewBox="0 0 96 96" style={{ display: 'block' } as any}>
                    <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="#eceef3" strokeWidth="6" />
                    <circle
                      cx="48" cy="48" r={RADIUS} fill="none"
                      stroke={C.tertiary} strokeWidth="6"
                      strokeDasharray={CIRCUM} strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' } as any}
                    />
                    <text x="48" y="53" textAnchor="middle" fill={C.tertiary} fontSize="14" fontWeight="700" fontFamily="system-ui">
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

          {/* ── Intention Input (only when no tasks) ─────────────── */}
          {totalCount === 0 && (
            <>
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
                style={[styles.ctaButtonFull, loading && styles.ctaDisabled]}
                onPress={handleGenerate}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>
                  {loading ? 'Generating...' : 'Add to Daily Tasks'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Feedback ─────────────────────────────────────────── */}
          {error && <ErrorMessage message={error} />}
          {loading && <LoadingSpinner message="AI is generating your tasks..." />}

          {/* ── Task Checklist ──────────────────────────────────────── */}
          {tasks && tasks.length > 0 && (
            <View style={styles.tasksSection}>
              {tasks.map((task, idx) => {
                const isActive = idx === activeIndex && !task.completed;
                const isPending = !task.completed && !isActive;
                const completedAt = task.updatedAt && task.completed ? task.updatedAt : null;
                const completedLabel = completedAt
                  ? new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : null;

                if (isActive) {
                  // ── Active task: glass card, left green border, indented
                  return (
                    <View key={task.id} style={[glass, styles.taskRowActive]}>
                      <TouchableOpacity
                        style={styles.taskCircleOutline}
                        onPress={() => handleToggleComplete(task.id, task.completed)}
                        activeOpacity={0.75}
                      />
                      <View style={styles.taskContent}>
                        <Text style={styles.taskTitleActive}>{task.title}</Text>
                        {task.guidance ? (
                          <Text style={styles.taskGuidance}>{task.guidance}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                }

                if (task.completed) {
                  // ── Completed task: filled green circle, strikethrough title
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={styles.taskRow}
                      onPress={() => handleToggleComplete(task.id, task.completed)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.taskCircleDone}>
                        <Text style={styles.taskCheckMark}>✓</Text>
                      </View>
                      <View style={styles.taskContent}>
                        <Text style={styles.taskTitleDone}>{task.title}</Text>
                        <Text style={styles.taskMeta}>
                          Completed at {completedLabel || '--:--'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }

                // ── Pending task: faint outline circle, opacity 50%
                return (
                  <View key={task.id} style={[styles.taskRow, styles.taskRowPending]}>
                    <View style={styles.taskCirclePending} />
                    <View style={styles.taskContent}>
                      <Text style={styles.taskTitlePending}>{task.title}</Text>
                      <Text style={styles.taskMeta}>Unlocks after Task {idx}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Bottom CTA ──────────────────────────────────────────── */}
          {totalCount > 0 && (
            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/(tabs)/tafakkur')}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaIcon}>✓</Text>
                <Text style={styles.ctaText}>Add to Daily Tasks</Text>
              </TouchableOpacity>
            </View>
          )}

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
    maxWidth: 520,
    alignSelf: 'center',
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingVertical: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    fontWeight: '600' as const,
    color: '#1e2024',
  },
  // hero
  hero: {
    marginBottom: 30,
  },
  displayHeadline: {
    fontSize: Platform.OS === 'web' ? 70 : 54,
    lineHeight: Platform.OS === 'web' ? 74 : 58,
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
    borderRadius: 28,
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
    fontSize: 28,
    fontFamily: 'Newsreader',
    fontStyle: 'italic' as const,
    color: C.onSurfaceVariant,
    lineHeight: 36,
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
    borderRadius: 28,
  },
  intentionInput: {
    fontSize: 17,
    lineHeight: 26,
    fontFamily: 'Noto Serif',
    color: C.onSurface,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  // CTA full-width (empty state)
  ctaButtonFull: {
    backgroundColor: C.tertiary,
    borderRadius: 9999,
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  // CTA row (right-aligned, tasks state — matches reference)
  ctaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    marginTop: 32,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#166534',
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.30,
    shadowRadius: 32,
    elevation: 8,
  },
  ctaIcon: {
    color: '#e8ffe8',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  ctaText: {
    color: '#e8ffe8',
    fontSize: 14,
    letterSpacing: 0.8,
    fontWeight: '700' as const,
    fontFamily: 'Plus Jakarta Sans',
  },
  // tasks
  tasksSection: {
    gap: 0,
    marginBottom: 0,
  },
  // Completed/pending task row — plain, no card
  taskRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 12,
    gap: 20,
  },
  // Pending task opacity
  taskRowPending: {
    opacity: 0.50,
  },
  // Active task: glass card, indented, left green border
  taskRowActive: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 20,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: Platform.OS === 'web' ? 24 : 8,
    borderLeftWidth: 4,
    borderLeftColor: '#166534',
    borderRadius: 24,
    gap: 20,
  },
  // Completed: large filled green circle w-10 h-10
  taskCircleDone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.tertiary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0 as const,
    marginTop: 2,
    shadowColor: C.tertiary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  // Active: large outlined circle
  taskCircleOutline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(119,123,129,0.35)',
    backgroundColor: 'transparent',
    flexShrink: 0 as const,
    marginTop: 2,
  },
  // Pending: large faint circle
  taskCirclePending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(119,123,129,0.20)',
    backgroundColor: 'transparent',
    flexShrink: 0 as const,
    marginTop: 2,
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
  // Completed title: Noto Serif, line-through, muted
  taskTitleDone: {
    fontSize: 18,
    fontFamily: 'Noto Serif',
    color: C.onSurfaceVariant,
    opacity: 0.6,
    textDecorationLine: 'line-through' as const,
    lineHeight: 26,
  },
  // Active title: Noto Serif, larger, medium weight
  taskTitleActive: {
    fontSize: 20,
    fontFamily: 'Noto Serif',
    fontWeight: '500' as const,
    color: C.onSurface,
    lineHeight: 28,
  },
  // Pending title: Noto Serif, normal
  taskTitlePending: {
    fontSize: 18,
    fontFamily: 'Noto Serif',
    color: C.onSurface,
    lineHeight: 26,
  },
  taskMeta: {
    fontSize: 13,
    fontFamily: 'Plus Jakarta Sans',
    color: '#777b81',
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  // AI guidance shown below active task title
  taskGuidance: {
    fontSize: 13,
    fontFamily: 'Plus Jakarta Sans',
    color: C.onSurfaceVariant,
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 280,
  },
});

