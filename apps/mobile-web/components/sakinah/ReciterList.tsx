import { FlatList, Text, TouchableOpacity } from "react-native";

interface Reciter {
  id: number;
  name: string;
  arabicName: string;
  style: string;
}

interface ReciterListProps {
  reciters: Reciter[];
  selectedReciter: Reciter | null;
  onSelect: (reciter: Reciter) => void;
}

export function ReciterList({ reciters, selectedReciter, onSelect }: ReciterListProps) {
  return (
    <FlatList
      data={reciters}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingBottom: 16 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onSelect(item)}
          className={`px-4 py-3 rounded-xl mb-1 ${
            selectedReciter?.id === item.id ? "bg-primary/10" : "bg-surface"
          }`}
        >
          <Text
            className={`font-sans text-body-sm ${
              selectedReciter?.id === item.id
                ? "text-primary font-semibold"
                : "text-ink-primary"
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
  );
}