import type { Route } from './+types/api.settings.check';
import { resolveSaveFilePath, getAvailableVersions } from '../services/save-parser/SettingsService';
import { readAndEvaluateSaves } from '../services/save-parser/SaveDrawingParser';

export async function action({ request }: Route.ActionArgs) {
  let body: any = {};
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await request.json();
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries());
  }

  const { version, file, slot } = body;
  const targetVersion = version === 'Repentance' ? 'Repentance' : 'Repentance+';
  const targetFile = Math.min(3, Math.max(1, Number(file ?? slot) || 1));

  const status = resolveSaveFilePath({
    version: targetVersion,
    file: targetFile,
    characterMenu: 'normal',
  });

  const drawings = readAndEvaluateSaves(targetVersion);
  const availableVersions = getAvailableVersions();

  return Response.json({
    ...status,
    drawings,
    availableVersions,
  });
}
