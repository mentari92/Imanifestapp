import { Tabs } from "expo-router";
import { View } from "react-native";
import { LayoutDashboard, Sparkles, CheckSquare, Mic, Headphones } from "lucide-react-native";

function TabIcon({
  Icon,
  color,
  focused,
  size,
}: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  focused: boolean;
  size: number;
}) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Icon size={size} color={color} />
      {focused && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#064E3B",
            marginTop: 4,
          }}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#064E3B",
        tabBarInactiveTintColor: "#A8A29E",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: "#064E3B",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Lora-Regular",
          fontSize: 10,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: "#F8FAFC",
          shadowColor: "transparent",
          elevation: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: "#1C1917",
        headerTitleStyle: {
          fontFamily: "PlayfairDisplay-Bold",
          fontSize: 20,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={LayoutDashboard} color={color} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "ImanSync",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={Sparkles} color={color} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dua-todo"
        options={{
          title: "Dua-to-Do",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={CheckSquare} color={color} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="heartpulse"
        options={{
          title: "HeartPulse",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={Mic} color={color} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sakinah"
        options={{
          title: "Sakinah",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={Headphones} color={color} focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
