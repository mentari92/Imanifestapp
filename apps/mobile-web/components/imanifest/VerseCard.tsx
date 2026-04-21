import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import type { QuranVerse } from "@imanifest/shared";

interface VerseCardProps {
  verse: QuranVerse;
}

export function VerseCard({ verse }: VerseCardProps) {
  const [tafsirOpen, setTafsirOpen] = useState(false);

  return (
    <View className="bg-surface-card rounded-[24px] p-6 border border-white/10 shadow-verse overflow-hidden">
      {/* Decorative Aura */}
      <View className="absolute -top-10 -left-10 w-20 h-20 bg-accent/5 rounded-full blur-3xl" />
      
      <View className="flex-row items-center justify-between mb-4">
        <View className="bg-accent/10 px-3 py-1 rounded-full">
          <Text className="font-mono text-[10px] text-accent font-bold tracking-widest">
            {verse.verseKey}
          </Text>
        </View>
      </View>

      {/* Arabic text — larger and right-to-left */}
      <Text
        className="font-arabic text-[30px] leading-[1.8] text-ink-primary text-right mb-5"
        style={{ writingDirection: "rtl" }}
      >
        {verse.arabicText}
      </Text>

      {/* English translation with nice quote styling */}
      <View className="border-l-2 border-accent/30 pl-4">
        <Text className="font-sans text-body-lg text-ink-primary leading-[1.7] italic">
          "{verse.translation}"
        </Text>
      </View>

      {/* Collapsible tafsir */}
      {verse.tafsirSnippet && (
        <TouchableOpacity
          onPress={() => setTafsirOpen(!tafsirOpen)}
          className="mt-3 flex-row items-center gap-1"
          activeOpacity={0.7}
        >
          {tafsirOpen ? (
            <ChevronUp size={14} color="#54161B" />
          ) : (
            <ChevronDown size={14} color="#54161B" />
          )}
          <Text className="font-sans text-body-sm text-accent">
            {tafsirOpen ? "Hide Tafsir" : "Tafsir"}
          </Text>
        </TouchableOpacity>
      )}

      {tafsirOpen && verse.tafsirSnippet && (
        <Text className="font-sans text-body-sm text-ink-secondary mt-2 leading-[1.5]">
          {verse.tafsirSnippet}
        </Text>
      )}
    </View>
  );
}