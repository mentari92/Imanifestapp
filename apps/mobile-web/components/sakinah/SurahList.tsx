import { FlatList, Text, TouchableOpacity, View } from "react-native";

interface Surah {
  number: number;
  name: string;
  englishName: string;
  versesCount: number;
}

interface SurahListProps {
  surahs: Surah[];
  selectedSurah: Surah | null;
  onSelect: (surah: Surah) => void;
}

export function SurahList({ surahs, selectedSurah, onSelect }: SurahListProps) {
  return (
    <FlatList
      data={surahs}
      keyExtractor={(item) => String(item.number)}
      contentContainerStyle={{ paddingBottom: 16 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onSelect(item)}
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
  );
}