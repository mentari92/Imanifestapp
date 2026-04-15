import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from "react-native";
import { useRouter } from "expo-router";

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
  id: number;
  label: string;
  done: boolean;
  time?: string;
  desc?: string;
}

function completedAt(): string {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `Completed at ${h}:${m} ${ampm}`;
}

const INITIAL_TASKS: Task[] = [
  { id: 1, label: "Purify Intention with morning Dhikr", done: true, time: "Completed at 06:15 AM" },
  { id: 2, label: "Visualize Divine Support after Dhuhr", done: true, time: "Completed at 12:45 PM" },
  { id: 3, label: "Journalize 3 Gratitude Anchors", done: true, time: "Completed at 04:30 PM" },
  { id: 4, label: "Practice Deep Presence during Isha", done: false, desc: "Connect with the Infinite Source through focused breath and conscious movement." },
  { id: 5, label: "Release Outcome before Sleep", done: false, desc: "Surrender your intentions to Allah with trust and gratitude." },
];

export default function DuaTodoScreen() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const router = useRouter();

  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const toggle = (id: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: !t.done, time: !t.done ? completedAt() : undefined } : t
      )
    );
  };

  const remove = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = () => {
    const label = newLabel.trim();
    if (!label) return;
    setTasks((prev) => [
      ...prev,
      { id: Date.now(), label, done: false, desc: newDesc.trim() || undefined },
    ]);
    setNewLabel("");
    setNewDesc("");
    setShowAdd(false);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Decorative blobs */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1 } as any}>
        <View style={{ position: "absolute", top: "25%", left: -80, width: 256, height: 256, backgroundColor: "rgba(229,223,248,0.2)", borderRadius: 9999, ...(Platform.OS === "web" ? ({ filter: "blur(100px)" } as any) : {}) } as any} />
        <View style={{ position: "absolute", bottom: "25%", right: -80, width: 320, height: 320, backgroundColor: "rgba(255,228,242,0.2)", borderRadius: 9999, ...(Platform.OS === "web" ? ({ filter: "blur(120px)" } as any) : {}) } as any} />
      </View>

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 24, paddingVertical: 16,
          flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.6)",
          ...(Platform.OS === "web" ? ({ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(24px)" } as any) : {}),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18 }}>☑️</Text>
          </View>
          <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
            Dua-to-Do
          </Text>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
        {/* Title */}
        <Text style={{ fontFamily: "Newsreader", fontSize: 34, fontStyle: "italic", fontWeight: "600", color: "#2f3338", lineHeight: 42, marginBottom: 24 }}>
          {doneCount === tasks.length && tasks.length > 0
            ? "All intentions fulfilled ✨"
            : `${tasks.length} Steps to Manifest your Intention`}
        </Text>

        {/* Progress Card */}
        <View style={[glass(32), { padding: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#5b5f65", fontWeight: "700", marginBottom: 6 }}>
              Journey Status
            </Text>
            <Text style={{ fontFamily: "Newsreader", fontSize: 24, fontStyle: "italic", color: "#2f3338", marginBottom: 16 }}>
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
                    padding: 20,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 16,
                    ...(isNextActive
                      ? { borderLeftWidth: 3, borderLeftColor: "#166534" }
                      : { opacity: 0.65 }),
                  },
                ]}
              >
                <View
                  style={{
                    width: 40, height: 40, borderRadius: 20, marginTop: 4, flexShrink: 0,
                    borderWidth: 2,
                    borderColor: isNextActive ? "#166534" : "rgba(119,123,129,0.25)",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 18, color: isNextActive ? "#166534" : "#aaa" }}>○</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Noto Serif", fontSize: 18, fontWeight: "500", color: "#2f3338", marginBottom: 4 }}>{task.label}</Text>
                  {task.desc ? (
                    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, color: "#5b5f65", lineHeight: 18 }}>{task.desc}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => remove(task.id)} style={{ padding: 8, opacity: 0.35 }}>
                  <Text style={{ fontSize: 14, color: "#777b81" }}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add Task inline form */}
        {showAdd && (
          <View style={[glass(24), { padding: 20, gap: 12, marginBottom: 20 }]}>
            <Text style={{ fontFamily: "Newsreader", fontSize: 18, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
              New Intention
            </Text>
            <View style={[glass(16), { padding: 14 }]}>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="What do you intend to do?"
                placeholderTextColor="rgba(91,95,101,0.45)"
                style={{
                  fontFamily: "Noto Serif", fontSize: 15, color: "#2f3338",
                  ...(Platform.OS === "web" ? ({ outline: "none" } as any) : {}),
                }}
              />
            </View>
            <View style={[glass(16), { padding: 14 }]}>
              <TextInput
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Description (optional)"
                placeholderTextColor="rgba(91,95,101,0.45)"
                multiline
                style={{
                  fontFamily: "Noto Serif", fontSize: 14, color: "#2f3338",
                  minHeight: 56, textAlignVertical: "top",
                  ...(Platform.OS === "web" ? ({ outline: "none" } as any) : {}),
                }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setShowAdd(false); setNewLabel(""); setNewDesc(""); }}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 9999, alignItems: "center", backgroundColor: "rgba(229,223,248,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" }}
              >
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "600", color: "#524f63" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addTask}
                style={{ flex: 2, paddingVertical: 14, borderRadius: 9999, alignItems: "center", backgroundColor: "#166534" }}
              >
                <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", letterSpacing: 1, color: "#fff" }}>Add Intention</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setShowAdd(!showAdd)}
            activeOpacity={0.85}
            style={{ backgroundColor: "#166534", paddingHorizontal: 28, paddingVertical: 16, borderRadius: 9999, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#166534", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } }}
          >
            <Text style={{ fontSize: 18, color: "#fff" }}>{showAdd ? "✕" : "✚"}</Text>
            <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "600", letterSpacing: 1, color: "#fcf7ff" }}>
              {showAdd ? "Cancel" : "Add Intention"}
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
