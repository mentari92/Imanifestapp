import { ScrollView, View, Text, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Shield } from "lucide-react-native";

const glass = (radius = 20) => ({
  backgroundColor: "rgba(255,255,255,0.55)",
  borderRadius: radius,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.25)",
  ...(Platform.OS === "web"
    ? ({ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" } as any)
    : {}),
});

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 8 }}>
    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "700", color: "#1e1b2e", textTransform: "uppercase", letterSpacing: 1 }}>
      {title}
    </Text>
    {children}
  </View>
);

const Para = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ fontFamily: "Noto Serif", fontSize: 14, fontStyle: "italic", color: "#3f3f46", lineHeight: 24 }}>
    {children}
  </Text>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: "row", gap: 8 }}>
    <Text style={{ color: "#166534", fontSize: 14 }}>•</Text>
    <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, color: "#3f3f46", lineHeight: 20, flex: 1 }}>{children}</Text>
  </View>
);

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9f7ff" }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Background blobs */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden" } as any}>
        <View style={{ position: "absolute", top: "-5%", left: "-10%", width: "55%", height: "40%", backgroundColor: "#e5dff8", borderRadius: 9999, opacity: 0.35, ...(Platform.OS === "web" ? ({ filter: "blur(70px)" } as any) : {}) } as any} />
        <View style={{ position: "absolute", bottom: "10%", right: "-5%", width: "45%", height: "35%", backgroundColor: "#d1fae5", borderRadius: 9999, opacity: 0.3, ...(Platform.OS === "web" ? ({ filter: "blur(70px)" } as any) : {}) } as any} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <TouchableOpacity onPress={() => router.back()} style={[glass(12), { paddingHorizontal: 14, paddingVertical: 8 }]}>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "600", color: "#524f63" }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" }}>
          <Shield size={20} color="#065f46" strokeWidth={1.8} />
        </View>
        <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
          Privacy Policy
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24, gap: 24, maxWidth: 680, alignSelf: "center", width: "100%" }}>

        <View style={[glass(20), { padding: 20 }]}>
          <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#524f63", lineHeight: 26, textAlign: "center" }}>
            "And He is with you wherever you are." — Quran 57:4
          </Text>
        </View>

        <View style={[glass(20), { padding: 24, gap: 20 }]}>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#777b81", textTransform: "uppercase", letterSpacing: 1 }}>
            Last updated: April 2026
          </Text>

          <Para>
            Your spiritual journey is yours. This policy covers what we collect, why, and how we handle it. Short version: we collect only what we need, we don't sell anything, and you can delete your data anytime.
          </Para>

          <Section title="What We Collect">
            <Bullet>Your email address and display name when you create an account</Bullet>
            <Bullet>Spiritual intentions, reflections, and dua text you write, sent to the AI to generate your guidance and nothing else</Bullet>
            <Bullet>Basic usage data (which screens you visit) to help us fix what's broken, never sold</Bullet>
            <Bullet>Quran.com account token if you connect via OAuth, stored encrypted and used only to sync your reading goals</Bullet>
          </Section>

          <Section title="What We Never Collect">
            <Bullet>We don't sell or share your data with advertisers</Bullet>
            <Bullet>We don't read your reflections for anything other than generating your guidance in that session</Bullet>
            <Bullet>There's no payment data to store. We have no paid features.</Bullet>
          </Section>

          <Section title="How Your Data Is Used">
            <Para>
              When you submit a reflection, the text goes to OpenRouter, which routes it to models like Gemini or DeepSeek. They process the request and don't keep it. Verse searches go through api.quran.com. Your text doesn't persist on either server.
            </Para>
          </Section>

          <Section title="Data Storage & Retention">
            <Bullet>Email and display name sit in our database on a private VPS</Bullet>
            <Bullet>Session cache expires in Redis within 1–24 hours</Bullet>
            <Bullet>Email us anytime to delete your account and everything tied to it</Bullet>
          </Section>

          <Section title="Third-Party Services">
            <Bullet>OpenRouter (openrouter.ai) — routes your reflection text to AI models</Bullet>
            <Bullet>Quran Foundation / Quran.com — source for Quran text, translations, and tafsir</Bullet>
            <Bullet>cdn.islamic.network — audio recitations (no personal data shared)</Bullet>
            <Bullet>Dicebear (api.dicebear.com) — reciter avatars (no personal data shared)</Bullet>
          </Section>

          <Section title="Your Rights">
            <Bullet>See or download your personal data</Bullet>
            <Bullet>Request correction of inaccurate information</Bullet>
            <Bullet>Delete your account and all data</Bullet>
            <Bullet>Skip the AI features if you'd prefer your text not to be processed</Bullet>
          </Section>

          <Section title="Contact">
            <Para>
              Questions or deletion requests: mentaribisnis92@gmail.com. We reply within 48 hours.
            </Para>
          </Section>
        </View>
      </View>
    </ScrollView>
  );
}
