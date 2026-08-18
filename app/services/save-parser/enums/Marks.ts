export const Marks = Object.freeze({
  MOMS_HEART: 0,
  ISAAC: 1,
  SATAN: 2,
  BOSS_RUSH: 3,
  BLUE_BABY: 4,
  THE_LAMB: 5,
  MEGA_SATAN: 6,
  GREED: 7,
  HUSH: 8,
  DELIRIUM: 9,
  MOTHER: 10,
  THE_BEAST: 11,
} as const);

export const MarkNames = Object.freeze([
  "Mom's Heart",
  "Isaac",
  "Satan",
  "Boss Rush",
  "Blue Baby",
  "The Lamb",
  "Mega Satan",
  "Greed",
  "Hush",
  "Delirium",
  "Mother",
  "The Beast",
] as const);

export function getMarkName(markIndex: number): string {
  return MarkNames[markIndex] ?? `Mark_${markIndex}`;
}
