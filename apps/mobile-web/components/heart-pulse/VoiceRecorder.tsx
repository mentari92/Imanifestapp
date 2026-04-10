import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Mic, Square, Play, Pause, Send } from "lucide-react-native";
import { Audio } from "expo-av";
import { TextInput } from "react-native";

const MAX_DURATION_MS = 120_000; // 2 minutes

interface VoiceRecorderProps {
  onSubmit: (audioUri: string, transcriptText: string) => Promise<void>;
  isLoading: boolean;
}

export function VoiceRecorder({ onSubmit, isLoading }: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [transcriptText, setTranscriptText] = useState("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();

    return () => {
      if (durationInterval.current) clearInterval(durationInterval.current);
      if (sound) sound.unloadAsync();
    };
  }, []);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingUri(null);
      setDurationMs(0);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setDurationMs((prev) => {
          if (prev >= MAX_DURATION_MS) {
            stopRecording();
            return MAX_DURATION_MS;
          }
          return prev + 100;
        });
      }, 100);
    } catch {
      // Silently handle — UI state stays false
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) setRecordingUri(uri);
    } catch {
      // Recording stop failed
    } finally {
      setRecording(null);
      setIsRecording(false);
    }
  };

  const playPreview = async () => {
    if (!recordingUri) return;

    // Stop previous playback
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: recordingUri },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) setIsPlaying(false);
        }
      },
    );
    setSound(newSound);
  };

  const stopPreview = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleSubmit = async () => {
    if (!recordingUri || !transcriptText.trim()) return;
    await onSubmit(recordingUri, transcriptText.trim());
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Permission denied
  if (hasPermission === false) {
    return (
      <View className="bg-surface rounded-2xl px-5 py-6 border border-border items-center mt-4">
        <Mic size={32} color="#78716C" />
        <Text className="font-sans text-body-sm text-ink-secondary mt-3 text-center">
          Mikrofon diperlukan untuk rekam suara. Aktifkan di pengaturan.
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-4 space-y-4">
      {/* Recording Controls */}
      <View className="bg-surface rounded-2xl px-5 py-6 border border-border items-center">
        {/* Timer */}
        <Text className="font-display text-display-lg text-primary">
          {formatTime(durationMs)}
        </Text>
        <Text className="font-sans text-body-xs text-ink-secondary mt-1">
          {isRecording ? "Merekam..." : recordingUri ? "Selesai merekam" : "Siap merekam"}
        </Text>

        {/* Duration bar */}
        <View className="w-full h-2 bg-border rounded-full mt-4 overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.min((durationMs / MAX_DURATION_MS) * 100, 100)}%` }}
          />
        </View>
        <Text className="font-sans text-body-xs text-ink-secondary mt-1">
          Maks 2:00
        </Text>

        {/* Record / Stop button */}
        <View className="flex-row items-center mt-4 gap-4">
          {!isRecording && !recordingUri && (
            <TouchableOpacity
              onPress={startRecording}
              className="w-16 h-16 bg-red-500 rounded-full items-center justify-center active:opacity-80"
            >
              <Mic size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {isRecording && (
            <TouchableOpacity
              onPress={stopRecording}
              className="w-16 h-16 bg-red-500 rounded-full items-center justify-center active:opacity-80"
            >
              <Square size={28} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Playback controls */}
          {recordingUri && !isRecording && (
            <>
              <TouchableOpacity
                onPress={isPlaying ? stopPreview : playPreview}
                className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center active:opacity-80"
              >
                {isPlaying ? (
                  <Pause size={22} color="#064E3B" />
                ) : (
                  <Play size={22} color="#064E3B" fill="#064E3B" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setRecordingUri(null);
                  setDurationMs(0);
                }}
                className="px-4 py-2 rounded-xl bg-border"
              >
                <Text className="font-sans text-body-xs text-ink-secondary">
                  Rekam Ulang
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Transcript input + Submit */}
      {recordingUri && !isRecording && (
        <View className="space-y-3">
          <TextInput
            value={transcriptText}
            onChangeText={setTranscriptText}
            placeholder="Tulis transkrip refleksi suaramu..."
            className="bg-surface border border-border rounded-2xl px-4 py-3 font-sans text-body-sm text-ink-primary"
            multiline
            numberOfLines={3}
            style={{ textAlignVertical: "top" }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!transcriptText.trim() || isLoading}
            className="bg-primary rounded-button py-3 px-6 flex-row items-center justify-center gap-2 active:opacity-80 disabled:opacity-50"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
            <Text className="font-sans text-label text-white">
              {isLoading ? "Mengirim..." : "Kirim Refleksi"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}