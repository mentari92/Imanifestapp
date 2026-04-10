import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Mic, Keyboard, Flame, RotateCcw } from "lucide-react-native";
import { useHeartPulse } from "../../hooks/useHeartPulse";
import { VoiceRecorder } from "../../components/heart-pulse/VoiceRecorder";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { ErrorMessage } from "../../components/shared/ErrorMessage";

type InputMode = "text" | "voice";

const SENTIMENT_COLORS: Record<string, { bg: string; text: string }> = {
  hopeful: { bg: "bg-emerald-100", text: "text-emerald-800" },
  grateful: { bg: "bg-amber-100", text: "text-amber-800" },
  peaceful: { bg: "bg-teal-100", text: "text-teal-800" },
  content: { bg: "bg-green-100", text: "text-green-800" },
  focused: { bg: "bg-blue-100", text: "text-blue-800" },
  anxious: { bg: "bg-rose-100", text: "text-rose-800" },
  struggling: { bg: "bg-red-100", text: "text-red-800" },
  uncertain: { bg: "bg-orange-100", text: "text-orange-800" },
  heavy: { bg: "bg-stone-100", text: "text-stone-800" },
  other: { bg: "bg-gray-100", text: "text-gray-800" },
};

export default function HeartPulseScreen() {
  const [reflectionText, setReflectionText] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const {
    reflection,
    sentiment,
    sentimentScore,
    streakCount,
    isLoading,
    error,
    submitTextReflection,
    submitVoiceReflection,
    reset,
  } = useHeartPulse();
  const [submitted, setSubmitted] = useState(false);

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

  const colors = sentiment ? SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.other : null;

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
        {sentiment && colors && (
          <View className={`mt-4 self-start rounded-full px-4 py-2 ${colors.bg}`}>
            <Text className={`font-sans text-body-sm font-semibold capitalize ${colors.text}`}>
              {sentiment}
            </Text>
          </View>
        )}

        {/* Score bar */}
        {sentimentScore !== null && (
          <View className="mt-3">
            <View className="flex-row items-center">
              <View className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.round(sentimentScore * 100)}%` }}
                />
              </View>
              <Text className="font-sans text-body-sm text-ink-secondary ml-3">
                {Math.round(sentimentScore * 100)}%
              </Text>
            </View>
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
        <View className="mt-6 bg-primary rounded-2xl px-5 py-4 flex-row items-center">
          <Flame size={24} color="#E3C567" />
          <View className="ml-3">
            <Text className="font-sans text-body-sm text-white/70">
              Current Streak
            </Text>
            <Text className="font-display text-display-md text-white">
              {streakCount} {streakCount === 1 ? "day" : "days"}
            </Text>
          </View>
        </View>
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
    </ScrollView>
  );
}