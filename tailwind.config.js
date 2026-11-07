/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#15161A", soft: "#5B5E66", faint: "#9A9CA3" },
        paper: "#F5F4EF",
        line: "#E3E1D9",
        accent: { DEFAULT: "#E0531F", dark: "#BF4314", soft: "#FCE7DC" },
        good: { DEFAULT: "#1F7A4D", soft: "#DDF0E5" },
        warn: { DEFAULT: "#A86A00", soft: "#F8ECCF" },
        bad: { DEFAULT: "#B4322A", soft: "#F8DEDB" },
        li: "#0A66C2",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        // Une seule police de titres dans toute l'app (la même que l'accueil) : Nunito, très grasse
        serif: ["Nunito", "Geist", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
