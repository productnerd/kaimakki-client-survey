/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#121212",
        cream: {
          DEFAULT: "#fff8e6",
          78: "rgba(255,248,230,0.78)",
          61: "rgba(255,248,230,0.61)",
          31: "rgba(255,248,230,0.31)",
          20: "rgba(255,248,230,0.20)",
          10: "rgba(255,248,230,0.10)",
        },
        accent: "#eda4e8",
        pink: "#eda4e8",
        lime: "#ddf073",
        brown: "#211305",
        surface: "#1a1a1a",
        border: "#2a2a2a",
      },
      fontFamily: {
        display: ["Montserrat", "system-ui", "sans-serif"],
        body: ["Satoshi", "system-ui", "sans-serif"],
      },
      borderRadius: {
        brand: "24px",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px 0 rgba(237,164,232,0.3)" },
          "50%": { boxShadow: "0 0 22px 4px rgba(237,164,232,0.5)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.04)", opacity: "0.85" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        breathe: "breathe 1.4s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
