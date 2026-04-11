import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Mic, Keyboard, RotateCcw } from "lucide-react-native";
import { useHeartPulse } from "../../hooks/useHeartPulse";
import { VoiceRecorder } from "../../components/heart-pulse/VoiceRecorder";
import { SentimentBadge } from "../../components/heart-pulse/SentimentBadge";
import { StreakCard } from "../../components/heart-pulse/StreakCard";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { ErrorMessage } from "../../components/shared/ErrorMessage";

type InputMode = "text" | "voice";

export default function HeartPulseScreen() {
  const [reflectionText, setReflectionText] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const {
    reflection,
    sentiment,
    sentimentScore,
    streakCount,
    history,
    historyLoading,
    isLoading,
    error,
    submitTextReflection,
    submitVoiceReflection,
    fetchHistory,
    reset,
  } = useHeartPulse();
  const [submitted, setSubmitted] = useState(false);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSubmitText = async () => {
    if (!reflectionText.trim()) return;
    await submitTextReflection(reflectionText.trim());
    setSubmitted(true);
  };

  const handleSubmitVoice = async (audioUri: string, transcriptText: string) => {
    await submitVoiceReflection(audioUri, transcriptText);
    setSubmitted(true);
  };

  const handleReset = () => {
    reset();
    setReflectionText("");
    setSubmitted(false);
  };

  // Result view — same for both text and voice
  if (submitted && reflection) {
    return (
      <ScrollView className="flex-1 bg-background px-screen-x py-6">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-display-lg text-primary">
            Reflection
          </Text>
          <Pressable onPress={handleReset} className="p-2">
            <RotateCcw size={20} color="#78716C" />
          </Pressable>
        </View>

        {/* Sentiment Badge */}
        {sentiment && (
          <View className="mt-4">
            <SentimentBadge sentiment={sentiment} score={sentimentScore} />
          </View>
        )}

        {/* Transcript */}
        <View className="mt-6 bg-surface rounded-2xl px-4 py-4 border border-border">
          <Text className="font-sans text-body-sm text-ink-secondary mb-2">
            Your reflection:
          </Text>
          <Text className="font-sans text-body-md text-ink-primary">
            {reflection.transcriptText}
          </Text>
        </View>

        {/* Streak Card */}
        <StreakCard streakCount={streakCount} />

        {/* Sentiment History */}
        <HistorySection history={history} historyLoading={historyLoading} />
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background px-screen-x py-6">
      <Text className="font-display text-display-lg text-primary">
        HeartPulse
      </Text>
      <Text className="font-sans text-body-md text-ink-secondary mt-2">
        Journal your spiritual heartbeat.
      </Text>

      {/* Streak Card — always visible */}
      <StreakCard streakCount={streakCount} loading={historyLoading} />

      {/* Mode Toggle */}
      <View className="mt-6 flex-row bg-surface rounded-2xl p-1 border border-border">
        <TouchableOpacity
          onPress={() => setInputMode("text")}
          className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${
            inputMode === "text" ? "bg-primary" : ""
          }`}
        >
          <Keyboard size={16} color={inputMode === "text" ? "#FFFFFF" : "#78716C"} />
          <Text
            className={`font-sans text-body-sm font-semibold ${
              inputMode === "text" ? "text-white" : "text-ink-secondary"
            }`}
          >
            Teks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setInputMode("voice")}
          className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${
            inputMode === "voice" ? "bg-primary" : ""
          }`}
        >
          <Mic size={16} color={inputMode === "voice" ? "#FFFFFF" : "#78716C"} />
          <Text
            className={`font-sans text-body-sm font-semibold ${
              inputMode === "voice" ? "text-white" : "text-ink-secondary"
            }`}
          >
            Suara
          </Text>
        </TouchableOpacity>
      </View>

      {error && <ErrorMessage message={error} />}

      {/* Text Mode */}
      {inputMode === "text" && (
        <>
          <View className="mt-6">
            <Text className="font-sans text-body-sm text-ink-secondary mb-2">
              How are you feeling today?
            </Text>
            <TextInput
              value={reflectionText}
              onChangeText={setReflectionText}
              placeholder="Write your reflection here..."
              multiline
              numberOfLines={5}
              className="bg-surface rounded-xl px-4 py-3 font-sans text-body-md text-ink-primary border border-border min-h-[120]"
              placeholderTextColor="#78716C"
              textAlignVertical="top"
            />
          </View>

          <Pressable
            onPress={handleSubmitText}
            disabled={isLoading || !reflectionText.trim()}
            className="mt-6 bg-primary rounded-2xl px-6 py-4 flex-row items-center justify-center active:opacity-80 disabled:opacity-50"
          >
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                <Mic size={20} color="#E3C567" />
                <Text className="font-sans text-body-md text-white ml-2 font-semibold">
                  Submit Reflection
                </Text>
              </>
            )}
          </Pressable>
        </>
      )}

      {/* Voice Mode */}
      {inputMode === "voice" && (
        <VoiceRecorder onSubmit={handleSubmitVoice} isLoading={isLoading} />
      )}

      {/* Sentiment History — visible in input view too */}
      <HistorySection history={history} historyLoading={historyLoading} />
    </ScrollView>
  );
}

/** Reusable history section — used in both input and result views */
function HistorySection({
  history,
  historyLoading,
}: {
  history: Array<{
    id: string;
    sentiment: string | null;
    sentimentScore: number | null;
    transcriptText: string | null;
    createdAt: string;
  }>;
  historyLoading: boolean;
}) {
  return (
    <View className="mt-6">
      <Text className="font-display text-display-md text-primary mb-3">
        Recent Reflections
      </Text>
      {historyLoading ? (
        <LoadingSpinner />
      ) : history.length === 0 ? (
        <Text className="font-sans text-body-sm text-ink-secondary">
          No reflections yet.
        </Text>
      ) : (
        <View className="gap-3">
          {history.slice(0, 7).map((r) => (
            <View
              key={r.id}
              className="bg-surface rounded-xl px-4 py-3 border border-border"
            >
              <View className="flex-row items-center justify-between">
                <SentimentBadge
                  sentiment={r.sentiment ?? "other"}
                  score={r.sentimentScore}
                  size="sm"
                />
                <Text className="font-mono text-xs text-ink-secondary">
                  {new Date(r.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {r.transcriptText && (
                <Text
                  className="font-sans text-body-sm text-ink-secondary mt-2"
                  numberOfLines={2}
                >
                  {r.transcriptText}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}