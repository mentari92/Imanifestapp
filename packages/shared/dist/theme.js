"use strict";
// Design tokens from 05-design-system.md Section 4
// For non-Tailwind usage (charts, animations, conditional styles)
Object.defineProperty(exports, "__esModule", { value: true });
exports.spacing = exports.radii = exports.colors = void 0;
exports.colors = {
    primary: "#F8FAFC", // Off White
    accent: "#D4AF37", // Gold
    highlight: "#FFFFFF",
    background: "#064E3B", // Emerald Deep
    surface: "rgba(2, 44, 34, 0.6)", // Darker semi-transparent
    ink: {
        primary: "#F8FAFC",
        secondary: "#94A3B8", // Slate 400
        disabled: "#475569",
        inverse: "#1A1829",
    },
    status: {
        error: "#FF6B6B",
        success: "#40C057",
        warning: "#FFD43B",
        info: "#4DABF7",
    },
};
exports.radii = {
    card: 12,
    button: 8,
    pill: 999,
    verse: 16,
};
exports.spacing = {
    screenX: 20,
    screenY: 24,
    cardP: 16,
    section: 32,
};
