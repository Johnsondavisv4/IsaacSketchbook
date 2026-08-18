import { Character } from './models/Character';
import { Achievement } from './models/Achievement';
import { Item } from './models/Item';
import { getSoloDifficulty, getOnlineDifficulty } from './enums/Difficulty';

const SECTION_OFFSET = 0x14;
const ENTRY_LENS = [1, 4, 4, 1, 1, 1, 1, 4, 4, 1, 546];

const NUM_CHARACTERS = 34;
const NUM_MARKS = 12;
const NUM_ITEMS = 732;
const NUM_ACHIEVEMENTS_REP_PLUS = 641;
const NUM_ACHIEVEMENTS_REP = 637;

function getSectionOffsets(data: Uint8Array): number[] {
  let offset = SECTION_OFFSET;
  const sectionData = new Array<number>(3);
  const resultsOffset = new Array<number>(ENTRY_LENS.length).fill(0);

  for (let i = 0; i < ENTRY_LENS.length; i++) {
    for (let j = 0; j < 3; j++) {
      sectionData[j] =
        data[offset] |
        (data[offset + 1] << 8) |
        (data[offset + 2] << 16) |
        (data[offset + 3] << 24);
      offset += 4;
    }

    if (resultsOffset[i] === 0) {
      resultsOffset[i] = offset;
    }

    for (let j = 0; j < sectionData[2]; j++) {
      offset += ENTRY_LENS[i];
    }
  }
  return resultsOffset;
}

function getInt(data: Uint8Array, offset: number, numberBytes = 2): number {
  let result = 0;
  for (let i = 0; i < numberBytes; i++) {
    result += data[offset + i] << i;
  }
  return result;
}

function getChecklistUnlocks(
  data: Uint8Array,
  section1Offset: number,
  charIndex: number
): number[] {
  const result = new Array<number>(NUM_MARKS);
  if (charIndex === 14) {
    // The Forgotten
    let offset = section1Offset + 0x32c;
    for (let i = 0; i < NUM_MARKS; i++) {
      const currentOffset = offset + i * 4;
      result[i] = getInt(data, currentOffset);
      if (i === 8) offset += 0x4;
      if (i === 9) offset += 0x37c;
      if (i === 10) offset += 0x84;
    }
  } else if (charIndex > 14) {
    // Repentance (Bethany, J&E, Tainted 17..33)
    let offset = section1Offset + 0x31c;
    for (let i = 0; i < NUM_MARKS; i++) {
      const currentOffset = offset + charIndex * 4 + i * 19 * 4;
      result[i] = getInt(data, currentOffset);
      if (i === 8) offset += 0x4c;
      if (i === 9 || i === 10) offset += 0x3c;
    }
  } else {
    // 0..13 (Isaac ... Apollyon)
    let offset = section1Offset + 0x6c;
    for (let i = 0; i < NUM_MARKS; i++) {
      const currentOffset = offset + charIndex * 4 + i * 14 * 4;
      result[i] = getInt(data, currentOffset);
      if (i === 5) offset += 0x14;
      if (i === 8) offset += 0x3c;
      if (i === 9) offset += 0x3b0;
      if (i === 10) offset += 0x50;
    }
  }
  return result;
}

function parseAchievements(
  data: Uint8Array,
  section0Offset: number,
  count: number
): Achievement[] {
  let offset = section0Offset;
  const achievements: Achievement[] = [];
  for (let i = 1; i <= count; i++) {
    offset++;
    const unlocked = data[offset] === 1;
    achievements.push(new Achievement(i, undefined, unlocked));
  }
  return achievements;
}

function parseItems(data: Uint8Array, section3Offset: number): Item[] {
  let offset = section3Offset;
  const items: Item[] = [];
  for (let i = 0; i < NUM_ITEMS; i++) {
    offset++;
    const seen = data[offset] === 1;
    items.push(new Item(i + 1, seen));
  }
  return items;
}

export interface ParsedSaveData {
  version: 'Repentance' | 'Repentance+';
  characters: Character[];
  achievements: Achievement[];
  items: Item[];
}

export function parseSaveFile(
  data: Uint8Array,
  version: 'Repentance' | 'Repentance+' = 'Repentance+'
): ParsedSaveData {
  const sectionOffsets = getSectionOffsets(data);

  // 1. Personajes y Marcas (Sección 1)
  const characters: Character[] = [];
  for (let c = 0; c < NUM_CHARACTERS; c++) {
    const rawMarks = getChecklistUnlocks(data, sectionOffsets[1], c);
    const soloMarks = new Map<number, number>();
    const onlineMarks = new Map<number, number>();
    for (let m = 0; m < NUM_MARKS; m++) {
      soloMarks.set(m, getSoloDifficulty(rawMarks[m]));
      onlineMarks.set(m, getOnlineDifficulty(rawMarks[m]));
    }
    characters.push(new Character(c, undefined, soloMarks, onlineMarks));
  }

  // 2. Logros (Sección 0)
  const achCount =
    version === 'Repentance' ? NUM_ACHIEVEMENTS_REP : NUM_ACHIEVEMENTS_REP_PLUS;
  const achievements = parseAchievements(data, sectionOffsets[0], achCount);

  // 3. Coleccionables / Items (Sección 3)
  const items = parseItems(data, sectionOffsets[3]);

  return {
    version,
    characters,
    achievements,
    items,
  };
}
