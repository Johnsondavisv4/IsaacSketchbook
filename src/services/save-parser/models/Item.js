import { getItemName } from '../enums/EItems.js';

export class Item {
    /**
     * @param {number} id
     * @param {string} [name]
     * @param {boolean} [seen=false]
     */
    constructor(id, name, seen = false) {
        this.id = id;
        this.name = name ?? getItemName(id);
        this.seen = Boolean(seen);
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
        return this.name;
    }

    /**
     * @returns {boolean}
     */
    isSeen() {
        return this.seen;
    }

    /**
     * @returns {object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            seen: this.seen
        };
    }
}
