import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { Sparkles, Star, Award, CheckCircle } from "lucide-react-native";
import { ShareTheLightCard } from "../shared/ShareTheLightCard";

interface Task {
  id: string;
  manifestationId: string;
  description: string;
  isCompleted: boolean;
  quranGoalId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskChecklistProps {
  tasks: Task[];
  onToggle: (taskId: string, isCompleted: boolean) => void;
}

export function TaskChecklist({ tasks, onToggle }: TaskChecklistProps) {
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  // Faith score gamification (e.g. 50 points per task)
  const faithScore = completedCount * 50;

  const [showEcard, setShowEcard] = useState(false);

  const handleRealize = () => {
    setShowEcard(true); // Bring up the beautiful Share The Light E-Card
  };

  return (
    <View className="flex-1 space-y-6">
      {/* Gamified Goal Card */}
      <View className="bg-surface-card rounded-[24px] p-6 border border-border shadow-card backdrop-blur-md items-center mt-2 relative overflow-hidden">
        <View className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={100} color="#D4AF37" />
        </View>

        <Text className="font-display text-display-md text-primary mb-1">
          Manifestation Progress
        </Text>
        <Text className="font-sans text-body-sm text-ink-secondary mb-5">
          "Earn $10,000 / month by next quarter"
        </Text>

        <View className="flex-row items-center gap-3">
          <View className="flex-1 h-3 bg-border rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </View>
          <Text className="font-display text-display-sm text-primary">
            {progressPct}%
          </Text>
        </View>

        <View className="flex-row items-center gap-2 mt-4 bg-white/40 px-4 py-2 rounded-full border border-white/50">
          <Star size={16} color="#D4AF37" fill="#D4AF37" />
          <Text className="font-sans text-label text-ink-primary">
            Faith Score: {faithScore}
          </Text>
        </View>
      </View>

      {/* Task List */}
      {tasks.length === 0 ? (
        <View className="mt-8 items-center">
          <Text className="font-sans text-body-md text-ink-secondary text-center">
            No tasks yet. Generate your roadmap.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <Text className="font-display text-display-sm text-primary mt-2 mb-2">
              Your Daily Action Plan
            </Text>
          )}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              onPress={() => onToggle(item.id, !item.isCompleted)}
              className={`flex-row items-center px-5 py-4 rounded-[20px] shadow-sm border transition-all ${
                item.isCompleted 
                  ? "bg-sage-green/10 border-sage-green/30" 
                  : "bg-surface-card border-border backdrop-blur-md"
              }`}
              activeOpacity={0.8}
            >
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${
                item.isCompleted ? "bg-[#166534] border-[#166534]" : "border-ink-disabled"
              }`}>
                {item.isCompleted && <CheckCircle size={14} color="#FFFFFF" />}
              </View>
              <View className="flex-1">
                <Text className={`font-sans text-body-md ${
                  item.isCompleted ? "text-ink-secondary line-through opacity-70" : "text-primary"
                }`}>
                  {item.description}
                </Text>
                {index === 0 && !item.isCompleted && (
                  <Text className="font-sans text-xs text-accent mt-1">
                    +50 Faith Score (Spiritual Task)
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={() => (
            <TouchableOpacity 
              onPress={handleRealize}
              disabled={progressPct < 100}
              className={`mt-8 py-5 rounded-[20px] flex-row justify-center items-center gap-2 border shadow-card transition-all ${
                progressPct === 100 
                  ? "bg-primary border-primary" 
                  : "bg-surface-input border-border opacity-50"
              }`}
            >
              <Award size={20} color={progressPct === 100 ? "#FFFFFF" : "#9896A9"} />
              <Text className={`font-sans text-label font-bold ${
                progressPct === 100 ? "text-ink-inverse" : "text-ink-disabled"
              }`}>
                {progressPct === 100 ? "Mark as Realized ✨" : "Complete Roadmap to Realize"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Share The Light E-Card Modal */}
      <ShareTheLightCard 
        visible={showEcard} 
        onClose={() => setShowEcard(false)} 
        manifestationGoal="Earn $10,000 / month by next quarter" 
        faithScore={faithScore} 
      />
    </View>
  );
}