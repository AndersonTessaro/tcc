export type LevelBounds = { levelStartXp: number; nextLevelXp: number };

// Mirrors GamificationService.xpToReachLevel: (level - 1)^2 * 100.
export function fallbackLevelBounds(level: number): LevelBounds {
  const completed = Math.max(level, 1) - 1;
  return { levelStartXp: completed * completed * 100, nextLevelXp: level * level * 100 };
}

export type LevelProgress = { earned: number; span: number; remaining: number; nextLevel: number };

export function levelProgress(xp: number, level: number, bounds: LevelBounds = fallbackLevelBounds(level)): LevelProgress {
  const span = Math.max(1, bounds.nextLevelXp - bounds.levelStartXp);
  return {
    earned: Math.min(span, Math.max(0, xp - bounds.levelStartXp)),
    span,
    remaining: Math.max(0, bounds.nextLevelXp - xp),
    nextLevel: level + 1,
  };
}

export function remainingXpLabel(progress: LevelProgress): string {
  return `Faltam ${progress.remaining} XP para o nível ${progress.nextLevel}`;
}
