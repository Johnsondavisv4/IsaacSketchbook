import { isTainted, getCharacterName } from '../enums/ECharacters';
import { getMarkName } from '../enums/Marks';
import { Difficulty, DifficultyLabels } from '../enums/Difficulty';

export interface CharacterJSON {
  id: number;
  character: string;
  tainted: boolean;
  soloMarks: Record<string, string>;
  onlineMarks: Record<string, string>;
}

export class Character {
  public id: number;
  public character: string;
  public tainted: boolean;
  public soloMarks: Map<number, number>;
  public onlineMarks: Map<number, number>;

  constructor(
    id: number,
    name?: string,
    soloMarks: Map<number, number> = new Map(),
    onlineMarks: Map<number, number> = new Map()
  ) {
    this.id = id;
    this.character = name ?? getCharacterName(id);
    this.tainted = isTainted(id);
    this.soloMarks = soloMarks;
    this.onlineMarks = onlineMarks;
  }

  getId(): number {
    return this.id;
  }

  getName(): string {
    return this.character;
  }

  isTainted(): boolean {
    return this.tainted;
  }

  getSoloMark(mark: number): number {
    return this.soloMarks.get(mark) ?? Difficulty.NONE;
  }

  getSoloMarks(): Map<number, number> {
    return new Map(this.soloMarks);
  }

  getOnlineMark(mark: number): number {
    return this.onlineMarks.get(mark) ?? Difficulty.NONE;
  }

  getOnlineMarks(): Map<number, number> {
    return new Map(this.onlineMarks);
  }

  toJSON(): CharacterJSON {
    const soloObj: Record<string, string> = {};
    const onlineObj: Record<string, string> = {};

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
      onlineMarks: onlineObj,
    };
  }
}
