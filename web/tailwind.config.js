/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { primary: "#6C5CE7", accent: "#00B894" },
    },
  },
  plugins: [],
};
