import { ScrollView, View, Text, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";

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

export default function TermsOfServiceScreen() {
  const router = useRouter();

  const handleBack = () => {
    const canGoBack = (router as any)?.canGoBack?.();
    if (canGoBack) router.back();
    else router.replace("/");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9f7ff" }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Background blobs */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden" } as any}>
        <View style={{ position: "absolute", top: "-5%", right: "-10%", width: "55%", height: "40%", backgroundColor: "#fce7f3", borderRadius: 9999, opacity: 0.35, ...(Platform.OS === "web" ? ({ filter: "blur(70px)" } as any) : {}) } as any} />
        <View style={{ position: "absolute", bottom: "10%", left: "-5%", width: "45%", height: "35%", backgroundColor: "#e5dff8", borderRadius: 9999, opacity: 0.3, ...(Platform.OS === "web" ? ({ filter: "blur(70px)" } as any) : {}) } as any} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <TouchableOpacity onPress={handleBack} style={[glass(12), { paddingHorizontal: 14, paddingVertical: 8 }]}>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 13, fontWeight: "600", color: "#524f63" }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" }}>
          <FileText size={20} color="#be185d" strokeWidth={1.8} />
        </View>
        <Text style={{ fontFamily: "Newsreader", fontSize: 22, fontStyle: "italic", fontWeight: "600", color: "#1e1b2e" }}>
          Terms of Service
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24, gap: 24, maxWidth: 680, alignSelf: "center", width: "100%" }}>

        <View style={[glass(20), { padding: 20 }]}>
          <Text style={{ fontFamily: "Noto Serif", fontSize: 15, fontStyle: "italic", color: "#524f63", lineHeight: 26, textAlign: "center" }}>
            "Indeed, Allah is with those who are patient." — Quran 2:153
          </Text>
        </View>

        <View style={[glass(20), { padding: 24, gap: 20 }]}>
          <Text style={{ fontFamily: "Plus Jakarta Sans", fontSize: 11, color: "#777b81", textTransform: "uppercase", letterSpacing: 1 }}>
            Last updated: April 2026
          </Text>

          <Para>
            By using IManifest, you agree to these terms. They're short.
          </Para>

          <Section title="What IManifest Is">
            <Para>
              IManifest is a spiritual productivity app. It uses Quranic guidance and AI to help you set goals and reflect. It's not a fatwa service, not a substitute for a qualified scholar, and not medical advice.
            </Para>
          </Section>

          <Section title="Using the App">
            <Bullet>You must be at least 13 years old to create an account</Bullet>
            <Bullet>You're responsible for keeping your account credentials secure</Bullet>
            <Bullet>Don't use the app to spread content that contradicts Islamic ethics or could harm others</Bullet>
            <Bullet>One account per person. Sharing accounts isn't allowed.</Bullet>
          </Section>

          <Section title="AI-Generated Content">
            <Para>
              The guidance IManifest generates comes from AI models drawing on Quranic verses and Islamic themes. It's not a ruling. Check anything important with a qualified scholar. We try to be accurate, but AI makes mistakes.
            </Para>
          </Section>

          <Section title="Quranic Content">
            <Para>
              Quran text, translations, and tafsir come from the Quran Foundation (quran.com) under their usage terms. Audio is from cdn.islamic.network. We don't own any of it.
            </Para>
          </Section>

          <Section title="Your Content">
            <Bullet>What you write stays yours</Bullet>
            <Bullet>Submitting text gives us permission to process it for your guidance request. That's the full extent of it.</Bullet>
            <Bullet>Don't enter sensitive information the app doesn't ask for</Bullet>
          </Section>

          <Section title="Account Termination">
            <Para>
              Delete your account anytime from settings or by emailing us. We can suspend accounts that break these terms. We'll tell you if we close yours, unless doing so creates a safety issue.
            </Para>
          </Section>

          <Section title="Limitation of Liability">
            <Para>
              IManifest is as-is. We're not liable for decisions made based on AI content, outages, or data loss outside our control. Use it alongside your own judgment.
            </Para>
          </Section>

          <Section title="Changes to These Terms">
            <Para>
              We'll update these as the app changes. We'll notify you of anything significant. Continuing to use the app after that means you accept the new terms.
            </Para>
          </Section>

          <Section title="Contact">
            <Para>
              Questions: hello@imanifestapp.com.
            </Para>
          </Section>
        </View>
      </View>
    </ScrollView>
  );
}