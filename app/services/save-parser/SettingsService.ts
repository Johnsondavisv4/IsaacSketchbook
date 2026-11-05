import fs from 'node:fs';
import path from 'node:path';
import { findSteamPathSync, findSteamAppSync } from 'steam-locate';

const SETTINGS_PATH = path.resolve(process.cwd(), 'settings.json');

// Cache only discovery; save files and installation status are checked afresh.
let steamPathCache: { value: string | null; checkedAt: number } | undefined;

function getSteamPath(): string | null {
  if (steamPathCache && Date.now() - steamPathCache.checkedAt < 30_000) {
    return steamPathCache.value;
  }
  let value: string | null = null;
  try {
    value = findSteamPathSync();
  } catch {
    // Steam may be absent; callers will return an offline status.
  }
  steamPathCache = { value, checkedAt: Date.now() };
  return value;
}

function getSteamUserdataRoots(): string[] {
  const steamPath = getSteamPath();
  return steamPath ? [path.join(steamPath, 'userdata')] : [];
}

function isIsaacInstalled(): boolean {
  const steamPath = getSteamPath();
  if (!steamPath) return false;
  try {
    return findSteamAppSync('250900', steamPath).isInstalled;
  } catch {
    // A missing manifest or an unavailable library is not an installed game.
    return false;
  }
}

export interface SaveSettings {
  version: 'Repentance' | 'Repentance+';
  file: number;
  characterMenu: 'normal' | 'tainted';
  characterView: 'list' | 'wheel';
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
          characterView: parsed.characterView === 'wheel' ? 'wheel' : 'list',
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
    characterView: 'list',
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
    characterView: newSettings.characterView === undefined
      ? current.characterView
      : newSettings.characterView === 'wheel' ? 'wheel' : 'list',
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
  const roots = getSteamUserdataRoots();
  let isSteamDetected = getSteamPath() !== null;
  const isGameInstalled = isIsaacInstalled();

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    isSteamDetected = true;

    try {
      const userDirs = fs.readdirSync(root);
      for (const userDir of userDirs) {
        const gameDir = path.join(root, userDir, '250900');
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

export function resolveSaveFilePath(settings?: (Pick<SaveSettings, 'version' | 'file'> & Partial<SaveSettings>) | null): SaveFileStatus {
  const activeSettings = settings || getSettings();
  if (!activeSettings) {
    return { fullPath: null, filename: '', exists: false };
  }

  const filename = getSaveFilename(activeSettings);

  // Leftover saves from an uninstalled game must not activate synchronization.
  if (!isIsaacInstalled()) {
    return { fullPath: null, filename, exists: false };
  }

  for (const root of getSteamUserdataRoots()) {
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
