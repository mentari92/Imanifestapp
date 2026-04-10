import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  Play,
  Pause,
  SkipBack,
  ChevronDown,
  Music,
  Headphones,
} from "lucide-react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import { useSakinah } from "../../hooks/useSakinah";
import { ErrorMessage } from "../../components/shared/ErrorMessage";

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

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  // Play audio
  const playAudio = async (url: string) => {
    try {
      // Stop previous sound
      if (sound) {
        await sound.unloadAsync();
      }

      setIsBuffering(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setIsBuffering(status.isBuffering);
          }
        },
      );
      setSound(newSound);
    } catch {
      setIsBuffering(false);
    }
  };

  const togglePlayback = async () => {
    if (!sound || !audioUrl) {
      if (audioUrl) await playAudio(audioUrl);
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View className="flex-1 bg-background px-screen-x py-6">
      <Text className="font-display text-display-lg text-primary">
        SakinahStream
      </Text>
      <Text className="font-sans text-body-md text-ink-secondary mt-1">
        Listen, reflect, find peace.
      </Text>

      {error && <ErrorMessage message={error} />}

      {/* Now Playing Card */}
      <View className="mt-6 bg-surface rounded-3xl px-5 py-6 border border-border items-center">
        <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
          <Music size={28} color="#064E3B" />
        </View>

        <Text className="font-display text-display-md text-primary text-center">
          {selectedSurah?.englishName || "Select a Surah"}
        </Text>
        <Text className="font-sans text-body-sm text-ink-secondary mt-1">
          {selectedReciter?.name || "Select a Reciter"}
        </Text>

        {/* Playback Controls */}
        <View className="flex-row items-center mt-6">
          <TouchableOpacity
            onPress={() => setPickerMode("surah")}
            className="p-3"
          >
            <SkipBack size={22} color="#064E3B" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayback}
            disabled={isBuffering || (!audioUrl && !sound)}
            className="w-16 h-16 bg-primary rounded-full items-center justify-center mx-4 active:opacity-80 disabled:opacity-50"
          >
            {isBuffering || (isLoading && !sound) ? (
              <ActivityIndicator color="#E3C567" />
            ) : isPlaying ? (
              <Pause size={28} color="#FFFFFF" />
            ) : (
              <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPickerMode("reciter")}
            className="p-3"
          >
            <Headphones size={22} color="#064E3B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Picker Buttons */}
      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={() => setPickerMode(pickerMode === "reciter" ? null : "reciter")}
          className="flex-1 bg-surface rounded-2xl px-4 py-3 border border-border flex-row items-center justify-between"
        >
          <Text className="font-sans text-body-sm text-ink-primary" numberOfLines={1}>
            {selectedReciter?.name || "Choose Reciter"}
          </Text>
          <ChevronDown size={16} color="#78716C" />
        </Pressable>

        <Pressable
          onPress={() => setPickerMode(pickerMode === "surah" ? null : "surah")}
          className="flex-1 bg-surface rounded-2xl px-4 py-3 border border-border flex-row items-center justify-between"
        >
          <Text className="font-sans text-body-sm text-ink-primary" numberOfLines={1}>
            {selectedSurah?.englishName || "Choose Surah"}
          </Text>
          <ChevronDown size={16} color="#78716C" />
        </Pressable>
      </View>

      {/* Picker List */}
      {pickerMode === "reciter" && (
        <FlatList
          data={reciters}
          keyExtractor={(item) => String(item.id)}
          className="mt-3"
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                selectReciter(item);
                setPickerMode(null);
              }}
              className={`px-4 py-3 rounded-xl mb-1 ${
                selectedReciter?.id === item.id ? "bg-primary/10" : "bg-surface"
              }`}
            >
              <Text
                className={`font-sans text-body-sm ${
                  selectedReciter?.id === item.id ? "text-primary font-semibold" : "text-ink-primary"
                }`}
              >
                {item.name}
              </Text>
              {item.style ? (
                <Text className="font-sans text-body-xs text-ink-secondary">
                  {item.style}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}

      {pickerMode === "surah" && (
        <FlatList
          data={surahs}
          keyExtractor={(item) => String(item.number)}
          className="mt-3"
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                selectSurah(item);
                setPickerMode(null);
              }}
              className={`px-4 py-3 rounded-xl mb-1 flex-row items-center ${
                selectedSurah?.number === item.number ? "bg-primary/10" : "bg-surface"
              }`}
            >
              <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
                <Text className="font-sans text-body-xs text-primary font-semibold">
                  {item.number}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  className={`font-sans text-body-sm ${
                    selectedSurah?.number === item.number
                      ? "text-primary font-semibold"
                      : "text-ink-primary"
                  }`}
                >
                  {item.englishName}
                </Text>
                {item.name ? (
                  <Text className="font-sans text-body-xs text-ink-secondary">
                    {item.name}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}