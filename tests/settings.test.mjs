import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('character view settings persist without overwriting other preferences', async t => {
  const originalDirectory = process.cwd();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'isaac-settings-'));
  const moduleUrl = new URL('../app/services/save-parser/SettingsService.ts', import.meta.url);
  process.chdir(temporary);
  try {
    const { getSettings, saveSettings } = await import(moduleUrl.href);
    await t.test('new configurations default to list', () => {
      assert.equal(getSettings(), null);
      assert.equal(saveSettings({}).characterView, 'list');
      assert.equal(getSettings().characterView, 'list');
    });
    await t.test('legacy JSON defaults to list without changing the selected save', () => {
      fs.writeFileSync('settings.json', JSON.stringify({ version: 'Repentance', file: 3, characterMenu: 'tainted' }));
      assert.deepEqual(getSettings(), { version: 'Repentance', file: 3, characterMenu: 'tainted', characterView: 'list' });
    });
    await t.test('wheel survives writing, rereading and a file selection change', () => {
      saveSettings({ characterView: 'wheel' });
      assert.deepEqual(getSettings(), { version: 'Repentance', file: 3, characterMenu: 'tainted', characterView: 'wheel' });
      saveSettings({ file: 2, characterMenu: 'normal' });
      assert.equal(getSettings().characterView, 'wheel');
      assert.equal(JSON.parse(fs.readFileSync('settings.json', 'utf8')).characterView, 'wheel');
    });
    await t.test('list can be restored and invalid values normalize to list', () => {
      saveSettings({ characterView: 'list' });
      assert.equal(getSettings().characterView, 'list');
      saveSettings({ characterView: 'invalid' });
      assert.equal(getSettings().characterView, 'list');
    });
  } finally {
    process.chdir(originalDirectory);
    assert.ok(path.resolve(temporary).startsWith(path.join(os.tmpdir(), 'isaac-settings-')));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
