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
          className={`px-4 py-3 rounded-[16px] mb-2 border border-border backdrop-blur-md shadow-sm transition-all ${
            selectedReciter?.id === item.id ? "bg-accent/20 border-accent/40" : "bg-surface-input"
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