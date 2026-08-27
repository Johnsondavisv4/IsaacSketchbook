import { exists, readTextFile, writeTextFile, readDir } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

async function getSettingsPath(): Promise<string> {
  try {
    const exeDir: string = await invoke('get_exe_dir');
    if (exeDir) {
      const sep = exeDir.includes('/') ? '/' : '\\';
      return `${exeDir}${sep}settings.json`;
    }
  } catch (err) {
    console.warn('No se pudo obtener el directorio del exe vía Tauri invoke, usando ruta relativa:', err);
  }
  return 'settings.json';
}

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

export async function getSettings(): Promise<SaveSettings | null> {
  try {
    const fromRust: any = await invoke('get_settings');
    if (fromRust && fromRust.version && (fromRust.file !== undefined || fromRust.slot !== undefined)) {
      return {
        version: fromRust.version === 'Repentance+' ? 'Repentance+' : 'Repentance',
        file: Number(fromRust.file ?? fromRust.slot) || 1,
        characterMenu: fromRust.characterMenu === 'tainted' ? 'tainted' : 'normal',
      };
    }
  } catch (invokeErr) {
    // Fallback if invoke is unavailable
  }

  try {
    const settingsPath = await getSettingsPath();
    const hasFile = await exists(settingsPath);
    if (hasFile) {
      const raw = await readTextFile(settingsPath);
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
    console.error('Error leyendo settings.json:', err?.message || err);
  }
  return null;
}

export async function saveSettings(newSettings: Partial<SaveSettings> & { slot?: number }): Promise<SaveSettings> {
  const current = (await getSettings()) || {
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

  try {
    await invoke('save_settings', { settings: validated });
    return validated;
  } catch (invokeErr) {
    // Fallback if invoke is unavailable
  }

  try {
    const settingsPath = await getSettingsPath();
    await writeTextFile(settingsPath, JSON.stringify(validated, null, 2));
  } catch (err: any) {
    console.error('Error guardando settings.json:', err?.message || err);
  }
  return validated;
}

export interface AvailableVersionsStatus {
  hasRepentancePlus: boolean;
  hasRepentance: boolean;
  isSteamDetected: boolean;
  isGameInstalled: boolean;
}

export async function getAvailableVersions(): Promise<AvailableVersionsStatus> {
  let hasRepentancePlus = false;
  let hasRepentance = false;
  let isSteamDetected = false;
  let isGameInstalled = false;

  for (const root of STEAM_USERDATA_ROOTS) {
    try {
      const rootExists = await exists(root);
      if (!rootExists) continue;
      isSteamDetected = true;

      const userDirs = await readDir(root);
      for (const entry of userDirs) {
        if (!entry.isDirectory) continue;
        const userDirName = entry.name;
        const gameDir = `${root}\\${userDirName}\\250900`;
        const gameDirExists = await exists(gameDir);
        if (gameDirExists) {
          isGameInstalled = true;
        }
        const remoteDir = `${gameDir}\\remote`;
        const remoteDirExists = await exists(remoteDir);
        if (remoteDirExists) {
          for (let f = 1; f <= 3; f++) {
            if (await exists(`${remoteDir}\\rep+persistentgamedata${f}.dat`)) {
              hasRepentancePlus = true;
            }
            if (await exists(`${remoteDir}\\rep_persistentgamedata${f}.dat`)) {
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

export async function resolveSaveFilePath(settings?: SaveSettings | null): Promise<SaveFileStatus> {
  const activeSettings = settings || (await getSettings());
  if (!activeSettings) {
    return { fullPath: null, filename: '', exists: false };
  }

  const filename = getSaveFilename(activeSettings);

  for (const root of STEAM_USERDATA_ROOTS) {
    try {
      const rootExists = await exists(root);
      if (!rootExists) continue;

      const userDirs = await readDir(root);
      for (const entry of userDirs) {
        if (!entry.isDirectory) continue;
        const userDirName = entry.name;
        const remoteDir = `${root}\\${userDirName}\\250900\\remote`;
        const remoteDirExists = await exists(remoteDir);
        if (remoteDirExists) {
          const fullPath = `${remoteDir}\\${filename}`;
          if (await exists(fullPath)) {
            return { fullPath, filename, exists: true };
          }
        }
      }
    } catch {
    }
  }

  return { fullPath: null, filename, exists: false };
}

