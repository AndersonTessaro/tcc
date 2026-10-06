import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  brand: "#34146D",
  brandDark: "#27104F",
  primary: "#6C45BE",
  primaryPressed: "#56349E",
  primarySoft: "#EFE9FA",
  accent: "#6C45BE",
  link: "#5C2ABA",
  screen: "#F4F4F6",
  surface: "#FFFFFF",
  field: "#FAF9FB",
  border: "#DDD9E1",
  borderStrong: "#B5AFBC",
  track: "#E4E1E8",
  text: "#17131A",
  muted: "#5F5B63",
  placeholder: "#6A666B",
  onBrand: "#FFFFFF",
  onBrandMuted: "#DCD3EE",
  danger: "#B42318",
  dangerSoft: "#FDECEA",
  success: "#1B7F4B",
  successSoft: "#E5F4EC",
  warning: "#A15C07",
  warningSoft: "#FEF3E2",
  streak: "#F26B1D",
  scrim: "rgba(23, 19, 26, 0.45)",
} as const;

export const brandGradient = ["#2A1454", "#3B1E78", "#3B1E78", "#2A1454"] as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const type = {
  display: { fontSize: 28, fontWeight: "700", color: colors.text },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  heading: { fontSize: 17, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, fontWeight: "400", color: colors.text },
  bodyStrong: { fontSize: 15, fontWeight: "600", color: colors.text },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  caption: { fontSize: 13, fontWeight: "400", color: colors.muted },
} satisfies Record<string, TextStyle>;

export const shadow: ViewStyle = {
  shadowColor: "#1B0F33",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const MIN_TOUCH = 44;
