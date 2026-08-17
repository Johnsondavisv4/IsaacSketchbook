import { getAchievementName, getAchievementUnlock } from '../enums/EAchievements.js';

export class Achievement {
    /**
     * @param {number} id
     * @param {string} [name]
     * @param {boolean} [unlocked=false]
     * @param {string} [unlock]
     */
    constructor(id, name, unlocked = false, unlock) {
        this.id = id;
        this.achievement = name ?? getAchievementName(id);
        this.unlocked = Boolean(unlocked);
        this.unlock = unlock ?? getAchievementUnlock(id);
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
        return this.achievement;
    }

    /**
     * @returns {boolean}
     */
    isUnlocked() {
        return this.unlocked;
    }

    /**
     * @returns {string}
     */
    getUnlock() {
        return this.unlock;
    }

    /**
     * @returns {object}
     */
    toJSON() {
        return {
            id: this.id,
            achievement: this.achievement,
            unlocked: this.unlocked,
            unlock: this.unlock
        };
    }
}
