import { isTainted, getCharacterName } from '../enums/ECharacters.js';
import { getMarkName } from '../enums/Marks.js';
import { Difficulty, DifficultyLabels } from '../enums/Difficulty.js';

export class Character {
    /**
     * @param {number} id
     * @param {string} [name]
     * @param {Map<number, number>} [soloMarks]
     * @param {Map<number, number>} [onlineMarks]
     */
    constructor(id, name, soloMarks = new Map(), onlineMarks = new Map()) {
        this.id = id;
        this.character = name ?? getCharacterName(id);
        this.tainted = isTainted(id);
        this.soloMarks = soloMarks;
        this.onlineMarks = onlineMarks;
    }

    /**
     * @returns {number}
     */
    getId() {
        return this.id;
    }

    /**
     * @returns {string}
     */
    getName() {
        return this.character;
    }

    /**
     * @returns {boolean}
     */
    isTainted() {
        return this.tainted;
    }

    /**
     * @param {number} mark
     * @returns {number}
     */
    getSoloMark(mark) {
        return this.soloMarks.get(mark) ?? Difficulty.NONE;
    }

    /**
     * @returns {Map<number, number>}
     */
    getSoloMarks() {
        return new Map(this.soloMarks);
    }

    /**
     * @param {number} mark
     * @returns {number}
     */
    getOnlineMark(mark) {
        return this.onlineMarks.get(mark) ?? Difficulty.NONE;
    }

    /**
     * @returns {Map<number, number>}
     */
    getOnlineMarks() {
        return new Map(this.onlineMarks);
    }

    /**
     * @returns {object}
     */
    toJSON() {
        const soloObj = {};
        const onlineObj = {};

        for (let i = 0; i < 12; i++) {
            const markName = getMarkName(i);
            const soloDiff = this.soloMarks.get(i) ?? Difficulty.NONE;
            const onlineDiff = this.onlineMarks.get(i) ?? Difficulty.NONE;

            soloObj[markName] = DifficultyLabels[soloDiff] ?? 'None';
            onlineObj[markName] = DifficultyLabels[onlineDiff] ?? 'None';
        }

        return {
            id: this.id,
            character: this.character,
            tainted: this.tainted,
            soloMarks: soloObj,
            onlineMarks: onlineObj
        };
    }
}
