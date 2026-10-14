import { practiceRating } from "@/features/student/practiceMood";

export function practiceDetails(notes: string | null) {
  const parts = notes?.split(/;\s*(?=Dificuldade:|Avaliação:)/) ?? [];
  const difficulty = parts.find((part) => part.startsWith("Dificuldade:"))?.slice("Dificuldade:".length).trim();
  const activity = parts.filter((part) => !part.startsWith("Dificuldade:") && !part.startsWith("Avaliação:")).join("; ").trim();
  return { activity: activity || "Não informado", difficulty: difficulty || "Não informado", rating: practiceRating(notes) };
}
