export const Difficulty = Object.freeze({
    NONE: 0,
    NORMAL: 1,
    HARD: 2,
    ONLINE_NORMAL: 4,
    ONLINE_HARD: 8
});

export const DifficultyLabels = Object.freeze({
    [Difficulty.NONE]: 'None',
    [Difficulty.NORMAL]: 'Normal',
    [Difficulty.HARD]: 'Hard',
    [Difficulty.ONLINE_NORMAL]: 'Online Normal',
    [Difficulty.ONLINE_HARD]: 'Online Hard'
});

/**
 * @param {number} difficulty 
 * @returns {boolean}
 */
export function isOnline(difficulty) {
    return (difficulty >> 2) !== 0;
}

/**
 * @param {number} difficulty 
 * @returns {number}
 */
export function getSoloDifficulty(difficulty) {
    let tmp = difficulty & 0b11;
    if (tmp === 3) return Difficulty.HARD;
    return difficulty & 0b11;
}

/**
 * @param {number} difficulty 
 * @returns {number}
 */
export function getOnlineDifficulty(difficulty) {
    let tmp = difficulty >> 2;
    if (tmp === 3) return Difficulty.HARD;
    return difficulty >> 2;
}
