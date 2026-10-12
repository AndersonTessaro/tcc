export const practiceMoods = [
  require("@/assets/images/figma-student/mood-1.png"),
  require("@/assets/images/figma-student/mood-2.png"),
  require("@/assets/images/figma-student/mood-3.png"),
  require("@/assets/images/figma-student/mood-4.png"),
  require("@/assets/images/figma-student/mood-5.png"),
];

export function practiceRating(notes: string | null): number | null {
  const match = notes?.match(/(?:^|;\s*)Avaliação: ([1-5])\/5(?:;|$)/);
  return match ? Number(match[1]) : null;
}
