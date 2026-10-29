/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Same brand tokens as mobile/src/ui/theme.ts.
      colors: {
        primary: { DEFAULT: "#6C45BE", strong: "#5A36A6", soft: "#EFE9FA" },
        ink: { DEFAULT: "#17131A", muted: "#5E5866", faint: "#8C8794" },
        canvas: "#F6F5F8",
        line: "#E6E3EB",
        success: { DEFAULT: "#1B7F4B", soft: "#E5F4EC" },
        warning: { DEFAULT: "#9A5B00", soft: "#FDF1DC" },
        danger: { DEFAULT: "#B42318", soft: "#FDECEA" },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
