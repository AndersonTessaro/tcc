export const colors = {
  brand: "#34146D",
  brandDark: "#27104F",
  brandLight: "#4A2388",
  accent: "#7643CD",
  link: "#6C38C4",
  screen: "#F5F5F6",
  surface: "#FFFFFF",
  field: "#F9F8F9",
  border: "#DDD9DD",
  track: "#CECED0",
  text: "#17131A",
  muted: "#6A666B",
  placeholder: "#9A969B",
  danger: "#B42318",
  notification: "#F5A524",
  streak: "#F26B1D",
  badge: "#E5484D",
} as const;

export const brandGradient = [colors.brandDark, colors.brandLight, colors.brandDark] as const;
