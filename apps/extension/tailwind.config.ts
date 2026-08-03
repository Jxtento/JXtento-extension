import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jxtento: {
          bg: "#000000",
          panel: "#111111",
          border: "#333333",
          text: "#FFFFFF",
          muted: "#888888",
          accent: "#FFFFFF",
          accentForeground: "#000000",
          good: "#22C55E",
          warn: "#EAB308",
          bad: "#EF4444"
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
}

export default config
