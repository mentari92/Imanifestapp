import { ScrollView, View, Text, TouchableOpacity, Platform, Image, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { HeartHandshake } from "lucide-react-native";

const founderPhoto = require("../assets/about-us/mentari-rahman-photo.jpg");

const glass = (radius = 22) => ({
  backgroundColor: "rgba(255,255,255,0.7)",
  borderRadius: radius,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.55)",
  ...(Platform.OS === "web"
    ? ({ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" } as any)
    : {}),
});

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 10 }}>
    <Text
      style={{
        fontFamily: "Inter-SemiBold",
        fontSize: 12,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: "#6b7280",
      }}
    >
      {title}
    </Text>
    {children}
  </View>
);

const Para = ({ children }: { children: React.ReactNode }) => (
  <Text
    style={{
      fontFamily: "Lora-Regular",
      fontSize: 15,
      lineHeight: 26,
      color: "#4b5563",
    }}
  >
    {children}
  </Text>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 9999,
      backgroundColor: "rgba(91,33,182,0.08)",
      borderWidth: 1,
      borderColor: "rgba(91,33,182,0.12)",
    }}
  >
    <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 12, color: "#5b21b6" }}>
      {children}
    </Text>
  </View>
);

const StoryLabel = ({ children }: { children: React.ReactNode }) => (
  <Text
    style={{
      fontFamily: "Inter-SemiBold",
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: "#6b7280",
    }}
  >
    {children}
  </Text>
);

export default function AboutUsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const handleBack = () => {
    const canGoBack = (router as any)?.canGoBack?.();
    if (canGoBack) router.back();
    else router.replace("/");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f6f1ff" }}
      contentContainerStyle={{ paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        pointerEvents="none"
        style={{ position: "absolute", inset: 0, overflow: "hidden" } as any}
      >
        <View
          style={{
            position: "absolute",
            top: -20,
            left: -40,
            width: 380,
            height: 240,
            borderRadius: 9999,
            backgroundColor: "rgba(147,197,253,0.18)",
            ...(Platform.OS === "web" ? ({ filter: "blur(70px)" } as any) : {}),
          } as any}
        />
        <View
          style={{
            position: "absolute",
            top: 260,
            right: -60,
            width: 360,
            height: 260,
            borderRadius: 9999,
            backgroundColor: "rgba(167,243,208,0.22)",
            ...(Platform.OS === "web" ? ({ filter: "blur(80px)" } as any) : {}),
          } as any}
        />
        <View
          style={{
            position: "absolute",
            bottom: 120,
            left: "18%",
            width: 320,
            height: 220,
            borderRadius: 9999,
            backgroundColor: "rgba(251,191,36,0.12)",
            ...(Platform.OS === "web" ? ({ filter: "blur(75px)" } as any) : {}),
          } as any}
        />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 22, flexDirection: "row", alignItems: "center", gap: 14 }}>
        <TouchableOpacity onPress={handleBack} style={[glass(12), { paddingHorizontal: 14, paddingVertical: 8 }]}>
          <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: "#4b5563" }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#e9d5ff", alignItems: "center", justifyContent: "center" }}>
          <HeartHandshake size={20} color="#6d28d9" strokeWidth={1.8} />
        </View>
        <Text style={{ fontFamily: "PlayfairDisplay-Bold", fontSize: 21, color: "#1f2937" }}>
          About Us
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 14, maxWidth: 820, alignSelf: "center", width: "100%" }}>
        <View style={[glass(24), { padding: 24, gap: 12 }]}>
          <Text style={{ fontFamily: "PlayfairDisplay-Bold", fontSize: 24, lineHeight: 32, color: "#111827", maxWidth: 660 }}>
            ImanifestApp helps people turn intention into action.
          </Text>
          <Text style={{ fontFamily: "Lora-Regular", fontSize: 15, lineHeight: 25, color: "#4b5563", maxWidth: 680 }}>
            The app is built for the quiet moments when someone wants to make sense of what they are carrying, what they are hoping for, or what they need to do next. It brings reflection, Quranic guidance, and practical next steps into one place.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
            <Pill>Quranic guidance</Pill>
            <Pill>Reflection</Pill>
            <Pill>Practical next steps</Pill>
          </View>
        </View>

        <View style={[glass(24), { padding: 24, gap: 16 }]}>
          <Section title="Meet the Founder">
            <StoryLabel>Profile</StoryLabel>
            <View style={{ flexDirection: isCompact ? "column" : "row", gap: 18, alignItems: isCompact ? "stretch" : "flex-start" }}>
              <View
                style={{
                  width: isCompact ? "100%" : 140,
                  height: isCompact ? 220 : 164,
                  borderRadius: 18,
                  overflow: "hidden",
                  backgroundColor: "#dbeafe",
                  flexShrink: 0,
                }}
              >
                <Image
                  source={founderPhoto}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, gap: 10 }}>
                <Para>
                  I want to be real with you: Imanifestapp is my lifeline.
                </Para>
                <Para>
                  My name is Mentari Rahman. I&apos;ve spent the last 8 years in the tech industry, most recently at Canva and before that as a Country Manager for Financer. But those titles didn&apos;t matter when my life suddenly felt like it was falling apart.
                </Para>
                <Para>
                  A while ago, I lost over $20,000, money I&apos;d saved for years to build a mosque. I trusted a friend, but they took the money and disappeared. The mosque was never built. In that same month, my work contract ended. Suddenly, I was back at my parents&apos; house, trying to figure out how to pay my monthly mortgage with no steady income left.
                </Para>
                <Para>
                  To be honest, I was angry, embarrassed, and exhausted. It&apos;s hard to think clearly when your bank account is low and your trust in people is broken.
                </Para>
                <Para>
                  I started building Imanifestapp from my room at my parents&apos; house because I needed a way to stay sane. I needed a tool to help me find peace through the Quran without feeling overwhelmed. This app is my way of getting back on my feet.
                </Para>
                <Para>
                  I&apos;m building this business to turn things around. My goal is to become a techpreneur who actually helps people. I still want to build that mosque. I want to start a foundation to help those in need and create jobs for others who might be struggling just like I was.
                </Para>
                <Para>
                  Imanifestapp is more than just code. It&apos;s proof that a bad situation doesn&apos;t have to be the end of your story.
                </Para>
              </View>
            </View>
          </Section>
        </View>

        <View style={[glass(24), { padding: 24, gap: 16 }]}>
          <Section title="My Mission">
            <Para>
              My mission is simple. I want to help people slow down, think clearly, and move with purpose. ImanifestApp is not trying to replace faith, advice, or community. It is here to support them.
            </Para>
            <Para>
              I want the app to feel steady and practical, especially for people who are dealing with pressure, uncertainty, or a decision they do not know how to make yet.
            </Para>
          </Section>
        </View>

        <View style={[glass(24), { padding: 24, gap: 16 }]}>
          <Section title="Giving Back">
            <Para>
              I&apos;m building this with a bigger goal in mind. I want to build that mosque myself, the one that was taken from me. I want to start a foundation to help those in need and create jobs for others who might be struggling just like I was. Knowing that this work can eventually help someone else makes it easier to keep going every day.
            </Para>
          </Section>
        </View>

        <View style={[glass(24), { padding: 24, gap: 16 }]}>
          <Section title="Why Use ImanifestApp?">
            <View style={{ gap: 12, flexDirection: "row", flexWrap: "wrap" }}>
              <View style={[glass(16), { padding: 14, flexBasis: 250, flexGrow: 1 }]}>
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: "#7c3aed", marginBottom: 6 }}>
                  Clear thinking
                </Text>
                <Text style={{ fontFamily: "Lora-Regular", fontSize: 13, lineHeight: 21, color: "#4b5563" }}>
                  When everything feels tangled, the app helps people slow down and sort their thoughts.
                </Text>
              </View>
              <View style={[glass(16), { padding: 14, flexBasis: 250, flexGrow: 1 }]}>
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: "#7c3aed", marginBottom: 6 }}>
                  Guidance that feels close
                </Text>
                <Text style={{ fontFamily: "Lora-Regular", fontSize: 13, lineHeight: 21, color: "#4b5563" }}>
                  The app keeps the focus on reflection and practical action, not noise.
                </Text>
              </View>
              <View style={[glass(16), { padding: 14, flexBasis: 250, flexGrow: 1 }]}>
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13, color: "#7c3aed", marginBottom: 6 }}>
                  Built from real life
                </Text>
                <Text style={{ fontFamily: "Lora-Regular", fontSize: 13, lineHeight: 21, color: "#4b5563" }}>
                  I built this during a season that forced me to be honest about pain, work, and hope.
                </Text>
              </View>
            </View>
          </Section>
        </View>
      </View>
    </ScrollView>
  );
}