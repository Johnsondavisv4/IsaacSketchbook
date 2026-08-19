import { getAchievementName, getAchievementUnlock, getAchievementSprite } from '../enums/EAchievements';

export interface AchievementJSON {
  id: number;
  achievement: string;
  unlocked: boolean;
  unlock: string;
  sprite: string;
}

export class Achievement {
  public id: number;
  public achievement: string;
  public unlocked: boolean;
  public unlock: string;
  public sprite: string;

  constructor(id: number, name?: string, unlocked: boolean = false, unlock?: string) {
    this.id = id;
    this.achievement = name ?? getAchievementName(id);
    this.unlocked = Boolean(unlocked);
    this.unlock = unlock ?? getAchievementUnlock(id);
    this.sprite = getAchievementSprite(this.id, this.achievement);
  }

  getId(): number {
    return this.id;
  }

  getName(): string {
    return this.achievement;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  getUnlock(): string {
    return this.unlock;
  }

  getSprite(): string {
    return this.sprite;
  }

  toJSON(): AchievementJSON {
    return {
      id: this.id,
      achievement: this.achievement,
      unlocked: this.unlocked,
      unlock: this.unlock,
      sprite: this.sprite,
    };
  }
}
