import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Play, Pause, RotateCcw, AlertCircle } from "lucide-react-native";
import { Audio, AVPlaybackStatus } from "expo-av";

// ─── Module-level singleton: audio persists across tab navigation ───
let activeSound: Audio.Sound | null = null;
let activeSoundUri: string | null = null;
let loadGeneration = 0; // Guards against rapid-switch race conditions

function unloadActiveSound() {
  if (activeSound) {
    activeSound.unloadAsync().catch(() => {});
    activeSound = null;
    activeSoundUri = null;
  }
}

/**
 * Call when the entire Sakinah feature is abandoned (e.g., app backgrounds
 * or user logs out). Stops and releases the module-level audio singleton.
 */
export function stopAndReleaseAudio() {
  unloadActiveSound();
  loadGeneration = 0;
}

// Clean up on app state change (backgrounded → release resources)
import { AppState, AppStateStatus } from "react-native";

let appStateSubscription: { remove: () => void } | null = null;

function setupAppStateListener() {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
    if (nextState === "background" && activeSound) {
      // Pause (don't unload) when backgrounded — user expects to resume
      activeSound.pauseAsync().catch(() => {});
    }
  });
}

interface AudioPlayerProps {
  audioUrl: string | null;
  surahName: string;
  reciterName: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ audioUrl, surahName, reciterName }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const isSeeking = useRef(false);
  const progressBarWidth = useRef(0);

  // Setup app state listener once
  useEffect(() => {
    setupAppStateListener();
  }, []);

  const loadAudio = useCallback(async (url: string) => {
    // Increment generation to invalidate stale loads
    const thisGeneration = ++loadGeneration;

    try {
      setIsAudioLoading(true);
      setAudioError(null);

      // Unload previous
      unloadActiveSound();

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, progressUpdateIntervalMillis: 250 },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && !status.isBuffering && status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
          }
        },
      );

      // Guard: if another load started while we were awaiting, discard this one
      if (thisGeneration !== loadGeneration) {
        sound.unloadAsync().catch(() => {});
        return;
      }

      activeSound = sound;
      activeSoundUri = url;
      setIsAudioLoading(false);
      setIsPlaying(true);
    } catch {
      if (thisGeneration === loadGeneration) {
        setIsAudioLoading(false);
        setAudioError("Unable to load audio. Please try another surah or reciter.");
      }
    }
  }, []);

  // Sync with module-level singleton
  useEffect(() => {
    if (!audioUrl) return;

    // If the URL changed, load new audio
    if (activeSoundUri !== audioUrl) {
      loadAudio(audioUrl);
    }

    // Poll position from active sound
    const interval = setInterval(async () => {
      if (activeSound && !isSeeking.current) {
        try {
          const status = await activeSound.getStatusAsync();
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);
            setIsBuffering(status.isBuffering);
          }
        } catch {
          // Sound may have been unloaded
        }
      }
    }, 250);

    return () => {
      clearInterval(interval);
    };
  }, [audioUrl, loadAudio]);

  const togglePlayback = useCallback(async () => {
    if (!activeSound) {
      if (audioUrl) await loadAudio(audioUrl);
      return;
    }

    try {
      const status = await activeSound.getStatusAsync();
      if (!status.isLoaded) {
        if (audioUrl) await loadAudio(audioUrl);
        return;
      }

      if (status.isPlaying) {
        await activeSound.pauseAsync();
        setIsPlaying(false);
      } else {
        await activeSound.playAsync();
        setIsPlaying(true);
      }
    } catch {
      setAudioError("Playback error. Please try again.");
    }
  }, [audioUrl, loadAudio]);

  const handleSeek = useCallback(
    async (fraction: number) => {
      if (!activeSound || duration === 0) return;
      const seekPos = fraction * duration;
      try {
        await activeSound.setPositionAsync(seekPos);
        setPosition(seekPos);
      } catch {
        // Seek failed silently
      }
    },
    [duration],
  );

  const handleRestart = useCallback(async () => {
    if (!activeSound) return;
    try {
      await activeSound.setPositionAsync(0);
      setPosition(0);
      await activeSound.playAsync();
      setIsPlaying(true);
    } catch {
      // Restart failed silently
    }
  }, []);

  // ─── Render ────────────────────────────────────────────────

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View className="bg-surface rounded-3xl px-5 py-6 border border-border">
      {/* Surah & Reciter Info */}
      <Text className="font-display text-display-md text-primary text-center">
        {surahName}
      </Text>
      <Text className="font-sans text-body-sm text-ink-secondary mt-1 text-center">
        {reciterName}
      </Text>

      {/* Error State */}
      {audioError && (
        <View className="mt-4 flex-row items-center justify-center gap-2">
          <AlertCircle size={16} color="#54161B" />
          <Text className="font-sans text-body-sm text-rosewood">{audioError}</Text>
        </View>
      )}

      {/* Progress Bar */}
      {(duration > 0 || isPlaying || isBuffering) && !audioError && (
        <View className="mt-5">
          <Pressable
            onLayout={(e) => {
              progressBarWidth.current = e.nativeEvent.layout.width;
            }}
            onPress={(e) => {
              const w = progressBarWidth.current || 300;
              const fraction = Math.max(0, Math.min(1, e.nativeEvent.locationX / w));
              handleSeek(fraction);
            }}
            className="h-8 justify-center"
          >
            <View className="h-1.5 bg-border rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          </Pressable>

          <View className="flex-row justify-between mt-1">
            <Text className="font-sans text-body-xs text-ink-secondary">
              {formatTime(position)}
            </Text>
            <Text className="font-sans text-body-xs text-ink-secondary">
              {formatTime(duration)}
            </Text>
          </View>
        </View>
      )}

      {/* Playback Controls */}
      <View className="flex-row items-center justify-center mt-4 gap-4">
        {/* Restart */}
        <TouchableOpacity onPress={handleRestart} disabled={!activeSound} className="p-3">
          <RotateCcw size={20} color="#064E3B" />
        </TouchableOpacity>

        {/* Play / Pause */}
        <TouchableOpacity
          onPress={togglePlayback}
          disabled={isAudioLoading || (!audioUrl && !activeSound)}
          className="w-16 h-16 bg-primary rounded-full items-center justify-center active:opacity-80 disabled:opacity-50"
        >
          {isAudioLoading || isBuffering ? (
            <ActivityIndicator color="#E3C567" />
          ) : isPlaying ? (
            <Pause size={28} color="#FFFFFF" />
          ) : (
            <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
          )}
        </TouchableOpacity>

        {/* Spacer for symmetry */}
        <View className="w-11" />
      </View>
    </View>
  );
}