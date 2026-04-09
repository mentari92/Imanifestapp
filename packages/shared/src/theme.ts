// Design tokens from 05-design-system.md Section 4
// For non-Tailwind usage (charts, animations, conditional styles)

export const colors = {
  primary:    "#064E3B",
  accent:     "#54161B",
  highlight:  "#E3C567",
  background: "#F8FAFC",
  surface:    "#F1F5F0",
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