import { Items } from '../enums/EItems.js';

export class Item {
    /**
     * @param {number} id
     * @param {boolean} [seen=false]
     */
    constructor(id, seen = false) {
        this.id = Items.getIDfromIndex(id);
        this.name = Items.getName(id);
        this.sprite = Items.getSprite(this.id);
        this.seen = Boolean(seen);
    }

    toggleSeen() {
        this.seen = !this.seen;
    }

    setSeen(value) {
        this.seen = Boolean(value);
    }

    getID() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    getSprite() {
        return this.sprite;
    }

    isSeen() {
        return this.seen;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            sprite: this.sprite,
            seen: this.seen
        };
    }
}
