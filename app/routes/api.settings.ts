import type { Route } from './+types/api.settings';
import {
  getSettings,
  saveSettings,
  resolveSaveFilePath,
  getSaveFilename,
} from '../services/save-parser/SettingsService';

export async function loader() {
  const settings = getSettings();
  const status = resolveSaveFilePath(settings);
  return Response.json({
    configured: Boolean(settings),
    settings: settings || { version: 'Repentance+', slot: 1, characterMenu: 'normal' },
    filename:
      status.filename ||
      (settings ? getSaveFilename(settings) : 'rep+persistentgamedata1.dat'),
    exists: status.exists,
    fullPath: status.fullPath,
  });
}

export async function action({ request }: Route.ActionArgs) {
  let body: any = {};
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await request.json();
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries());
  }

  const { version, slot, characterMenu } = body;
  const current = getSettings() || {
    version: 'Repentance+',
    slot: 1,
    characterMenu: 'normal',
  };

  const targetVersion =
    version || current.version || ('Repentance+' as const);
  const targetSlot =
    slot !== undefined ? Number(slot) : (current.slot || 1);
  const targetMenu =
    characterMenu || current.characterMenu || ('normal' as const);

  const saved = saveSettings({
    version: targetVersion,
    slot: targetSlot,
    characterMenu: targetMenu,
  });
  const status = resolveSaveFilePath(saved);

  return Response.json({
    ok: true,
    configured: true,
    settings: saved,
    filename: status.filename,
    exists: status.exists,
    fullPath: status.fullPath,
  });
}
