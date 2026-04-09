import { Tabs } from "expo-router";
import { Sparkles, CheckSquare, Mic, Headphones } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#064E3B",
        tabBarInactiveTintColor: "#78716C",
        tabBarStyle: {
          backgroundColor: "#F8FAFC",
          borderTopColor: "#F1F5F0",
        },
        tabBarLabelStyle: {
          fontFamily: "Lora-Regular",
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: "#F8FAFC",
        },
        headerTintColor: "#1C1917",
        headerTitleStyle: {
          fontFamily: "PlayfairDisplay-Bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ImanSync",
          tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dua-todo"
        options={{
          title: "Dua-to-Do",
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="heartpulse"
        options={{
          title: "HeartPulse",
          tabBarIcon: ({ color, size }) => <Mic size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sakinah"
        options={{
          title: "SakinahStream",
          tabBarIcon: ({ color, size }) => <Headphones size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}