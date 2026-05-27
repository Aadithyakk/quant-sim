import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--xlb-bg) / <alpha-value>)",
        panel: "rgb(var(--xlb-panel) / <alpha-value>)",
        panel2: "rgb(var(--xlb-panel2) / <alpha-value>)",
        border: "rgb(var(--xlb-border) / <alpha-value>)",
        accent: "rgb(var(--xlb-accent) / <alpha-value>)",
        accent2: "rgb(var(--xlb-accent2) / <alpha-value>)",
        good: "rgb(var(--xlb-good) / <alpha-value>)",
        bad: "rgb(var(--xlb-bad) / <alpha-value>)",
        muted: "rgb(var(--xlb-muted) / <alpha-value>)",
        ink: "rgb(var(--xlb-ink) / <alpha-value>)",
        soft: "rgb(var(--xlb-soft) / <alpha-value>)",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
      },
      backgroundImage: {
        bamboo: "repeating-linear-gradient(45deg, rgb(var(--xlb-bamboo) / 0.06), rgb(var(--xlb-bamboo) / 0.06) 2px, transparent 2px, transparent 8px)",
        steam: "radial-gradient(800px 360px at 20% -10%, rgb(var(--xlb-accent) / 0.10), transparent 60%), radial-gradient(700px 300px at 110% 0%, rgb(var(--xlb-accent2) / 0.10), transparent 60%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
