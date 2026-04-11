import { View, Text } from "react-native";

type SentimentCategory = "positive" | "negative" | "neutral";

interface SentimentBadgeProps {
  sentiment: string;
  score: number | null;
  size?: "sm" | "md";
}

const POSITIVE_SENTIMENTS = new Set([
  "hopeful",
  "grateful",
  "peaceful",
  "content",
  "focused",
]);

const NEGATIVE_SENTIMENTS = new Set([
  "anxious",
  "struggling",
  "uncertain",
  "heavy",
]);

function categorizeSentiment(sentiment: string): SentimentCategory {
  if (POSITIVE_SENTIMENTS.has(sentiment)) return "positive";
  if (NEGATIVE_SENTIMENTS.has(sentiment)) return "negative";
  return "neutral";
}

const CATEGORY_STYLES: Record<
  SentimentCategory,
  { bg: string; text: string }
> = {
  positive: { bg: "bg-primary/10", text: "text-primary" },
  negative: { bg: "bg-accent/10", text: "text-accent" },
  neutral: { bg: "bg-surface", text: "text-secondary" },
};

export function SentimentBadge({
  sentiment,
  score,
  size = "md",
}: SentimentBadgeProps) {
  const category = categorizeSentiment(sentiment);
  const styles = CATEGORY_STYLES[category];
  const isSmall = size === "sm";

  return (
    <View>
      {/* Sentiment label pill */}
      <View
        className={`self-start rounded-full ${isSmall ? "px-3 py-1" : "px-4 py-2"} ${styles.bg}`}
      >
        <Text
          className={`font-sans font-semibold capitalize ${styles.text} ${isSmall ? "text-xs" : "text-body-sm"}`}
        >
          {sentiment}
        </Text>
      </View>

      {/* Score bar */}
      {score !== null && (
        <View className={isSmall ? "mt-1 flex-row items-center" : "mt-2"}>
          <View className={`flex-1 ${isSmall ? "h-1" : "h-2"} bg-border rounded-full overflow-hidden`}>
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.round(score * 100)}%` }}
            />
          </View>
          <Text className={`font-mono ${isSmall ? "text-xs" : "text-body-sm"} text-ink-secondary ${isSmall ? "ml-2" : "ml-3"}`}>
            {Math.round(score * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
}