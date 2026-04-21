import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, Platform } from "react-native";
import { Mic, Square, Send, Info } from "lucide-react-native";

interface VoiceRecorderProps {
  onSubmit: (audioUri: string, transcriptText: string) => Promise<void>;
  isLoading: boolean;
}

export function VoiceRecorder({ onSubmit, isLoading }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [hasWebSpeech, setHasWebSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    if (Platform.OS === "web") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasWebSpeech(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US"; // Global competition, use English

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscriptText(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!hasWebSpeech || !recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscriptText("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = async () => {
    if (!transcriptText.trim()) return;
    await onSubmit("web-speech-api-audio", transcriptText.trim());
  };

  if (!hasWebSpeech && Platform.OS === "web") {
    return (
      <View className="bg-surface-card rounded-[24px] px-5 py-6 border border-border shadow-card backdrop-blur-md items-center mt-4">
        <Info size={32} color="#D4AF37" />
        <Text className="font-sans text-body-sm text-ink-secondary mt-3 text-center">
          Voice recording is only supported on Chrome or Safari browsers. Please type your reflection instead.
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-4 space-y-4">
      <View className="bg-surface-card rounded-[24px] px-5 py-8 border border-border shadow-card backdrop-blur-md items-center">
        <Text className="font-display text-display-lg text-primary">{isRecording ? "Listening..." : "Tap to Speak"}</Text>
        <Text className="font-sans text-body-xs text-ink-secondary mt-1 text-center px-6">
          {isRecording ? "Speak clearly, the AI is listening to your heart's reflection..." : "Your voice will be instantly transcribed to text"}
        </Text>
        <View className="flex-row items-center mt-8">
          <TouchableOpacity
            onPress={toggleRecording}
            className={`w-24 h-24 rounded-full items-center justify-center shadow-gold active:scale-95 transition-all ${isRecording ? "bg-red-500/20 border-2 border-red-500" : "bg-primary"}`}
          >
            {isRecording ? (
              <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center animate-pulse">
                <Square size={28} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            ) : (
              <Mic size={32} color="#022C22" />
            )}
          </TouchableOpacity>
        </View>
        {isRecording && (
          <View className="mt-4 flex-row gap-1">
             {[1,2,3,4].map(i => <View key={i} className="w-1.5 h-4 bg-red-500 rounded-full animate-bounce" style={Platform.OS === "web" ? ({ animationDelay: `${i*0.2}s` } as any) : undefined} />)}
          </View>
        )}
      </View>
      <View className="space-y-3 mt-4">
        <TextInput
          value={transcriptText}
          onChangeText={setTranscriptText}
          placeholder="Your transcription will appear here..."
          className="bg-surface-card border border-border rounded-[20px] px-5 py-5 font-sans text-body-md text-ink-primary shadow-sm"
          multiline
          numberOfLines={4}
          style={{ textAlignVertical: "top", minHeight: 120 }}
          placeholderTextColor="#475569"
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!transcriptText.trim() || isLoading}
          className="bg-primary rounded-button py-5 px-6 flex-row items-center justify-center gap-2 active:opacity-80 disabled:opacity-50 shadow-gold"
        >
          {isLoading ? <ActivityIndicator color="#022C22" size="small" /> : <Send size={20} color="#022C22" />}
          <Text className="font-sans text-label text-ink-inverse font-bold">
            {isLoading ? "Generating Insight..." : "Submit Reflection"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}