export const ECharacters = Object.freeze({
  ISAAC: 0,
  MAGDALENE: 1,
  CAIN: 2,
  JUDAS: 3,
  BLUE_BABY: 4,
  EVE: 5,
  SAMSON: 6,
  AZAZEL: 7,
  LAZARUS: 8,
  EDEN: 9,
  THE_LOST: 10,
  LILITH: 11,
  KEEPER: 12,
  APOLLYON: 13,
  THE_FORGOTTEN: 14,
  BETHANY: 15,
  JACOB_AND_ESAU: 16,

  T_ISAAC: 17,
  T_MAGDALENE: 18,
  T_CAIN: 19,
  T_JUDAS: 20,
  T_BLUE_BABY: 21,
  T_EVE: 22,
  T_SAMSON: 23,
  T_AZAZEL: 24,
  T_LAZARUS: 25,
  T_EDEN: 26,
  T_LOST: 27,
  T_LILITH: 28,
  T_KEEPER: 29,
  T_APOLLYON: 30,
  T_FORGOTTEN: 31,
  T_BETHANY: 32,
  T_JACOB: 33,
} as const);

export const CharacterNames = Object.freeze([
  "Isaac",
  "Magdalene",
  "Cain",
  "Judas",
  "Blue Baby",
  "Eve",
  "Samson",
  "Azazel",
  "Lazarus",
  "Eden",
  "The Lost",
  "Lilith",
  "Keeper",
  "Apollyon",
  "The Forgotten",
  "Bethany",
  "Jacob & Esau",

  "Tainted Isaac",
  "Tainted Magdalene",
  "Tainted Cain",
  "Tainted Judas",
  "Tainted Blue Baby",
  "Tainted Eve",
  "Tainted Samson",
  "Tainted Azazel",
  "Tainted Lazarus",
  "Tainted Eden",
  "Tainted Lost",
  "Tainted Lilith",
  "Tainted Keeper",
  "Tainted Apollyon",
  "Tainted Forgotten",
  "Tainted Bethany",
  "Tainted Jacob",
] as const);

export function isTainted(charId: number): boolean {
  return charId >= 17 && charId <= 33;
}

export function getCharacterName(charId: number): string {
  return CharacterNames[charId] ?? `Character_${charId}`;
}

export function getCharacterId(name: string): number {
  const idx = CharacterNames.findIndex((n) => n.toLowerCase() === name.toLowerCase());
  return idx !== -1 ? idx : 0;
}
