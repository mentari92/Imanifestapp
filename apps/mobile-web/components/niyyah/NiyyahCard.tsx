import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Sparkles, Mic, BookOpen, Search } from "lucide-react-native";
import { useImanifest } from "../../hooks/useImanifest";
import { colors } from "../../constants/theme";

interface NiyyahCardProps {
  intention: string;
  setIntention: (val: string) => void;
  onSubmit: () => void;
}

export const NiyyahCard: React.FC<NiyyahCardProps> = ({
  intention,
  setIntention,
  onSubmit,
}) => {
  const { quickSearch } = useImanifest();
  const [liveVerses, setLiveVerses] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search for live verses
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (intention.trim().length > 3) {
        setIsSearching(true);
        const verses = await quickSearch(intention);
        setLiveVerses(verses);
        setIsSearching(false);
      } else {
        setLiveVerses([]);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [intention, quickSearch]);

  return (
    <View 
      className="bg-surface-card border border-white/20 rounded-[32px] p-8 shadow-card backdrop-blur-xl relative overflow-hidden"
    >
      {/* Holographic Glow Effect */}
      <View 
        className="absolute -top-20 -right-20 w-40 h-40 bg-accent/20 rounded-full blur-[60px]" 
      />
      <View 
        className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-[60px]" 
      />

      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center gap-3">
          <View className="bg-accent/10 p-2 rounded-full">
            <Sparkles size={24} color={colors.accent} />
          </View>
          <Text className="font-display text-display-md text-ink-primary">
            New Niyyah
          </Text>
        </View>
      </View>

      <View className="bg-white/5 border border-white/10 rounded-[24px] p-5 mb-6">
        <TextInput
          className="font-sans text-body-lg text-ink-primary min-h-[120px]"
          multiline
          placeholder="I intend to..."
          placeholderTextColor="#6B6985"
          value={intention}
          onChangeText={setIntention}
          textAlignVertical="top"
        />
        
        {/* Live Search Indicator */}
        {isSearching && (
          <View className="absolute bottom-4 right-4 flex-row items-center gap-2">
            <Search size={14} color={colors.accent} />
            <Text className="font-sans text-[10px] text-accent uppercase tracking-widest">
              Sensing Verses...
            </Text>
          </View>
        )}
      </View>

      {/* Live Verse Seeds (The "Immediate" feeling) */}
      {liveVerses.length > 0 && (
        <View className="mb-6 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Text className="font-sans text-[10px] text-ink-secondary uppercase tracking-[2px] mb-1">
            Divine Seeds Identified
          </Text>
          {liveVerses.map((v, i) => (
            <View 
              key={i}
              className="bg-white/5 border border-white/5 rounded-xl p-3 flex-row items-center gap-3"
            >
              <BookOpen size={14} color={colors.accent} />
              <Text 
                numberOfLines={1}
                className="font-sans text-body-sm text-ink-secondary flex-1 italic"
              >
                "{v.translation}"
              </Text>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row gap-4">
        <TouchableOpacity
          className="flex-1 bg-primary rounded-button py-5 items-center shadow-gold active:scale-[0.98] transition-all"
          onPress={onSubmit}
        >
          <Text className="font-sans text-label text-ink-inverse uppercase tracking-widest font-bold">
            Manifest with Tawakkul
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="aspect-square bg-white/5 border border-white/10 rounded-button items-center justify-center active:bg-white/10 px-4"
        >
          <Mic size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
