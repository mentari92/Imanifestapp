import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { BookOpen, Sparkles, ArrowRight, Share2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { VerseCard } from "./VerseCard";
import { colors } from "../../constants/theme";
import type { QuranVerse } from "@imanifest/shared";

interface ImanifestResultProps {
  verses: QuranVerse[];
  aiSummary: string;
  manifestationId: string;
}

export function ImanifestResult({ verses, aiSummary, manifestationId }: ImanifestResultProps) {
  const router = useRouter();

  if (verses.length === 0) return null;

  const handleGeneratePlan = () => {
    router.push({
      pathname: "/(tabs)/dua-todo",
      params: { manifestationId },
    });
  };

    const handleShare = () => {
    const text = `✨ My Spiritual Insight for: "${aiSummary}"\n\nI am manifesting my intention with guidance from the Quran. #Imanifest #ShareTheLight`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Imanifest Insight", text }).catch(console.error);
    } else {
      alert("Insight copied to clipboard! ✨");
    }
  };

  return (
    <View className="mt-section">
      {/* AI Summary / Spiritual Validation */}
      <View className="bg-surface-card rounded-[32px] p-8 border border-white/10 shadow-gold mb-12 relative overflow-hidden">
        <View className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={120} color={colors.accent} />
        </View>
        <TouchableOpacity 
          onPress={handleShare}
          className="absolute top-6 right-6 z-10 bg-white/10 p-2 rounded-full border border-white/10"
        >
          <Share2 size={18} color={colors.accent} />
        </TouchableOpacity>
        
        <Text className="font-sans text-[10px] text-accent uppercase tracking-[3px] mb-4 font-bold">
          Spiritual Insight
        </Text>
        <Text className="font-sans text-[20px] text-ink-primary leading-[1.6] italic">
          "{aiSummary}"
        </Text>
      </View>

      {/* Section header for Verses */}
      <View className="flex-row items-center gap-3 mb-6 px-2">
        <View className="bg-sage-green/10 p-2 rounded-full">
          <BookOpen size={20} color="#D4AF37" />
        </View>
        <Text className="font-display text-display-md text-ink-primary">
          Quranic Foundations
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
        <Sparkles size={20} color="#022C22" />
        <Text className="font-sans text-body-md text-ink-inverse ml-2 font-semibold">
          Generate Action Plan
        </Text>
        <ArrowRight size={18} color="#022C22" style={{ marginLeft: 8 }} />
      </Pressable>
    </View>
  );
}