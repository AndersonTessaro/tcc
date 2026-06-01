/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: { primary: "#6C5CE7", accent: "#00B894", bg: "#0E0E1A" },
    },
  },
  plugins: [],
};
