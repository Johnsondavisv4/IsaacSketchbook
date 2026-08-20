import type { Route } from './+types/api.settings.check';
import { resolveSaveFilePath } from '../services/save-parser/SettingsService';

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

  return Response.json(status);
}
