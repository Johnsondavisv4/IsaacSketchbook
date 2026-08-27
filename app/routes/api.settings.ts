import type { Route } from './+types/api.settings';
import {
  getSettings,
  saveSettings,
  resolveSaveFilePath,
  getSaveFilename,
  getAvailableVersions,
} from '../services/save-parser/SettingsService';

export async function clientLoader() {
  const settings = await getSettings();
  const status = await resolveSaveFilePath(settings);
  const availableVersions = await getAvailableVersions();
  return Response.json({
    configured: Boolean(settings),
    settings: settings || { version: 'Repentance+', file: 1, characterMenu: 'normal' },
    filename:
      status.filename ||
      (settings ? getSaveFilename(settings) : 'rep+persistentgamedata1.dat'),
    exists: status.exists,
    fullPath: status.fullPath,
    availableVersions,
  });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  let body: any = {};
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await request.json();
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries());
  }

  const { version, file, slot, characterMenu } = body;
  const current = (await getSettings()) || {
    version: 'Repentance+',
    file: 1,
    characterMenu: 'normal',
  };

  const targetVersion =
    version || current.version || ('Repentance+' as const);
  const targetFile =
    file !== undefined ? Number(file) : (slot !== undefined ? Number(slot) : (current.file || 1));
  const targetMenu =
    characterMenu || current.characterMenu || ('normal' as const);

  const saved = await saveSettings({
    version: targetVersion,
    file: targetFile,
    characterMenu: targetMenu,
  });
  const status = await resolveSaveFilePath(saved);

  return Response.json({
    ok: true,
    configured: true,
    settings: saved,
    filename: status.filename,
    exists: status.exists,
    fullPath: status.fullPath,
    availableVersions: await getAvailableVersions(),
  });
}
