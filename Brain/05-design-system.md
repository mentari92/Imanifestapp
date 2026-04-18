# Design System (Legacy)
# ImanifestApp – AI-Powered Spiritual Productivity Platform

> IMPORTANT (April 2026): This document is legacy guidance.
> Active UI source of truth is Stitch output in apps/mobile-web/assets/stitch/*.json and the current implementation patterns in apps/mobile-web/global.css.
> If this file conflicts with Stitch artifacts, follow Stitch artifacts.

**Version:** 1.0  
**Status:** Final — Ready for Development  
**Language:** English (global audience — all UI copy, labels, error messages, and content in English)

---

## 1. Brand Philosophy

ImanifestApp sits at the intersection of Islamic spirituality and modern productivity. The visual identity is intentionally calm and grounded — not loud, not corporate. It should feel like a quiet room where someone goes to think clearly and act with purpose.

The color and typography decisions are grounded in the founder's personal energy framework: **Bazi (Chinese Four Pillars of Destiny)**. This is the same system applied across the project ecosystem. Colors are not decorative choices — they represent energetic balance for the founder's profile.

**Founder profile:**
- Zodiac: Sagittarius
- Shio: Monkey (1992)
- Birth season: December — Water element dominant (Winter)
- Life Path: 7 (introspection, spiritual depth, analytical)

**Energy diagnosis:** Strong Water element. Needs Wood to channel the Water constructively, and Fire to introduce warmth and prevent stagnation.

**Design principle:** Grounded growth. The UI should feel rooted and focused, not animated and excitable. Interactions are smooth but deliberate. Whitespace is generous. Every element earns its place on screen.

---

## 2. Color Theory & Bazi Alignment

### Why these colors

| Color | Name | Hex | Element | Bazi Reason |
|-------|------|-----|---------|-------------|
| Primary | Forest Green | `#064E3B` | Wood | Wood absorbs excess Water energy. Green is also the color of Islam, growth, and calm presence. |
| Accent | Rosewood | `#54161B` | Fire | Fire balances the cold Water element. Deep maroon introduces warmth without aggression. Life Path 7 resonates with depth and introspection — this dark red captures that. |
| Highlight | Champagne Gold | `#E3C567` | Metal | Shio Monkey's element is Metal. Gold represents abundance, clarity, and the precision-oriented Monkey energy. Used sparingly for streak counts, achievements, and key CTAs. |
| Background | Off-White | `#F8FAFC` | Neutral | Clean and modern. Reduces visual noise so the user can focus on their intention. |
| Text Primary | Deep Charcoal | `#1C1917` | Earth | Earth stabilizes all four elements. Dark charcoal (not pure black) reads warmer and less harsh on screen. |
| Text Secondary | Warm Gray | `#78716C` | Earth | For labels, captions, timestamps. Still warm-toned to stay cohesive. |
| Surface | Soft White | `#F1F5F0` | Wood/Neutral | Used for cards and containers. Slightly green-tinted white to reinforce Wood energy subtly. |
| Error | Deep Rose | `#9F1239` | Fire | Error states use a contained Fire tone. Distinct from Rosewood but tonally consistent. |
| Success | Sage Green | `#166534` | Wood | Confirmation, completed tasks. Lighter Wood variant of the primary. |

### Do not use

- Emerald or bright green (#10B981 range) — clashes with the deep Forest Green primary and reads as a different brand
- Pure black (#000000) — too harsh against off-white background
- Bright orange or yellow — too yang for this brand; the energy should be contained

---

## 3. Palette Reference

```
Primary     Forest Green    #064E3B   ████████  Background of primary buttons, nav active state
Accent      Rosewood        #54161B   ████████  Secondary buttons, tags, spiritual depth elements
Highlight   Champagne Gold  #E3C567   ████████  Streaks, achievements, key numbers, gold CTAs
Background  Off-White       #F8FAFC   ████████  App background, screen base
Surface     Soft White      #F1F5F0   ████████  Cards, modals, bottom sheets
Text/900    Deep Charcoal   #1C1917   ████████  Body text, headings
Text/500    Warm Gray       #78716C   ████████  Labels, captions, metadata
Error       Deep Rose       #9F1239   ████████  Error states
Success     Sage Green      #166534   ████████  Success states, completed tasks
```

---

## 4. NativeWind Theme Configuration

Drop this into `apps/mobile-web/tailwind.config.js`. All color names map directly to Tailwind utility classes (`bg-primary`, `text-accent`, `border-highlight`, etc.).

```js
// apps/mobile-web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#064E3B",
          50:  "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",  // ← brand primary
        },
        accent: {
          DEFAULT: "#54161B",
          50:  "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#8B2635",
          600: "#6B1D26",
          700: "#5A1920",
          800: "#54161B",  // ← brand accent
          900: "#450F14",
        },
        highlight: {
          DEFAULT: "#E3C567",
          50:  "#FEFCE8",
          100: "#FEF9C3",
          200: "#FEF08A",
          300: "#F5D878",
          400: "#E3C567",  // ← brand highlight
          500: "#CA9A3C",
          600: "#A37C2A",
          700: "#7C5E1D",
          800: "#5A4315",
          900: "#3B2C0C",
        },
        surface: {
          DEFAULT: "#F1F5F0",
          card:    "#F1F5F0",
          modal:   "#FFFFFF",
          input:   "#F8FAFC",
        },
        background: {
          DEFAULT: "#F8FAFC",
        },
        text: {
          primary:   "#1C1917",
          secondary: "#78716C",
          disabled:  "#A8A29E",
          inverse:   "#F8FAFC",
        },
        status: {
          error:   "#9F1239",
          success: "#166534",
          warning: "#92400E",
          info:    "#1E40AF",
        },
      },
      fontFamily: {
        sans:    ["Lora", "serif"],          // body text — see Typography section
        display: ["Playfair Display", "serif"], // headings
        mono:    ["JetBrains Mono", "monospace"], // code, verse keys
        arabic:  ["Amiri", "serif"],         // Quranic Arabic text
      },
      borderRadius: {
        card:   "12px",
        button: "8px",
        pill:   "999px",
        verse:  "16px",
      },
      spacing: {
        // Named spacing tokens for consistency
        "screen-x": "20px",  // horizontal screen padding
        "screen-y": "24px",  // vertical screen padding
        "card-p":   "16px",  // card internal padding
        "section":  "32px",  // between page sections
      },
      boxShadow: {
        card:    "0 1px 3px rgba(6, 78, 59, 0.08), 0 1px 2px rgba(6, 78, 59, 0.04)",
        "card-hover": "0 4px 12px rgba(6, 78, 59, 0.12)",
        verse:   "0 2px 8px rgba(84, 22, 27, 0.10)",
        gold:    "0 0 0 2px rgba(227, 197, 103, 0.40)",
      },
    },
  },
  plugins: [],
};
```

### Shared theme object (for non-Tailwind usage)

Use this in `packages/shared/src/theme.ts` for any component that needs programmatic access to tokens (e.g. Expo charts, animations, conditional styles).

```ts
// packages/shared/src/theme.ts

export const colors = {
  primary:    "#064E3B",
  accent:     "#54161B",
  highlight:  "#E3C567",
  background: "#F8FAFC",
  surface:    "#F1F5F0",
  text: {
    primary:   "#1C1917",
    secondary: "#78716C",
    disabled:  "#A8A29E",
    inverse:   "#F8FAFC",
  },
  status: {
    error:   "#9F1239",
    success: "#166534",
    warning: "#92400E",
    info:    "#1E40AF",
  },
} as const;

export const radii = {
  card:   12,
  button: 8,
  pill:   999,
  verse:  16,
} as const;

export const spacing = {
  screenX: 20,
  screenY: 24,
  cardP:   16,
  section: 32,
} as const;

export type ColorToken = typeof colors;
```

---

## 5. Typography

### Font pairing rationale

The fonts were chosen for two qualities: spiritual warmth and technical clarity. The app deals with sacred text (Quran) and structured productivity (tasks, streaks, scores). The typography needs to serve both without tension.

| Role | Font | Format | Why |
|------|------|--------|-----|
| Headings / Display | **Playfair Display** | Serif | Elegant, literary, deep. Carries the spiritual weight of intention-setting without looking like a mosque app. The high contrast between thick and thin strokes evokes classical Islamic calligraphy aesthetics. |
| Body / UI text | **Lora** | Serif | Readable serif that pairs with Playfair without competing. Warmer and more grounded than sans alternatives. Chosen over Inter/Roboto specifically to avoid the corporate productivity app feel. |
| Quranic Arabic | **Amiri** | Arabic Serif | Standard choice for digital Quranic text. Faithfully renders harakat (diacritics), has good Unicode coverage for all Quranic characters, and is free via Google Fonts. |
| Verse keys / metadata | **JetBrains Mono** | Monospace | For verse references like `2:286`, timestamps, and scores. Monospace keeps these from looking like regular body text. |

### Loading fonts in Expo

```ts
// apps/mobile-web/app/_layout.tsx
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular,
} from "@expo-google-fonts/playfair-display";
import {
  Lora_400Regular,
  Lora_600SemiBold,
} from "@expo-google-fonts/lora";
import { Amiri_400Regular } from "@expo-google-fonts/amiri";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "PlayfairDisplay-Bold":    PlayfairDisplay_700Bold,
    "PlayfairDisplay-Regular": PlayfairDisplay_400Regular,
    "Lora-Regular":            Lora_400Regular,
    "Lora-SemiBold":           Lora_600SemiBold,
    "Amiri-Regular":           Amiri_400Regular,
    "JetBrainsMono-Regular":   JetBrainsMono_400Regular,
  });

  if (!fontsLoaded) return null;

  // ... rest of layout
}
```

### Install font packages

```bash
npx expo install \
  @expo-google-fonts/playfair-display \
  @expo-google-fonts/lora \
  @expo-google-fonts/amiri \
  @expo-google-fonts/jetbrains-mono \
  expo-font
```

### Type scale

| Token | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| `display-xl` | Playfair Display | 32px | 700 | 1.2 | App title, onboarding hero |
| `display-lg` | Playfair Display | 26px | 700 | 1.25 | Screen headings |
| `display-md` | Playfair Display | 22px | 400 | 1.3 | Section titles |
| `body-lg` | Lora | 17px | 400 | 1.6 | Primary body text, verse translations |
| `body-md` | Lora | 15px | 400 | 1.6 | Secondary body, descriptions |
| `body-sm` | Lora | 13px | 400 | 1.5 | Captions, metadata, timestamps |
| `label` | Lora | 13px | 600 | 1.2 | Button labels, form labels |
| `arabic-lg` | Amiri | 26px | 400 | 1.8 | Quranic verse Arabic text |
| `arabic-md` | Amiri | 20px | 400 | 1.8 | Inline Quranic phrases |
| `mono` | JetBrains Mono | 13px | 400 | 1.4 | Verse keys (2:286), scores, streaks |

---

## 6. Component Patterns

### VerseCard

The most important component in the app. Renders a single Quranic verse returned by ImanSync.

```
┌─────────────────────────────────────┐
│  2:286                              │  ← mono, text/secondary
│                                     │
│  لَا يُكَلِّفُ اللَّهُ نَفْسًا...   │  ← Arabic, arabic-lg, right-aligned
│                                     │
│  Allah does not burden a soul       │  ← body-lg, text/primary
│  beyond that it can bear.           │
│                                     │
│  ▸ Tafsir                           │  ← collapsible, body-sm, accent color
└─────────────────────────────────────┘
```

- Background: `surface` (#F1F5F0)
- Border: 1px left border in `primary` (#064E3B)
- Border radius: `verse` (16px)
- Shadow: `verse`
- Arabic text: right-to-left, `font-arabic`, `text-right`

### SentimentBadge

```
Positive states  → bg-primary/10    text-primary    (Forest Green family)
Neutral states   → bg-surface       text-secondary
Negative states  → bg-accent/10     text-accent     (Rosewood family)
Streak/Gold      → bg-highlight/20  text-highlight  (Champagne Gold family)
```

### TaskItem (Dua-to-Do checklist)

- Uncompleted: `border-primary/30`, checkbox outline `primary`
- Completed: text `text/disabled`, strikethrough, checkbox fill `primary`
- Step number: `mono`, `text/secondary`

### StreakCard

- Number: `display-lg`, `highlight` color
- Label: `body-sm`, `text/secondary`
- Background: subtle gold wash (`bg-highlight/10`)
- Border: 1px `highlight/40`

---

## 7. Language & Copy Guidelines

**All UI must be in English.** ImanifestApp targets a global Muslim audience — Indonesia, Malaysia, Middle East, UK, US, and beyond. English is the common language across these markets.

### Rules

- All button labels, navigation items, form labels, error messages, placeholder text, and loading states: **English only**
- AI-generated content (ImanSync summary, Dua-to-Do steps, HeartPulse sentiment): **English**
- Verse translations: **English** (using Quran Foundation's English translation)
- Tafsir snippets: **English**
- Arabic text in VerseCard: Arabic script only — never transliterated

### Tone

The copy voice is calm, direct, and supportive. Not corporate. Not preachy.

| Avoid | Use instead |
|-------|------------|
| "Please enter your intention in the field below" | "What's your intention today?" |
| "Your request is being processed" | "Finding your verses..." |
| "An error has occurred" | "Something went wrong. Try again." |
| "Congratulations on your achievement!" | "5-day streak. Keep going." |
| "Unlock the power of your spirituality" | "Turn your intention into action." |

### Sentiment labels (HeartPulse)

Always English. Single word where possible.

```
hopeful | grateful | peaceful | content | focused
anxious | struggling | uncertain | heavy
```

### Empty state copy examples

```
No manifestations yet.
Set your first intention to get started.

No reflections this week.
Even one sentence counts.

Your streak starts today.
```

---

## 8. Iconography

Use **Lucide icons** (`lucide-react-native`) throughout. They are clean, minimal, and consistent with the calm brand aesthetic.

Do not mix icon libraries. No emoji as functional icons.

| Feature | Icon | Name |
|---------|------|------|
| ImanSync | `Sparkles` | Intention / AI |
| Dua-to-Do | `CheckSquare` | Tasks / checklist |
| HeartPulse | `Mic` (recording), `Heart` (journal) | Voice |
| SakinahStream | `Headphones` | Audio |
| Dashboard | `LayoutDashboard` | Overview |
| Streak | `Flame` | Streak count |
| Settings | `Settings` | — |
| Verse | `BookOpen` | Quran |
| Delete | `Trash2` | — |

---

## 9. Motion & Interaction

Keep animation minimal. The brand is calm — not a fintech app trying to celebrate every tap.

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Screen transition | Fade + slide up 8px | 220ms ease-out |
| Card press | Scale to 0.98 | 100ms |
| Checkbox complete | Scale 1 → 1.15 → 1 | 200ms spring |
| Streak increment | Number count-up | 600ms |
| ImanSync loading | Subtle pulse on verse placeholders | Loop 1.2s |
| Error shake | ±4px horizontal | 300ms |

No confetti. No full-screen celebration animations. A streak milestone (e.g. 7 days) can show a brief gold glow on the StreakCard — nothing more.

---

## 10. Dark Mode

Dark mode is planned for post-hackathon. In MVP, the app ships light mode only.

When dark mode is implemented, the mapping is:

| Token | Light | Dark |
|-------|-------|------|
| background | #F8FAFC | #0C1A14 |
| surface | #F1F5F0 | #162820 |
| text/primary | #1C1917 | #F5F0EB |
| text/secondary | #78716C | #A8A29E |
| primary | #064E3B | #10B981 |
| accent | #54161B | #FB7185 |
| highlight | #E3C567 | #E3C567 |

The Forest Green primary lightens significantly in dark mode (to maintain contrast on dark surfaces). Rosewood shifts to a lighter rose. Champagne Gold stays identical in both modes.
