import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ListChecks } from "lucide-react-native";
import { api } from "../../lib/api";

const glass = (radius = 24) => ({
  backgroundColor: "rgba(255,255,255,0.65)",
  borderRadius: radius,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.3)",
  ...(Platform.OS === "web"
    ? ({ backdropFilter: "blur(24px) saturate(130%)", WebkitBackdropFilter: "blur(24px) saturate(130%)" } as any)
    : {}),
});

interface Task {
  id: string | number;
  label: string;
  done: boolean;
  time?: string;
}

function mapTaskItem(item: any, index: number): Task {
  if (typeof item === "string") {
    return { id: `task-${index + 1}`, label: item, done: false };
  }

  const done = Boolean(item?.isCompleted ?? item?.done);
  return {
    id: item?.id ?? `task-${index + 1}`,
    label: item?.description ?? item?.label ?? "",
    done,
    time: done ? completedAt() : undefined,
  };
}

function completedAt(): string {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `Completed at ${h}:${m} ${ampm}`;
}

function buildStarterTasks(intent: string): Task[] {
  const source = intent.toLowerCase();
  const isEnglish = /[a-zA-Z]/.test(intent) && !/shalat|saya|aku|mau|ingin|dan |yang |untuk/.test(source);

  if (isEnglish) {
    return [
      { id: 1, label: "Perform all 5 daily prayers on time and track your consistency", done: false },
      {
        id: 2,
        label: /work|job|career|resume/.test(source)
          ? "Update your CV and send at least 2 job applications today"
          : "Complete your top priority task with 45 minutes of focused effort",
        done: false,
      },
      {
        id: 3,
        label: /debt|money|finance|salary/.test(source)
          ? "Create a 7-day financial plan and commit to a spending limit"
          : "Write 3 specific things you are grateful for and 1 self-reflection today",
        done: false,
      },
      { id: 4, label: "Read and reflect on 1 relevant Quranic verse", done: false },
      { id: 5, label: "Close the day with a specific dua and review your progress", done: false },
    ];
  }

  return [
    { id: 1, label: "Shalat 5 waktu tepat waktu dan catat konsistensinya", done: false },
    {
      id: 2,
      label: /kerja|karier|cv|lamaran/.test(source)
        ? "Perbarui CV dan kirim minimal 2 lamaran hari ini"
        : "Kerjakan 1 tugas prioritas utama selama 45 menit fokus",
      done: false,
    },
    {
      id: 3,
      label: /rezeki|utang|cicilan|keuangan/.test(source)
        ? "Buat rencana keuangan 7 hari dan disiplin sesuai batas"
        : "Tulis 3 syukur spesifik dan 1 evaluasi diri hari ini",
      done: false,
    },
    { id: 4, label: "Baca dan renungkan 1 ayat Al-Quran yang relevan", done: false },
    { id: 5, label: "Tutup hari dengan doa spesifik dan review progres", done: false },
  ];
}

export default function DuaTodoScreen() {
  const router = useRouter();
  const { intentText, tasksJson, manifestationId } = useLocalSearchParams<{
    intentText: string;
    tasksJson: string;
    manifestationId: string;
  }>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isGeneratingFromAi, setIsGeneratingFromAi] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [resolvedAiSummary, setResolvedAiSummary] = useState<string>("");
  const [resolvedIntentText, setResolvedIntentText] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const debounceRef = useRef<any>(null);

  // Load tasks from backend generation flow first, then local/session fallback.
  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      let loaded = false;
      let resolvedManifestationId = manifestationId || "";

      try {
        if (typeof sessionStorage !== "undefined") {
          const stored = sessionStorage.getItem("manifest_result");
          if (stored) {
            const parsed = JSON.parse(stored);

            if (!resolvedManifestationId && typeof parsed.manifestationId === "string") {
              resolvedManifestationId = parsed.manifestationId;
            }

            setResolvedAiSummary(parsed.aiSummary || "");
            setResolvedIntentText(parsed.intentText || intentText || "");

            if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
              setTasks(parsed.tasks.map((item: any, i: number) => mapTaskItem(item, i)));
              loaded = true;
            }
          }
        }
      } catch {}

      if (resolvedManifestationId) {
        setIsGeneratingFromAi(true);
        try {
          const res = await api.post("/dua-to-do/generate", {
            manifestationId: resolvedManifestationId,
          }, { timeout: 20000 });
          const generatedTasks = Array.isArray(res.data?.tasks)
            ? res.data.tasks.map((item: any, i: number) => mapTaskItem(item, i))
            : [];

          if (!isCancelled && generatedTasks.length > 0) {
            setTasks(generatedTasks);
            loaded = true;
            setNotice(null);
          }
        } catch {
          if (!isCancelled) {
            setNotice("Could not load AI tasks. Showing fallback steps.");
          }
        }
        setIsGeneratingFromAi(false);
      }

      if (!loaded && tasksJson) {
        try {
          const parsed: any[] = JSON.parse(tasksJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (!isCancelled) {
              setTasks(parsed.map((item, i) => mapTaskItem(item, i)));
              setResolvedIntentText(intentText || "");
            }
            loaded = true;
          }
        } catch {}
      }

      if (!loaded && !isCancelled) {
        const resolvedIntent = intentText || "";
        setResolvedIntentText(resolvedIntent);
        setTasks(buildStarterTasks(resolvedIntent));
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [intentText, manifestationId, tasksJson]);

  // AI suggestions as user types new task
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (newLabel.trim().length < 8) {
      setAiSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setAiSuggestLoading(true);
      try {
        const searchText = intentText
          ? `${intentText} — ${newLabel}`
          : newLabel;
        const res = await api.post(
          "/iman-sync/quick-search",
          { text: searchText },
          { timeout: 10000 },
        );
        const verses = (res.data.verses || []).slice(0, 2);
        setAiSuggestions(verses.map((v: any) => `"${v.translation}" — ${v.verseKey}`));
      } catch {
        setAiSuggestions([
          "Start with small consistent steps — don't wait for perfect motivation.",
          "Pick 1 spiritual practice + 1 worldly ikhtiar you can execute today.",
        ]);
      }
      setAiSuggestLoading(false);
    }, 1200);
    return () => clearTimeout(debounceRef.current);
  }, [newLabel, intentText]);

  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const toggle = async (id: string | number) => {
    let previousDone = false;
    let previousTime: string | undefined;
    let nextDone = false;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        previousDone = t.done;
        previousTime = t.time;
        nextDone = !t.done;
        return {
          ...t,
          done: nextDone,
          time: nextDone ? completedAt() : undefined,
        };
      })
    );

    try {
      await api.patch(`/dua-to-do/tasks/${id}`, { isCompleted: nextDone });
    } catch {
      setNotice("Could not save task status to server. Change reverted.");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, done: previousDone, time: previousDone ? previousTime : undefined }
            : t
        )
      );
    }
  };

  const remove = (id: string | number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = () => {
    const label = newLabel.trim();
    if (!label) return;
    setTasks((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label, done: false },
    ]);
    setNewLabel("");
    setAiSuggestions([]);
    setShowAdd(false);
  };

  const isFromImanifest = !!resolvedIntentText || !!manifestationId;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 140 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Decorative blobs */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1 } as any}>
        <View style={{ position: "absolute", top: "25%", left: -80, width: 256, height: 256, backgroundColor: "rgba(229,223,248,0.2)", borderRadius: 9999, ...(Platform.OS === "web" ? ({ filter: "blur(100px)" } as any) : {}) } as any} />
        <View style={{ position: "absolute", bottom: "25%", right: -80, width: 320, height: 320, backgroundColor: "rgba(255,228,242,0.2)", borderRadius: 9999, ...(Platform.OS === "web" ? ({ filter: "blur(120px)" } as any) : {}) } as any} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.6)", ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)" } as any) : {}) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center" }}>
            <ListChecks size={20} color="#b45309" strokeWidth={1.8} />
          </View>
          <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
            Dua-to-Do
          </Text>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 28, maxWidth: 680, alignSelf: "center", width: "100%" }}>

        {/* Title */}
        <Text style={{ fontFamily: "Newsreader", fontSize: 34, fontStyle: "italic", fontWeight: "600", color: "#2f3338", lineHeight: 42, marginBottom: 8 }}>
          {doneCount === tasks.length && tasks.length > 0
            ? "All intentions fulfilled ✨"
            : isFromImanifest
            ? "Your AI-Guided Ikhtiar Steps"
            : `${tasks.length} Steps to Manifest`}
        </Text>

        {/* Intention context */}
        {resolvedIntentText ? (
          <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#5b5f65", lineHeight: 22, marginBottom: 24, opacity: 0.85 }}>
            Intention: "{resolvedIntentText}"
          </Text>
        ) : (
          <Text style={{ fontFamily: "Noto Serif", fontSize: 13, color: "#5b5f65", marginBottom: 24, lineHeight: 20 }}>
            Go to Imanifest tab to set your intention and get personalized AI-guided steps.
          </Text>
        )}

        {isGeneratingFromAi && (
          <View style={[glass(16), { padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }]}> 
            <ActivityIndicator size="small" color="#166534" />
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65" }}>
              Generating AI-guided Dua-to-Do steps...
            </Text>
          </View>
        )}

        {notice ? (
          <View style={[glass(16), { padding: 12, marginBottom: 20, backgroundColor: "rgba(254,243,199,0.6)" }]}> 
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#7c2d12" }}>{notice}</Text>
          </View>
        ) : null}

        {/* AI Summary */}
        {resolvedAiSummary ? (
          <View style={[glass(20), { padding: 20, gap: 8, backgroundColor: "rgba(169,247,183,0.08)", marginBottom: 24 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16 }}>✨</Text>
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#0e6030", fontWeight: "700" }}>AI Guidance</Text>
            </View>
            <Text style={{ fontFamily: "Noto Serif", fontSize: 14, color: "#2f3338", lineHeight: 24, fontStyle: "italic" }}>
              {resolvedAiSummary}
            </Text>
          </View>
        ) : null}

        {/* Progress Card */}
        <View style={[glass(32), { padding: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#5b5f65", fontWeight: "700", marginBottom: 6 }}>
              Journey Status
            </Text>
            <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", color: "#2f3338", marginBottom: 16 }}>
              {doneCount}/{tasks.length} Steps Completed
            </Text>
            <View style={{ height: 8, backgroundColor: "#eceef3", borderRadius: 4, overflow: "hidden" }}>
              <View style={{ width: `${pct}%` as any, height: "100%", backgroundColor: "#206c3a", borderRadius: 4 }} />
            </View>
          </View>
          <View style={{ width: 80, height: 80, alignItems: "center", justifyContent: "center", marginLeft: 20 }}>
            <View style={{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: "#eceef3" }} />
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 15, fontWeight: "700", color: "#206c3a" }}>{pct}%</Text>
          </View>
        </View>

        {/* Empty state */}
        {tasks.length === 0 && (
          <View style={[glass(20), { padding: 32, alignItems: "center", gap: 16, marginBottom: 24 }]}>
            <Text style={{ fontSize: 40 }}>🌱</Text>
            <Text style={{ fontFamily: "Newsreader", fontSize: 20, fontStyle: "italic", color: "#2f3338", textAlign: "center" }}>
              No steps yet
            </Text>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#5b5f65", textAlign: "center", lineHeight: 20 }}>
              Go to the Imanifest tab, write your intention, and tap "Manifest & Get Dua Steps" to receive AI-guided steps.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/imanifest")}
              style={{ backgroundColor: "#206c3a", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 9999 }}
            >
              <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: "#e8ffe8", letterSpacing: 1 }}>
                Go to Imanifest →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Task List */}
        <View style={{ gap: 0, marginBottom: 32 }}>
          {tasks.map((task, i) => {
            const isNextActive = !task.done && tasks.slice(0, i).every((t) => t.done);

            if (task.done) {
              return (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => toggle(task.id)}
                  activeOpacity={0.75}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 16 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#206c3a", alignItems: "center", justifyContent: "center", marginTop: 4, flexShrink: 0, shadowColor: "#206c3a", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
                    <Text style={{ color: "#e8ffe8", fontSize: 18 }}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Noto Serif", fontSize: 17, color: "rgba(47,51,56,0.4)", textDecorationLine: "line-through" }}>{task.label}</Text>
                    {task.time ? (
                      <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#777b81", marginTop: 3, fontStyle: "italic" }}>{task.time}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => remove(task.id)} style={{ padding: 8, opacity: 0.4 }}>
                    <Text style={{ fontSize: 14, color: "#777b81" }}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={task.id}
                onPress={() => toggle(task.id)}
                activeOpacity={0.85}
                style={[
                  glass(24),
                  {
                    padding: 20, flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 16,
                    ...(isNextActive ? { borderLeftWidth: 3, borderLeftColor: "#166534" } : { opacity: 0.7 }),
                  },
                ]}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, marginTop: 4, flexShrink: 0, borderWidth: 2, borderColor: isNextActive ? "#166534" : "rgba(119,123,129,0.25)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, color: isNextActive ? "#166534" : "#aaa" }}>○</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Noto Serif", fontSize: 17, fontWeight: "500", color: "#2f3338" }}>{task.label}</Text>
                </View>
                <TouchableOpacity onPress={() => remove(task.id)} style={{ padding: 8, opacity: 0.35 }}>
                  <Text style={{ fontSize: 14, color: "#777b81" }}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add Task Form */}
        {showAdd && (
          <View style={[glass(24), { padding: 20, gap: 12, marginBottom: 20 }]}>
            <Text style={{ fontFamily: "Newsreader", fontSize: 18, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
              Add Your Own Step
            </Text>
            <View style={[glass(16), { padding: 14 }]}>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="What spiritual action do you commit to?"
                placeholderTextColor="rgba(91,95,101,0.45)"
                style={{
                  fontFamily: "Noto Serif", fontSize: 15, color: "#2f3338",
                  ...(Platform.OS === "web" ? ({ outline: "none" } as any) : {}),
                }}
                autoFocus
              />
            </View>

            {/* AI verse hints while typing */}
            {(aiSuggestLoading || aiSuggestions.length > 0) && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 12 }}>✨</Text>
                  <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#0e6030", fontWeight: "700" }}>
                    {aiSuggestLoading ? "Finding related verses..." : "Related Quranic Guidance"}
                  </Text>
                  {aiSuggestLoading && <ActivityIndicator size="small" color="#0e6030" />}
                </View>
                {aiSuggestions.map((s, i) => (
                  <Text key={i} style={{ fontFamily: "Noto Serif", fontSize: 12, fontStyle: "italic", color: "#524f63", lineHeight: 18 }}>
                    {s}
                  </Text>
                ))}
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setShowAdd(false); setNewLabel(""); setAiSuggestions([]); }}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 9999, alignItems: "center", backgroundColor: "rgba(229,223,248,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" }}
              >
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "600", color: "#524f63" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addTask}
                style={{ flex: 2, paddingVertical: 14, borderRadius: 9999, alignItems: "center", backgroundColor: "#166534" }}
              >
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", letterSpacing: 1, color: "#fff" }}>Add Step</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.push("/imanifest")}
            activeOpacity={0.85}
            style={[glass(9999), { flex: 1, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }]}
          >
            <Text style={{ fontSize: 16 }}>🌟</Text>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "600", color: "#524f63" }}>New Intention</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAdd(!showAdd)}
            activeOpacity={0.85}
            style={{ flex: 1, backgroundColor: "#166534", paddingVertical: 16, borderRadius: 9999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#166534", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } }}
          >
            <Text style={{ fontSize: 16, color: "#fff" }}>{showAdd ? "✕" : "✚"}</Text>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: "600", letterSpacing: 0.5, color: "#fcf7ff" }}>
              {showAdd ? "Cancel" : "Add Step"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/tafakkur")}
          activeOpacity={0.85}
          style={{ backgroundColor: "#605d71", paddingVertical: 20, paddingHorizontal: 32, borderRadius: 9999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8, shadowColor: "#605d71", shadowOpacity: 0.15, shadowRadius: 32, shadowOffset: { width: 0, height: 16 } }}
        >
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 3, color: "#fff" }}>
            Begin Tafakkur
          </Text>
          <Text style={{ fontSize: 18, color: "#fff" }}>🌿</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
