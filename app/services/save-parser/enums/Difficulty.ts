export const Difficulty = Object.freeze({
  NONE: 0,
  NORMAL: 1,
  HARD: 2,
  ONLINE_NORMAL: 4,
  ONLINE_HARD: 8,
} as const);

export type DifficultyValue = typeof Difficulty[keyof typeof Difficulty];

export const DifficultyLabels: Record<number, string> = Object.freeze({
  [Difficulty.NONE]: 'None',
  [Difficulty.NORMAL]: 'Normal',
  [Difficulty.HARD]: 'Hard',
  [Difficulty.ONLINE_NORMAL]: 'Online Normal',
  [Difficulty.ONLINE_HARD]: 'Online Hard',
});

export function isOnline(difficulty: number): boolean {
  return (difficulty >> 2) !== 0;
}

export function getSoloDifficulty(difficulty: number): number {
  const tmp = difficulty & 0b11;
  if (tmp === 3) return Difficulty.HARD;
  return difficulty & 0b11;
}

export function getOnlineDifficulty(difficulty: number): number {
  const tmp = difficulty >> 2;
  if (tmp === 3) return Difficulty.HARD;
  return difficulty >> 2;
}
