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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDuaToDo } from '../../hooks/useDuaToDo';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import { colors } from '../../constants/theme';

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
    } catch (err) {
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
    } catch (err) {
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
          <Text style={styles.title}>🤲 Dua To-Do</Text>
          <Text style={styles.subtitle}>
            Turn your duas into actionable tasks with AI guidance
          </Text>
        </View>

        {/* Intention Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Your Dua / Intention</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., I want to become closer to Allah through daily Quran reading..."
            placeholderTextColor={colors.textSecondary}
            value={intention}
            onChangeText={setIntention}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Generating...' : '🤲 Generate Action Tasks'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && <ErrorMessage message={error} />}

        {/* Loading */}
        {loading && (
          <LoadingSpinner message="AI is generating your tasks..." />
        )}

        {/* Relevant Verses */}
        {verses && verses.length > 0 && (
          <View style={styles.versesSection}>
            <Text style={styles.sectionTitle}>📖 Related Quran Verses</Text>
            {verses.map((verse, index) => (
              <View key={verse.number || index} style={styles.verseCard}>
                <Text style={styles.verseText}>"{verse.text}"</Text>
                <Text style={styles.verseRef}>
                  {verse.surahName} {verse.surahNumber}:{verse.ayahNumber}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tasks List */}
        {tasks && tasks.length > 0 && (
          <View style={styles.tasksSection}>
            <Text style={styles.sectionTitle}>
              ✅ Your Tasks ({tasks.filter((t) => t.completed).length}/
              {tasks.length})
            </Text>
            {tasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    task.completed && styles.checkboxCompleted,
                  ]}
                  onPress={() =>
                    handleToggleComplete(task.id, task.completed)
                  }
                >
                  {task.completed && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleCompleted,
                  ]}
                >
                  {task.title}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(task.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
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
    minHeight: 100,
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
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500' as const,
    fontFamily: 'Inter-Medium',
  },
  tasksSection: {
    marginBottom: 16,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontFamily: 'Inter-Regular',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through' as const,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteText: {
    fontSize: 20,
    color: colors.error,
    fontWeight: '700' as const,
  },
};