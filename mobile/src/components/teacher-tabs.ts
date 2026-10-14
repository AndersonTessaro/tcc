import type { TabConfig } from "./app-tab-bar";

export const teacherTabs: readonly TabConfig[] = [
  { name: "dashboard", label: "Início", icon: require("@/assets/images/figma-teacher/home.png"), size: 24 },
  { name: "students", label: "Alunos", icon: require("@/assets/images/figma-teacher/students.png"), size: 25 },
  { name: "schedule", label: "Aulas", icon: require("@/assets/images/figma-teacher/lessons.png"), size: 22 },
  { name: "reports", label: "Relatórios", icon: require("@/assets/images/figma-teacher/reports.png"), size: 22 },
  { name: "more", label: "Mais", icon: require("@/assets/images/figma-teacher/more.png"), size: 24 },
];
