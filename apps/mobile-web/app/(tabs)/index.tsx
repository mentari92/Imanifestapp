import { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Sparkles, RotateCcw } from "lucide-react-native";
import { useImanSync } from "../../hooks/useImanSync";
import { IntentionForm } from "../../components/iman-sync/IntentionForm";
import { ImanSyncResult } from "../../components/iman-sync/ImanSyncResult";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { ErrorMessage } from "../../components/shared/ErrorMessage";

// ─── Ornamental Divider ───────────────────────────────────────
function OrnamentDivider() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(227, 197, 103, 0.4)" }} />
      <Text style={{ fontFamily: "Amiri-Regular", fontSize: 18, color: "#E3C567" }}>✦</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(227, 197, 103, 0.4)" }} />
    </View>
  );
}

export default function ImanSyncScreen() {
  const { result, isLoading, error, analyze, analyzeVision, reset } = useImanSync();

  const handleSubmit = useCallback(
    (intentText: string, imageUri?: string, imageBase64?: string) => {
      if (imageBase64) {
        analyzeVision(intentText, imageBase64, imageUri);
      } else {
        analyze(intentText);
      }
    },
    [analyze, analyzeVision],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
    >
      {/* Hero Header */}
      <View
        style={{
          backgroundColor: "#064E3B",
          borderRadius: 20,
          paddingVertical: 28,
          paddingHorizontal: 20,
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        {/* Bismillah */}
        <Text
          style={{
            fontFamily: "Amiri-Regular",
            fontSize: 20,
            color: "#E3C567",
            marginBottom: 16,
            writingDirection: "rtl",
          }}
        >
          بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
        </Text>

        {/* Icon in gold ring */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "rgba(227, 197, 103, 0.15)",
            borderWidth: 1.5,
            borderColor: "rgba(227, 197, 103, 0.5)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Sparkles size={30} color="#E3C567" />
        </View>

        <Text
          style={{
            fontFamily: "PlayfairDisplay-Bold",
            fontSize: 28,
            color: "#FFFFFF",
            letterSpacing: 0.5,
          }}
        >
          ImanSync
        </Text>
        <Text
          style={{
            fontFamily: "Lora-Regular",
            fontSize: 14,
            color: "#A7F3D0",
            marginTop: 6,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          Selaraskan niatmu dengan ayat Al-Quran.
        </Text>
      </View>

      {/* Ornamental divider before form */}
      {!result && !isLoading && <OrnamentDivider />}

      {/* Loading state */}
      {isLoading && <LoadingSpinner message="Menganalisis niatmu..." />}

      {/* Error state */}
      {error && !isLoading && (
        <View style={{ marginBottom: 24 }}>
          <ErrorMessage message={error} />
        </View>
      )}

      {/* Result */}
      {result && !isLoading && (
        <>
          <ImanSyncResult
            verses={result.verses}
            aiSummary={result.aiSummary}
            manifestationId={result.manifestationId}
          />

          {/* New intention button */}
          <TouchableOpacity
            onPress={reset}
            style={{
              marginTop: 24,
              marginBottom: 8,
              borderRadius: 10,
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderWidth: 1.5,
              borderColor: "#064E3B",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            activeOpacity={0.8}
          >
            <RotateCcw size={16} color="#064E3B" />
            <Text
              style={{
                fontFamily: "Lora-Regular",
                fontWeight: "600",
                fontSize: 14,
                color: "#064E3B",
              }}
            >
              Niat Baru
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Form */}
      {!result && !isLoading && (
        <IntentionForm onSubmit={handleSubmit} isLoading={isLoading} />
      )}
    </ScrollView>
  );
}
