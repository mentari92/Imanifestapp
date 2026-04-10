import { View, Text, Pressable } from "react-native";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { VerseCard } from "./VerseCard";
import type { QuranVerse } from "@imanifest/shared";

interface ImanSyncResultProps {
  verses: QuranVerse[];
  aiSummary: string;
  manifestationId: string;
}

export function ImanSyncResult({ verses, aiSummary, manifestationId }: ImanSyncResultProps) {
  const router = useRouter();

  if (verses.length === 0) return null;

  const handleGeneratePlan = () => {
    router.push({
      pathname: "/(tabs)/dua-todo",
      params: { manifestationId },
    });
  };

  return (
    <View className="mt-section">
      {/* AI Summary */}
      <View className="bg-surface rounded-verse p-card-p border-l-2 border-highlight shadow-gold mb-section">
        <Text className="font-sans text-body-md text-ink-secondary mb-2">
          Spiritual Validation
        </Text>
        <Text className="font-sans text-body-lg text-text-primary leading-[1.6]">
          {aiSummary}
        </Text>
      </View>

      {/* Section header */}
      <View className="flex-row items-center gap-2 mb-4">
        <BookOpen size={20} color="#064E3B" />
        <Text className="font-display text-display-md text-primary">
          Your Verses
        </Text>
      </View>

      {/* Verse cards */}
      <View className="gap-4">
        {verses.map((verse, index) => (
          <VerseCard key={verse.verseKey || index} verse={verse} />
        ))}
      </View>

      {/* Generate Action Plan button */}
      <Pressable
        onPress={handleGeneratePlan}
        className="mt-section bg-primary rounded-2xl px-6 py-4 flex-row items-center justify-center active:opacity-80"
      >
        <Sparkles size={20} color="#E3C567" />
        <Text className="font-sans text-body-md text-white ml-2 font-semibold">
          Generate Action Plan
        </Text>
        <ArrowRight size={18} color="#E3C567" style={{ marginLeft: 8 }} />
      </Pressable>
    </View>
  );
}