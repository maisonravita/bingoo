/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Lisent les jetons de src/index.css (thème clair et sombre)
        ink: { DEFAULT: "rgb(var(--ink) / <alpha-value>)", soft: "rgb(var(--ink-soft) / <alpha-value>)", faint: "rgb(var(--ink-faint) / <alpha-value>)" },
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: { DEFAULT: "rgb(var(--accent) / <alpha-value>)", dark: "rgb(var(--accent-dark) / <alpha-value>)", soft: "rgb(var(--accent-soft) / <alpha-value>)" },
        good: { DEFAULT: "rgb(var(--good) / <alpha-value>)", soft: "rgb(var(--good-soft) / <alpha-value>)" },
        warn: { DEFAULT: "rgb(var(--warn) / <alpha-value>)", soft: "rgb(var(--warn-soft) / <alpha-value>)" },
        bad: { DEFAULT: "rgb(var(--bad) / <alpha-value>)", soft: "rgb(var(--bad-soft) / <alpha-value>)" },
        info: { DEFAULT: "rgb(var(--info) / <alpha-value>)", soft: "rgb(var(--info-soft) / <alpha-value>)" },
        li: "#0A66C2",
      },
      borderRadius: { champ: "var(--rayon-champ)", carte: "var(--rayon-carte)", fenetre: "var(--rayon-fenetre)" },
      boxShadow: { menu: "var(--ombre-menu)", fenetre: "var(--ombre-fenetre)" },
      transitionDuration: { rapide: "var(--duree-rapide)", DEFAULT: "var(--duree)", lente: "var(--duree-lente)" },
      transitionTimingFunction: { DEFAULT: "var(--courbe)" },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Geist", "system-ui", "-apple-system", "sans-serif"],
        // Une seule police partout : Plus Jakarta Sans (voir --font-titre dans index.css)
        serif: ['"Plus Jakarta Sans"', "Geist", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
