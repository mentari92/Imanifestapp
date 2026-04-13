import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react-native";
import type { QuranVerse } from "@imanifest/shared";

interface VerseCardProps {
  verse: QuranVerse;
}

export function VerseCard({ verse }: VerseCardProps) {
  const [tafsirOpen, setTafsirOpen] = useState(false);

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E2E8E0",
        shadowColor: "#54161B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        // Gold left accent border
        borderLeftWidth: 4,
        borderLeftColor: "#E3C567",
      }}
    >
      {/* Verse Key Badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          backgroundColor: "#F8FAFC",
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F0",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#064E3B",
            borderRadius: 999,
            paddingVertical: 4,
            paddingHorizontal: 12,
          }}
        >
          <BookOpen size={11} color="#E3C567" />
          <Text
            style={{
              fontFamily: "JetBrainsMono-Regular",
              fontSize: 11,
              color: "#FFFFFF",
              letterSpacing: 0.3,
            }}
          >
            {verse.verseKey}
          </Text>
        </View>

        {/* Ornamental star */}
        <Text style={{ fontFamily: "Amiri-Regular", fontSize: 16, color: "#E3C567" }}>✦</Text>
      </View>

      {/* Main content */}
      <View style={{ padding: 16 }}>
        {/* Arabic text container */}
        <View
          style={{
            backgroundColor: "#ECFDF5",
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: "rgba(6, 78, 59, 0.1)",
          }}
        >
          <Text
            style={{
              fontFamily: "Amiri-Regular",
              fontSize: 26,
              lineHeight: 48,
              color: "#064E3B",
              textAlign: "right",
              writingDirection: "rtl",
            }}
          >
            {verse.arabicText}
          </Text>
        </View>

        {/* English translation */}
        <Text
          style={{
            fontFamily: "Lora-Regular",
            fontSize: 15,
            color: "#1C1917",
            lineHeight: 26,
          }}
        >
          {verse.translation}
        </Text>

        {/* Collapsible Tafsir */}
        {verse.tafsirSnippet && (
          <>
            <TouchableOpacity
              onPress={() => setTafsirOpen(!tafsirOpen)}
              style={{
                marginTop: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                alignSelf: "flex-start",
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: "#FFF1F2",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#FECDD3",
              }}
              activeOpacity={0.7}
            >
              {tafsirOpen ? (
                <ChevronUp size={13} color="#54161B" />
              ) : (
                <ChevronDown size={13} color="#54161B" />
              )}
              <Text
                style={{
                  fontFamily: "Lora-Regular",
                  fontWeight: "600",
                  fontSize: 12,
                  color: "#54161B",
                }}
              >
                {tafsirOpen ? "Sembunyikan Tafsir" : "Lihat Tafsir"}
              </Text>
            </TouchableOpacity>

            {tafsirOpen && (
              <View
                style={{
                  marginTop: 10,
                  padding: 12,
                  backgroundColor: "#FFF8F8",
                  borderRadius: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: "#54161B",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Lora-Regular",
                    fontSize: 13,
                    color: "#78716C",
                    lineHeight: 22,
                  }}
                >
                  {verse.tafsirSnippet}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
