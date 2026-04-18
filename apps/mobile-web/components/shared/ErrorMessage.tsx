import { View, Text, TouchableOpacity } from "react-native";
import { AlertCircle, RefreshCw } from "lucide-react-native";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  isOffline?: boolean;
}

export function ErrorMessage({ message, onRetry, isOffline }: ErrorMessageProps) {
  return (
    <View className="bg-red-50 rounded-card p-card-p border-l-2 border-status-error">
      <View className="flex-row items-start gap-3 mb-3">
        <AlertCircle size={20} color="#9F1239" />
        <Text className="font-sans text-body-md text-status-error flex-1">
          {message}
        </Text>
      </View>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="flex-row items-center gap-2 bg-red-200 px-3 py-2 rounded-md self-start"
        >
          <RefreshCw size={16} color="#9F1239" />
          <Text className="font-sans text-sm text-status-error font-medium">
            {isOffline ? 'Retry' : 'Try Again'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}