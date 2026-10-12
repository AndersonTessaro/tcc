import type { TabConfig } from "./app-tab-bar";

export const studentTabs: readonly TabConfig[] = [
  { name: "dashboard", label: "Início", icon: require("@/assets/images/figma-student/home.png"), size: 24 },
  { name: "lessons", label: "Aulas", icon: require("@/assets/images/figma-student/calendar.png"), size: 25 },
  { name: "practice", label: "Prática", icon: require("@/assets/images/figma-student/musical-note.png"), size: 22 },
  { name: "progress", label: "Progresso", icon: require("@/assets/images/figma-student/progress.png"), size: 22 },
  { name: "more", label: "Mais", icon: require("@/assets/images/figma-student/options.png"), size: 24 },
];
