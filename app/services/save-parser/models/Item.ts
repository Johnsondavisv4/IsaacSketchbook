import { Items } from '../enums/EItems';

export interface ItemJSON {
  id: number;
  name: string;
  quote: string;
  sprite: string;
  seen: boolean;
}

export class Item {
  public id: number;
  public name: string;
  public quote: string;
  public sprite: string;
  public seen: boolean;

  constructor(id: number, seen: boolean = false) {
    this.id = Items.getIDfromIndex(id);
    this.name = Items.getName(id);
    this.quote = Items.getQuote(this.id);
    this.sprite = Items.getSprite(this.id);
    this.seen = Boolean(seen);
  }

  toggleSeen(): void {
    this.seen = !this.seen;
  }

  setSeen(value: boolean): void {
    this.seen = Boolean(value);
  }

  getID(): number {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getQuote(): string {
    return this.quote;
  }

  getSprite(): string {
    return this.sprite;
  }

  isSeen(): boolean {
    return this.seen;
  }

  toJSON(): ItemJSON {
    return {
      id: this.id,
      name: this.name,
      quote: this.quote,
      sprite: this.sprite,
      seen: this.seen,
    };
  }
}
