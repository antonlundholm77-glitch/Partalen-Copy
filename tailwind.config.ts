import type { Config } from "tailwindcss";

// Färgvärdena lever i styles/tokens.css (oliv-profilen). Här mappas de
// till Tailwind-namn. Två namnset finns sida vid sida mot samma värden:
// legacy (panel/ink/…) som app-komponenterna använder, och kanoniska
// namn (surface/fg/…) som designsystem-primitiverna använder.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // legacy (app-komponenter)
        bg: "var(--bg)",
        panel: "var(--bg-panel)",
        secondary: "var(--bg-secondary)",
        ink: "var(--text-primary)",
        "ink-2": "var(--text-secondary)",
        "ink-3": "var(--text-tertiary)",
        "warning-bg": "var(--warning-bg)",
        "warning-text": "var(--warning-text)",
        "success-bg": "var(--success-bg)",
        "success-text": "var(--success-text)",
        // kanoniska namn (primitiver)
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        fg: {
          DEFAULT: "var(--fg)",
          warm: "var(--fg-warm)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          inv: "var(--fg-inv)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          2: "var(--accent-2)",
          bright: "var(--accent-bright)",
          bg: "var(--accent-bg)",
          text: "var(--accent-text)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
          2: "var(--border-2)",
          3: "var(--border-3)",
        },
        danger: { DEFAULT: "var(--danger)", bg: "var(--danger-bg)" },
        warn: { DEFAULT: "var(--warn)", bg: "var(--warn-bg)" },
        warm: { DEFAULT: "var(--warm)", 2: "var(--warm-2)", bg: "var(--warm-bg)" },
      },
      borderRadius: {
        sm: "5px",
        DEFAULT: "7px",
        md: "7px",
        lg: "11px",
        xl: "16px",
      },
      boxShadow: {
        DEFAULT: "var(--shadow)",
        lg: "var(--shadow-lg)",
        elev1: "var(--elev-1)",
        elev2: "var(--elev-2)",
        popover: "var(--elev-popover)",
      },
      fontFamily: {
        sans: "var(--sans)",
        display: "var(--display)",
        serif: "var(--serif)",
        mono: "var(--mono)",
      },
    },
  },
  plugins: [],
};

export default config;
