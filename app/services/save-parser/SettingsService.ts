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

interface SteamStatus {
  userdataPath: string | null;
  isGameInstalled: boolean;
}

async function getSteamStatus(): Promise<SteamStatus> {
  try {
    return await invoke<SteamStatus>('get_steam_status');
  } catch (error) {
    console.error('Error detectando Steam:', error);
    return { userdataPath: null, isGameInstalled: false };
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

export async function getSettings(): Promise<SaveSettings | null> {
  try {
    const fromRust: any = await invoke('get_settings');
    if (fromRust && fromRust.version && (fromRust.file !== undefined || fromRust.slot !== undefined)) {
      return {
        version: fromRust.version === 'Repentance+' ? 'Repentance+' : 'Repentance',
        file: Number(fromRust.file ?? fromRust.slot) || 1,
        characterMenu: fromRust.characterMenu === 'tainted' ? 'tainted' : 'normal',
        characterView: fromRust.characterView === 'wheel' ? 'wheel' : 'list',
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
          characterView: parsed.characterView === 'wheel' ? 'wheel' : 'list',
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
  const steam = await getSteamStatus();
  const isSteamDetected = steam.userdataPath !== null;
  const isGameInstalled = steam.isGameInstalled;

  for (const root of steam.userdataPath ? [steam.userdataPath] : []) {
    try {
      const rootExists = await exists(root);
      if (!rootExists) continue;

      const userDirs = await readDir(root);
      for (const entry of userDirs) {
        if (!entry.isDirectory) continue;
        const userDirName = entry.name;
        const gameDir = `${root}\\${userDirName}\\250900`;
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

export async function resolveSaveFilePath(settings?: (Pick<SaveSettings, 'version' | 'file'> & Partial<SaveSettings>) | null): Promise<SaveFileStatus> {
  const activeSettings = settings || (await getSettings());
  if (!activeSettings) {
    return { fullPath: null, filename: '', exists: false };
  }

  const filename = getSaveFilename(activeSettings);
  const steam = await getSteamStatus();
  // Leftover saves from an uninstalled game must not activate synchronization.
  if (!steam.isGameInstalled) {
    return { fullPath: null, filename, exists: false };
  }

  for (const root of steam.userdataPath ? [steam.userdataPath] : []) {
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

