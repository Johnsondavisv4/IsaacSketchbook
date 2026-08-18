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
  slot: number;
  characterMenu: 'normal' | 'tainted';
}

export interface SaveFileStatus {
  fullPath: string | null;
  filename: string;
  exists: boolean;
}

export function getSaveFilename(settings: Partial<SaveSettings>): string {
  const prefix = settings.version === 'Repentance+' ? 'rep+' : 'rep_';
  const slot = settings.slot || 1;
  return `${prefix}persistentgamedata${slot}.dat`;
}

export function getSettings(): SaveSettings | null {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version && parsed.slot) {
        return {
          version: parsed.version === 'Repentance+' ? 'Repentance+' : 'Repentance',
          slot: Number(parsed.slot) || 1,
          characterMenu: parsed.characterMenu === 'tainted' ? 'tainted' : 'normal',
        };
      }
    }
  } catch (err: any) {
    console.error('Error leyendo settings.json:', err.message);
  }
  return null;
}

export function saveSettings(newSettings: Partial<SaveSettings>): SaveSettings {
  const current = getSettings() || {
    version: 'Repentance+',
    slot: 1,
    characterMenu: 'normal',
  };
  const validated: SaveSettings = {
    version:
      newSettings.version ?
        newSettings.version === 'Repentance+' ? 'Repentance+' : 'Repentance'
      : current.version,
    slot:
      newSettings.slot !== undefined ?
        Math.min(3, Math.max(1, Number(newSettings.slot) || 1))
      : current.slot,
    characterMenu:
      newSettings.characterMenu ?
        newSettings.characterMenu === 'tainted' ? 'tainted' : 'normal'
      : current.characterMenu,
  };

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(validated, null, 2), 'utf8');
  return validated;
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
      // Ignore directory access errors
    }
  }

  return { fullPath: null, filename, exists: false };
}
