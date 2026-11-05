import type { AchievementJSON } from '../services/save-parser/models/Achievement';

// Character IDs and achievement IDs are separate namespaces. In particular,
// Blue Baby unlocks through "???" (32); "Blue Baby" (209) is a co-op baby.
const NORMAL_UNLOCKS: Readonly<Record<number, number>> = {
  1: 1, 2: 2, 3: 3, 4: 32, 5: 42, 6: 67, 7: 79, 8: 80,
  9: 81, 10: 82, 11: 199, 12: 251, 13: 340, 14: 390, 15: 404, 16: 405,
};

// These normals use the shared question-mark placeholder in the atlas rather
// than a locked portrait. Their slots are absent until the character is known.
const HIDDEN_NORMALS = new Set([4, 10, 12, 14]);

export interface CharacterUnlock {
  state: 'unlocked' | 'locked' | 'unknown';
  achievement?: AchievementJSON;
}

export function getCharacterUnlock(
  characterId: number,
  achievements: readonly AchievementJSON[],
  hasSave: boolean,
): CharacterUnlock {
  if (characterId === 0) return { state: 'unlocked' };
  const achievementId = characterId >= 17 && characterId <= 33
    ? 474 + characterId - 17
    : NORMAL_UNLOCKS[characterId];
  if (!hasSave || achievementId === undefined) return { state: 'unknown' };
  const achievement = achievements.find(item => item.id === achievementId);
  if (!achievement) return { state: 'unknown' };
  return { state: achievement.unlocked ? 'unlocked' : 'locked', achievement };
}

export function isCharacterVisible(
  characterId: number,
  achievements: readonly AchievementJSON[],
  hasSave: boolean,
): boolean {
  const normalId = characterId >= 17 ? characterId - 17 : characterId;
  if (!HIDDEN_NORMALS.has(normalId)) return true;
  if (getCharacterUnlock(normalId, achievements, hasSave).state !== 'locked') return true;
  if (characterId < 17) return false;
  // An explicitly unlocked Tainted flag remains authoritative, including saves
  // with inconsistent flags. Unknown/offline data never proves a locked state.
  return getCharacterUnlock(characterId, achievements, hasSave).state !== 'locked';
}
