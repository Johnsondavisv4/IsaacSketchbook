import { readFile } from '@tauri-apps/plugin-fs';
import {
  getSaveFilename,
  resolveSaveFilePath,
  type SaveSettings,
} from './SettingsService';

export interface SaveDrawingResult {
  file: number;
  exists: boolean;
  filename: string;
  image: string;
  checkmarks: number;
  photoOutline: boolean;
  priority: number;
}

const SECTION_OFFSET = 0x14;
const ENTRY_LENS = [1, 4, 4, 1, 1, 1, 1, 4, 4, 1, 546];

function getSectionOffsets(data: Uint8Array): number[] {
  let offset = SECTION_OFFSET;
  const sectionData = new Array<number>(3);
  const resultsOffset = new Array<number>(ENTRY_LENS.length).fill(0);

  for (let i = 0; i < ENTRY_LENS.length; i++) {
    for (let j = 0; j < 3; j++) {
      if (offset + 4 <= data.length) {
        sectionData[j] =
          data[offset] |
          (data[offset + 1] << 8) |
          (data[offset + 2] << 16) |
          (data[offset + 3] << 24);
      }
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

function readUInt32LE(data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) return 0;
  return (
    (data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)) >>>
    0
  );
}

function isCorrectHeader(data: Uint8Array): boolean {
  if (data.length < 16) return false;
  const header = String.fromCharCode(...data.slice(0, 11));
  return header === 'ISAACNGSAVE';
}

export function parseSaveDrawing(
  data: Uint8Array | null | undefined,
  fileNumber = 1,
  filename = ''
): SaveDrawingResult {
  if (!data || data.length < 0x14) {
    return {
      file: fileNumber,
      exists: Boolean(data && data.length > 0),
      filename,
      image: '01_basement.png',
      checkmarks: 0,
      photoOutline: false,
      priority: 19,
    };
  }

  if (!isCorrectHeader(data)) {
    return {
      file: fileNumber,
      exists: true,
      filename,
      image: 'corruptdata.png',
      checkmarks: 0,
      photoOutline: false,
      priority: 1,
    };
  }

  const sections = getSectionOffsets(data);
  const sec0 = sections[0];
  const sec1 = sections[1];
  const sec7 = sections.length > 7 ? sections[7] : 0;

  const hasAchievement = (achId: number): boolean => {
    if (sec0 + achId < data.length) {
      return data[sec0 + achId] === 1;
    }
    return false;
  };

  const getCounter = (counterId: number): number => {
    return readUInt32LE(data, sec1 + counterId * 4);
  };

  const getCutscene = (cutsceneId: number): number => {
    if (!sec7) return 0;
    return readUInt32LE(data, sec7 + (cutsceneId - 1) * 4);
  };

  if (hasAchievement(637)) {
    return { file: fileNumber, exists: true, filename, image: 'deadgod.png', checkmarks: 0, photoOutline: false, priority: 2 };
  }

  const beastKills = getCounter(492);
  if (beastKills > 0) {
    return { file: fileNumber, exists: true, filename, image: 'beast.png', checkmarks: 0, photoOutline: false, priority: 3 };
  }

  const dogma = getCutscene(26) > 0 || getCutscene(25) > 0;
  if (dogma) {
    return { file: fileNumber, exists: true, filename, image: 'dogma.png', checkmarks: 0, photoOutline: false, priority: 4 };
  }

  if (hasAchievement(635)) {
    return { file: fileNumber, exists: true, filename, image: 'mother.png', checkmarks: 0, photoOutline: false, priority: 5 };
  }

  if (hasAchievement(339)) {
    return { file: fileNumber, exists: true, filename, image: '2savefilestogo.png', checkmarks: 0, photoOutline: false, priority: 6 };
  }

  if (hasAchievement(235)) {
    return { file: fileNumber, exists: true, filename, image: '17_1000percent.png', checkmarks: 0, photoOutline: false, priority: 7 };
  }

  if (hasAchievement(84)) {
    return { file: fileNumber, exists: true, filename, image: '15_realplatinumgod.png', checkmarks: 0, photoOutline: false, priority: 8 };
  }

  if (hasAchievement(69)) {
    return { file: fileNumber, exists: true, filename, image: '14_platinumgod.png', checkmarks: 0, photoOutline: false, priority: 9 };
  }

  const megaSatanKills = getCounter(26);
  if (megaSatanKills > 0) {
    return { file: fileNumber, exists: true, filename, image: '16_killmegasatan.png', checkmarks: 0, photoOutline: false, priority: 10 };
  }

  if (hasAchievement(41)) {
    return { file: fileNumber, exists: true, filename, image: '07_goldengod.png', checkmarks: 0, photoOutline: false, priority: 11 };
  }

  if (hasAchievement(155)) {
    return { file: fileNumber, exists: true, filename, image: '13_lambskull.png', checkmarks: 0, photoOutline: false, priority: 12 };
  }

  const isaacKills = getCounter(11);
  const satanKills = getCounter(13);
  if (isaacKills > 0 || satanKills > 0) {
    const negativeMap: Record<number, string> = {
      1: '12_negative1piece.png',
      2: '11_negative2pieces.png',
      3: '10_negative3pieces.png',
      4: '09_negative4pieces.png',
    };
    const photoMap: Record<number, string> = {
      1: '12_photo1piece.png',
      2: '11_photo2pieces.png',
      3: '10_photo3pieces.png',
      4: '09_photo4pieces.png',
    };

    if (satanKills > isaacKills) {
      const img = negativeMap[satanKills] || (satanKills >= 5 ? '08_negativefull.png' : '12_negative1piece.png');
      const outline = isaacKills === 0;
      return { file: fileNumber, exists: true, filename, image: img, checkmarks: 0, photoOutline: outline, priority: 13 };
    } else {
      const img = photoMap[isaacKills] || (isaacKills >= 5 ? '08_photofull.png' : '12_photo1piece.png');
      return { file: fileNumber, exists: true, filename, image: img, checkmarks: 0, photoOutline: false, priority: 13 };
    }
  }

  if (hasAchievement(32)) {
    return { file: fileNumber, exists: true, filename, image: '06_bluebaby.png', checkmarks: 0, photoOutline: false, priority: 14 };
  }

  if (hasAchievement(11)) {
    return { file: fileNumber, exists: true, filename, image: '05_fetus.png', checkmarks: 0, photoOutline: false, priority: 15 };
  }

  if (hasAchievement(33)) {
    return { file: fileNumber, exists: true, filename, image: '04_everythingisterrible.png', checkmarks: 0, photoOutline: false, priority: 16 };
  }

  const momKills = getCounter(1);
  if (momKills >= 1 && momKills <= 4) {
    return { file: fileNumber, exists: true, filename, image: '03_heart.png', checkmarks: momKills, photoOutline: false, priority: 17 };
  }

  if (hasAchievement(4)) {
    return { file: fileNumber, exists: true, filename, image: '02_momkill.png', checkmarks: 0, photoOutline: false, priority: 18 };
  }

  return {
    file: fileNumber,
    exists: true,
    filename,
    image: '01_basement.png',
    checkmarks: 0,
    photoOutline: false,
    priority: 19,
  };
}

export function resolveMultiSaveDrawings(drawings: SaveDrawingResult[]): SaveDrawingResult[] {
  if (!drawings || drawings.length < 3) return drawings;

  const results = drawings.map((d) => ({ ...d }));

  const allDeadGod = results.every((d) => d.exists && d.priority === 2);
  if (allDeadGod) {
    const f1 = results.find((d) => d.file === 1);
    const f2 = results.find((d) => d.file === 2);
    const f3 = results.find((d) => d.file === 3);
    if (f1) f1.image = 'infinity1.png';
    if (f2) f2.image = 'infinity2.png';
    if (f3) f3.image = 'infinity3.png';
    return results;
  }

  const oneMillionFiles = results
    .filter((d) => d.exists && d.priority === 6)
    .sort((a, b) => a.file - b.file);

  if (oneMillionFiles.length === 3) {
    const f1 = results.find((d) => d.file === 1);
    const f2 = results.find((d) => d.file === 2);
    const f3 = results.find((d) => d.file === 3);
    if (f1) f1.image = 'complete1.png';
    if (f2) f2.image = 'complete2.png';
    if (f3) f3.image = 'complete3.png';
  } else if (oneMillionFiles.length === 2) {
    oneMillionFiles[0].image = '2savefilestogo.png';
    oneMillionFiles[1].image = '1savefiletogo.png';
  } else if (oneMillionFiles.length === 1) {
    oneMillionFiles[0].image = '2savefilestogo.png';
  }

  return results;
}

export async function readAndEvaluateSaves(version: 'Repentance' | 'Repentance+' = 'Repentance+'): Promise<SaveDrawingResult[]> {
  const initialResults: SaveDrawingResult[] = [];

  for (let f = 1; f <= 3; f++) {
    const status = await resolveSaveFilePath({ version, file: f, characterMenu: 'normal' });
    if (status.exists && status.fullPath) {
      try {
        const buf = await readFile(status.fullPath);
        const evaluated = parseSaveDrawing(buf, f, status.filename);
        initialResults.push(evaluated);
        continue;
      } catch {
        initialResults.push({
          file: f,
          exists: true,
          filename: status.filename,
          image: 'corruptdata.png',
          checkmarks: 0,
          photoOutline: false,
          priority: 1,
        });
        continue;
      }
    }

    initialResults.push({
      file: f,
      exists: false,
      filename: status.filename || getSaveFilename({ version, file: f }),
      image: '01_basement.png',
      checkmarks: 0,
      photoOutline: false,
      priority: 19,
    });
  }

  return resolveMultiSaveDrawings(initialResults);
}
