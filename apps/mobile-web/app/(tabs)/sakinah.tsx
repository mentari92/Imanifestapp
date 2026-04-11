import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ChevronDown, Headphones, BookOpen } from "lucide-react-native";
import { useSakinah } from "../../hooks/useSakinah";
import { ErrorMessage } from "../../components/shared/ErrorMessage";
import { ReciterList } from "../../components/sakinah/ReciterList";
import { SurahList } from "../../components/sakinah/SurahList";
import { AudioPlayer } from "../../components/sakinah/AudioPlayer";

type PickerMode = "reciter" | "surah" | null;

export default function SakinahStreamScreen() {
  const {
    reciters,
    surahs,
    selectedReciter,
    selectedSurah,
    audioUrl,
    isLoading,
    error,
    selectReciter,
    selectSurah,
  } = useSakinah();

  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  return (
    <View className="flex-1 bg-background px-screen-x py-6">
      {/* Header */}
      <Text className="font-display text-display-lg text-primary">
        SakinahStream
      </Text>
      <Text className="font-sans text-body-md text-ink-secondary mt-1">
        Listen, reflect, find peace.
      </Text>

      {/* Loading state for initial data fetch */}
      {isLoading && !selectedReciter && (
        <View className="mt-8 items-center">
          <ActivityIndicator size="large" color="#064E3B" />
          <Text className="font-sans text-body-sm text-ink-secondary mt-3">
            Loading reciters & surahs…
          </Text>
        </View>
      )}

      {error && <ErrorMessage message={error} />}

      {/* Audio Player — always visible once we have data */}
      {!isLoading || selectedReciter ? (
        <View className="mt-6">
          <AudioPlayer
            audioUrl={audioUrl}
            surahName={selectedSurah?.englishName || "Al-Fatihah"}
            reciterName={selectedReciter?.name || "Select a Reciter"}
          />
        </View>
      ) : null}

      {/* Picker Buttons */}
      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={() => setPickerMode(pickerMode === "reciter" ? null : "reciter")}
          className="flex-1 bg-surface rounded-2xl px-4 py-3 border border-border flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2 flex-1">
            <Headphones size={16} color="#064E3B" />
            <Text className="font-sans text-body-sm text-ink-primary" numberOfLines={1}>
              {selectedReciter?.name || "Choose Reciter"}
            </Text>
          </View>
          <ChevronDown
            size={16}
            color="#78716C"
            style={{ transform: [{ rotate: pickerMode === "reciter" ? "180deg" : "0deg" }] }}
          />
        </Pressable>

        <Pressable
          onPress={() => setPickerMode(pickerMode === "surah" ? null : "surah")}
          className="flex-1 bg-surface rounded-2xl px-4 py-3 border border-border flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2 flex-1">
            <BookOpen size={16} color="#064E3B" />
            <Text className="font-sans text-body-sm text-ink-primary" numberOfLines={1}>
              {selectedSurah?.englishName || "Choose Surah"}
            </Text>
          </View>
          <ChevronDown
            size={16}
            color="#78716C"
            style={{ transform: [{ rotate: pickerMode === "surah" ? "180deg" : "0deg" }] }}
          />
        </Pressable>
      </View>

      {/* Picker List */}
      {pickerMode === "reciter" && (
        <View className="mt-3 flex-1">
          <ReciterList
            reciters={reciters}
            selectedReciter={selectedReciter}
            onSelect={(reciter) => {
              selectReciter(reciter);
              setPickerMode(null);
            }}
          />
        </View>
      )}

      {pickerMode === "surah" && (
        <View className="mt-3 flex-1">
          <SurahList
            surahs={surahs}
            selectedSurah={selectedSurah}
            onSelect={(surah) => {
              selectSurah(surah);
              setPickerMode(null);
            }}
          />
        </View>
      )}
    </View>
  );
}