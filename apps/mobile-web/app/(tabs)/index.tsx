import { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Sparkles, RotateCcw } from "lucide-react-native";
import { useImanSync } from "../../hooks/useImanSync";
import { IntentionForm } from "../../components/iman-sync/IntentionForm";
import { ImanSyncResult } from "../../components/iman-sync/ImanSyncResult";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { ErrorMessage } from "../../components/shared/ErrorMessage";

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
    <ScrollView className="flex-1 bg-background px-screen-x py-screen-y">
      {/* Header */}
      <View className="items-center mb-section">
        <Sparkles size={48} color="#064E3B" />
        <Text className="font-display text-display-lg text-primary mt-4">
          ImanSync
        </Text>
        <Text className="font-sans text-body-md text-ink-secondary mt-2 text-center">
          Turn your intention into action.
        </Text>
      </View>

      {/* Loading state */}
      {isLoading && (
        <LoadingSpinner message="Analyzing your intention..." />
      )}

      {/* Error state */}
      {error && !isLoading && (
        <View className="mb-section">
          <ErrorMessage message={error} />
        </View>
      )}

      {/* Result — show after successful analysis */}
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
            className="mt-section mb-8 rounded-button py-3 px-6 border border-primary flex-row items-center justify-center gap-2"
            activeOpacity={0.8}
          >
            <RotateCcw size={16} color="#064E3B" />
            <Text className="font-sans text-label text-primary">
              New Intention
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Form — show when no result and not loading */}
      {!result && !isLoading && (
        <IntentionForm onSubmit={handleSubmit} isLoading={isLoading} />
      )}
    </ScrollView>
  );
}
