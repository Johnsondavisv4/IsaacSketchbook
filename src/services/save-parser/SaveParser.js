import { Character } from './models/Character.js';
import { Achievement } from './models/Achievement.js';
import { Item } from './models/Item.js';
import { Items } from './enums/EItems.js';
import { getSoloDifficulty, getOnlineDifficulty } from './enums/Difficulty.js';

const SECTION_OFFSET = 0x14;
const ENTRY_LENS = [1, 4, 4, 1, 1, 1, 1, 4, 4, 1, 546];

const NUM_CHARACTERS = 34;
const NUM_MARKS = 12;
const NUM_ITEMS = 732;
const NUM_ACHIEVEMENTS_REP_PLUS = 641;
const NUM_ACHIEVEMENTS_REP = 637;

/**
 * @param {Uint8Array} data 
 * @returns {number[]}
 */
function getSectionOffsets(data) {
    let offset = SECTION_OFFSET;
    const sectionData = new Array(3);
    const resultsOffset = new Array(ENTRY_LENS.length).fill(0);

    for (let i = 0; i < ENTRY_LENS.length; i++) {
        for (let j = 0; j < 3; j++) {
            sectionData[j] = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
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

/**
 * @param {Uint8Array} data 
 * @param {number} offset 
 * @param {number} numberBytes 
 * @returns {number}
 */
function getInt(data, offset, numberBytes = 2) {
    let result = 0;
    for (let i = 0; i < numberBytes; i++) {
        result += data[offset + i] << i;
    }
    return result;
}

/**
 * @param {Uint8Array} data 
 * @param {number} section1Offset 
 * @param {number} charIndex 
 * @returns {number[]}
 */
function getChecklistUnlocks(data, section1Offset, charIndex) {
    const result = new Array(NUM_MARKS);
    if (charIndex === 14) { // The Forgotten
        let offset = section1Offset + 0x32C;
        for (let i = 0; i < NUM_MARKS; i++) {
            let currentOffset = offset + i * 4;
            result[i] = getInt(data, currentOffset);
            if (i === 8) offset += 0x4;
            if (i === 9) offset += 0x37C;
            if (i === 10) offset += 0x84;
        }
    } else if (charIndex > 14) { // Repentance (Bethany, J&E, Tainted 17..33)
        let offset = section1Offset + 0x31C;
        for (let i = 0; i < NUM_MARKS; i++) {
            let currentOffset = offset + charIndex * 4 + i * 19 * 4;
            result[i] = getInt(data, currentOffset);
            if (i === 8) offset += 0x4C;
            if (i === 9 || i === 10) offset += 0x3C;
        }
    } else { // 0..13 (Isaac ... Apollyon)
        let offset = section1Offset + 0x6C;
        for (let i = 0; i < NUM_MARKS; i++) {
            let currentOffset = offset + charIndex * 4 + i * 14 * 4;
            result[i] = getInt(data, currentOffset);
            if (i === 5) offset += 0x14;
            if (i === 8) offset += 0x3C;
            if (i === 9) offset += 0x3B0;
            if (i === 10) offset += 0x50;
        }
    }
    return result;
}

/**
 * @param {Uint8Array} data 
 * @param {number} section0Offset 
 * @param {number} count 
 * @returns {Achievement[]}
 */
function parseAchievements(data, section0Offset, count) {
    let offset = section0Offset;
    const achievements = [];
    for (let i = 1; i <= count; i++) {
        offset++;
        const unlocked = data[offset] === 1;
        achievements.push(new Achievement(i, undefined, unlocked));
    }
    return achievements;
}

/**
 * @param {Uint8Array} data 
 * @param {number} section3Offset 
 * @returns {Item[]}
 */
function parseItems(data, section3Offset) {
    let offset = section3Offset;
    const items = [];
    for (let i = 0; i < NUM_ITEMS; i++) {
        offset++;
        const seen = data[offset] === 1;
        items.push(new Item(i + 1, seen));
    }
    return items;
}

/**
 * Parsea un archivo de guardado binario de Isaac (.dat) en modo solo lectura.
 * @param {Uint8Array} data 
 * @param {'Repentance'|'Repentance+'} [version='Repentance+'] 
 * @returns {{ version: string, characters: Character[], achievements: Achievement[], items: Item[] }}
 */
export function parseSaveFile(data, version = 'Repentance+') {
    const sectionOffsets = getSectionOffsets(data);

    // 1. Personajes y Marcas (Sección 1)
    const characters = [];
    for (let c = 0; c < NUM_CHARACTERS; c++) {
        const rawMarks = getChecklistUnlocks(data, sectionOffsets[1], c);
        const soloMarks = new Map();
        const onlineMarks = new Map();
        for (let m = 0; m < NUM_MARKS; m++) {
            soloMarks.set(m, getSoloDifficulty(rawMarks[m]));
            onlineMarks.set(m, getOnlineDifficulty(rawMarks[m]));
        }
        characters.push(new Character(c, undefined, soloMarks, onlineMarks));
    }

    // 2. Logros (Sección 0)
    const achCount = version === 'Repentance' ? NUM_ACHIEVEMENTS_REP : NUM_ACHIEVEMENTS_REP_PLUS;
    const achievements = parseAchievements(data, sectionOffsets[0], achCount);

    // 3. Coleccionables / Items (Sección 3)
    const items = parseItems(data, sectionOffsets[3]);

    return {
        version,
        characters,
        achievements,
        items
    };
}
