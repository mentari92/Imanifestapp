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
          900: "#064E3B",  // brand primary
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
          800: "#54161B",  // brand accent
          900: "#450F14",
        },
        highlight: {
          DEFAULT: "#E3C567",
          50:  "#FEFCE8",
          100: "#FEF9C3",
          200: "#FEF08A",
          300: "#F5D878",
          400: "#E3C567",  // brand highlight
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
        ink: {
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
        sans:    ["Lora-Regular", "Lora-SemiBold"],
        display: ["PlayfairDisplay-Bold", "PlayfairDisplay-Regular"],
        mono:    ["JetBrainsMono-Regular"],
        arabic:  ["Amiri-Regular"],
      },
      borderRadius: {
        card:   "12px",
        button: "8px",
        pill:   "999px",
        verse:  "16px",
      },
      spacing: {
        "screen-x": "20px",
        "screen-y": "24px",
        "card-p":   "16px",
        "section":  "32px",
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