import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Pressable,
} from "react-native";
import { Sparkles, ImagePlus, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { ErrorMessage } from "../shared/ErrorMessage";

interface IntentionFormProps {
  onSubmit: (intentText: string, imageUri?: string, imageBase64?: string) => void;
  isLoading: boolean;
}

const MAX_IMAGE_SIZE_MB = 5;

export function IntentionForm({ onSubmit, isLoading }: IntentionFormProps) {
  const [intentText, setIntentText] = useState("");
  const [imageSizeError, setImageSizeError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    base64: string;
  } | null>(null);

  const handleSubmit = () => {
    const trimmed = intentText.trim();
    if (!trimmed || trimmed.length > 500 || isLoading) return;
    onSubmit(
      trimmed,
      selectedImage?.uri,
      selectedImage?.base64,
    );
  };

  const pickImage = useCallback(async () => {
    setImageSizeError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    // Validate file size (base64 is ~33% larger than actual bytes)
    if (asset.base64) {
      const sizeInBytes = (asset.base64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      if (sizeInMB > MAX_IMAGE_SIZE_MB) {
        setImageSizeError(
          `Image is too large (${sizeInMB.toFixed(1)}MB). Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`,
        );
        return;
      }
    }

    setSelectedImage({
      uri: asset.uri,
      base64: asset.base64 || "",
    });
  }, []);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const charCount = intentText.length;
  const isOverLimit = charCount > 500;
  const isEmpty = intentText.trim().length === 0;

  return (
    <View className="bg-surface rounded-verse p-card-p shadow-card">
      <Text className="font-sans text-body-md text-ink-secondary mb-3">
        What's your intention today?
      </Text>

      <TextInput
        className="bg-surface-input rounded-button p-4 font-sans text-body-lg text-text-primary min-h-[120px] text-top"
        placeholder="I want to become more patient in my daily life..."
        placeholderTextColor="#A8A29E"
        value={intentText}
        onChangeText={setIntentText}
        multiline
        maxLength={500}
        editable={!isLoading}
        textAlignVertical="top"
      />

      {/* Character counter */}
      <View className="flex-row justify-between items-center mt-2">
        <Text
          className={`font-sans text-body-sm ${
            isOverLimit ? "text-status-error" : "text-ink-secondary"
          }`}
        >
          {charCount}/500
        </Text>
      </View>

      {/* Image picker section */}
      <View className="mt-4">
        {selectedImage ? (
          <View className="relative">
            <Image
              source={{ uri: selectedImage.uri }}
              className="w-full h-48 rounded-button"
              resizeMode="cover"
            />
            <Pressable
              onPress={removeImage}
              className="absolute top-2 right-2 bg-surface/80 rounded-full p-1.5"
            >
              <X size={16} color="#064E3B" />
            </Pressable>
            <View className="absolute bottom-2 left-2 bg-primary/80 rounded-button px-2 py-1">
              <Text className="font-sans text-body-sm text-text-inverse">
                Image attached
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={pickImage}
            disabled={isLoading}
            className="border-2 border-dashed border-primary/30 rounded-button py-4 flex-row items-center justify-center gap-2"
          >
            <ImagePlus size={20} color="#064E3B" />
            <Text className="font-sans text-body-md text-primary">
              Add image (optional)
            </Text>
          </Pressable>
        )}
      </View>

      {/* Image size error */}
      {imageSizeError && (
        <View className="mt-3">
          <ErrorMessage message={imageSizeError} />
        </View>
      )}

      {/* Submit button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading || isEmpty || isOverLimit}
        className={`mt-4 rounded-button py-3.5 px-6 flex-row items-center justify-center gap-2 ${
          isLoading || isEmpty || isOverLimit
            ? "bg-primary/40"
            : "bg-primary"
        }`}
        activeOpacity={0.8}
      >
        <Sparkles size={18} color="#F8FAFC" />
        <Text
          className={`font-sans text-label text-text-inverse ${
            isLoading || isEmpty || isOverLimit ? "opacity-60" : ""
          }`}
        >
          {isLoading
            ? selectedImage
              ? "Analyzing image & finding verses..."
              : "Finding your verses..."
            : selectedImage
              ? "Validate with Quran + Image"
              : "Validate with Quran"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}