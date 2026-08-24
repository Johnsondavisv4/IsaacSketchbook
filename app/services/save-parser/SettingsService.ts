import fs from 'node:fs';
import path from 'node:path';

const SETTINGS_PATH = path.resolve(process.cwd(), 'settings.json');

const STEAM_USERDATA_ROOTS = [
  'C:\\Program Files (x86)\\Steam\\userdata',
  'C:\\Program Files\\Steam\\userdata',
  'D:\\Steam\\userdata',
  'E:\\Steam\\userdata',
];

export interface SaveSettings {
  version: 'Repentance' | 'Repentance+';
  file: number;
  characterMenu: 'normal' | 'tainted';
}

export interface SaveFileStatus {
  fullPath: string | null;
  filename: string;
  exists: boolean;
}

export function getSaveFilename(settings: Partial<SaveSettings> & { slot?: number }): string {
  const prefix = settings.version === 'Repentance+' ? 'rep+' : 'rep_';
  const file = settings.file ?? settings.slot ?? 1;
  return `${prefix}persistentgamedata${file}.dat`;
}

export function getSettings(): SaveSettings | null {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version && (parsed.file !== undefined || parsed.slot !== undefined)) {
        return {
          version: parsed.version === 'Repentance+' ? 'Repentance+' : 'Repentance',
          file: Number(parsed.file ?? parsed.slot) || 1,
          characterMenu: parsed.characterMenu === 'tainted' ? 'tainted' : 'normal',
        };
      }
    }
  } catch (err: any) {
    console.error('Error leyendo settings.json:', err.message);
  }
  return null;
}

export function saveSettings(newSettings: Partial<SaveSettings> & { slot?: number }): SaveSettings {
  const current = getSettings() || {
    version: 'Repentance+',
    file: 1,
    characterMenu: 'normal',
  };
  const targetFile = newSettings.file ?? newSettings.slot;
  const validated: SaveSettings = {
    version:
      newSettings.version ?
        newSettings.version === 'Repentance+' ? 'Repentance+' : 'Repentance'
      : current.version,
    file:
      targetFile !== undefined ?
        Math.min(3, Math.max(1, Number(targetFile) || 1))
      : current.file,
    characterMenu:
      newSettings.characterMenu ?
        newSettings.characterMenu === 'tainted' ? 'tainted' : 'normal'
      : current.characterMenu,
  };

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(validated, null, 2), 'utf8');
  return validated;
}

export interface AvailableVersionsStatus {
  hasRepentancePlus: boolean;
  hasRepentance: boolean;
  isSteamDetected: boolean;
  isGameInstalled: boolean;
}

export function getAvailableVersions(): AvailableVersionsStatus {
  let hasRepentancePlus = false;
  let hasRepentance = false;
  let isSteamDetected = false;
  let isGameInstalled = false;

  for (const root of STEAM_USERDATA_ROOTS) {
    if (!fs.existsSync(root)) continue;
    isSteamDetected = true;

    try {
      const userDirs = fs.readdirSync(root);
      for (const userDir of userDirs) {
        const gameDir = path.join(root, userDir, '250900');
        if (fs.existsSync(gameDir)) {
          isGameInstalled = true;
        }
        const remoteDir = path.join(gameDir, 'remote');
        if (fs.existsSync(remoteDir)) {
          for (let f = 1; f <= 3; f++) {
            if (fs.existsSync(path.join(remoteDir, `rep+persistentgamedata${f}.dat`))) {
              hasRepentancePlus = true;
            }
            if (fs.existsSync(path.join(remoteDir, `rep_persistentgamedata${f}.dat`))) {
              hasRepentance = true;
            }
          }
        }
      }
    } catch {
    }
  }

  return {
    hasRepentancePlus,
    hasRepentance,
    isSteamDetected,
    isGameInstalled,
  };
}

export function resolveSaveFilePath(settings?: SaveSettings | null): SaveFileStatus {
  const activeSettings = settings || getSettings();
  if (!activeSettings) {
    return { fullPath: null, filename: '', exists: false };
  }

  const filename = getSaveFilename(activeSettings);

  for (const root of STEAM_USERDATA_ROOTS) {
    if (!fs.existsSync(root)) continue;

    try {
      const userDirs = fs.readdirSync(root);
      for (const userDir of userDirs) {
        const remoteDir = path.join(root, userDir, '250900', 'remote');
        if (fs.existsSync(remoteDir)) {
          const fullPath = path.join(remoteDir, filename);
          if (fs.existsSync(fullPath)) {
            return { fullPath, filename, exists: true };
          }
        }
      }
    } catch {
    }
  }

  return { fullPath: null, filename, exists: false };
}
