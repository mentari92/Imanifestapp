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
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    const trimmed = intentText.trim();
    if (!trimmed || trimmed.length > 500 || isLoading) return;
    onSubmit(trimmed, selectedImage?.uri, selectedImage?.base64);
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

    if (asset.base64) {
      const sizeInBytes = (asset.base64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      if (sizeInMB > MAX_IMAGE_SIZE_MB) {
        setImageSizeError(
          `Gambar terlalu besar (${sizeInMB.toFixed(1)}MB). Maks ${MAX_IMAGE_SIZE_MB}MB.`,
        );
        return;
      }
    }

    setSelectedImage({ uri: asset.uri, base64: asset.base64 || "" });
  }, []);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const charCount = intentText.length;
  const isOverLimit = charCount > 500;
  const isEmpty = intentText.trim().length === 0;
  const isDisabled = isLoading || isEmpty || isOverLimit;

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: "#E2E8E0",
        shadowColor: "#064E3B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay-Bold",
          fontSize: 17,
          color: "#1C1917",
          marginBottom: 4,
        }}
      >
        Apa niatmu hari ini?
      </Text>
      <Text
        style={{
          fontFamily: "Lora-Regular",
          fontSize: 13,
          color: "#78716C",
          marginBottom: 14,
        }}
      >
        Tuliskan niatmu dan kami akan temukan ayat Al-Quran yang sesuai.
      </Text>

      {/* Text Input */}
      <TextInput
        style={{
          backgroundColor: "#F8FAFC",
          borderRadius: 12,
          padding: 14,
          fontFamily: "Lora-Regular",
          fontSize: 15,
          color: "#1C1917",
          minHeight: 130,
          lineHeight: 24,
          borderWidth: 1.5,
          borderColor: isFocused ? "#064E3B" : "#E2E8E0",
          textAlignVertical: "top",
        }}
        placeholder="Contoh: Aku ingin menjadi lebih sabar dalam kehidupan sehari-hari..."
        placeholderTextColor="#A8A29E"
        value={intentText}
        onChangeText={setIntentText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        multiline
        maxLength={500}
        editable={!isLoading}
        textAlignVertical="top"
      />

      {/* Character counter */}
      <Text
        style={{
          fontFamily: "JetBrainsMono-Regular",
          fontSize: 11,
          color: isOverLimit ? "#9F1239" : "#A8A29E",
          textAlign: "right",
          marginTop: 6,
        }}
      >
        {charCount}/500
      </Text>

      {/* Image picker section */}
      <View style={{ marginTop: 12 }}>
        {selectedImage ? (
          <View style={{ position: "relative" }}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={{ width: "100%", height: 180, borderRadius: 12 }}
              resizeMode="cover"
            />
            <Pressable
              onPress={removeImage}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: "rgba(255,255,255,0.9)",
                borderRadius: 999,
                padding: 6,
              }}
            >
              <X size={14} color="#54161B" />
            </Pressable>
            <View
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                backgroundColor: "rgba(6, 78, 59, 0.85)",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontFamily: "Lora-Regular", fontSize: 11, color: "#FFFFFF" }}>
                Gambar terlampir
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={pickImage}
            disabled={isLoading}
            style={{
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: "rgba(6, 78, 59, 0.3)",
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: "rgba(6, 78, 59, 0.02)",
            }}
          >
            <ImagePlus size={18} color="#064E3B" />
            <Text style={{ fontFamily: "Lora-Regular", fontSize: 14, color: "#064E3B" }}>
              Tambah gambar (opsional)
            </Text>
          </Pressable>
        )}
      </View>

      {/* Image size error */}
      {imageSizeError && (
        <View style={{ marginTop: 10 }}>
          <ErrorMessage message={imageSizeError} />
        </View>
      )}

      {/* Submit button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isDisabled}
        style={{
          marginTop: 16,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: isDisabled ? "#E2E8E0" : "#064E3B",
        }}
        activeOpacity={0.8}
      >
        <Sparkles size={18} color={isDisabled ? "#A8A29E" : "#E3C567"} />
        <Text
          style={{
            fontFamily: "Lora-Regular",
            fontWeight: "600",
            fontSize: 15,
            color: isDisabled ? "#A8A29E" : "#FFFFFF",
          }}
        >
          {isLoading
            ? selectedImage
              ? "Menganalisis gambar & ayat..."
              : "Menemukan ayat untukmu..."
            : selectedImage
              ? "Validasi dengan Quran + Gambar"
              : "Validasi dengan Al-Quran"}
        </Text>
      </TouchableOpacity>

      {/* Gold accent bar at bottom when not disabled */}
      {!isDisabled && (
        <View
          style={{
            height: 3,
            backgroundColor: "#E3C567",
            borderRadius: 999,
            marginTop: 12,
            opacity: 0.6,
          }}
        />
      )}
    </View>
  );
}
